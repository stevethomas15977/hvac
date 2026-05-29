import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.PROPOSAL_SUBMISSIONS_TABLE;
const defaultTenantId = process.env.PROPOSAL_DEFAULT_TENANT_ID || 'development';

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  };
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
