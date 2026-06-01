import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

function resolveSubmittedBy(event) {
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

  return 'unknown';
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

function parseIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null;
  }

  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) {
    return null;
  }

  return dt;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function toRiskWeight(dueDateRisk) {
  if (dueDateRisk === 'high') {
    return 0.2;
  }

  if (dueDateRisk === 'medium') {
    return 0.5;
  }

  return 0.8;
}

function computeDueDateRisk(bidDueDateIso) {
  const bidDueDate = parseIsoDate(bidDueDateIso);
  if (!bidDueDate) {
    return {
      dueDateRisk: 'unknown',
      daysUntilDue: null
    };
  }

  const msUntilDue = bidDueDate.getTime() - Date.now();
  const daysUntilDue = Math.floor(msUntilDue / (24 * 60 * 60 * 1000));

  if (daysUntilDue <= 7) {
    return {
      dueDateRisk: 'high',
      daysUntilDue
    };
  }

  if (daysUntilDue <= 21) {
    return {
      dueDateRisk: 'medium',
      daysUntilDue
    };
  }

  return {
    dueDateRisk: 'low',
    daysUntilDue
  };
}

function computeManufacturerFit(representedManufacturer, approvedManufacturers) {
  if (!Array.isArray(approvedManufacturers) || approvedManufacturers.length === 0) {
    return 'unknown';
  }

  const represented = representedManufacturer.trim().toLowerCase();
  const approved = approvedManufacturers
    .filter((value) => typeof value === 'string')
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);

  if (approved.includes(represented)) {
    return 'fit';
  }

  const partialMatch = approved.some((value) => value.includes(represented) || represented.includes(value));
  return partialMatch ? 'partial' : 'conflict';
}

function normalizeBodFitScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return null;
  }

  return clamp(value, 0, 1);
}

function buildTriageEvaluation(body) {
  const { dueDateRisk, daysUntilDue } = computeDueDateRisk(body.bidDueDateIso);
  const manufacturerFit = computeManufacturerFit(body.representedManufacturer, body.approvedManufacturers);
  const bodFitScore = normalizeBodFitScore(body.bodFitScoreHint) ?? (manufacturerFit === 'fit' ? 0.78 : manufacturerFit === 'partial' ? 0.62 : 0.5);
  const dueDateWeight = dueDateRisk === 'unknown' ? 0.55 : toRiskWeight(dueDateRisk);
  const incumbentBoost = body.isIncumbentProject === true ? 0.08 : 0;
  const strategicBoost = body.isStrategicCustomer === true ? 0.06 : 0;

  const winProbabilityRaw = (0.5 * bodFitScore) + (0.4 * dueDateWeight) + incumbentBoost + strategicBoost;
  const winProbability = clamp(Number.parseFloat(winProbabilityRaw.toFixed(2)), 0, 0.98);
  const confidence = clamp(Number.parseFloat((0.5 + (bodFitScore * 0.3) + (dueDateRisk === 'unknown' ? 0 : 0.12)).toFixed(2)), 0.45, 0.92);

  const reasonCodes = [];
  const blockers = [];

  if (manufacturerFit === 'fit') {
    reasonCodes.push('MANUFACTURER_FIT');
  } else if (manufacturerFit === 'partial') {
    reasonCodes.push('BOD_PARTIAL_MATCH');
  } else if (manufacturerFit === 'conflict') {
    reasonCodes.push('MANUFACTURER_CONFLICT');
    blockers.push('Represented manufacturer conflicts with approved manufacturer list.');
  } else {
    reasonCodes.push('MANUFACTURER_UNKNOWN');
  }

  if (dueDateRisk === 'high') {
    reasonCodes.push('DUE_DATE_NEAR');
    blockers.push('Bid due date is within 7 days.');
  } else if (dueDateRisk === 'medium') {
    reasonCodes.push('DUE_DATE_TIGHT');
  }

  if (body.isIncumbentProject === true) {
    reasonCodes.push('INCUMBENT_ADVANTAGE');
  }

  let recommendation = 'needs_review';
  if (manufacturerFit === 'conflict' || winProbability < 0.45) {
    recommendation = 'pass';
  } else if (winProbability >= 0.7 && dueDateRisk !== 'high') {
    recommendation = 'pursue';
  }

  return {
    recommendation,
    winProbability,
    bodFitScore,
    dueDateRisk,
    manufacturerFit,
    confidence,
    reasonCodes,
    blockers,
    generatedAtIso: isoNow(),
    generatedBy: 'triage-engine-v1',
    daysUntilDue
  };
}

