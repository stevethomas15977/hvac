# Angular Code Learning Guide (Fast Path)

This guide is for developers who are new to Angular and need to understand this project quickly.

## Goal

By the end of this guide, you should know:
- where the app starts
- how routing works
- where state lives
- how mock mode vs real HTTP mode is selected
- where to make common changes safely

## 30-Minute Learning Path

1. Read app bootstrap and providers:
- [frontend/hvac/src/main.ts](../frontend/hvac/src/main.ts)
- [frontend/hvac/src/app/app.config.ts](../frontend/hvac/src/app/app.config.ts)

2. Read routes and layout shell:
- [frontend/hvac/src/app/app.routes.ts](../frontend/hvac/src/app/app.routes.ts)
- [frontend/hvac/src/app/layout/app-shell.component.ts](../frontend/hvac/src/app/layout/app-shell.component.ts)

3. Read runtime config and auth:
- [frontend/hvac/public/app-config.json](../frontend/hvac/public/app-config.json)
- [frontend/hvac/src/app/core/config/runtime-config.service.ts](../frontend/hvac/src/app/core/config/runtime-config.service.ts)
- [frontend/hvac/src/app/core/auth/auth.service.ts](../frontend/hvac/src/app/core/auth/auth.service.ts)
- [frontend/hvac/src/app/core/auth/guards/auth.guard.ts](../frontend/hvac/src/app/core/auth/guards/auth.guard.ts)

4. Read the two main page patterns:
- Wizard page and service
  - [frontend/hvac/src/app/pages/proposals-new-wizard.component.ts](../frontend/hvac/src/app/pages/proposals-new-wizard.component.ts)
  - [frontend/hvac/src/app/pages/proposal-wizard.service.ts](../frontend/hvac/src/app/pages/proposal-wizard.service.ts)
- Intake workspace page and service
  - [frontend/hvac/src/app/pages/proposals-page.component.ts](../frontend/hvac/src/app/pages/proposals-page.component.ts)
  - [frontend/hvac/src/app/pages/proposals-intake.service.ts](../frontend/hvac/src/app/pages/proposals-intake.service.ts)

5. Read API abstraction pattern:
- Wizard contracts and implementations
  - [frontend/hvac/src/app/pages/proposal-wizard-api.ts](../frontend/hvac/src/app/pages/proposal-wizard-api.ts)
  - [frontend/hvac/src/app/pages/proposal-wizard-http-api.service.ts](../frontend/hvac/src/app/pages/proposal-wizard-http-api.service.ts)
  - [frontend/hvac/src/app/pages/proposal-wizard-mock-api.service.ts](../frontend/hvac/src/app/pages/proposal-wizard-mock-api.service.ts)

## Mental Model of This App

This is a standalone-component Angular 19 app.

The architecture is:
- Component: renders UI and forwards user actions
- Service: owns state, validation, and workflow logic
- API interface token: defines backend contract
- HTTP implementation: real backend calls
- Mock implementation: fake local responses for development

The provider wiring in [frontend/hvac/src/app/app.config.ts](../frontend/hvac/src/app/app.config.ts) chooses HTTP or mock at runtime using values loaded from [frontend/hvac/public/app-config.json](../frontend/hvac/public/app-config.json).

## App Startup Flow

1. [frontend/hvac/src/main.ts](../frontend/hvac/src/main.ts) bootstraps Angular with AppConfig.
2. App initializer runs [frontend/hvac/src/app/core/config/runtime-config.service.ts](../frontend/hvac/src/app/core/config/runtime-config.service.ts).
3. Runtime config is loaded from app-config.json.
4. Cognito settings are applied if configured.
5. API providers are resolved in app.config.ts (HTTP or mock).
6. Router loads first route and shell.

## Routing and Page Loading

Routes are in [frontend/hvac/src/app/app.routes.ts](../frontend/hvac/src/app/app.routes.ts).

Important points:
- app/dashboard, app/proposals, app/proposals/new, and app/admin are lazy loaded with loadComponent.
- authGuard protects the app area.
- tenantAdminGuard protects the admin page.
- [frontend/hvac/src/app/layout/app-shell.component.ts](../frontend/hvac/src/app/layout/app-shell.component.ts) is the top nav and hosts child pages via router outlet.

## Authentication Flow

Core auth logic is in [frontend/hvac/src/app/core/auth/auth.service.ts](../frontend/hvac/src/app/core/auth/auth.service.ts).

Modes:
- local mode: fake user is set for local development
- cognito mode: Hosted UI + tokens

Callback page:
- [frontend/hvac/src/app/pages/auth-callback.component.ts](../frontend/hvac/src/app/pages/auth-callback.component.ts)
- It finalizes login and redirects to dashboard.

## How State Works (Signals)

This codebase uses Angular signals heavily.

Example:
- [frontend/hvac/src/app/pages/proposal-wizard.service.ts](../frontend/hvac/src/app/pages/proposal-wizard.service.ts)

