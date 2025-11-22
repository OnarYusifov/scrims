/**
 * Shared Prisma Selectors
 *
 * Consolidates repeated Prisma select objects used across modules.
 * This ensures consistency and makes it easier to maintain selectors.
 */

import type { Prisma } from "@trayb/db";

/**
 * Common user selectors
 */
export const userSelectors = {
  /**
   * Minimal user fields for lists and summaries
   */
  summary: {
    id: true,
    username: true,
    email: true,
    discord: true,
    role: true,
    image: true,
    createdAt: true,
    status: true,
  } satisfies Prisma.UserSelect,

  /**
   * User with basic profile info
   */
  profile: {
    id: true,
    username: true,
    email: true,
    discord: true,
    role: true,
    image: true,
    createdAt: true,
    updatedAt: true,
    emailVerified: true,
    status: true,
  } satisfies Prisma.UserSelect,

  /**
   * User reference (id and username only)
   */
  reference: {
    id: true,
    username: true,
  } satisfies Prisma.UserSelect,
} as const;

/**
 * Common audit log selectors
 */
export const auditSelectors = {
  /**
   * Basic audit log entry
   */
  basic: {
    id: true,
    action: true,
    reason: true,
    metadata: true,
    createdAt: true,
    actor: {
      select: userSelectors.reference,
    },
  } satisfies Prisma.PlayerAuditLogSelect,

  /**
   * Audit log with user and actor details
   */
  detailed: {
    id: true,
    action: true,
    reason: true,
    metadata: true,
    createdAt: true,
    user: {
      select: {
        id: true,
        username: true,
        email: true,
      },
    },
    actor: {
      select: {
        id: true,
        username: true,
        email: true,
      },
    },
  } satisfies Prisma.PlayerAuditLogSelect,
} as const;

/**
 * Common badge selectors
 */
export const badgeSelectors = {
  /**
   * Badge with all display fields
   */
  display: {
    id: true,
    label: true,
    variant: true,
    icon: true,
  } satisfies Prisma.BadgeSelect,
} as const;

/**
 * Common role selectors
 */
export const roleSelectors = {
  /**
   * Player role with assigner info
   */
  withAssigner: {
    id: true,
    role: true,
    isPrimary: true,
    reason: true,
    assignedBy: true,
    createdAt: true,
    assignedByUser: {
      select: userSelectors.reference,
    },
  } satisfies Prisma.PlayerRoleSelect,
} as const;

/**
 * Common ban selectors
 */
export const banSelectors = {
  /**
   * Active ban details
   */
  active: {
    id: true,
    type: true,
    status: true,
    reason: true,
    durationDays: true,
    banFromAllHubs: true,
    banFromDiscord: true,
    startsAt: true,
    endsAt: true,
  } satisfies Prisma.PlayerBanSelect,
} as const;