function validateTriageRunPayload(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }

  if (typeof body.documentBundleId !== 'string' || !body.documentBundleId.trim()) {
    return 'documentBundleId is required.';
  }

  if (typeof body.representedManufacturer !== 'string' || !body.representedManufacturer.trim()) {
    return 'representedManufacturer is required.';
  }

  if (body.bidDueDateIso !== undefined && !parseIsoDate(body.bidDueDateIso)) {
    return 'bidDueDateIso must be a valid ISO date string when provided.';
  }

  if (body.bodFitScoreHint !== undefined && (typeof body.bodFitScoreHint !== 'number' || Number.isNaN(body.bodFitScoreHint))) {
    return 'bodFitScoreHint must be a number between 0 and 1 when provided.';
  }

  return null;
}

function buildTriagePrioritySort(triage) {
  const priorityScore = clamp((triage.winProbability * 0.7) + (triage.bodFitScore * 0.3), 0, 1);
  const inverted = String(1000 - Math.round(priorityScore * 1000)).padStart(4, '0');
  return `${inverted}#${triage.generatedAtIso}`;
}

async function persistTriageRun(event, opportunityId, body, triage) {
  const tenantId = resolveTenantId(event);
  const username = resolveSubmittedBy(event);
  const generatedAtIso = triage.generatedAtIso;
  const opportunityKey = `OPPORTUNITY#${opportunityId}`;
  const triageQueueKey = `TRIAGE#${triage.recommendation}`;
  const triagePrioritySort = buildTriagePrioritySort(triage);

  const stageItem = {
    tenant_key: `TENANT#${tenantId}`,
    submission_key: `${opportunityKey}#STAGE#triage#TS#${generatedAtIso}`,
    entityType: 'workflow_stage_output',
    tenantId,
    opportunityId,
    stage: 'triage',
    opportunity_key: opportunityKey,
    stage_updated_at: `triage#${generatedAtIso}`,
    triage_queue_key: triageQueueKey,
    triage_priority_sort: triagePrioritySort,
    request: {
      documentBundleId: body.documentBundleId,
      representedManufacturer: body.representedManufacturer,
      bidDueDateIso: body.bidDueDateIso ?? null,
      bodFitScoreHint: body.bodFitScoreHint ?? null,
      isIncumbentProject: body.isIncumbentProject === true,
      isStrategicCustomer: body.isStrategicCustomer === true
    },
    triage,
    updatedAtIso: generatedAtIso,
    createdBy: username
  };

  await client.send(new PutCommand({
    TableName: tableName,
    Item: stageItem,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: {
      tenant_key: `TENANT#${tenantId}`,
      submission_key: opportunityKey
    },
    UpdateExpression: 'SET entityType = :entityType, tenantId = :tenantId, opportunityId = :opportunityId, opportunity_key = :opportunityKey, stage = :stage, stage_updated_at = :stageUpdatedAt, latestTriage = :latestTriage, triage_queue_key = :triageQueueKey, triage_priority_sort = :triagePrioritySort, updatedAtIso = :updatedAtIso',
    ExpressionAttributeValues: {
      ':entityType': 'workflow_summary',
      ':tenantId': tenantId,
      ':opportunityId': opportunityId,
      ':opportunityKey': opportunityKey,
      ':stage': 'triage',
      ':stageUpdatedAt': `triage#${generatedAtIso}`,
      ':latestTriage': triage,
      ':triageQueueKey': triageQueueKey,
      ':triagePrioritySort': triagePrioritySort,
      ':updatedAtIso': generatedAtIso
    }
  }));

  return {
    tenantId,
    username
  };
}

