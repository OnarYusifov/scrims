import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index';
import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer';

// In-memory storage for imported matches (RAM only, resets on restart)
const importedMatches = new Map<string, any>();

// In-memory temporary players (for calculation only, not in database)
const temporaryPlayers = new Map<string, {
  id: string;
  username: string;
  elo: number;
  matchesPlayed: number;
  isCalibrating: boolean;
}>();

interface PlayerStats {
  username?: string; // Optional during initial import
  placeholderId?: string; // Temporary ID for unmatched stats
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
  clutches: number;
  multiKills: number;
  plants?: number; // Spike plants
  defuses?: number; // Spike defuses
}

interface TrackerMatchData {
  matchId: string;
  trackerLink: string;
  players: PlayerStats[];
  winner: 'Team Alpha' | 'Team Bravo';
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
  isMatchingUsernames?: boolean; // Flag for two-phase import
}


export default async function importRoutes(fastify: FastifyInstance) {
  // Import match from OP.GG link
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { trackerLink } = request.body as { trackerLink: string };
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;

      // Only ROOT/ADMIN can import matches
      if (!['ROOT', 'ADMIN'].includes(userRole)) {
        return reply.code(403).send({ error: 'Only admins can import matches' });
      }

      if (!trackerLink || !trackerLink.includes('op.gg')) {
        return reply.code(400).send({ error: 'Invalid OP.GG link. Please provide an OP.GG match URL.' });
      }

      // Parse match ID from URL
      // Example: https://op.gg/valorant/match/abc123/username
      const matchIdMatch = trackerLink.match(/match\/([a-zA-Z0-9\-]+)/);
      if (!matchIdMatch) {
        return reply.code(400).send({ error: 'Could not parse match ID from URL' });
      }

      const matchId = matchIdMatch[1];

      // Check if already imported
      if (importedMatches.has(matchId)) {
        return reply.code(400).send({ error: 'Match already imported' });
      }

      // Phase 1: Extract usernames from OP.GG
      fastify.log.info('Phase 1: Extracting usernames from OP.GG...');
      const extractedUsernames = await extractUsernamesFromOpgg(trackerLink, fastify);
      
      if (extractedUsernames.length === 0) {
        return reply.code(400).send({ error: 'Could not extract usernames from OP.GG page. Please check the link.' });
      }
      
      fastify.log.info(`Phase 1 complete: Extracted ${extractedUsernames.length} usernames`);
      
      // Store match in pending state (waiting for manual stats)
      const pendingMatch = {
        id: matchId,
        trackerLink,
        importedAt: new Date().toISOString(),
        importedBy: userId,
        usernames: extractedUsernames,
        status: 'pending_stats', // Waiting for manual stats entry
      };
      
      importedMatches.set(matchId, pendingMatch);
      
      return {
        message: 'Usernames extracted successfully. Please enter stats manually.',
        match: {
          id: matchId,
          trackerLink,
          usernames: extractedUsernames,
          status: 'pending_stats',
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Complete import with manually entered stats
  fastify.post('/:id/complete', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params as { id: string };
      const { players: manualPlayers, score, maps } = request.body as {
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
        }>;
        score: {
          alpha: number;
          bravo: number;
        };
        maps?: Array<{
          name: string;
          score: {
            alpha: number;
            bravo: number;
          };
        }>;
      };
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;

      // Only ROOT/ADMIN can import matches
      if (!['ROOT', 'ADMIN'].includes(userRole)) {
        return reply.code(403).send({ error: 'Only admins can import matches' });
      }

      // Get pending match
      const pendingMatch = importedMatches.get(matchId);
      if (!pendingMatch || pendingMatch.status !== 'pending_stats') {
        return reply.code(404).send({ error: 'Pending match not found or already completed' });
      }

      if (manualPlayers.length !== 10) {
        return reply.code(400).send({ error: 'Must provide stats for exactly 10 players' });
      }

      // Convert manual players to PlayerStats format
      const matchData: TrackerMatchData = {
        matchId,
        trackerLink: pendingMatch.trackerLink,
        players: manualPlayers.map(p => ({
          username: p.username,
          team: p.team,
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          acs: p.acs,
          adr: p.adr,
          headshotPercent: p.headshotPercent,
          firstKills: p.firstKills,
          firstDeaths: p.firstDeaths,
          kast: p.kast,
          multiKills: p.multiKills,
          clutches: 0, // Not available, set to 0
          plants: 0, // Not needed
          defuses: 0, // Not needed
        })),
        winner: score.alpha > score.bravo ? 'Team Alpha' : 'Team Bravo',
        score,
        maps: maps || [{
          name: 'Unknown Map',
          score,
        }],
      };

      // Get all players from database to match by username
      const playersWithUsernames = matchData.players.filter(p => p.username);
      const dbUsers = playersWithUsernames.length > 0 ? await prisma.user.findMany({
        where: {
          username: {
            in: playersWithUsernames.map(p => p.username!).filter(Boolean),
          },
        },
      }) : [];

      // Create username to user ID mapping
      const usernameToUserId = new Map(
        dbUsers.map(u => [u.username.toLowerCase(), u.id])
      );

      // Create temporary players for those not in database
      matchData.players.forEach(player => {
        if (player.username) {
          const foundInDb = dbUsers.find(u => u.username.toLowerCase() === player.username!.toLowerCase());
          if (!foundInDb) {
            // Create temporary player in memory
            const tempId = `temp-${player.username.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
            temporaryPlayers.set(tempId, {
              id: tempId,
              username: player.username,
              elo: 800, // Default starting Elo
              matchesPlayed: 0,
              isCalibrating: true,
            });
          }
        }
      });

      // Combine DB users with temporary players
      const allPlayers = [
        ...dbUsers.map(u => ({
          id: u.id,
          username: u.username,
          elo: u.elo,
          matchesPlayed: u.matchesPlayed || 0,
          isCalibrating: u.isCalibrating || false,
        })),
        ...Array.from(temporaryPlayers.values()),
      ];

      // Calculate team averages and Elo changes
      const teamAlphaPlayers = matchData.players.filter(p => p.team === 'Team Alpha');
      const teamBravoPlayers = matchData.players.filter(p => p.team === 'Team Bravo');

      const alphaEloSum = teamAlphaPlayers.reduce((sum, p) => {
        if (p.username && !p.username.startsWith('player-')) {
          const user = allPlayers.find(u => u.username.toLowerCase() === (p.username || '').toLowerCase());
          return sum + (user?.elo || 800);
        }
        return sum + 800; // Default Elo for unmatched players
      }, 0);
      const alphaAvgElo = alphaEloSum / teamAlphaPlayers.length;

      const bravoEloSum = teamBravoPlayers.reduce((sum, p) => {
        if (p.username && !p.username.startsWith('player-')) {
          const user = allPlayers.find(u => u.username.toLowerCase() === (p.username || '').toLowerCase());
          return sum + (user?.elo || 800);
        }
        return sum + 800; // Default Elo for unmatched players
      }, 0);
      const bravoAvgElo = bravoEloSum / teamBravoPlayers.length;

      const allAcs = matchData.players.map(p => p.acs);
      const avgAcs = allAcs.reduce((sum, acs) => sum + acs, 0) / allAcs.length;

      // Calculate Elo changes for each player
      const eloChanges = await Promise.all(
        matchData.players.map(async (player) => {
          // Use username or placeholder ID
          const identifier = player.username || player.placeholderId || 'unknown';
          
          // Find player in DB or temporary players
          const user = player.username 
            ? allPlayers.find(u => u.username.toLowerCase() === player.username!.toLowerCase())
            : null;
          
          if (!user) {
            // Player not in database, use default Elo
            return {
              userId: null,
              username: player.username || identifier,
              currentElo: 800,
              newElo: 800,
              eloChange: 0,
              won: matchData.winner === player.team,
              isTemporary: !!player.username, // Temporary if username exists but not in DB
              stats: {
                kills: player.kills,
                deaths: player.deaths,
                assists: player.assists,
                acs: player.acs || 0,
                adr: player.adr,
                headshotPercent: player.headshotPercent,
                firstKills: player.firstKills,
                firstDeaths: player.firstDeaths,
                kast: player.kast,
                clutches: 0, // Not available
                multiKills: player.multiKills,
              },
            };
          }

          const isTemporary = user.id.startsWith('temp-');

          const isAlpha = player.team === 'Team Alpha';
          const won = matchData.winner === player.team;
          const opponentAvgElo = isAlpha ? bravoAvgElo : alphaAvgElo;

          // Calculate Elo without saving to database (read-only simulation)
          // Use EloService logic but don't persist
          try {
            // Get user's current state for K-factor calculation
            const userState = {
              elo: user.elo,
              matchesPlayed: user.matchesPlayed || 0,
              isCalibrating: user.isCalibrating || false,
            };

            // Calculate K-factor (same logic as EloService)
            const START_RATING = 800;
            const CALIBRATION_MATCHES = 10;
            const CALIBRATION_K = 48;
            const NORMAL_K = 32;
            const HIGH_ELO_K = 24;
            const HIGH_ELO_THRESHOLD = 1600;
            const MAX_CHANGE_PER_SERIES = 150;

            let kFactor: number;
            if (userState.isCalibrating && userState.matchesPlayed < CALIBRATION_MATCHES) {
              kFactor = CALIBRATION_K;
            } else if (userState.elo >= HIGH_ELO_THRESHOLD) {
              kFactor = HIGH_ELO_K;
            } else {
              kFactor = NORMAL_K;
            }

            // Series multiplier (BO1 = 1.0)
            const seriesMultiplier = 1.0;

            // Calculate expected score
            const expectedScore = 1 / (1 + Math.pow(10, (opponentAvgElo - userState.elo) / 400));
            const actualScore = won ? 1 : 0;

            // Calculate Elo change
            let eloChange = Math.round(kFactor * seriesMultiplier * (actualScore - expectedScore));

            // Apply per-series cap
            if (Math.abs(eloChange) > MAX_CHANGE_PER_SERIES) {
              eloChange = Math.sign(eloChange) * MAX_CHANGE_PER_SERIES;
            }

            const oldElo = userState.elo;
            const newElo = Math.max(0, oldElo + eloChange);

            return {
              userId: isTemporary ? null : user.id, // Only return real user ID
              username: player.username || identifier,
              currentElo: oldElo,
              newElo: newElo,
              eloChange: eloChange,
              won,
              kFactor,
              isTemporary,
              stats: {
                kills: player.kills,
                deaths: player.deaths,
                assists: player.assists,
                acs: player.acs || 0,
                adr: player.adr,
                headshotPercent: player.headshotPercent,
                firstKills: player.firstKills,
                firstDeaths: player.firstDeaths,
                kast: player.kast,
                clutches: 0, // Not available
                multiKills: player.multiKills,
              },
            };
              } catch (error) {
                fastify.log.error(`Error calculating Elo for ${user.username}: ${error instanceof Error ? error.message : String(error)}`);
                return {
                  userId: isTemporary ? null : user.id,
                  username: player.username || identifier,
                  currentElo: user.elo,
                  newElo: user.elo,
                  eloChange: 0,
                  won,
                  isTemporary,
                  error: 'Failed to calculate Elo',
                  stats: {
                    kills: player.kills,
                    deaths: player.deaths,
                    assists: player.assists,
                    acs: player.acs,
                    adr: player.adr,
                    headshotPercent: player.headshotPercent,
                    firstKills: player.firstKills,
                    firstDeaths: player.firstDeaths,
                    kast: player.kast,
                    clutches: player.clutches,
                    multiKills: player.multiKills,
                  },
                };
              }
            })
          );

      // Store in memory (not database)
      const importedMatch = {
        id: matchId,
        trackerLink: pendingMatch.trackerLink,
        importedAt: new Date().toISOString(),
        importedBy: userId,
        matchData: matchData,
        eloChanges,
        score: matchData.score,
        maps: matchData.maps,
      };

      importedMatches.set(matchId, importedMatch);

      fastify.log.info(`Match imported: ${matchId} by user ${userId}`);

      return {
        message: 'Match imported successfully (stored in memory only)',
        match: importedMatch,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get all imported matches
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const matches = Array.from(importedMatches.values());
      return { matches };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get specific imported match
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const match = importedMatches.get(id);
      
      if (!match) {
        return reply.code(404).send({ error: 'Imported match not found' });
      }

      return { match };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Clear all imported matches (for testing)
  fastify.delete('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      if (!['ROOT', 'ADMIN'].includes(userRole)) {
        return reply.code(403).send({ error: 'Only admins can clear imported matches' });
      }

      importedMatches.clear();
      temporaryPlayers.clear(); // Also clear temporary players
      return { message: 'All imported matches and temporary players cleared from memory' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
}

// Extract usernames from OP.GG page
async function extractUsernamesFromOpgg(opggLink: string, fastify: FastifyInstance): Promise<string[]> {
  const usernames: string[] = [];
  
  try {
    let html: string;
    
    // Try regular fetch first
    try {
      const response = await fetch(opggLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (response.status === 403) {
        html = await fetchWithPuppeteer(opggLink, fastify);
      } else if (!response.ok) {
        throw new Error(`Failed to fetch OP.GG page: ${response.status} ${response.statusText}`);
      } else {
        html = await response.text();
      }
    } catch (error: any) {
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        html = await fetchWithPuppeteer(opggLink, fastify);
      } else {
        throw error;
      }
    }

    const $ = cheerio.load(html);
    
    // OP.GG uses links in format: /valorant/agents/Jett or profile links
    // Extract usernames from table rows - look for links like [ozby#ragin](ozby-ragin)
    $('table tbody tr').each((_, element) => {
      const $row = $(element);
      
      // Look for username links in the row
      $row.find('a[href*="/valorant/"]').each((_, link) => {
        const $link = $(link);
        const href = $link.attr('href') || '';
        const text = $link.text().trim();
        
        // OP.GG format: links like [ozby#ragin](ozby-ragin) or [The Chosen One#AZE](The-Chosen-One-AZE)
        // Extract username from link text or href
        if (text && text.includes('#')) {
          // Format: "ozby#ragin" or "ozby #ragin" or "The Chosen One#AZE" or "A1The Chosen One#AZEAscendant"
          let username = text.trim(); // Keep spaces for now
          
          // Remove rank prefixes like "A1", "A3", "D2", "Im1" etc. (but not just "A" at start)
          // Match patterns like: A1, A3, D2, Im1, I1, etc. (rank abbreviation + number)
          username = username.replace(/^(A[1-3]|D[1-3]|I[1-3]|Im[1-3]|G[1-3]|P[1-3]|S[1-3]|B[1-3]|R[1-3]|Unrank)\s*/, ''); // Remove rank prefixes with optional space
          
          // Remove rank suffixes like "Ascendant", "Diamond", "Immortal", "Unrank", etc.
          // Match patterns like: "Ascendant1", "Ascendant 1", "Diamond2", "Immortal3", etc.
          username = username.replace(/\s*(Ascendant|Diamond|Immortal|Unrank|Bronze|Silver|Gold|Platinum|Radiant|Iron)(\s*\d+)?$/i, '');
          
          // Normalize whitespace around # but keep spaces in username
          // "The Chosen One #AZE" -> "The Chosen One#AZE"
          username = username.replace(/\s*#\s*/, '#');
          
          // Final cleanup: ensure format is "name#tag" (name can have spaces)
          if (username.includes('#')) {
            const parts = username.split('#');
            if (parts.length === 2 && parts[0].trim().length > 0 && parts[1].trim().length > 0) {
              // Clean tag: remove any rank suffixes that might have been left
              let tag = parts[1].trim();
              tag = tag.replace(/(Ascendant|Diamond|Immortal|Unrank|Bronze|Silver|Gold|Platinum|Radiant|Iron)(\d+)?$/i, '');
              
              // Clean name: remove any rank prefixes/suffixes
              let name = parts[0].trim();
              name = name.replace(/^(A[1-3]|D[1-3]|I[1-3]|Im[1-3]|G[1-3]|P[1-3]|S[1-3]|B[1-3]|R[1-3]|Unrank)\s*/, '');
              name = name.replace(/\s*(Ascendant|Diamond|Immortal|Unrank|Bronze|Silver|Gold|Platinum|Radiant|Iron)(\d+)?$/i, '');
              
              if (name.length > 0 && tag.length > 0) {
                username = `${name}#${tag}`;
                if (!usernames.includes(username)) {
                  usernames.push(username);
                }
              }
            }
          }
        } else if (href.includes('-') && !href.includes('/agents/')) {
          // Extract from href like "/valorant/ozby-ragin" -> "ozby#ragin"
          // Or "/valorant/The-Chosen-One-AZE" -> "The Chosen One#AZE"
          const hrefParts = href.split('/').pop();
          if (hrefParts && hrefParts.includes('-')) {
            // Split by last dash (before tag) - tag is usually short and at the end
            // Format: "The-Chosen-One-AZE" -> "The Chosen One#AZE"
            const parts = hrefParts.split('-');
            if (parts.length >= 2) {
              // Last part is usually the tag (short, uppercase or numbers)
              const tag = parts[parts.length - 1];
              const nameParts = parts.slice(0, -1);
              const name = nameParts.join(' '); // Join with spaces
              const username = `${name}#${tag}`;
              if (username && username.includes('#') && !usernames.includes(username)) {
                usernames.push(username);
              }
            } else {
              // Fallback: simple format "ozby-ragin" -> "ozby#ragin"
              const username = hrefParts.replace(/-/g, '#').replace(/_/g, '#');
              if (username && username.includes('#') && !usernames.includes(username)) {
                usernames.push(username);
              }
            }
          }
        }
      });
      
      // Also try extracting from row text directly - but be more careful
      const rowText = $row.text();
      // Look for patterns like "ozby#ragin" or "The Chosen One#AZE" - handle spaces in usernames
      // Match: (name with spaces) # (tag without spaces)
      const usernameMatch = rowText.match(/([A-Za-z0-9_\-\s]+?)\s*#\s*([A-Za-z0-9_\-]+)/);
      if (usernameMatch) {
        let name = usernameMatch[1].trim();
        let tag = usernameMatch[2].trim();
        
        // Remove rank prefixes from name
        name = name.replace(/^(A[1-3]|D[1-3]|I[1-3]|Im[1-3]|G[1-3]|P[1-3]|S[1-3]|B[1-3]|R[1-3]|Unrank)\s*/, '');
        
        // Remove rank suffixes from name
        name = name.replace(/\s*(Ascendant|Diamond|Immortal|Unrank|Bronze|Silver|Gold|Platinum|Radiant|Iron)(\s*\d+)?$/i, '');
        
        // Clean tag: remove any rank suffixes that might be in the tag
        tag = tag.replace(/(Ascendant|Diamond|Immortal|Unrank|Bronze|Silver|Gold|Platinum|Radiant|Iron)(\d+)?$/i, '');
        
        const username = `${name.trim()}#${tag.trim()}`;
        
        // Ensure it's still a valid username format (name can have spaces)
        if (username.includes('#') && name.trim().length > 0 && tag.trim().length > 0 && !usernames.includes(username)) {
          usernames.push(username);
        }
      }
    });
    
    fastify.log.info(`Extracted ${usernames.length} usernames from OP.GG`);
    return usernames;
  } catch (error) {
    fastify.log.error(`Error extracting usernames from OP.GG: ${error}`);
    return [];
  }
}

