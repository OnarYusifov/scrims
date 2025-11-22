# Admin Audit Module

## Overview

This module provides access to the audit log system, which tracks all administrative actions performed on players. Every role change, ban, unban, and administrative note is logged for compliance and security.

## Data Models

### Core Entity

- **PlayerAuditLog**: Audit trail entries with:
  - `userId`: Target player
  - `actorId`: Admin who performed the action
  - `action`: Type of action (role_change, ban, unban, note)
  - `reason`: Reason for the action
  - `metadata`: Additional JSON data
  - `createdAt`: Timestamp

## Routes

### `GET /admin/audit-logs`

List audit log entries with pagination and filtering.

**Query Parameters:**

- `page` (number, default: 1): Page number
- `pageSize` (number, default: 25, max: 100): Items per page
- `userId` (string, optional): Filter by target player
- `actorId` (string, optional): Filter by admin who performed action
- `action` (string, optional): Filter by action type
- `search` (string, optional): Search in reason or metadata

**Response:** Paginated list of audit log entries with user and actor details

## Architecture

### Layer Structure

```
routes.ts          # Route definitions with Swagger schemas
controller.ts      # Request/response handling
service.ts         # Business logic and filtering
repository.ts      # Database queries
schema.ts          # Zod validation schemas
```

### Key Components

- **Service**: Builds complex where clauses for filtering
- **Repository**: Efficient queries with proper selectors
- **Controller**: Handles pagination and response formatting

## Usage Notes

- Audit logs are immutable (read-only)
- All admin actions automatically create audit entries
- Metadata field allows storing additional context (e.g., old/new role values)
- Search functionality searches both reason text and metadata JSON

## Testing

Run tests with:

```bash
bun test apps/backend/src/modules/admin/audit
```

### Test Coverage

- Audit log listing with filters
- Pagination handling
- Search functionality
- Date range filtering

## Dependencies

- `@trayb/db`: Prisma client
- `../../../utils/prisma-selectors`: Shared Prisma selectors
