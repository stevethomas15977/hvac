# Python Project Coding Standards

## Style and Architecture
- Enforce strict PEP 8 compliance for all styling.
- Use explicit type hinting on all function signatures and variable assignments.
- Prefer explicit async/await patterns using `asyncio` for I/O bound tasks.
- Use pure functions for deterministic transformations.
- Use classes for services, repositories, adapters, and clients that manage dependencies.
- Avoid unnecessary abstraction when a simple function is clearer.

## Testing and Security
- All new features must include isolated unit tests using the `pytest` framework.
- Place shared test fixtures in `tests/conftest.py`.
- Never expose hardcoded credentials; use `pydantic-settings` to load environments.