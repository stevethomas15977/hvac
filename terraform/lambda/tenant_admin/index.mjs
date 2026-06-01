import {
  AdminListGroupsForUserCommand,
  AdminUpdateUserAttributesCommand,
  CognitoIdentityProviderClient,
  ListUsersInGroupCommand
} from '@aws-sdk/client-cognito-identity-provider';
import {
  parseClaimGroups,
  sanitizeGroupName,
  toTenantKey,
  resolveTenantAdminScope,
  isUserInTenantScope,
  resolveTenantGroupCandidates
} from './group-scope.mjs';

const cognitoClient = new CognitoIdentityProviderClient({});
const userPoolId = process.env.COGNITO_USER_POOL_ID || '';

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

function resolveCognitoUsername(event) {
  const claims = getJwtClaims(event);
  const username = claims?.['cognito:username'];

  if (typeof username === 'string' && username.trim()) {
    return username.trim();
  }

  return null;
}

function toBooleanClaim(value) {
  return value === true || value === 'true' || value === 'yes';
}

function hasTenantAdminClaim(event) {
  const claims = getJwtClaims(event);
  return toBooleanClaim(claims?.['custom:tenant_admin']);
}

function hasTenantAdminAttribute(user) {
  const tenantAdminAttribute = user.Attributes?.find((attribute) => attribute.Name === 'custom:tenant_admin');
  return toBooleanClaim(tenantAdminAttribute?.Value);
}

async function listUsersInGroup(groupName) {
  const users = [];
  let nextToken;

  do {
    const page = await cognitoClient.send(new ListUsersInGroupCommand({
      GroupName: groupName,
      UserPoolId: userPoolId,
      NextToken: nextToken,
      Limit: 60
    }));

    users.push(...(page.Users || []));
    nextToken = page.NextToken;
  } while (nextToken);

  return users;
}

