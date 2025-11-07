import { getToken } from './auth';
import { Match, MatchStatus, SeriesType } from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const token = getToken();
  
  // Only include Content-Type for requests with a body
  const hasBody = options?.body !== undefined && options?.body !== null;
  const headers: HeadersInit = {
    ...(hasBody && { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options?.headers,
  };
  
  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
      // Cache GET requests
      cache: (options?.method === 'GET' || !options?.method) ? 'default' : 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      // Try to get error message from response
      let errorMessage = `API error: ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON, use default message
      }
      throw new Error(errorMessage);
    }

    return response.json();
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(`Cannot connect to server. Make sure the backend is running on ${API_URL}`);
    }
    throw error;
  }
}

export interface ProfileData {
  user: {
    id: string;
    discordId: string;
    username: string;
    avatarUrl?: string;
    role: string;
    elo: number;
    peakElo: number;
    matchesPlayed: number;
    isCalibrating: boolean;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    avgKD: number;
    avgACS: number;
    avgADR: number;
    createdAt: string;
    lastLogin?: string;
  };
  eloHistory: Array<{
    id: string;
    oldElo: number;
    newElo: number;
    change: number;
    won: boolean;
    seriesType: string;
    createdAt: string;
  }>;
  recentStats: {
    acs: number;
    adr: number;
    kast: number;
    headshotPercent: number;
    kd: number;
    wpr: number;
  };
}

export async function fetchProfile(): Promise<ProfileData> {
  return apiRequest<ProfileData>('/api/users/profile');
}

export async function fetchUserProfile(userId: string): Promise<ProfileData> {
  return apiRequest<ProfileData>(`/api/users/${userId}`);
}

// Match API functions
export interface MatchListResponse {
  matches: Match[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchMatches(params?: {
  page?: number;
  limit?: number;
  status?: MatchStatus;
}): Promise<MatchListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.status) queryParams.append('status', params.status);

  const query = queryParams.toString();
  return apiRequest<MatchListResponse>(`/api/matches${query ? `?${query}` : ''}`);
}

export async function fetchMatch(matchId: string): Promise<Match> {
  return apiRequest<Match>(`/api/matches/${matchId}`);
}

export async function createMatch(seriesType: SeriesType = 'BO1'): Promise<Match> {
  return apiRequest<Match>('/api/matches', {
    method: 'POST',
    body: JSON.stringify({ seriesType }),
  });
}

export async function joinMatch(matchId: string, teamId?: string): Promise<{ message: string; teamId?: string }> {
  return apiRequest<{ message: string; teamId?: string }>(`/api/matches/${matchId}/join`, {
    method: 'POST',
    body: JSON.stringify({ teamId }),
  });
}

export async function leaveMatch(matchId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}/leave`, {
    method: 'POST',
  });
}

export async function removePlayerFromMatch(matchId: string, userId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}/remove-player`, {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}

export async function deleteMatch(matchId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}`, {
    method: 'DELETE',
  });
}

// Admin API functions
export interface User {
  id: string;
  discordId: string;
  username: string;
  discriminator?: string;
  avatar?: string;
  email?: string;
  role: string;
  isWhitelisted: boolean;
  isBanned: boolean;
  elo: number;
  peakElo: number;
  matchesPlayed: number;
  isCalibrating: boolean;
  createdAt: string;
  lastLogin?: string;
}

export interface UserListResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<UserListResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);

  const query = queryParams.toString();
  return apiRequest<UserListResponse>(`/api/admin/users${query ? `?${query}` : ''}`);
}

