import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.PROPOSAL_SUBMISSIONS_TABLE;
const defaultTenantId = process.env.PROPOSAL_DEFAULT_TENANT_ID || 'development';

const workflowStubMode = (process.env.PROPOSAL_WORKFLOW_STUB_MODE || 'false').toLowerCase() === 'true';

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  };
}

function errorResponse(statusCode, code, message, details = undefined, requestId = undefined) {
  return response(statusCode, {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
      ...(requestId ? { requestId } : {})
    }
  });
}

function normalizeRecommendation(payload) {
  return payload?.state?.finalDecision?.recommendation ?? payload?.decisionPreview?.status ?? 'needs_review';
}

function getJwtClaims(event) {
  return event.requestContext?.authorizer?.jwt?.claims ?? null;
}

function resolveTenantId(event) {
  const claims = getJwtClaims(event);
  const claimTenantId = claims?.['custom:tenant_id'];
  const claimTenantCode = claims?.['custom:tenant_code'];

  if (typeof claimTenantId === 'string' && claimTenantId.trim()) {
    return claimTenantId.trim();
  }

  if (typeof claimTenantCode === 'string' && claimTenantCode.trim()) {
    return claimTenantCode.trim();
  }

  return defaultTenantId;
}

function resolveSubmittedBy(event, payload) {
  const claims = getJwtClaims(event);

  const claimUsername = claims?.['cognito:username'];
  if (typeof claimUsername === 'string' && claimUsername.trim()) {
    return claimUsername.trim();
  }

  const claimPreferredUsername = claims?.preferred_username;
  if (typeof claimPreferredUsername === 'string' && claimPreferredUsername.trim()) {
    return claimPreferredUsername.trim();
  }

  const claimEmail = claims?.email;
  if (typeof claimEmail === 'string' && claimEmail.trim()) {
    return claimEmail.trim();
  }

  const claimSubject = claims?.sub;
  if (typeof claimSubject === 'string' && claimSubject.trim()) {
    return claimSubject.trim();
  }

  return payload.submittedBy || 'unknown';
}

function normalizeSubmissionStatus(recommendation) {
  return recommendation === 'needs_review' ? 'needs_review' : 'submitted';
}

function toStructuredError(error) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message
    };
  }

  return {
    message: 'Unknown error'
  };
}

function mapRecentSubmission(item) {
  return {
    submissionId: item.submissionId || '',
    tenantId: item.tenantId || '',
    submittedBy: item.submittedBy || 'unknown',
    recommendation: item.recommendation || 'needs_review',
    status: item.status || 'submitted',
    submittedAtIso: item.submittedAtIso || '',
    projectName: item.projectName || '',
    projectNumber: item.projectNumber || ''
  };
}

function parseLimit(event) {
  const rawLimit = event.queryStringParameters?.limit;
  const parsed = Number.parseInt(rawLimit ?? '10', 10);
  if (Number.isNaN(parsed)) {
    return 10;
  }

  return Math.max(1, Math.min(parsed, 25));
}

function parseRequestBody(event) {
  if (!event.body) {
    return {};
  }

  try {
    return JSON.parse(event.body);
  } catch {
    return null;
  }
}

function parseWorkflowRoute(method, path) {
  if (method !== 'POST') {
    return null;
  }

  const match = path.match(/^\/api\/proposals\/workflow\/opportunities\/([^/]+)\/(triage|qualification|selection)\/(run|decision|compare)$/);
  if (!match) {
    return null;
  }

  return {
    opportunityId: decodeURIComponent(match[1]),
    stage: match[2],
    action: match[3]
  };
}

function isoNow() {
  return new Date().toISOString();
}

function validateDecisionPayload(body, allowedDecisions) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }

  if (!allowedDecisions.includes(body.decision)) {
    return `decision must be one of: ${allowedDecisions.join(', ')}.`;
  }

  if (typeof body.rationale !== 'string' || !body.rationale.trim()) {
    return 'rationale is required and cannot be empty.';
  }

  return null;
}

function handleTriageRunStub(opportunityId, body) {
  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'validation_failed', 'Request body is required.');
  }

  if (typeof body.documentBundleId !== 'string' || !body.documentBundleId.trim()) {
    return errorResponse(400, 'validation_failed', 'documentBundleId is required.');
  }

  if (typeof body.representedManufacturer !== 'string' || !body.representedManufacturer.trim()) {
    return errorResponse(400, 'validation_failed', 'representedManufacturer is required.');
  }

  return response(200, {
    opportunityId,
    triage: {
      recommendation: 'needs_review',
      winProbability: 0.62,
      bodFitScore: 0.58,
      dueDateRisk: 'medium',
      manufacturerFit: 'partial',
      confidence: 0.64,
      reasonCodes: ['BOD_PARTIAL_MATCH', 'DUE_DATE_NEAR'],
      blockers: [],
      generatedAtIso: isoNow(),
      generatedBy: 'system'
    }
  });
}

