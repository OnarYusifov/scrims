# ADR-002: Shared Prisma Selectors

## Status

Accepted

## Context

Prisma selectors were being duplicated across modules, leading to:

- Inconsistency in which fields were selected
- Maintenance burden when schema changed
- Larger bundle sizes due to duplicate code

## Decision

Create a centralized `utils/prisma-selectors.ts` file with reusable selector objects for common entities (User, AuditLog, Badge, Role, Ban).

## Consequences

### Positive

- **Consistency**: All modules use the same selectors for the same entities
- **Maintainability**: Changes to selectors happen in one place
- **Type Safety**: Selectors are typed with `satisfies Prisma.XSelect`
- **Reusability**: Easy to compose selectors for complex queries

### Negative

- **Coupling**: Modules depend on shared utilities (acceptable for selectors)
- **File Size**: One large file with all selectors (mitigated by good organization)

## Implementation

Selectors are organized by entity:

- `userSelectors`: summary, profile, reference
- `auditSelectors`: basic, detailed
- `badgeSelectors`: display
- `roleSelectors`: withAssigner
- `banSelectors`: active

Usage:

```typescript
import { userSelectors } from "../../../utils/prisma-selectors.js";

const select = userSelectors.summary;
```

## Related ADRs

- ADR-001: Modular Architecture Pattern
