#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(command, options = {}) {
  return execSync(command, {
    stdio: ['ignore', 'pipe', 'pipe'],
    encoding: 'utf8',
    ...options
  }).trim();
}

function fail(message, context = undefined) {
  console.error(`FAIL: ${message}`);
  if (context !== undefined) {
    console.error(JSON.stringify(context, null, 2));
  }
  process.exit(1);
}

function assert(condition, message, context = undefined) {
  if (!condition) {
    fail(message, context);
  }
}

async function postJson(url, token, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }

  return {
    status: response.status,
    body: json
  };
}

function requireProfile() {
  const profile = process.env.AWS_PROFILE;
  assert(profile === 'development', 'AWS_PROFILE must be set to development for Step 5 contract tests.', { AWS_PROFILE: profile ?? null });
}

function getTerraformOutput(terraformDir, name) {
  return run(`terraform output -raw ${name}`, { cwd: terraformDir });
}

function getJwtToken(terraformDir, userName, password) {
  const userPoolId = getTerraformOutput(terraformDir, 'user_pool_id');
  const clientId = getTerraformOutput(terraformDir, 'user_pool_client_id');

  run(
    `aws cognito-idp admin-set-user-password --user-pool-id ${userPoolId} --username ${userName} --password ${password} --permanent`,
    { cwd: terraformDir }
  );

  const authRaw = run(
    `aws cognito-idp initiate-auth --client-id ${clientId} --auth-flow USER_PASSWORD_AUTH --auth-parameters USERNAME=${userName},PASSWORD=${password}`,
    { cwd: terraformDir }
  );

  const auth = JSON.parse(authRaw);
  const idToken = auth?.AuthenticationResult?.IdToken;
  assert(typeof idToken === 'string' && idToken.length > 0, 'Could not obtain Cognito IdToken.', auth);
  return idToken;
}

function verifyError(result, expectedCode) {
  assert(result.status === 400, 'Expected HTTP 400 validation failure.', result);
  assert(result.body?.error?.code === expectedCode, 'Unexpected error code.', result);
}

async function main() {
  requireProfile();

  const repoRoot = run('git rev-parse --show-toplevel');
  const terraformDir = `${repoRoot}/terraform`;

  const apiBase = getTerraformOutput(terraformDir, 'proposal_submission_api_endpoint');
  const token = getJwtToken(terraformDir, 'dev.workflow.validator', 'DevWorkflow#2026!');
  const opportunityId = `opp-contract-${Date.now()}`;
  const base = `${apiBase}/api/proposals/workflow/opportunities/${opportunityId}`;

  const triageRun = await postJson(`${base}/triage/run`, token, {
    documentBundleId: 'bundle-contract-001',
    representedManufacturer: 'Acme HVAC',
    approvedManufacturers: ['Acme HVAC', 'Contoso Air'],
    bidDueDateIso: '2026-07-31T00:00:00Z',
    bodFitScoreHint: 0.8,
    isIncumbentProject: true
  });
  assert(triageRun.status === 200, 'triage/run expected HTTP 200.', triageRun);
  assert(typeof triageRun.body?.triage?.recommendation === 'string', 'triage/run missing recommendation.', triageRun);
  assert(typeof triageRun.body?.triage?.confidence === 'number', 'triage/run missing confidence.', triageRun);

  const triageDecision = await postJson(`${base}/triage/decision`, token, {
    decision: 'pursue',
    rationale: 'Contract test triage decision.'
  });
  assert(triageDecision.status === 200, 'triage/decision expected HTTP 200.', triageDecision);
  assert(triageDecision.body?.stage === 'triage', 'triage/decision wrong stage.', triageDecision);

  const qualificationRun = await postJson(`${base}/qualification/run`, token, {
    documentBundleId: 'bundle-contract-001',
    representedManufacturer: 'Acme HVAC',
    approvedManufacturers: ['Acme HVAC', 'Contoso Air'],
    requiresCitations: true,
    citations: [
      {
        claimId: 'claim-1',
        sourceDocumentId: 'spec-1',
        pageNumber: 12,
        snippet: 'Approved manufacturer list includes Acme HVAC',
        confidence: 0.91
      }
    ]
  });
  assert(qualificationRun.status === 200, 'qualification/run expected HTTP 200.', qualificationRun);
  assert(Array.isArray(qualificationRun.body?.qualification?.policyChecks), 'qualification/run missing policy checks.', qualificationRun);
  assert(Array.isArray(qualificationRun.body?.qualification?.citations), 'qualification/run missing citations.', qualificationRun);

  const qualificationDecision = await postJson(`${base}/qualification/decision`, token, {
    decision: 'go',
    rationale: 'Contract test qualification decision.'
  });
  assert(qualificationDecision.status === 200, 'qualification/decision expected HTTP 200.', qualificationDecision);
  assert(qualificationDecision.body?.stage === 'qualification', 'qualification/decision wrong stage.', qualificationDecision);

  const selectionCompare = await postJson(`${base}/selection/compare`, token, {
    toolPathModel: 'TX-440',
    manufacturerPathModel: 'TX-445',
    deltas: [
      {
        field: 'airflow_cfm',
        toolPathValue: '4400',
        manufacturerValue: '4100',
        severity: 'warning',
        rationale: 'Manufacturer airflow lower than recommendation.',
        citations: [
          {
            claimId: 'claim-airflow',
            sourceDocumentId: 'submittal-23',
            pageNumber: 7,
            snippet: 'Rated airflow 4100 CFM',
            confidence: 0.88
          }
        ]
      }
    ]
  });
  assert(selectionCompare.status === 200, 'selection/compare expected HTTP 200.', selectionCompare);
  assert(typeof selectionCompare.body?.selection?.overallStatus === 'string', 'selection/compare missing overallStatus.', selectionCompare);
  assert(Array.isArray(selectionCompare.body?.selection?.deltas), 'selection/compare missing deltas.', selectionCompare);

  const selectionDecision = await postJson(`${base}/selection/decision`, token, {
    decision: 'needs_review',
    rationale: 'Contract test selection decision.'
  });
  assert(selectionDecision.status === 200, 'selection/decision expected HTTP 200.', selectionDecision);
  assert(selectionDecision.body?.stage === 'selection', 'selection/decision wrong stage.', selectionDecision);

  const invalidTriageDecision = await postJson(`${base}/triage/decision`, token, {
    decision: 'pursue'
  });
  verifyError(invalidTriageDecision, 'validation_failed');

  const invalidSelectionCompare = await postJson(`${base}/selection/compare`, token, {
    toolPathModel: 'TX-440'
  });
  verifyError(invalidSelectionCompare, 'validation_failed');

  console.log('PASS: Workflow contract tests succeeded.');
  console.log(JSON.stringify({
    opportunityId,
    checkedEndpoints: [
      'triage/run',
      'triage/decision',
      'qualification/run',
      'qualification/decision',
      'selection/compare',
      'selection/decision'
    ],
    checkedFailurePaths: [
      'triage/decision missing rationale',
      'selection/compare missing manufacturerPathModel'
    ]
  }, null, 2));
}

main().catch((error) => {
  fail('Unexpected contract test runner error.', {
    name: error?.name,
    message: error?.message,
    stack: error?.stack
  });
});