export async function updateUserRole(userId: string, role: 'USER' | 'MODERATOR' | 'ADMIN' | 'ROOT'): Promise<User> {
  return apiRequest<User>(`/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function banUser(userId: string, banned: boolean): Promise<User> {
  return apiRequest<User>(`/api/admin/users/${userId}/ban`, {
    method: 'PATCH',
    body: JSON.stringify({ banned }),
  });
}

export async function addToWhitelist(discordId: string): Promise<User> {
  return apiRequest<User>('/api/admin/whitelist', {
    method: 'POST',
    body: JSON.stringify({ discordId }),
  });
}

export async function removeFromWhitelist(userId: string): Promise<User> {
  return apiRequest<User>(`/api/admin/whitelist/${userId}`, {
    method: 'DELETE',
  });
}

export interface AuditLog {
  id: string;
  userId?: string;
  user?: {
    id: string;
    username: string;
    discordId: string;
  };
  action: string;
  entity: string;
  entityId: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
  matchId?: string;
}

export interface AuditLogResponse {
  logs: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function fetchAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  entity?: string;
}): Promise<AuditLogResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.action) queryParams.append('action', params.action);
  if (params?.entity) queryParams.append('entity', params.entity);

  const query = queryParams.toString();
  return apiRequest<AuditLogResponse>(`/api/admin/audit-logs${query ? `?${query}` : ''}`);
}

export interface WeightProfile {
  id: string;
  name: string;
  isActive: boolean;
  killWeight: number;
  deathWeight: number;
  assistWeight: number;
  acsWeight: number;
  adrWeight: number;
  kastWeight: number;
  firstKillWeight: number;
  clutchWeight: number;
  createdAt: string;
  updatedAt: string;
}

export async function fetchWeightProfiles(): Promise<WeightProfile[]> {
  return apiRequest<WeightProfile[]>('/api/admin/weight-profiles');
}

export async function createWeightProfile(data: {
  name: string;
  killWeight?: number;
  deathWeight?: number;
  assistWeight?: number;
  acsWeight?: number;
  adrWeight?: number;
  kastWeight?: number;
  firstKillWeight?: number;
  clutchWeight?: number;
}): Promise<WeightProfile> {
  return apiRequest<WeightProfile>('/api/admin/weight-profiles', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateWeightProfile(id: string, data: Partial<WeightProfile>): Promise<WeightProfile> {
  return apiRequest<WeightProfile>(`/api/admin/weight-profiles/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function activateWeightProfile(id: string): Promise<WeightProfile> {
  return apiRequest<WeightProfile>(`/api/admin/weight-profiles/${id}/activate`, {
    method: 'PATCH',
  });
}

// Team Selection API functions
export async function startTeamSelection(
  matchId: string,
  allocationMethod: 'random' | 'elo' | 'captain',
  captainMethod?: 'voting' | 'elo' | 'random'
): Promise<Match> {
  return apiRequest<Match>(`/api/matches/${matchId}/start-team-selection`, {
    method: 'PATCH',
    body: JSON.stringify({ allocationMethod, captainMethod }),
  });
}

export async function voteForCaptain(
  matchId: string,
  candidateId: string
): Promise<{ message: string; needsCoinflip?: boolean; candidates?: string[]; voteCounts?: Record<string, number> }> {
  return apiRequest<{ message: string; needsCoinflip?: boolean; candidates?: string[]; voteCounts?: Record<string, number> }>(`/api/matches/${matchId}/captain-vote`, {
    method: 'POST',
    body: JSON.stringify({ candidateId }),
  });
}

export async function getCaptainVotes(
  matchId: string
): Promise<{ votes: Array<{ userId: string; username?: string; candidateId: string | null }>; voteCounts: Record<string, number> }> {
  return apiRequest<{ votes: Array<{ userId: string; username?: string; candidateId: string | null }>; voteCounts: Record<string, number> }>(`/api/matches/${matchId}/captain-votes`);
}

export async function assignTeams(
  matchId: string,
  method: 'random' | 'elo' | 'manual',
  assignments?: Array<{ userId: string; teamId: string }>
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}/assign-teams`, {
    method: 'PATCH',
    body: JSON.stringify({ method, assignments }),
  });
}

export async function captainPickPlayer(
  matchId: string,
  playerId: string,
  teamId: string
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}/captain-pick`, {
    method: 'POST',
    body: JSON.stringify({ playerId, teamId }),
  });
}

