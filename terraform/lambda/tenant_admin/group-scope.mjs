function sanitizeGroupName(value) {
  if (typeof value !== 'string') {
    return '';
  }

  let normalized = value.trim();
  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('[') && normalized.endsWith(']')) {
    normalized = normalized.slice(1, -1).trim();
  }

  if (
    (normalized.startsWith('"') && normalized.endsWith('"'))
    || (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function parseClaimGroups(event) {
  const claims = event?.requestContext?.authorizer?.jwt?.claims ?? null;
  const groupsClaim = claims?.['cognito:groups'];

  if (Array.isArray(groupsClaim)) {
    return groupsClaim
      .map((value) => sanitizeGroupName(value))
      .filter(Boolean);
  }

  if (typeof groupsClaim === 'string' && groupsClaim.trim()) {
    try {
      const parsed = JSON.parse(groupsClaim);
      if (Array.isArray(parsed)) {
        return parsed
          .map((value) => sanitizeGroupName(value))
          .filter(Boolean);
      }

      if (typeof parsed === 'string' && parsed.trim()) {
        return [sanitizeGroupName(parsed)].filter(Boolean);
      }
    } catch {
      return groupsClaim
        .split(',')
        .map((value) => sanitizeGroupName(value))
        .filter(Boolean);
    }
  }

  return [];
}

function toTenantKey(groupName) {
  const trimmed = sanitizeGroupName(groupName);
  if (!trimmed) {
    return null;
  }

  const withoutAdminSuffix = trimmed.endsWith('_admin')
    ? trimmed.slice(0, -'_admin'.length)
    : trimmed;

  const withoutTenantPrefix = withoutAdminSuffix.startsWith('tenant_')
    ? withoutAdminSuffix.slice('tenant_'.length)
    : withoutAdminSuffix;

  const tenantKey = withoutTenantPrefix.trim();
  return tenantKey ? tenantKey.toLowerCase() : null;
}

function resolveTenantAdminScope(groups) {
  const nonEmptyGroups = groups.filter((group) => typeof group === 'string' && group.trim());
  if (nonEmptyGroups.length === 0) {
    return null;
  }

  const tenantGroups = nonEmptyGroups.filter((group) => !group.endsWith('_admin'));
  const tenantGroup = tenantGroups[0] ?? nonEmptyGroups[0];
  const tenantKey = toTenantKey(tenantGroup);

  if (!tenantKey) {
    return null;
  }

  return {
    tenantGroup,
    tenantKey
  };
}

function isUserInTenantScope(groups, tenantKey) {
  return groups.some((group) => toTenantKey(group) === tenantKey);
}

function resolveTenantGroupCandidates(tenantGroup, tenantKey) {
  const candidates = [
    tenantGroup,
    tenantKey,
    `tenant_${tenantKey}`,
    `${tenantKey}_admin`,
    `tenant_${tenantKey}_admin`
  ];

  return Array.from(new Set(candidates.filter((group) => typeof group === 'string' && group.trim())))
    .map((group) => group.trim());
}

export {
  parseClaimGroups,
  sanitizeGroupName,
  toTenantKey,
  resolveTenantAdminScope,
  isUserInTenantScope,
  resolveTenantGroupCandidates
};