function handleTriageDecisionStub(opportunityId, body, event) {
  const validationError = validateDecisionPayload(body, ['pursue', 'pass', 'needs_review']);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  return response(200, {
    opportunityId,
    stage: 'triage',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy: resolveSubmittedBy(event, {}),
    decidedAtIso: isoNow()
  });
}

function handleQualificationRunStub(opportunityId, body) {
  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'validation_failed', 'Request body is required.');
  }

  if (typeof body.documentBundleId !== 'string' || !body.documentBundleId.trim()) {
    return errorResponse(400, 'validation_failed', 'documentBundleId is required.');
  }

  if (typeof body.representedManufacturer !== 'string' || !body.representedManufacturer.trim()) {
    return errorResponse(400, 'validation_failed', 'representedManufacturer is required.');
  }

  if (!Array.isArray(body.approvedManufacturers)) {
    return errorResponse(400, 'validation_failed', 'approvedManufacturers must be an array.');
  }

  const represented = body.representedManufacturer.trim();
  const approved = body.approvedManufacturers
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  const hasOverlap = approved.some((item) => item.toLowerCase() === represented.toLowerCase());

  return response(200, {
    opportunityId,
    qualification: {
      recommendation: hasOverlap ? 'go' : 'needs_review',
      confidence: hasOverlap ? 0.79 : 0.56,
      representedManufacturer: represented,
      detectedManufacturers: approved,
      overlapStatus: hasOverlap ? 'eligible' : 'conflict',
      policyChecks: [
        {
          code: 'MANUFACTURER_OVERLAP',
          status: hasOverlap ? 'pass' : 'fail',
          message: hasOverlap
            ? 'Represented manufacturer is present in approved manufacturer list.'
            : 'Represented manufacturer is not present in approved manufacturer list.'
        }
      ],
      citations: [],
      reasonCodes: hasOverlap ? ['MANUFACTURER_MATCH'] : ['MANUFACTURER_CONFLICT'],
      blockers: hasOverlap ? [] : ['Represented manufacturer missing from approved list.'],
      generatedAtIso: isoNow()
    }
  });
}

function handleQualificationDecisionStub(opportunityId, body, event) {
  const validationError = validateDecisionPayload(body, ['go', 'no_go', 'needs_review']);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  return response(200, {
    opportunityId,
    stage: 'qualification',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy: resolveSubmittedBy(event, {}),
    decidedAtIso: isoNow()
  });
}

function handleSelectionCompareStub(opportunityId, body) {
  if (!body || typeof body !== 'object') {
    return errorResponse(400, 'validation_failed', 'Request body is required.');
  }

  if (typeof body.toolPathModel !== 'string' || !body.toolPathModel.trim()) {
    return errorResponse(400, 'validation_failed', 'toolPathModel is required.');
  }

  if (typeof body.manufacturerPathModel !== 'string' || !body.manufacturerPathModel.trim()) {
    return errorResponse(400, 'validation_failed', 'manufacturerPathModel is required.');
  }

  const toolPathModel = body.toolPathModel.trim();
  const manufacturerPathModel = body.manufacturerPathModel.trim();
  const aligned = toolPathModel.toLowerCase() === manufacturerPathModel.toLowerCase();

  return response(200, {
    opportunityId,
    selection: {
      toolPathModel,
      manufacturerPathModel,
      overallStatus: aligned ? 'aligned' : 'mismatch',
      confidence: aligned ? 0.83 : 0.61,
      deltas: aligned
        ? []
        : [
            {
              field: 'model',
              toolPathValue: toolPathModel,
              manufacturerValue: manufacturerPathModel,
              severity: 'warning',
              rationale: 'Manufacturer path model differs from tool-path recommendation.',
              citations: []
            }
          ],
      reasonCodes: aligned ? ['MODEL_ALIGNED'] : ['MODEL_MISMATCH'],
      blockers: aligned ? [] : ['Tool-path and manufacturer-path models do not match.'],
      generatedAtIso: isoNow()
    }
  });
}

function handleSelectionDecisionStub(opportunityId, body, event) {
  const validationError = validateDecisionPayload(body, ['approve', 'reject', 'needs_review']);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  return response(200, {
    opportunityId,
    stage: 'selection',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy: resolveSubmittedBy(event, {}),
    decidedAtIso: isoNow()
  });
}

function handleWorkflowStubRoute(event, route) {
  const body = parseRequestBody(event);
  if (body === null) {
    return errorResponse(400, 'bad_request', 'Request body must be valid JSON.');
  }

  if (route.stage === 'triage' && route.action === 'run') {
    return handleTriageRunStub(route.opportunityId, body);
  }

  if (route.stage === 'triage' && route.action === 'decision') {
    return handleTriageDecisionStub(route.opportunityId, body, event);
  }

  if (route.stage === 'qualification' && route.action === 'run') {
    return handleQualificationRunStub(route.opportunityId, body);
  }

  if (route.stage === 'qualification' && route.action === 'decision') {
    return handleQualificationDecisionStub(route.opportunityId, body, event);
  }

  if (route.stage === 'selection' && route.action === 'compare') {
    return handleSelectionCompareStub(route.opportunityId, body);
  }

  if (route.stage === 'selection' && route.action === 'decision') {
    return handleSelectionDecisionStub(route.opportunityId, body, event);
  }

  return errorResponse(404, 'not_found', 'Workflow route is not supported.');
}

