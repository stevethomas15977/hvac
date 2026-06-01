# AWS Lambda Best Practices

- Keep Lambda handlers thin.
- Place business logic in separate service modules.
- Use one Lambda function per cohesive business capability.
- Avoid creating large “god Lambdas” that perform unrelated tasks.
- Avoid direct Lambda-to-Lambda calls unless there is a clear reason.
- Prefer Step Functions for ordered workflows.
- Prefer EventBridge or SQS for decoupled asynchronous workflows.
- Load configuration from environment variables using typed settings.
- Never hardcode secrets, ARNs, account IDs, or regions.
- Use structured logging and include correlation/request IDs where available.
- All Lambda business logic must be unit testable without AWS network calls.
- Use pure functions for deterministic transformations.
- Use classes for services, repositories, adapters, and clients that manage dependencies.
- Avoid unnecessary abstraction when a simple function is clearer.
- Extract authenticated user claims from the API Gateway authorizer context.
- Pass a trusted `AuthContext` or `TenantContext` object into services.
- Do not parse or trust raw JWTs inside business logic unless required.
- Business services must require tenant context as an explicit parameter.
- Repository methods must require tenant ID for tenant-owned data.

Example:

```python
@dataclass(frozen=True)
class AuthContext:
    user_id: str
    tenant_id: str
    roles: list[str]
    scopes: list[str]

# Angular + Cognito + API Gateway Security Standards

## Core Principle

The Angular application may authenticate users through Amazon Cognito, but API Gateway and backend services must enforce authorization.

Never trust tenant IDs, roles, permissions, usernames, or account identifiers supplied by the browser.

---

## Angular Client Rules

- Use Amazon Cognito hosted UI or OAuth/OIDC flows where practical.
- Store tokens using the most secure project-approved approach.
- Never store secrets in Angular code.
- Never embed Cognito client secrets in the browser.
- Attach the Cognito JWT access token to API requests using the `Authorization: Bearer <token>` header.
- Do not send tenant IDs as trusted request body fields.
- Do not make authorization decisions only in Angular route guards.
- Angular route guards are for user experience only, not security.

---

## API Gateway Rules

- Protect all non-public routes with a Cognito User Pool authorizer or JWT authorizer.
- Validate token issuer, audience/client ID, expiration, and scopes.
- Require OAuth scopes for privileged API operations.
- Use separate routes/scopes for read, write, admin, and tenant-management operations.
- Do not expose unauthenticated APIs unless explicitly documented.
- Enable throttling and request validation.
- Use AWS WAF for public-facing APIs when appropriate.
- Configure CORS narrowly. Do not use wildcard origins for authenticated APIs.

---

## Multi-Tenant Authorization Rules

- The tenant context must come from trusted Cognito claims, token scopes, Cognito groups, or backend tenant mapping.
- Do not trust `tenantId` from query strings, route parameters, headers, or request bodies unless it is validated against the authenticated user.
- Every database query must enforce tenant isolation.
- Use tenant-aware repository methods.
- Backend code must verify that the authenticated user belongs to the tenant being accessed.
- Admin users must still be scoped to allowed tenants unless they are explicit platform administrators.