export async function performCoinflip(
  matchId: string,
  purpose: string
): Promise<{ result: string; value: number }> {
  return apiRequest<{ result: string; value: number }>(`/api/matches/${matchId}/coinflip`, {
    method: 'POST',
    body: JSON.stringify({ purpose }),
  });
}

export async function addTestUsersToMatch(
  matchId: string
): Promise<{ message: string; addedUsers: Array<{ userId: string; username: string; teamId: string }>; totalPlayers: number }> {
  return apiRequest<{ message: string; addedUsers: Array<{ userId: string; username: string; teamId: string }>; totalPlayers: number }>(`/api/matches/${matchId}/add-test-users`, {
    method: 'POST',
  });
}

export async function resetTeams(matchId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}/reset-teams`, {
    method: 'POST',
  });
}

export async function startCaptainVoting(matchId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}/start-captain-voting`, {
    method: 'PATCH',
  });
}

export async function finalizeCaptains(matchId: string): Promise<{ message: string; captain1Id: string; captain2Id: string }> {
  return apiRequest<{ message: string; captain1Id: string; captain2Id: string }>(`/api/matches/${matchId}/finalize-captains`, {
    method: 'PATCH',
  });
}

export async function finalizeTeams(matchId: string): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}/finalize-teams`, {
    method: 'PATCH',
  });
}

// Import match from Tracker.gg
export interface ImportedMatch {
  id: string;
  trackerLink: string;
  importedAt: string;
  importedBy: string;
  matchData: any;
  eloChanges: Array<{
    userId: string | null;
    username: string;
    currentElo: number;
    newElo: number;
    eloChange: number;
    won: boolean;
    isTemporary?: boolean;
    kFactor?: number;
    error?: string;
    stats: {
      kills: number;
      deaths: number;
      assists: number;
      acs: number;
      adr: number;
      headshotPercent: number;
      firstKills: number;
      firstDeaths: number;
      kast: number;
      clutches: number;
      multiKills: number;
    };
  }>;
  score: {
    alpha: number;
    bravo: number;
  };
  maps: Array<{
    name: string;
    score: {
      alpha: number;
      bravo: number;
    };
  }>;
}

export async function importMatchFromTracker(trackerLink: string): Promise<{ message: string; match: { id: string; trackerLink: string; usernames: string[]; status: 'pending_stats' } }> {
  return apiRequest<{ message: string; match: { id: string; trackerLink: string; usernames: string[]; status: 'pending_stats' } }>('/api/import', {
    method: 'POST',
    body: JSON.stringify({ trackerLink }),
  });
}

export async function completeImportWithStats(
  matchId: string,
  players: Array<{
    username: string;
    team: 'Team Alpha' | 'Team Bravo';
    kills: number;
    deaths: number;
    assists: number;
    acs: number;
    adr: number;
    headshotPercent: number;
    firstKills: number;
    firstDeaths: number;
    kast: number;
    multiKills: number;
    damageDelta?: number | null;
  }>,
  score: { alpha: number; bravo: number },
  maps?: Array<{ name: string; score: { alpha: number; bravo: number } }>
): Promise<{ message: string; match: ImportedMatch }> {
  return apiRequest<{ message: string; match: ImportedMatch }>(`/api/import/${matchId}/complete`, {
    method: 'POST',
    body: JSON.stringify({ players, score, maps }),
  });
}

export async function getImportedMatches(): Promise<{ matches: ImportedMatch[] }> {
  return apiRequest<{ matches: ImportedMatch[] }>('/api/import');
}

// Submit match stats and calculate Elo
export interface MatchStatsSubmission {
  maps: Array<{
    mapName: string;
    winnerTeamId: string;
    score: { alpha: number; bravo: number };
    playerStats: Array<{
      userId: string;
      teamId: string;
      kills: number;
      deaths: number;
      assists: number;
      acs: number;
      adr: number;
      headshotPercent: number;
      firstKills: number;
      firstDeaths: number;
      kast: number;
      multiKills: number;
      damageDelta?: number;
    }>;
  }>;
  winnerTeamId: string;
  adminOverride?: boolean;
}

export interface EloChangeResult {
  userId: string;
  oldElo: number;
  newElo: number;
  change: number;
}

export async function submitMatchStats(
  matchId: string,
  stats: MatchStatsSubmission
): Promise<{ message: string; eloResults: EloChangeResult[] }> {
  return apiRequest<{ message: string; eloResults: EloChangeResult[] }>(
    `/api/matches/${matchId}/stats`,
    {
      method: 'POST',
      body: JSON.stringify(stats),
    }
  );
}

// Submit stats for a single map
export interface MapStatsSubmission {
  mapName: string;
  winnerTeamId: string;
  score: { alpha: number; bravo: number };
  playerStats: Array<{
    userId: string;
    teamId: string;
    kills: number;
    deaths: number;
    assists: number;
    acs: number;
    adr: number;
    headshotPercent: number;
    firstKills: number;
    firstDeaths: number;
    kast: number;
    multiKills: number;
    damageDelta?: number;
  }>;
}

export async function submitMapStats(
  matchId: string,
  stats: MapStatsSubmission
): Promise<{ 
  message: string; 
  matchCompleted: boolean;
  eloResults?: EloChangeResult[];
  mapsPlayed?: number;
  mapsNeeded?: number;
}> {
  return apiRequest<{ 
    message: string; 
    matchCompleted: boolean;
    eloResults?: EloChangeResult[];
    mapsPlayed?: number;
    mapsNeeded?: number;
  }>(
    `/api/matches/${matchId}/stats/map`,
    {
      method: 'POST',
      body: JSON.stringify(stats),
    }
  );
}

export async function getImportedMatch(id: string): Promise<{ match: ImportedMatch }> {
  return apiRequest<{ match: ImportedMatch }>(`/api/import/${id}`);
}

export async function clearImportedMatches(): Promise<{ message: string }> {
  return apiRequest<{ message: string }>('/api/import', {
    method: 'DELETE',
  });
}

export async function addUserToMatchManually(
  matchId: string,
  userData: {
    userId: string
  }
): Promise<{
  message: string
  user: { id: string; username: string; discordId: string }
}> {
  return apiRequest<{
    message: string
    user: { id: string; username: string; discordId: string }
  }>(`/api/matches/${matchId}/add-user-manual`, {
    method: 'POST',
    body: JSON.stringify(userData),
  })
}

// ROOT Override functions
export async function rootAssignTeams(
  matchId: string,
  data: {
    teamAlpha: Array<{ userId: string }>
    teamBravo: Array<{ userId: string }>
    alphaCaptainId?: string
    bravoCaptainId?: string
  }
): Promise<{ message: string; teamAlpha: number; teamBravo: number }> {
  return apiRequest<{ message: string; teamAlpha: number; teamBravo: number }>(
    `/api/matches/${matchId}/root-assign-teams`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

export async function updateMatchStatus(
  matchId: string,
  status: MatchStatus
): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/api/matches/${matchId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function rootSetMatchStatus(
  matchId: string,
  status: 'DRAFT' | 'CAPTAIN_VOTING' | 'TEAM_SELECTION' | 'MAP_PICK_BAN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
): Promise<{ message: string; status: string }> {
  return apiRequest<{ message: string; status: string }>(
    `/api/matches/${matchId}/root-set-status`,
    {
      method: 'POST',
      body: JSON.stringify({ status }),
    }
  )
}

export async function rootSetMaps(
  matchId: string,
  maps: Array<{
    mapName: string
    action: 'PICK' | 'BAN'
    teamId?: string
    wasPlayed?: boolean
  }>
): Promise<{ message: string; mapsCount: number }> {
  return apiRequest<{ message: string; mapsCount: number }>(
    `/api/matches/${matchId}/root-set-maps`,
    {
      method: 'POST',
      body: JSON.stringify({ maps }),
    }
  )
}
