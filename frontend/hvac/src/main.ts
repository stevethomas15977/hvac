import { bootstrapApplication } from '@angular/platform-browser';
import { Amplify } from 'aws-amplify';
import 'aws-amplify/auth/enable-oauth-listener';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { cognitoConfig, isCognitoConfigured } from './app/core/auth/cognito.config';

if (isCognitoConfigured(cognitoConfig)) {
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
} else {
  console.warn('Cognito config is incomplete. Update src/app/core/auth/cognito.config.ts');
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
