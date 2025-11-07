export interface DiscordIdentity {
  discordId?: string;
  username?: string | null;
  avatarUrl?: string | null;
}

export interface LobbySyncPayload {
  matchId: string;
  players: DiscordIdentity[];
}

export interface TeamAssignmentPayload {
  matchId: string;
  teamAlpha: DiscordIdentity[];
  teamBravo: DiscordIdentity[];
}

export interface EloDelta {
  oldElo: number;
  newElo: number;
  change: number;
}

export interface MatchResultPlayer extends DiscordIdentity {
  kills: number;
  deaths: number;
  assists: number;
  acs: number;
  adr: number;
  plusMinus: number;
  team: 'ALPHA' | 'BRAVO';
  elo?: EloDelta;
}

export interface MatchMapSummary {
  mapName: string;
  scoreAlpha: number;
  scoreBravo: number;
  winner: 'ALPHA' | 'BRAVO' | 'TIE';
}

export interface MatchResultPayload {
  matchId: string;
  seriesType: string;
  teamAlpha: {
    name: string;
    score: number;
    players: MatchResultPlayer[];
  };
  teamBravo: {
    name: string;
    score: number;
    players: MatchResultPlayer[];
  };
  winner: 'ALPHA' | 'BRAVO' | 'TIE';
  maps: MatchMapSummary[];
  mvp?: MatchResultPlayer;
  completedAt?: Date;
}