async function persistTriageDecision(event, opportunityId, body) {
  const tenantId = resolveTenantId(event);
  const decidedBy = resolveSubmittedBy(event);
  const decidedAtIso = isoNow();
  const opportunityKey = `OPPORTUNITY#${opportunityId}`;

  const decisionItem = {
    tenant_key: `TENANT#${tenantId}`,
    submission_key: `${opportunityKey}#DECISION#triage#TS#${decidedAtIso}`,
    entityType: 'workflow_stage_decision',
    tenantId,
    opportunityId,
    stage: 'triage',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy,
    decidedAtIso,
    updatedAtIso: decidedAtIso
  };

  await client.send(new PutCommand({
    TableName: tableName,
    Item: decisionItem,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: {
      tenant_key: `TENANT#${tenantId}`,
      submission_key: opportunityKey
    },
    UpdateExpression: 'SET latestTriageDecision = :decisionObj, updatedAtIso = :updatedAtIso',
    ExpressionAttributeValues: {
      ':decisionObj': {
        decision: body.decision,
        rationale: body.rationale.trim(),
        decidedBy,
        decidedAtIso
      },
      ':updatedAtIso': decidedAtIso
    }
  }));

  return {
    tenantId,
    decidedBy,
    decidedAtIso
  };
}

async function handleTriageRun(opportunityId, body, event) {
  const validationError = validateTriageRunPayload(body);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  const triage = buildTriageEvaluation(body);

  try {
    const { tenantId, username } = await persistTriageRun(event, opportunityId, body, triage);
    console.log(JSON.stringify({
      event: 'workflow_triage_run_stored',
      tenantId,
      opportunityId,
      recommendation: triage.recommendation,
      confidence: triage.confidence,
      blockerCount: triage.blockers.length,
      username
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'workflow_triage_run_store_failed',
      tenantId: resolveTenantId(event),
      opportunityId,
      username: resolveSubmittedBy(event),
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to store triage result.');
  }

  return response(200, {
    opportunityId,
    triage: {
      recommendation: triage.recommendation,
      winProbability: triage.winProbability,
      bodFitScore: triage.bodFitScore,
      dueDateRisk: triage.dueDateRisk,
      manufacturerFit: triage.manufacturerFit,
      confidence: triage.confidence,
      reasonCodes: triage.reasonCodes,
      blockers: triage.blockers,
      generatedAtIso: triage.generatedAtIso,
      generatedBy: triage.generatedBy
    }
  });
}

async function handleTriageDecision(opportunityId, body, event) {
  const validationError = validateDecisionPayload(body, ['pursue', 'pass', 'needs_review']);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  let decisionMeta;
  try {
    decisionMeta = await persistTriageDecision(event, opportunityId, body);
    console.log(JSON.stringify({
      event: 'workflow_triage_decision_stored',
      tenantId: decisionMeta.tenantId,
      opportunityId,
      decision: body.decision,
      username: decisionMeta.decidedBy
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'workflow_triage_decision_store_failed',
      tenantId: resolveTenantId(event),
      opportunityId,
      username: resolveSubmittedBy(event),
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to store triage decision.');
  }

  return response(200, {
    opportunityId,
    stage: 'triage',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy: decisionMeta.decidedBy,
    decidedAtIso: decisionMeta.decidedAtIso
  });
}

function normalizeManufacturers(manufacturers) {
  if (!Array.isArray(manufacturers)) {
    return [];
  }

  return manufacturers
    .filter((item) => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item, index, array) => item.length > 0 && array.indexOf(item) === index);
}

function normalizeCitations(citations) {
  if (!Array.isArray(citations)) {
    return [];
  }

  return citations
    .filter((item) => item && typeof item === 'object')
    .map((item) => ({
      claimId: typeof item.claimId === 'string' ? item.claimId.trim() : '',
      sourceDocumentId: typeof item.sourceDocumentId === 'string' ? item.sourceDocumentId.trim() : '',
      pageNumber: Number.isInteger(item.pageNumber) ? item.pageNumber : null,
      snippet: typeof item.snippet === 'string' ? item.snippet.trim() : '',
      confidence: typeof item.confidence === 'number' && !Number.isNaN(item.confidence)
        ? clamp(item.confidence, 0, 1)
        : null
    }))
    .filter((item) => item.claimId && item.sourceDocumentId && item.pageNumber !== null && item.snippet && item.confidence !== null);
}

function validateQualificationRunPayload(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }

  if (typeof body.documentBundleId !== 'string' || !body.documentBundleId.trim()) {
    return 'documentBundleId is required.';
  }

  if (typeof body.representedManufacturer !== 'string' || !body.representedManufacturer.trim()) {
    return 'representedManufacturer is required.';
  }

  if (!Array.isArray(body.approvedManufacturers)) {
    return 'approvedManufacturers must be an array.';
  }

  if (body.requiresCitations !== undefined && typeof body.requiresCitations !== 'boolean') {
    return 'requiresCitations must be a boolean when provided.';
  }

  if (body.citations !== undefined && !Array.isArray(body.citations)) {
    return 'citations must be an array when provided.';
  }

  return null;
}

function buildQualificationEvaluation(body) {
  const representedManufacturer = body.representedManufacturer.trim();
  const detectedManufacturers = normalizeManufacturers(body.approvedManufacturers);
  const normalizedCitations = normalizeCitations(body.citations);
  const requiresCitations = body.requiresCitations === true;

  const representedLower = representedManufacturer.toLowerCase();
  const hasOverlap = detectedManufacturers.some((item) => item.toLowerCase() === representedLower);
  const overlapStatus = detectedManufacturers.length === 0 ? 'unknown' : (hasOverlap ? 'eligible' : 'conflict');

  const policyChecks = [
    {
      code: 'MANUFACTURER_OVERLAP',
      status: hasOverlap ? 'pass' : 'fail',
      message: hasOverlap
        ? 'Represented manufacturer is present in approved manufacturer list.'
        : 'Represented manufacturer is not present in approved manufacturer list.'
    }
  ];

  const reasonCodes = [];
  const blockers = [];

  if (hasOverlap) {
    reasonCodes.push('MANUFACTURER_MATCH');
  } else {
    reasonCodes.push('MANUFACTURER_CONFLICT');
    blockers.push('Represented manufacturer missing from approved manufacturer list.');
  }

  if (requiresCitations) {
    if (normalizedCitations.length > 0) {
      policyChecks.push({
        code: 'CITATION_COVERAGE',
        status: 'pass',
        message: 'Required citations are present.'
      });
      reasonCodes.push('CITATION_COVERAGE_OK');
    } else {
      policyChecks.push({
        code: 'CITATION_COVERAGE',
        status: 'fail',
        message: 'Citations are required but were not provided.'
      });
      reasonCodes.push('CITATION_GAP');
      blockers.push('Required citations are missing.');
    }
  } else if (normalizedCitations.length > 0) {
    policyChecks.push({
      code: 'CITATION_COVERAGE',
      status: 'warning',
      message: 'Citations provided and accepted as advisory evidence.'
    });
  }

  const baseConfidence = hasOverlap ? 0.78 : 0.52;
  const citationBoost = normalizedCitations.length > 0 ? 0.08 : 0;
  const confidence = clamp(Number.parseFloat((baseConfidence + citationBoost).toFixed(2)), 0.45, 0.95);

  let recommendation = 'needs_review';
  if (!hasOverlap) {
    recommendation = 'no_go';
  } else if (!requiresCitations || normalizedCitations.length > 0) {
    recommendation = 'go';
  }

  return {
    recommendation,
    confidence,
    representedManufacturer,
    detectedManufacturers,
    overlapStatus,
    policyChecks,
    citations: normalizedCitations,
    reasonCodes,
    blockers,
    generatedAtIso: isoNow(),
    generatedBy: 'qualification-engine-v1'
  };
}

async function persistQualificationRun(event, opportunityId, body, qualification) {
  const tenantId = resolveTenantId(event);
  const username = resolveSubmittedBy(event);
  const generatedAtIso = qualification.generatedAtIso;
  const opportunityKey = `OPPORTUNITY#${opportunityId}`;

  const stageItem = {
    tenant_key: `TENANT#${tenantId}`,
    submission_key: `${opportunityKey}#STAGE#qualification#TS#${generatedAtIso}`,
    entityType: 'workflow_stage_output',
    tenantId,
    opportunityId,
    stage: 'qualification',
    opportunity_key: opportunityKey,
    stage_updated_at: `qualification#${generatedAtIso}`,
    request: {
      documentBundleId: body.documentBundleId,
      representedManufacturer: body.representedManufacturer,
      approvedManufacturers: normalizeManufacturers(body.approvedManufacturers),
      requiresCitations: body.requiresCitations === true
    },
    qualification,
    updatedAtIso: generatedAtIso,
    createdBy: username
  };

  await client.send(new PutCommand({
    TableName: tableName,
    Item: stageItem,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: {
      tenant_key: `TENANT#${tenantId}`,
      submission_key: opportunityKey
    },
    UpdateExpression: 'SET entityType = :entityType, tenantId = :tenantId, opportunityId = :opportunityId, opportunity_key = :opportunityKey, stage = :stage, stage_updated_at = :stageUpdatedAt, latestQualification = :latestQualification, updatedAtIso = :updatedAtIso',
    ExpressionAttributeValues: {
      ':entityType': 'workflow_summary',
      ':tenantId': tenantId,
      ':opportunityId': opportunityId,
      ':opportunityKey': opportunityKey,
      ':stage': 'qualification',
      ':stageUpdatedAt': `qualification#${generatedAtIso}`,
      ':latestQualification': qualification,
      ':updatedAtIso': generatedAtIso
    }
  }));

  return {
    tenantId,
    username
  };
}

async function persistQualificationDecision(event, opportunityId, body) {
  const tenantId = resolveTenantId(event);
  const decidedBy = resolveSubmittedBy(event);
  const decidedAtIso = isoNow();
  const opportunityKey = `OPPORTUNITY#${opportunityId}`;

  const decisionItem = {
    tenant_key: `TENANT#${tenantId}`,
    submission_key: `${opportunityKey}#DECISION#qualification#TS#${decidedAtIso}`,
    entityType: 'workflow_stage_decision',
    tenantId,
    opportunityId,
    stage: 'qualification',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy,
    decidedAtIso,
    updatedAtIso: decidedAtIso
  };

  await client.send(new PutCommand({
    TableName: tableName,
    Item: decisionItem,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: {
      tenant_key: `TENANT#${tenantId}`,
      submission_key: opportunityKey
    },
    UpdateExpression: 'SET latestQualificationDecision = :decisionObj, updatedAtIso = :updatedAtIso',
    ExpressionAttributeValues: {
      ':decisionObj': {
        decision: body.decision,
        rationale: body.rationale.trim(),
        decidedBy,
        decidedAtIso
      },
      ':updatedAtIso': decidedAtIso
    }
  }));

  return {
    tenantId,
    decidedBy,
    decidedAtIso
  };
}

async function handleQualificationRun(opportunityId, body, event) {
  const validationError = validateQualificationRunPayload(body);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  const qualification = buildQualificationEvaluation(body);

  try {
    const { tenantId, username } = await persistQualificationRun(event, opportunityId, body, qualification);
    console.log(JSON.stringify({
      event: 'workflow_qualification_run_stored',
      tenantId,
      opportunityId,
      recommendation: qualification.recommendation,
      confidence: qualification.confidence,
      blockerCount: qualification.blockers.length,
      username
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'workflow_qualification_run_store_failed',
      tenantId: resolveTenantId(event),
      opportunityId,
      username: resolveSubmittedBy(event),
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to store qualification result.');
  }

  return response(200, {
    opportunityId,
    qualification: {
      recommendation: qualification.recommendation,
      confidence: qualification.confidence,
      representedManufacturer: qualification.representedManufacturer,
      detectedManufacturers: qualification.detectedManufacturers,
      overlapStatus: qualification.overlapStatus,
      policyChecks: qualification.policyChecks,
      citations: qualification.citations,
      reasonCodes: qualification.reasonCodes,
      blockers: qualification.blockers,
      generatedAtIso: qualification.generatedAtIso
    }
  });
}

async function handleQualificationDecision(opportunityId, body, event) {
  const validationError = validateDecisionPayload(body, ['go', 'no_go', 'needs_review']);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  let decisionMeta;
  try {
    decisionMeta = await persistQualificationDecision(event, opportunityId, body);
    console.log(JSON.stringify({
      event: 'workflow_qualification_decision_stored',
      tenantId: decisionMeta.tenantId,
      opportunityId,
      decision: body.decision,
      username: decisionMeta.decidedBy
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'workflow_qualification_decision_store_failed',
      tenantId: resolveTenantId(event),
      opportunityId,
      username: resolveSubmittedBy(event),
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to store qualification decision.');
  }

  return response(200, {
    opportunityId,
    stage: 'qualification',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy: decisionMeta.decidedBy,
    decidedAtIso: decisionMeta.decidedAtIso
  });
}

function normalizeSelectionDeltas(deltas) {
  if (!Array.isArray(deltas)) {
    return [];
  }

  return deltas
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const field = typeof item.field === 'string' ? item.field.trim() : '';
      const toolPathValue = typeof item.toolPathValue === 'string'
        ? item.toolPathValue.trim()
        : item.toolPathValue === undefined || item.toolPathValue === null
          ? ''
          : String(item.toolPathValue);
      const manufacturerValue = typeof item.manufacturerValue === 'string'
        ? item.manufacturerValue.trim()
        : item.manufacturerValue === undefined || item.manufacturerValue === null
          ? ''
          : String(item.manufacturerValue);
      const severity = ['info', 'warning', 'critical'].includes(item.severity) ? item.severity : 'warning';
      const rationale = typeof item.rationale === 'string' && item.rationale.trim()
        ? item.rationale.trim()
        : `${field || 'attribute'} differs between tool-path and manufacturer-path values.`;
      const citations = normalizeCitations(item.citations);

      return {
        field,
        toolPathValue,
        manufacturerValue,
        severity,
        rationale,
        citations
      };
    })
    .filter((item) => item.field && item.toolPathValue && item.manufacturerValue && item.toolPathValue !== item.manufacturerValue);
}

function validateSelectionComparePayload(body) {
  if (!body || typeof body !== 'object') {
    return 'Request body is required.';
  }

  const rawToolPathModel =
    (typeof body.toolPathModel === 'string' && body.toolPathModel.trim())
      ? body.toolPathModel.trim()
      : ((typeof body.recommendedToolPathModel === 'string' && body.recommendedToolPathModel.trim())
        ? body.recommendedToolPathModel.trim()
        : '');

  if (!rawToolPathModel) {
    return 'toolPathModel or recommendedToolPathModel is required.';
  }

  if (typeof body.manufacturerPathModel !== 'string' || !body.manufacturerPathModel.trim()) {
    return 'manufacturerPathModel is required.';
  }

  if (body.deltas !== undefined && !Array.isArray(body.deltas)) {
    return 'deltas must be an array when provided.';
  }

  return null;
}

function buildSelectionEvaluation(body) {
  const toolPathModel =
    (typeof body.toolPathModel === 'string' && body.toolPathModel.trim())
      ? body.toolPathModel.trim()
      : body.recommendedToolPathModel.trim();
  const manufacturerPathModel = body.manufacturerPathModel.trim();
  const modelAligned = toolPathModel.toLowerCase() === manufacturerPathModel.toLowerCase();
  const normalizedDeltas = normalizeSelectionDeltas(body.deltas);
  const deltas = [...normalizedDeltas];

  if (!modelAligned) {
    deltas.unshift({
      field: 'model',
      toolPathValue: toolPathModel,
      manufacturerValue: manufacturerPathModel,
      severity: 'critical',
      rationale: 'Manufacturer path model differs from tool-path recommendation.',
      citations: []
    });
  }

  const hasCritical = deltas.some((item) => item.severity === 'critical');
  const overallStatus = deltas.length === 0
    ? 'aligned'
    : (hasCritical ? 'needs_review' : 'mismatch');
  const reasonCodes = deltas.length === 0 ? ['MODEL_ALIGNED'] : ['MODEL_MISMATCH'];
  const blockers = hasCritical
    ? ['Critical model mismatch requires reviewer approval before final selection.']
    : [];
  const confidenceBase = deltas.length === 0 ? 0.86 : (hasCritical ? 0.57 : 0.66);
  const confidence = clamp(Number.parseFloat(confidenceBase.toFixed(2)), 0.45, 0.95);

  return {
    toolPathModel,
    manufacturerPathModel,
    overallStatus,
    confidence,
    deltas,
    reasonCodes,
    blockers,
    generatedAtIso: isoNow(),
    generatedBy: 'selection-engine-v1'
  };
}

async function persistSelectionCompare(event, opportunityId, body, selection) {
  const tenantId = resolveTenantId(event);
  const username = resolveSubmittedBy(event);
  const generatedAtIso = selection.generatedAtIso;
  const opportunityKey = `OPPORTUNITY#${opportunityId}`;

  const stageItem = {
    tenant_key: `TENANT#${tenantId}`,
    submission_key: `${opportunityKey}#STAGE#selection#TS#${generatedAtIso}`,
    entityType: 'workflow_stage_output',
    tenantId,
    opportunityId,
    stage: 'selection',
    opportunity_key: opportunityKey,
    stage_updated_at: `selection#${generatedAtIso}`,
    request: {
      toolPathModel: selection.toolPathModel,
      manufacturerPathModel: selection.manufacturerPathModel,
      notes: typeof body.notes === 'string' ? body.notes.trim() : ''
    },
    selection,
    updatedAtIso: generatedAtIso,
    createdBy: username
  };

  await client.send(new PutCommand({
    TableName: tableName,
    Item: stageItem,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: {
      tenant_key: `TENANT#${tenantId}`,
      submission_key: opportunityKey
    },
    UpdateExpression: 'SET entityType = :entityType, tenantId = :tenantId, opportunityId = :opportunityId, opportunity_key = :opportunityKey, stage = :stage, stage_updated_at = :stageUpdatedAt, latestSelection = :latestSelection, updatedAtIso = :updatedAtIso',
    ExpressionAttributeValues: {
      ':entityType': 'workflow_summary',
      ':tenantId': tenantId,
      ':opportunityId': opportunityId,
      ':opportunityKey': opportunityKey,
      ':stage': 'selection',
      ':stageUpdatedAt': `selection#${generatedAtIso}`,
      ':latestSelection': selection,
      ':updatedAtIso': generatedAtIso
    }
  }));

  return {
    tenantId,
    username
  };
}

async function persistSelectionDecision(event, opportunityId, body) {
  const tenantId = resolveTenantId(event);
  const decidedBy = resolveSubmittedBy(event);
  const decidedAtIso = isoNow();
  const opportunityKey = `OPPORTUNITY#${opportunityId}`;

  const decisionItem = {
    tenant_key: `TENANT#${tenantId}`,
    submission_key: `${opportunityKey}#DECISION#selection#TS#${decidedAtIso}`,
    entityType: 'workflow_stage_decision',
    tenantId,
    opportunityId,
    stage: 'selection',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy,
    decidedAtIso,
    updatedAtIso: decidedAtIso
  };

  await client.send(new PutCommand({
    TableName: tableName,
    Item: decisionItem,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  await client.send(new UpdateCommand({
    TableName: tableName,
    Key: {
      tenant_key: `TENANT#${tenantId}`,
      submission_key: opportunityKey
    },
    UpdateExpression: 'SET latestSelectionDecision = :decisionObj, updatedAtIso = :updatedAtIso',
    ExpressionAttributeValues: {
      ':decisionObj': {
        decision: body.decision,
        rationale: body.rationale.trim(),
        decidedBy,
        decidedAtIso
      },
      ':updatedAtIso': decidedAtIso
    }
  }));

  return {
    tenantId,
    decidedBy,
    decidedAtIso
  };
}

async function handleSelectionCompare(opportunityId, body, event) {
  const validationError = validateSelectionComparePayload(body);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  const selection = buildSelectionEvaluation(body);

  try {
    const { tenantId, username } = await persistSelectionCompare(event, opportunityId, body, selection);
    console.log(JSON.stringify({
      event: 'workflow_selection_compare_stored',
      tenantId,
      opportunityId,
      overallStatus: selection.overallStatus,
      confidence: selection.confidence,
      deltaCount: selection.deltas.length,
      username
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'workflow_selection_compare_store_failed',
      tenantId: resolveTenantId(event),
      opportunityId,
      username: resolveSubmittedBy(event),
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to store selection comparison.');
  }

  return response(200, {
    opportunityId,
    selection: {
      toolPathModel: selection.toolPathModel,
      manufacturerPathModel: selection.manufacturerPathModel,
      overallStatus: selection.overallStatus,
      confidence: selection.confidence,
      deltas: selection.deltas,
      reasonCodes: selection.reasonCodes,
      blockers: selection.blockers,
      generatedAtIso: selection.generatedAtIso
    }
  });
}

async function handleSelectionDecision(opportunityId, body, event) {
  const validationError = validateDecisionPayload(body, ['approve', 'reject', 'needs_review']);
  if (validationError) {
    return errorResponse(400, 'validation_failed', validationError);
  }

  let decisionMeta;
  try {
    decisionMeta = await persistSelectionDecision(event, opportunityId, body);
    console.log(JSON.stringify({
      event: 'workflow_selection_decision_stored',
      tenantId: decisionMeta.tenantId,
      opportunityId,
      decision: body.decision,
      username: decisionMeta.decidedBy
    }));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'workflow_selection_decision_store_failed',
      tenantId: resolveTenantId(event),
      opportunityId,
      username: resolveSubmittedBy(event),
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to store selection decision.');
  }

  return response(200, {
    opportunityId,
    stage: 'selection',
    decision: body.decision,
    rationale: body.rationale.trim(),
    decidedBy: decisionMeta.decidedBy,
    decidedAtIso: decisionMeta.decidedAtIso
  });
}

function handleWorkflowStubRoute(event, route) {
  const body = parseRequestBody(event);
  if (body === null) {
    return errorResponse(400, 'bad_request', 'Request body must be valid JSON.');
  }

  if (route.stage === 'selection' && route.action === 'compare') {
    return handleSelectionCompare(route.opportunityId, body, event);
  }

  if (route.stage === 'selection' && route.action === 'decision') {
    return handleSelectionDecision(route.opportunityId, body, event);
  }

  return errorResponse(404, 'not_found', 'Workflow route is not supported.');
}

async function handleWorkflowRoute(event, route) {
  const body = parseRequestBody(event);
  if (body === null) {
    return errorResponse(400, 'bad_request', 'Request body must be valid JSON.');
  }

  if (route.stage === 'triage' && route.action === 'run') {
    return handleTriageRun(route.opportunityId, body, event);
  }

  if (route.stage === 'triage' && route.action === 'decision') {
    return handleTriageDecision(route.opportunityId, body, event);
  }

  if (route.stage === 'qualification' && route.action === 'run') {
    return handleQualificationRun(route.opportunityId, body, event);
  }

  if (route.stage === 'qualification' && route.action === 'decision') {
    return handleQualificationDecision(route.opportunityId, body, event);
  }

  if (route.stage === 'selection' && route.action === 'compare') {
    return handleSelectionCompare(route.opportunityId, body, event);
  }

  if (route.stage === 'selection' && route.action === 'decision') {
    return handleSelectionDecision(route.opportunityId, body, event);
  }

  if (!workflowStubMode) {
    return errorResponse(404, 'not_found', 'Workflow route is not supported.');
  }

  return handleWorkflowStubRoute(event, route);
}

export const handler = async (event) => {
  if (!tableName) {
    return response(500, { message: 'Submission table is not configured.' });
  }

  const method = event.requestContext?.http?.method || '';
  const path = event.requestContext?.http?.path || event.rawPath || '';

  const workflowRoute = parseWorkflowRoute(method, path);
  if (!workflowRoute) {
    return response(404, { message: 'Not found.' });
  }

  return handleWorkflowRoute(event, workflowRoute);
};
