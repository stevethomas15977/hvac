export interface CognitoConfig {
  userPoolId: string;
  userPoolClientId: string;
  domain: string;
  redirectSignIn: string[];
  redirectSignOut: string[];
  scopes: string[];
  responseType: 'code';
}

const localOrigins = ['http://localhost:4200', 'http://localhost:8080'];

function getCurrentOrigin(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.location.origin;
}

function buildRedirectUrls(path: '/callback' | '/logout'): string[] {
  const currentOrigin = getCurrentOrigin();
  const origins = currentOrigin ? [currentOrigin, ...localOrigins] : localOrigins;
  const uniqueOrigins = Array.from(new Set(origins));

  return uniqueOrigins.map((origin) => `${origin}${path}`);
}

export const cognitoConfig: CognitoConfig = {
  userPoolId: 'us-east-1_BCiF1vC0f',
  userPoolClientId: '53fj59peq7e6967el5ruulqkob',
  domain: 'hvac-499181527793.auth.us-east-1.amazoncognito.com',
  redirectSignIn: buildRedirectUrls('/callback'),
  redirectSignOut: buildRedirectUrls('/logout'),
  scopes: ['openid', 'email', 'profile'],
  responseType: 'code'
};

export function isCognitoConfigured(config: CognitoConfig): boolean {
  return Boolean(
    config.userPoolId
    && config.userPoolClientId
    && config.domain
    && config.redirectSignIn.length > 0
    && config.redirectSignOut.length > 0
  );
}
