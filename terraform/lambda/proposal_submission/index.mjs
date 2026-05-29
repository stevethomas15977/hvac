import crypto from 'node:crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const tableName = process.env.PROPOSAL_SUBMISSIONS_TABLE;

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

function resolveTenantId(event) {
  const claimTenant = event.requestContext?.authorizer?.jwt?.claims?.['custom:tenant_id'];
  const headerTenant = event.headers?.['x-tenant-id'] ?? event.headers?.['X-Tenant-Id'];
  return claimTenant || headerTenant || 'development';
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
  const submittedBy = payload.submittedBy || 'unknown';
  const status = recommendation === 'needs_review' ? 'needs_review' : 'submitted';

  const item = {
    pk: `TENANT#${tenantId}`,
    sk: `SUBMISSION#${submittedAtIso}#${submissionId}`,
    gsi1pk: `QUEUE#${status}`,
    gsi1sk: `${submittedAtIso}#TENANT#${tenantId}#SUBMISSION#${submissionId}`,
    gsi2pk: `USER#${submittedBy}`,
    gsi2sk: `${submittedAtIso}#TENANT#${tenantId}#SUBMISSION#${submissionId}`,
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
    ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
  }));

  return response(201, {
    submissionId,
    status: 'submitted',
    reviewQueue: 'tenant-review',
    recommendation,
    submittedAtIso
  });
};
