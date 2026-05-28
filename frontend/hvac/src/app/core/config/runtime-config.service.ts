import { Injectable } from '@angular/core';
import { Amplify } from 'aws-amplify';
import { buildCognitoConfig, isCognitoConfigured, type RuntimeCognitoSettings } from '../auth/cognito.config';

interface RuntimeAppConfig {
  cognito: RuntimeCognitoSettings;
}

const defaultRuntimeConfig: RuntimeAppConfig = {
  cognito: {
    userPoolId: '',
    userPoolClientId: '',
    domain: '',
    localOrigins: ['http://localhost:4200', 'http://localhost:8080']
  }
};

@Injectable({ providedIn: 'root' })
export class RuntimeConfigService {
  private runtimeConfig: RuntimeAppConfig = defaultRuntimeConfig;

  async initialize(): Promise<void> {
    this.runtimeConfig = await this.loadRuntimeConfig();

    const cognitoConfig = buildCognitoConfig(this.runtimeConfig.cognito);
    if (!isCognitoConfigured(cognitoConfig)) {
      console.warn('Cognito runtime config is incomplete. Update public/app-config.json or repository variables used by the frontend workflow.');
      return;
    }

    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: cognitoConfig.userPoolId,
          userPoolClientId: cognitoConfig.userPoolClientId,
          loginWith: {
            oauth: {
              domain: cognitoConfig.domain,
              scopes: cognitoConfig.scopes,
              redirectSignIn: cognitoConfig.redirectSignIn,
              redirectSignOut: cognitoConfig.redirectSignOut,
              responseType: cognitoConfig.responseType
            }
          }
        }
      }
    });
  }

  get config(): RuntimeAppConfig {
    return this.runtimeConfig;
  }

  private async loadRuntimeConfig(): Promise<RuntimeAppConfig> {
    try {
      const response = await fetch('/app-config.json', {
        cache: 'no-store',
        headers: {
          Accept: 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Unable to load runtime config: HTTP ${response.status}`);
      }

      const raw = await response.json();
      return this.normalizeRuntimeConfig(raw);
    } catch (error) {
      console.warn('Falling back to default runtime config.', error);
      return defaultRuntimeConfig;
    }
  }

  private normalizeRuntimeConfig(rawConfig: unknown): RuntimeAppConfig {
    if (!rawConfig || typeof rawConfig !== 'object') {
      return defaultRuntimeConfig;
    }

    const candidate = rawConfig as {
      cognito?: RuntimeCognitoSettings;
    };

    const localOrigins = Array.isArray(candidate.cognito?.localOrigins)
      ? candidate.cognito?.localOrigins.filter((value): value is string => typeof value === 'string')
      : defaultRuntimeConfig.cognito.localOrigins;

    return {
      cognito: {
        userPoolId: candidate.cognito?.userPoolId ?? '',
        userPoolClientId: candidate.cognito?.userPoolClientId ?? '',
        domain: candidate.cognito?.domain ?? '',
        frontendBaseUrl: candidate.cognito?.frontendBaseUrl ?? '',
        localOrigins
      }
    };
  }
}