// Fetch match data from OP.GG (simpler HTML structure, easier to parse)
async function fetchOpggMatch(opggLink: string, fastify: FastifyInstance): Promise<TrackerMatchData> {
  try {
    fastify.log.info(`Fetching OP.GG match data from: ${opggLink}`);
    
    let html: string;
    
    // Try regular fetch first
    try {
      const response = await fetch(opggLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });

      if (!response.ok) {
        if (response.status === 403) {
          fastify.log.warn('OP.GG regular fetch blocked, trying with Puppeteer...');
          html = await fetchWithPuppeteer(opggLink, fastify);
        } else {
          throw new Error(`Failed to fetch OP.GG page: ${response.status} ${response.statusText}`);
        }
      } else {
        html = await response.text();
      }
    } catch (error: any) {
      if (error.message?.includes('403') || error.message?.includes('Forbidden')) {
        fastify.log.warn('OP.GG fetch blocked, trying with Puppeteer...');
        html = await fetchWithPuppeteer(opggLink, fastify);
      } else {
        throw error;
      }
    }

    const $ = cheerio.load(html);
    const matchId = opggLink.match(/match\/([a-zA-Z0-9\-]+)/)?.[1] || 'unknown';
    
    const players: PlayerStats[] = [];
    let teamAlphaScore = 0;
    let teamBravoScore = 0;
    
    // OP.GG uses clear table structure - much easier to parse!
    // Based on actual OP.GG structure: tables with tbody tr elements
    // Victory team table first, then Lose team table
    
    let isVictoryTeam = true; // Track which team we're parsing
    let victoryTeamCount = 0;
    
    $('table tbody tr').each((_, element) => {
      const $row = $(element);
      const rowText = $row.text();
      
      // Skip empty rows or header rows
      if (!rowText.trim() || rowText.includes('OP Score') || rowText.includes('Rank') || rowText.includes('KDA') || rowText.includes('ACS')) {
        // Check if we've moved to the Lose team section
        if (rowText.includes('Lose') || rowText.includes('Enemy team')) {
          isVictoryTeam = false;
        }
        return;
      }
      
      // Check if this is the start of a new team section
      if (rowText.includes('Victory') || rowText.includes('My team')) {
        if (victoryTeamCount >= 5) {
          isVictoryTeam = false;
        }
        return;
      }
      
      // Extract data from table cells - OP.GG has structured columns
      const cells = $row.find('td');
      if (cells.length < 10) return; // Not a valid player row (need enough columns)
      
      // Extract KDA from cells - look for pattern like "33 / 15 / 4" or "33/15/4"
      // OP.GG displays KDA in a specific column, usually after rank/name
      let kdaText = '';
      let kills = 0, deaths = 0, assists = 0;
      
      // Try to find KDA in cells - look for the pattern with slashes
      cells.each((idx, cell) => {
        const text = $(cell).text().trim();
        // Match patterns: "33 / 15 / 4", "33/15/4", "33/ 15/ 4", etc.
        const kdaMatch = text.match(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/);
        if (kdaMatch) {
          const k = parseInt(kdaMatch[1]);
          const d = parseInt(kdaMatch[2]);
          const a = parseInt(kdaMatch[3]);
          // Validate: kills/deaths/assists should be reasonable (0-50 for a match)
          if (k >= 0 && k <= 50 && d >= 0 && d <= 50 && a >= 0 && a <= 50) {
            kdaText = text;
            kills = k;
            deaths = d;
            assists = a;
            return false; // Break out of each loop
          }
        }
      });
      
      // If not found in cells, try extracting from row text directly
      if (!kdaText || (kills === 0 && deaths === 0 && assists === 0)) {
        // Match KDA pattern in row text - be more flexible with whitespace
        const kdaMatch = rowText.match(/(\d+)\s*\/\s*(\d+)\s*\/\s*(\d+)/);
        if (kdaMatch) {
          const k = parseInt(kdaMatch[1]);
          const d = parseInt(kdaMatch[2]);
          const a = parseInt(kdaMatch[3]);
          // Validate: kills/deaths/assists should be reasonable
          if (k >= 0 && k <= 50 && d >= 0 && d <= 50 && a >= 0 && a <= 50) {
            kills = k;
            deaths = d;
            assists = a;
          } else {
            return; // Invalid KDA, skip this row
          }
        } else {
          return; // No KDA found, skip this row
        }
      }
      
      // Additional validation: skip unrealistic stats
      if (kills > 50 || deaths > 50 || assists > 50) return;
      if (kills === 0 && deaths === 0 && assists === 0) return;
      
      // Extract all stats from table cells directly
      // OP.GG table structure: Rank | KDA | ACS | ADR | DDΔ | HS% | KAST | KD | FK | FD | MK | PL | DF
      const cellValues: string[] = [];
      cells.each((idx, cell) => {
        cellValues.push($(cell).text().trim());
      });
      
      // Extract ACS - look for decimal number followed by "Avg. score" or just a large number
      let acs = 0;
      for (let i = 0; i < cellValues.length; i++) {
        const text = cellValues[i];
        // Match "376.88" or "376.88Avg. score" or just "376"
        const acsMatch = text.match(/(\d+\.?\d*)\s*(?:Avg\.?\s*score)?/);
        if (acsMatch) {
          const potentialAcs = parseFloat(acsMatch[1]);
          // ACS should be between 50-500 for realistic Valorant matches
          if (potentialAcs >= 50 && potentialAcs <= 500) {
            acs = Math.round(potentialAcs);
            break;
          }
        }
      }
      
      // If ACS not found, calculate from KDA
      if (acs === 0) {
        acs = Math.round((kills * 150 + deaths * -50 + assists * 50) / 24);
      }
      
      // Extract ADR - look for number followed by "Avg. dmg" or just a number in range 50-400
      // ADR comes after ACS in the table
      let adr = 0;
      let acsFound = false;
      for (let i = 0; i < cellValues.length; i++) {
        const text = cellValues[i];
        
        // Check if we've passed the ACS column
        if (acs > 0 && !acsFound) {
          const potentialAcs = parseFloat(text.replace(/[^\d.]/g, ''));
          if (Math.abs(potentialAcs - acs) < 10) {
            acsFound = true;
            continue; // Next cell should be ADR
          }
        }
        
        const adrMatch = text.match(/(\d+)\s*(?:Avg\.?\s*dmg)?/);
        if (adrMatch) {
          const potentialAdr = parseInt(adrMatch[1]);
          // ADR should be between 50-400 for realistic matches
          // Also check it's not ACS (which is usually higher and has decimals)
          if (potentialAdr >= 50 && potentialAdr <= 400 && potentialAdr !== acs) {
            // If we found ACS, ADR should be in the next few cells
            if (acsFound || acs === 0) {
              adr = potentialAdr;
              break;
            }
          }
        }
      }
      
      if (adr === 0) {
        adr = Math.round(kills * 75 + assists * 25);
      }
      
      // Extract HS% and KAST from table cells - they're in specific columns
      // OP.GG structure: ... | ADR | DDΔ | HS% | KAST | ...
      let hs = 0;
      let kast = 0;
      
      // Look for percentages in cells - HS% comes before KAST
      for (let i = 0; i < cellValues.length; i++) {
        const text = cellValues[i];
        const percentMatch = text.match(/(\d+)\s*%/);
        if (percentMatch) {
          const percentValue = parseFloat(percentMatch[1]);
          // HS% should be between 0-100, KAST should be between 0-100
          if (percentValue >= 0 && percentValue <= 100) {
            // First valid percentage is usually HS%, second is KAST
            if (hs === 0) {
              hs = percentValue;
            } else if (kast === 0 && hs > 0) {
              kast = percentValue;
              break; // Found both
            }
          }
        }
      }
      
      // Fallback: try extracting from row text if not found in cells
      if (hs === 0 || kast === 0) {
        const percentages = rowText.match(/(\d+)\s*%/g);
        if (percentages && percentages.length > 0) {
          const firstPercent = parseFloat(percentages[0].replace('%', ''));
          if (firstPercent >= 0 && firstPercent <= 100) {
            if (hs === 0) hs = firstPercent;
          }
        }
        if (percentages && percentages.length > 1) {
          const secondPercent = parseFloat(percentages[1].replace('%', ''));
          if (secondPercent >= 0 && secondPercent <= 100) {
            if (kast === 0) kast = secondPercent;
          }
        }
      }
      
      // Extract FK (First Kills) - usually single digit, column after KAST
      let fk = 0;
      for (let i = 0; i < cellValues.length; i++) {
        const text = cellValues[i];
        const num = parseInt(text);
        if (num >= 0 && num <= 25 && text.length <= 2) { // FK is usually 0-25
          // Check if this cell is in the FK column position (after KAST)
          if (i > 5 && fk === 0) {
            fk = num;
          }
        }
      }
      if (fk === 0) fk = Math.floor(kills * 0.15);
      
      // Extract FD (First Deaths) - usually single digit, column after FK
      let fd = 0;
      for (let i = 0; i < cellValues.length; i++) {
        const text = cellValues[i];
        const num = parseInt(text);
        if (num >= 0 && num <= 25 && text.length <= 2 && fk > 0) {
          // FD is usually right after FK
          const fkIndex = cellValues.findIndex(c => parseInt(c) === fk);
          if (i === fkIndex + 1) {
            fd = num;
            break;
          }
        }
      }
      if (fd === 0) fd = Math.floor(deaths * 0.15);
      
      // Extract MK (Multi Kills) - usually near the end, single digit
      let multiKills = 0;
      for (let i = cellValues.length - 3; i < cellValues.length; i++) {
        if (i < 0) continue;
        const text = cellValues[i];
        const num = parseInt(text);
        if (num >= 0 && num <= 10 && text.length <= 2) {
          // Check if this looks like a multi-kill count
          multiKills = num;
          break;
        }
      }
      if (multiKills === 0) multiKills = Math.floor(kills / 4);
      
      // Extract PL (Plants) - usually near the end
      let plants = 0;
      for (let i = cellValues.length - 2; i < cellValues.length; i++) {
        if (i < 0) continue;
        const text = cellValues[i];
        const num = parseInt(text);
        if (num >= 0 && num <= 5 && text.length <= 1) {
          plants = num;
          break;
        }
      }
      
      // Extract DF (Defuses) - usually the last column
      let defuses = 0;
      const lastCell = cellValues[cellValues.length - 1];
      if (lastCell) {
        const num = parseInt(lastCell);
        if (num >= 0 && num <= 5 && lastCell.length <= 1) {
          defuses = num;
        }
      }
      
      // Track team assignment
      if (isVictoryTeam) {
        victoryTeamCount++;
      }
      
      // Check for duplicates
      const isDuplicate = players.some(p => 
        p.kills === kills && p.deaths === deaths && p.assists === assists
      );
      
      if (!isDuplicate) {
        players.push({
          team: isVictoryTeam ? 'Team Alpha' : 'Team Bravo', // Will be reassigned after sorting
          kills,
          deaths,
          assists,
          acs,
          adr,
          headshotPercent: hs,
          firstKills: fk,
          firstDeaths: fd,
          kast,
          clutches: 0, // OP.GG doesn't show clutches in this format
          multiKills,
          plants: plants, // Add plants
          defuses: defuses, // Add defuses
        });
      }
    });
    
    // Extract match score from page (e.g., "13 Victory" vs "11 Lose")
    // OP.GG displays scores like "13 Victory" and "11 Lose" or "13 - 11"
    const bodyText = $('body').text();
    
    // Try multiple patterns to find the score
    // Pattern 1: "13 Victory" vs "11 Lose"
    let scoreMatch = bodyText.match(/(\d+)\s*Victory.*?(\d+)\s*Lose|(\d+)\s*Lose.*?(\d+)\s*Victory/);
    if (scoreMatch) {
      teamAlphaScore = parseInt(scoreMatch[1] || scoreMatch[4] || '13');
      teamBravoScore = parseInt(scoreMatch[2] || scoreMatch[3] || '11');
    } else {
      // Pattern 2: "13 - 11" or "13:11"
      scoreMatch = bodyText.match(/(\d+)\s*[-:]\s*(\d+)/);
      if (scoreMatch) {
        teamAlphaScore = parseInt(scoreMatch[1]);
        teamBravoScore = parseInt(scoreMatch[2]);
      } else {
        // Validate scores are realistic (Valorant rounds go up to 13)
        if (teamAlphaScore > 13 || teamBravoScore > 13) {
          teamAlphaScore = 13;
          teamBravoScore = 11;
        } else {
          // Default scores
          teamAlphaScore = 13;
          teamBravoScore = 11;
        }
      }
    }
    
    // Validate scores are realistic (Valorant rounds go up to 13, OT can go to 15+ but rare)
    if (teamAlphaScore > 15 || teamBravoScore > 15) {
      fastify.log.warn(`Unrealistic scores detected: ${teamAlphaScore} - ${teamBravoScore}, using defaults`);
      teamAlphaScore = 13;
      teamBravoScore = 11;
    }
    
    // Extract map name if available
    const mapMatch = $('body').text().match(/Standard\s+Custom\s+(\w+)/);
    const mapName = mapMatch ? mapMatch[1] : 'Unknown Map';
    
    fastify.log.info(`OP.GG: Extracted ${players.length} players from OP.GG`);
    
    if (players.length < 10) {
      throw new Error(`Could not parse enough players from OP.GG page. Found ${players.length} players.`);
    }
    
    return {
      matchId,
      trackerLink: opggLink,
      players,
      winner: teamAlphaScore > teamBravoScore ? 'Team Alpha' : 'Team Bravo',
      score: {
        alpha: teamAlphaScore,
        bravo: teamBravoScore,
      },
      maps: [
        {
          name: mapName,
          score: {
            alpha: teamAlphaScore,
            bravo: teamBravoScore,
          },
        },
      ],
    };
  } catch (error) {
    fastify.log.error(`Error fetching OP.GG data: ${error}`);
    throw new Error(`Failed to fetch match data from OP.GG: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}


// Fetch using Puppeteer (headless browser) to bypass bot protection
async function fetchWithPuppeteer(trackerLink: string, fastify: FastifyInstance): Promise<string> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
      ],
    });

    const page = await browser.newPage();
    
    // Set realistic viewport and user agent
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Navigate to the page
    await page.goto(trackerLink, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait for the page to fully load and render dynamic content
    // Tracker.gg uses React/Vue, so we need to wait for components to mount
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Try multiple selectors that Tracker.gg might use for player stats
    const possibleSelectors = [
      'tbody tr',
      '[class*="player"]',
      '[class*="Player"]',
      '[class*="stat"]',
      '[class*="Stat"]',
      'table tr',
      '[data-player]',
      '.match-player',
    ];

    let foundStats = false;
    for (const selector of possibleSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        const elements = await page.$$(selector);
        if (elements.length >= 10) {
          fastify.log.info(`Found ${elements.length} elements with selector: ${selector}`);
          foundStats = true;
          break;
        }
      } catch (e) {
        // Try next selector
        continue;
      }
    }

    if (!foundStats) {
      fastify.log.warn('Could not find player selectors, waiting longer for dynamic content...');
      // Wait even longer for React/Vue to render
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Try scrolling to trigger lazy loading
      await page.evaluate(() => {
        // @ts-ignore - window and document are available in browser context
        window.scrollTo(0, document.body.scrollHeight);
        return new Promise(resolve => setTimeout(resolve, 2000));
      });
    }

    // Get the fully rendered HTML content
    const html = await page.content();
    
    // Debug: Save HTML to file for inspection (optional, remove in production)
    if (process.env.DEBUG_OPGG_HTML === 'true') {
      const fs = require('fs');
      fs.writeFileSync('/tmp/opgg-debug.html', html);
      fastify.log.info('Saved OP.GG HTML to /tmp/opgg-debug.html for debugging');
    }
    
    await browser.close();
    return html;
  } catch (error) {
    if (browser) {
      await browser.close();
    }
    fastify.log.error(`Puppeteer fetch failed: ${error}`);
    throw new Error(`Failed to fetch page with Puppeteer: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Generate simulated match data (fast, reliable, for testing)
// This was the original method that worked smoothly
async function generateSimulatedMatchData(trackerLink: string, matchId: string, fastify: FastifyInstance): Promise<TrackerMatchData> {
  fastify.log.info('Generating simulated match data (fast method)...');
  
  // Generate 10 players with realistic stats
  const players: PlayerStats[] = [];
  
  // Generate varied stats for realism
  const statRanges = [
    { kills: [15, 25], deaths: [8, 18], assists: [3, 10], acs: [180, 280] },
    { kills: [12, 20], deaths: [10, 16], assists: [4, 8], acs: [160, 240] },
    { kills: [10, 18], deaths: [12, 18], assists: [2, 7], acs: [140, 220] },
    { kills: [8, 16], deaths: [14, 20], assists: [1, 6], acs: [120, 200] },
    { kills: [6, 14], deaths: [16, 22], assists: [1, 5], acs: [100, 180] },
  ];
  
  // Generate 10 players (5 per team, sorted by ACS)
  for (let i = 0; i < 10; i++) {
    const range = statRanges[Math.floor(i / 2)]; // Alternate between ranges
    const kills = Math.floor(Math.random() * (range.kills[1] - range.kills[0] + 1)) + range.kills[0];
    const deaths = Math.floor(Math.random() * (range.deaths[1] - range.deaths[0] + 1)) + range.deaths[0];
    const assists = Math.floor(Math.random() * (range.assists[1] - range.assists[0] + 1)) + range.assists[0];
    const acs = Math.floor(Math.random() * (range.acs[1] - range.acs[0] + 1)) + range.acs[0];
    
    // Calculate derived stats
    const adr = Math.round(kills * 75 + assists * 25); // Approximate ADR
    const headshotPercent = Math.random() * 30 + 15; // 15-45% HS
    const firstKills = Math.floor(kills * 0.15);
    const firstDeaths = Math.floor(deaths * 0.15);
    const kast = Math.random() * 20 + 60; // 60-80% KAST
    const clutches = Math.random() < 0.3 ? 1 : 0; // 30% chance of clutch
    const multiKills = Math.floor(kills / 4);
    
    players.push({
      team: i < 5 ? 'Team Alpha' : 'Team Bravo', // Will be reassigned after sorting
      kills,
      deaths,
      assists,
      acs,
      adr,
      headshotPercent: Math.round(headshotPercent * 10) / 10,
      firstKills,
      firstDeaths,
      kast: Math.round(kast * 10) / 10,
      clutches,
      multiKills,
    });
  }
  
  // Sort by ACS (descending) - this is the key part
  players.sort((a, b) => b.acs - a.acs);
  
  // Reassign teams after sorting: top 5 = Alpha, next 5 = Bravo
  players.forEach((player, index) => {
    player.team = index < 5 ? 'Team Alpha' : 'Team Bravo';
  });
  
  // Determine winner (Team Alpha wins if they have higher total ACS)
  const alphaTotalAcs = players.filter(p => p.team === 'Team Alpha').reduce((sum, p) => sum + p.acs, 0);
  const bravoTotalAcs = players.filter(p => p.team === 'Team Bravo').reduce((sum, p) => sum + p.acs, 0);
  
  // Generate realistic scores
  const alphaScore = Math.floor(Math.random() * 3) + 13; // 13-15 rounds
  const bravoScore = alphaScore > 13 ? 13 - (alphaScore - 13) : Math.floor(Math.random() * 3) + 10;
  
  return {
    matchId,
    trackerLink,
    players,
    winner: alphaTotalAcs > bravoTotalAcs ? 'Team Alpha' : 'Team Bravo',
    score: {
      alpha: alphaScore,
      bravo: bravoScore,
    },
    maps: [
      {
        name: 'Unknown Map',
        score: {
          alpha: alphaScore,
          bravo: bravoScore,
        },
      },
    ],
  };
}
