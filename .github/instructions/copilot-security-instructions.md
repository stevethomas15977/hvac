# Security Principles

- Security is a functional requirement.
- Secure by default.
- Least privilege everywhere.
- Never trust client-side input.
- Validate all external input.
- Assume every public endpoint is under attack.
- Prefer defense in depth.
- Prefer explicit authorization checks.
- Protect confidentiality, integrity, and availability.

# Authentication

- Authentication must be centralized.
- Prefer Cognito User Pools or approved enterprise IdPs.
- Never implement custom password storage.
- Never generate authentication code when managed services exist.
- Validate JWT tokens through API Gateway authorizers.
- Do not trust user identity claims supplied by the Angular client.

# Authorization

- Authentication is not authorization.
- Every API request must perform authorization checks.
- Authorization decisions must be made server-side.
- Angular route guards are for user experience only.
- Never trust tenant IDs sent from the browser.
- Never trust role names sent from the browser.
- Derive tenant and role information from trusted claims.

# Multi-Tenant Security

- Every request must execute within a tenant context.
- Every database query must enforce tenant isolation.
- Never allow cross-tenant queries.
- Tenant IDs must come from trusted identity claims.
- All repository methods must require tenant context.
- Log all cross-tenant administrative actions.