import { bootstrapApplication } from '@angular/platform-browser';
import 'aws-amplify/auth/enable-oauth-listener';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