async function listTenantScopedUsers(tenantGroup, tenantKey) {
  const usersByUsername = new Map();
  const candidates = resolveTenantGroupCandidates(tenantGroup, tenantKey);

  for (const groupName of candidates) {
    try {
      const users = await listUsersInGroup(groupName);
      for (const user of users) {
        if (typeof user.Username === 'string' && user.Username.trim()) {
          usersByUsername.set(user.Username, user);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'ResourceNotFoundException') {
        continue;
      }

      throw error;
    }
  }

  return Array.from(usersByUsername.values());
}

async function listUserGroups(username) {
  const result = await cognitoClient.send(new AdminListGroupsForUserCommand({
    Username: username,
    UserPoolId: userPoolId,
    Limit: 60
  }));

  return (result.Groups || [])
    .map((group) => group.GroupName)
    .filter((group) => typeof group === 'string');
}

async function requireTenantAdmin(event) {
  if (!userPoolId) {
    return {
      error: errorResponse(500, 'configuration_error', 'COGNITO_USER_POOL_ID is not configured.')
    };
  }

  let groups = parseClaimGroups(event);
  if (groups.length === 0) {
    const username = resolveCognitoUsername(event);
    if (username) {
      try {
        groups = await listUserGroups(username);
      } catch {
        groups = [];
      }
    }
  }

  const scope = resolveTenantAdminScope(groups);
  if (!scope) {
    return {
      error: errorResponse(403, 'forbidden', 'Tenant group membership is required.', {
        groups
      })
    };
  }

  if (!hasTenantAdminClaim(event)) {
    return {
      error: errorResponse(403, 'forbidden', 'Tenant admin attribute is required.')
    };
  }

  return {
    ...scope,
    actor: resolveSubmittedBy(event)
  };
}

function getUserEmail(user) {
  const emailAttribute = user.Attributes?.find((attribute) => attribute.Name === 'email');
  if (typeof emailAttribute?.Value === 'string' && emailAttribute.Value.trim()) {
    return emailAttribute.Value;
  }

  return 'No email';
}

function toIsoDate(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date().toISOString();
}

async function buildTenantWorkspace(tenantGroup) {
  const tenantKey = toTenantKey(tenantGroup);

  if (!tenantKey) {
    return {
      tenantGroup,
      users: [],
      events: []
    };
  }

  const users = await listTenantScopedUsers(tenantGroup, tenantKey);

  const tenantUsers = await Promise.all(users.map(async (user) => {
    const username = user.Username;
    if (!username) {
      return null;
    }

    const groups = await listUserGroups(username);
    const belongsToTenant = isUserInTenantScope(groups, tenantKey);
    if (!belongsToTenant) {
      return null;
    }

    return {
      username,
      email: getUserEmail(user),
      groups,
      isTenantAdmin: hasTenantAdminAttribute(user),
      lastModifiedAt: toIsoDate(user.UserLastModifiedDate)
    };
  }));

  return {
    tenantGroup,
    users: tenantUsers
      .filter((user) => user !== null)
      .sort((a, b) => a.username.localeCompare(b.username)),
    events: []
  };
}

async function handleTenantWorkspace(event) {
  const auth = await requireTenantAdmin(event);
  if (auth.error) {
    return auth.error;
  }

  try {
    return response(200, await buildTenantWorkspace(auth.tenantGroup));
  } catch (error) {
    console.error(JSON.stringify({
      event: 'tenant_admin_workspace_query_failed',
      tenantGroup: auth.tenantGroup,
      actor: auth.actor,
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to load tenant admin workspace.');
  }
}

async function handleTenantAdminRoleUpdate(event) {
  const auth = await requireTenantAdmin(event);
  if (auth.error) {
    return auth.error;
  }

  const payload = parseRequestBody(event);
  if (!payload || typeof payload !== 'object') {
    return errorResponse(400, 'validation_failed', 'Request body must be valid JSON.');
  }

  if (typeof payload.username !== 'string' || !payload.username.trim()) {
    return errorResponse(400, 'validation_failed', 'username is required.');
  }

  if (typeof payload.isTenantAdmin !== 'boolean') {
    return errorResponse(400, 'validation_failed', 'isTenantAdmin must be a boolean.');
  }

  const username = payload.username.trim();

  try {
    const groups = await listUserGroups(username);
    const belongsToTenant = isUserInTenantScope(groups, auth.tenantKey);
    if (!belongsToTenant) {
      return errorResponse(404, 'not_found', 'User is not in the tenant scope.');
    }

    await cognitoClient.send(new AdminUpdateUserAttributesCommand({
      Username: username,
      UserPoolId: userPoolId,
      UserAttributes: [
        {
          Name: 'custom:tenant_admin',
          Value: payload.isTenantAdmin ? 'true' : 'false'
        }
      ]
    }));

    const workspace = await buildTenantWorkspace(auth.tenantGroup);
    return response(200, {
      ...workspace,
      events: [
        {
          id: `evt-${Date.now()}`,
          message: `${username} ${payload.isTenantAdmin ? 'granted' : 'removed from'} tenant admin role.`,
          actor: auth.actor,
          timestamp: new Date().toISOString(),
          severity: payload.isTenantAdmin ? 'info' : 'warning'
        }
      ]
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'tenant_admin_role_update_failed',
      tenantGroup: auth.tenantGroup,
      username,
      actor: auth.actor,
      error: toStructuredError(error)
    }));
    return errorResponse(500, 'internal_error', 'Unable to update tenant admin role.');
  }
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || '';
  const path = event.requestContext?.http?.path || event.rawPath || '';

  if (method === 'GET' && path.endsWith('/api/admin/tenant/workspace')) {
    return handleTenantWorkspace(event);
  }

  if (method === 'POST' && path.endsWith('/api/admin/tenant/users/admin-role')) {
    return handleTenantAdminRoleUpdate(event);
  }

  return response(404, { message: 'Not found.' });
};

export const __test = {
  parseClaimGroups,
  sanitizeGroupName,
  toTenantKey,
  resolveTenantAdminScope,
  resolveTenantGroupCandidates
};
