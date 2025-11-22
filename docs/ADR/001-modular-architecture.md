# ADR-001: Modular Architecture Pattern

## Status

Accepted

## Context

The backend codebase needed a clear structure for organizing routes, business logic, and database access. Early implementations had routes, controllers, and database queries mixed together, making it difficult to test, maintain, and scale.

## Decision

We adopted a modular architecture with clear separation of concerns:

```
modules/
  {domain}/
    routes.ts      # HTTP route definitions + Swagger schemas
    controller.ts  # Request/response handling, input validation
    service.ts     # Business logic, orchestration
    repository.ts  # Database access, Prisma queries
    schema.ts      # Zod validation schemas
    README.md      # Module documentation
```

## Consequences

### Positive

- **Testability**: Each layer can be tested independently
- **Maintainability**: Clear boundaries make it easy to find and change code
- **Reusability**: Services and repositories can be reused across routes
- **Type Safety**: Zod schemas provide runtime validation and TypeScript types
- **Documentation**: README per module explains purpose and usage

### Negative

- **More Files**: More files to navigate (mitigated by good IDE navigation)
- **Boilerplate**: Some repetition in route definitions (acceptable trade-off)

## Implementation Notes

- Controllers are thin - they validate input and call services
- Services contain all business logic and orchestrate repository calls
- Repositories use shared Prisma selectors from `utils/prisma-selectors.ts`
- All routes use Swagger/OpenAPI schemas for documentation
- Integration tests use Vitest with Fastify inject

## Related ADRs

- ADR-002: Shared Prisma Selectors
- ADR-003: Zod Schema Validation
