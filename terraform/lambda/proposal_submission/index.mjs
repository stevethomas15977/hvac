import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

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

export const handler = async (event) => {
  if (!tableName) {
    return response(500, { message: 'Submission table is not configured.' });
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

  const submittedAtIso = payload.submittedAtIso || new Date().toISOString();
  const submissionId = crypto.randomUUID();
  const tenantId = resolveTenantId(event);
  const recommendation = normalizeRecommendation(payload);
  const submittedBy = resolveSubmittedBy(event, payload);
  const status = recommendation === 'needs_review' ? 'needs_review' : 'submitted';

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

  await client.send(new PutCommand({
    TableName: tableName,
    Item: item,
    ConditionExpression: 'attribute_not_exists(tenant_key) AND attribute_not_exists(submission_key)'
  }));

  return response(201, {
    submissionId,
    status: 'submitted',
    reviewQueue: 'tenant-review',
    recommendation,
    submittedAtIso
  });
};
