export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  domain: string;
  redirectSignIn: string[];
  redirectSignOut: string[];
  scopes: string[];
  responseType: 'code';
}

export interface RuntimeCognitoSettings {
  userPoolId?: string;
  userPoolClientId?: string;
  domain?: string;
  frontendBaseUrl?: string;
  localOrigins?: string[];
}

const defaultLocalOrigins = ['http://localhost:4200', 'http://localhost:8080'];

function getCurrentOrigin(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location.origin;
}

function sanitizeOrigin(origin: string): string | null {
  if (!origin) {
    return null;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeOrigins(settings: RuntimeCognitoSettings): string[] {
  const configuredOrigins = settings.localOrigins ?? defaultLocalOrigins;
  const currentOrigin = getCurrentOrigin();
  const candidates = [currentOrigin, settings.frontendBaseUrl, ...configuredOrigins]
    .filter((value): value is string => Boolean(value));

  const validOrigins = candidates
    .map((origin) => sanitizeOrigin(origin))
    .filter((value): value is string => Boolean(value));

  return Array.from(new Set(validOrigins));
}

function buildRedirectUrls(settings: RuntimeCognitoSettings, path: '/callback' | '/logout'): string[] {
  const uniqueOrigins = normalizeOrigins(settings);

  return uniqueOrigins.map((origin) => `${origin}${path}`);
}

export function buildCognitoConfig(settings: RuntimeCognitoSettings): CognitoConfig {
  return {
    userPoolId: settings.userPoolId?.trim() ?? '',
    userPoolClientId: settings.userPoolClientId?.trim() ?? '',
    domain: settings.domain?.trim() ?? '',
    redirectSignIn: buildRedirectUrls(settings, '/callback'),
    redirectSignOut: buildRedirectUrls(settings, '/logout'),
    scopes: ['openid', 'email', 'profile'],
    responseType: 'code'
  };
}

export function isCognitoConfigured(config: CognitoConfig): boolean {
  return Boolean(
    config.userPoolId
    && config.userPoolClientId
    && config.domain
    && config.redirectSignIn.length > 0
    && config.redirectSignOut.length > 0
  );
}
