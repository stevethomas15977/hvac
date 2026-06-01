import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeGroupName,
  parseClaimGroups,
  toTenantKey,
  resolveTenantAdminScope,
  resolveTenantGroupCandidates
} from './group-scope.mjs';

test('sanitizeGroupName strips brackets and quotes', () => {
  assert.equal(sanitizeGroupName('[softwarelikeyou]'), 'softwarelikeyou');
  assert.equal(sanitizeGroupName('"softwarelikeyou"'), 'softwarelikeyou');
  assert.equal(sanitizeGroupName("'softwarelikeyou'"), 'softwarelikeyou');
});

test('parseClaimGroups handles bracketed string claim', () => {
  const event = {
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            'cognito:groups': '[softwarelikeyou]'
          }
        }
      }
    }
  };

  assert.deepEqual(parseClaimGroups(event), ['softwarelikeyou']);
});

test('toTenantKey normalizes tenant prefix and admin suffix', () => {
  assert.equal(toTenantKey('softwarelikeyou'), 'softwarelikeyou');
  assert.equal(toTenantKey('tenant_softwarelikeyou'), 'softwarelikeyou');
  assert.equal(toTenantKey('tenant_softwarelikeyou_admin'), 'softwarelikeyou');
});

test('resolveTenantAdminScope derives tenant key from admin group fallback', () => {
  const scope = resolveTenantAdminScope(['tenant_softwarelikeyou_admin']);

  assert.equal(scope?.tenantGroup, 'tenant_softwarelikeyou_admin');
  assert.equal(scope?.tenantKey, 'softwarelikeyou');
});

test('resolveTenantGroupCandidates includes expected variants', () => {
  const candidates = resolveTenantGroupCandidates('softwarelikeyou', 'softwarelikeyou');

  assert.deepEqual(candidates, [
    'softwarelikeyou',
    'tenant_softwarelikeyou',
    'softwarelikeyou_admin',
    'tenant_softwarelikeyou_admin'
  ]);
});
