export const games = ["valorant", "cs2"] as const;
export type GameId = (typeof games)[number];

export const matchTeams = ["alpha", "bravo"] as const;
export type MatchTeam = (typeof matchTeams)[number];

export const matchOutcomes = ["alpha", "bravo", "draw"] as const;
export type MatchOutcome = (typeof matchOutcomes)[number];

export const adminPlayerRoles = [
  "organizer",
  "admin",
  "moderator",
  "competitor",
  "viewer",
] as const;
export type AdminPlayerRole = (typeof adminPlayerRoles)[number];

export const adminPlayerStatuses = ["active", "banned", "suspended"] as const;
export type AdminPlayerStatus = (typeof adminPlayerStatuses)[number];
