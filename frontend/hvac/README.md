# Hvac

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Proposal Intake API (Mock/HTTP)

The Proposals page uses a mode-switchable service layer so the UI can run in mock mode now and switch to real HTTP endpoints later without component rewrites.

### Runtime config ownership

- `public/app-config.json` in this repository is the local development fallback template.
- The GitHub Actions frontend deploy workflow rewrites `public/app-config.json` during deployment for `development` and `production`.
- Deployed `development` and `production` builds are expected to run with Cognito auth and HTTP wizard API mode, and deployment fails if required runtime values are missing.

Environment policy summary:

- Local development: defaults can remain `mock` + `local` unless you intentionally configure local Cognito/API testing.
- CI/deployed development: generated runtime config (not the checked-in template).
- CI/deployed production: generated runtime config (not the checked-in template).

### Mode switch

Configure local mode in `public/app-config.json`:

```json
{
	"app": {
		"proposalApiMode": "mock"
	}
}
```

Supported values:

- `mock`: uses in-memory data (`ProposalsIntakeMockApiService`)
- `http`: uses backend endpoints (`ProposalsIntakeHttpApiService`)

### HTTP endpoints expected by frontend

Base URL:

- `/api/proposals/intake`

Endpoints:

- `GET /opportunities`
- `POST /opportunities/{opportunityId}/load-mock-package`
- `POST /opportunities/{opportunityId}/reset`
- `POST /opportunities/{opportunityId}/run-qualification`

All responses should return a `BidOpportunity` object (or an array for list endpoint).

### BidOpportunity contract (summary)

```ts
interface BidOpportunity {
	id: string;
	projectName: string;
	projectType: string;
	location: string;
	source: 'Open Bid' | 'Private Invite';
	dueDate: string; // ISO datetime
	manufacturer: string;
	estimatedValueUsd: number;
	intakeStatus: 'not_started' | 'uploading' | 'processing' | 'ready' | 'error';
	score: number;
	approvedManufacturers: string[];
	docs: BidDocument[];
	missingItems: string[];
	events: IntakeEvent[];
}
```

Reference source files:

- `src/app/pages/proposals-page.models.ts`
- `src/app/pages/proposal-intake-api.ts`
- `src/app/pages/proposals-intake-http-api.service.ts`

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
