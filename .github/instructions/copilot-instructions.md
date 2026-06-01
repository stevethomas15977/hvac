# Cross-Cutting Architecture Principles

- Prefer low coupling and high cohesion across Angular, Python, AWS Lambda, and Terraform code.
- Keep each module, component, service, Lambda function, and Terraform module focused on one responsibility.
- Do not mix infrastructure code, business logic, UI logic, and persistence logic in the same file.
- Prefer explicit boundaries:
  - Angular components handle presentation.
  - Angular services handle API interaction and client-side coordination.
  - Lambda handlers handle request/response translation only.
  - Python services contain business logic.
  - Repository/adapters contain persistence or external service calls.
  - Terraform modules define infrastructure capabilities.
- Avoid hidden side effects.
- Favor small, testable, reviewable changes.