async function handleSubmit(event, payload) {
  const submittedAtIso = payload.submittedAtIso || new Date().toISOString();
  const submissionId = crypto.randomUUID();
  const tenantId = resolveTenantId(event);
  const recommendation = normalizeRecommendation(payload);
  const submittedBy = resolveSubmittedBy(event, payload);
  const status = normalizeSubmissionStatus(recommendation);

  const item = {
    tenant_key: `TENANT#${tenantId}`,
    submission_key: `SUBMISSION#${submittedAtIso}#${submissionId}`,
    review_queue_key: `QUEUE#${status}`,
    review_queue_sort_key: `${submittedAtIso}#TENANT#${tenantId}#SUBMISSION#${submissionId}`,
    submitted_by_key: `USER#${submittedBy}`,
    submitted_by_sort_key: `${submittedAtIso}#TENANT#${tenantId}#SUBMISSION#${submissionId}`,
    entityType: 'proposal_submission',
    tenantId,
    submissionId,
    submittedAtIso,
    submittedBy,
    recommendation,
    status,
    projectName: payload.state.source?.projectName || '',
    projectNumber: payload.state.source?.projectNumber || '',
    reasonCodes: payload.decisionPacket.reasonCodes || [],
    blockerCount: Array.isArray(payload.decisionPacket.blockers) ? payload.decisionPacket.blockers.length : 0,
    decisionPacket: payload.decisionPacket,
    decisionPreview: payload.decisionPreview,
    wizardStateSnapshot: payload.state,
    updatedAtIso: submittedAtIso
  };

  console.log(JSON.stringify({
    event: 'proposal_submission_request',
    submissionId,
    tenantId,
    username: submittedBy,
    recommendation,
    status,
    submittedAtIso
  }));

  await client.send(new PutCommand({
    TableName: tableName,
    Item: item,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  console.log(JSON.stringify({
    event: 'proposal_submission_stored',
    submissionId,
    tenantId,
    username: submittedBy
  }));

  return response(201, {
    submissionId,
    status: 'submitted',
    reviewQueue: 'tenant-review',
    recommendation,
    submittedAtIso
  });
}

async function handleRecentSubmissions(event) {
  const tenantId = resolveTenantId(event);
  const limit = parseLimit(event);

  const queryResult = await client.send(new QueryCommand({
    TableName: tableName,
    KeyConditionExpression: 'tenant_key = :tenantKey',
    ExpressionAttributeValues: {
      ':tenantKey': `TENANT#${tenantId}`
    },
    ScanIndexForward: false,
    Limit: limit
  }));

  const submissions = (queryResult.Items || []).map(mapRecentSubmission);

  console.log(JSON.stringify({
    event: 'proposal_submission_recent_query',
    tenantId,
    username: resolveSubmittedBy(event, {}),
    resultCount: submissions.length,
    limit
  }));

  return response(200, {
    tenantId,
    count: submissions.length,
    submissions
  });
}

export const handler = async (event) => {
  if (!tableName) {
    return response(500, { message: 'Submission table is not configured.' });
  }

  const method = event.requestContext?.http?.method || '';
  const path = event.requestContext?.http?.path || event.rawPath || '';

  const workflowRoute = parseWorkflowRoute(method, path);
  if (workflowRoute) {
    if (!workflowStubMode) {
      return errorResponse(501, 'not_implemented', 'Workflow route is not implemented yet.');
    }

    return handleWorkflowStubRoute(event, workflowRoute);
  }

  if (method === 'GET' && path.endsWith('/api/proposals/wizard/submissions/recent')) {
    try {
      return await handleRecentSubmissions(event);
    } catch (error) {
      console.error(JSON.stringify({
        event: 'proposal_submission_recent_query_failed',
        tenantId: resolveTenantId(event),
        username: resolveSubmittedBy(event, {}),
        error: toStructuredError(error)
      }));
      return response(500, { message: 'Unable to load recent submissions.' });
    }
  }

  if (method !== 'POST') {
    return response(404, { message: 'Not found.' });
  }

  let payload;
  try {
    payload = event.body ? JSON.parse(event.body) : null;
  } catch {
    return response(400, { message: 'Request body must be valid JSON.' });
  }

  if (!payload?.state || !payload?.decisionPacket || !payload?.decisionPreview) {
    return response(400, { message: 'Submission payload is missing required fields.' });
  }

  try {
    return await handleSubmit(event, payload);
  } catch (error) {
    console.error(JSON.stringify({
      event: 'proposal_submission_store_failed',
      tenantId: resolveTenantId(event),
      username: resolveSubmittedBy(event, payload),
      error: toStructuredError(error)
    }));
    return response(500, { message: 'Unable to store submission.' });
  }
};