Patterns to learn:
- signal(...) stores mutable state
- computed(...) derives read-only values
- effect(...) reacts to state changes (autosave, debounced API refresh)

In the wizard service, signals are used for:
- draft form state
- workflow panel state (triage, qualification, selection)
- validation state
- submission status and receipts

## Wizard Feature (Highest-Value Flow)

UI:
- [frontend/hvac/src/app/pages/proposals-new-wizard.component.ts](../frontend/hvac/src/app/pages/proposals-new-wizard.component.ts)

Logic:
- [frontend/hvac/src/app/pages/proposal-wizard.service.ts](../frontend/hvac/src/app/pages/proposal-wizard.service.ts)

API contracts:
- [frontend/hvac/src/app/pages/proposal-wizard-api.ts](../frontend/hvac/src/app/pages/proposal-wizard-api.ts)

What happens:
1. User edits source/docs/scope/eligibility/selection inputs.
2. Service builds payloads and debounces workflow calls.
3. Triage, qualification, and selection results are stored in panel signals.
4. Decision preview and decision packet are derived from those backend-backed outputs.
5. Submit records selection decision, then submission receipt.

## Intake Workspace Feature

UI:
- [frontend/hvac/src/app/pages/proposals-page.component.ts](../frontend/hvac/src/app/pages/proposals-page.component.ts)

Logic:
- [frontend/hvac/src/app/pages/proposals-intake.service.ts](../frontend/hvac/src/app/pages/proposals-intake.service.ts)

HTTP API implementation:
- [frontend/hvac/src/app/pages/proposals-intake-http-api.service.ts](../frontend/hvac/src/app/pages/proposals-intake-http-api.service.ts)

This feature follows the same component + service + API abstraction pattern.

## Admin Feature

UI:
- [frontend/hvac/src/app/pages/admin-page.component.ts](../frontend/hvac/src/app/pages/admin-page.component.ts)

Logic:
- [frontend/hvac/src/app/pages/tenant-admin.service.ts](../frontend/hvac/src/app/pages/tenant-admin.service.ts)

Purpose:
- user list, tenant admin role updates, audit events

## Mock vs HTTP Mode (Critical)

Runtime switch is in app-config.json:
- proposalApiMode controls intake/admin APIs
- proposalWizardApiMode controls wizard APIs
- authMode controls local vs cognito auth

Provider selection logic is in:
- [frontend/hvac/src/app/app.config.ts](../frontend/hvac/src/app/app.config.ts)

When debugging behavior differences, first confirm runtime mode.

## Where To Change Things (Quick Index)

Change page labels/layout:
- [frontend/hvac/src/app/pages/proposals-new-wizard.component.ts](../frontend/hvac/src/app/pages/proposals-new-wizard.component.ts)

Change wizard validation/business logic:
- [frontend/hvac/src/app/pages/proposal-wizard.service.ts](../frontend/hvac/src/app/pages/proposal-wizard.service.ts)

Change backend request/response shapes:
- [frontend/hvac/src/app/pages/proposal-wizard-api.ts](../frontend/hvac/src/app/pages/proposal-wizard-api.ts)

Change real HTTP endpoints:
- [frontend/hvac/src/app/pages/proposal-wizard-http-api.service.ts](../frontend/hvac/src/app/pages/proposal-wizard-http-api.service.ts)

Change fake/mock behavior:
- [frontend/hvac/src/app/pages/proposal-wizard-mock-api.service.ts](../frontend/hvac/src/app/pages/proposal-wizard-mock-api.service.ts)

Change auth behavior:
- [frontend/hvac/src/app/core/auth/auth.service.ts](../frontend/hvac/src/app/core/auth/auth.service.ts)

Change runtime environment behavior:
- [frontend/hvac/public/app-config.json](../frontend/hvac/public/app-config.json)
- [frontend/hvac/src/app/core/config/runtime-config.service.ts](../frontend/hvac/src/app/core/config/runtime-config.service.ts)

## Fast Debugging Checklist

1. Confirm mode in app-config.json.
2. Confirm selected service implementation in app.config.ts.
3. Confirm route and guard behavior in app.routes.ts.
4. Confirm signal state in service file, not component file.
5. Confirm API response shape matches proposal-wizard-api.ts contracts.

## Local Commands

From [frontend/hvac](../frontend/hvac):

- npm install
- npm start
- npm run build
- npm test

Scripts are defined in [frontend/hvac/package.json](../frontend/hvac/package.json).

## Suggested Next Learning Step

After reading this guide once, pick one vertical slice and trace it end-to-end.

Best first slice:
- Edit one field in the wizard UI
- Watch how proposal-wizard.service updates state
- Follow one API call in proposal-wizard-http-api.service
- Verify the result renders back in proposals-new-wizard.component

That single trace teaches most of this codebase’s Angular pattern.
