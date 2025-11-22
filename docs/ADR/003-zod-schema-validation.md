# ADR-003: Zod Schema Validation

## Status

Accepted

## Context

We needed runtime validation for:

- HTTP request bodies and query parameters
- Environment variables
- Database input validation

TypeScript types alone don't provide runtime safety, and manual validation was error-prone.

## Decision

Use Zod for all runtime validation:

- Request validation in controllers
- Environment variable validation at startup
- Type inference from Zod schemas

## Consequences

### Positive

- **Type Safety**: Zod schemas generate TypeScript types automatically
- **Runtime Safety**: Invalid data is caught before reaching business logic
- **Clear Errors**: Zod provides detailed validation error messages
- **Single Source of Truth**: Schema defines both validation and types

### Negative

- **Bundle Size**: Zod adds to bundle size (acceptable trade-off)
- **Learning Curve**: Team needs to learn Zod API (minimal)

## Implementation

Schemas are defined in `schema.ts` files per module:

```typescript
export const playerListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(25),
  search: z.string().optional(),
});
```

Controllers parse input:

```typescript
const query = playerListQuerySchema.parse(request.query);
```

## Related ADRs

- ADR-001: Modular Architecture Pattern
