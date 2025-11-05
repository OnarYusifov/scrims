import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../index';
import { EloService } from '../services/elo.service';

export default async function matchRoutes(fastify: FastifyInstance) {
  // Get all matches (paginated)
  fastify.get('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Querystring: {
      page?: string;
      limit?: string;
      status?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const page = parseInt(request.query.page || '1');
      const limit = Math.min(parseInt(request.query.limit || '20'), 50);
      const skip = (page - 1) * limit;
      const status = request.query.status;

      const where: any = {};
      if (status) {
        where.status = status;
      }

      const [matches, total] = await Promise.all([
        prisma.match.findMany({
          where,
          include: {
            teams: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        discordId: true,
                        avatar: true,
                        elo: true,
                      },
                    },
                  },
                },
                captain: {
                  select: {
                    id: true,
                    username: true,
                    discordId: true,
                    avatar: true,
                  },
                },
              },
            },
            maps: {
              orderBy: { order: 'asc' },
            },
            winnerTeam: {
              include: {
                members: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.match.count({ where }),
      ]);

      return {
        matches,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get match by ID
  fastify.get('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;

      const match = await prisma.match.findUnique({
        where: { id },
        include: {
          teams: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      discordId: true,
                      avatar: true,
                      elo: true,
                      isCalibrating: true,
                    },
                  },
                },
              },
              captain: {
                select: {
                  id: true,
                  username: true,
                  discordId: true,
                  avatar: true,
                },
              },
            },
          },
          maps: {
            orderBy: { order: 'asc' },
          },
          winnerTeam: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                    },
                  },
                },
              },
            },
          },
          playerStats: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  discordId: true,
                  avatar: true,
                },
              },
              team: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          votes: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      return match;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create new match
  fastify.post('/', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Body: {
      seriesType?: 'BO1' | 'BO3' | 'BO5';
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const seriesType = request.body.seriesType || 'BO1';

      const match = await prisma.match.create({
        data: {
          seriesType,
          status: 'DRAFT',
        },
        include: {
          teams: true,
        },
      });

      return match;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Join match (add to a team)
  fastify.post('/:id/join', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      teamId?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;
      const { teamId } = request.body;

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is joinable
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match is not in a joinable state' });
      }

      // If teamId provided, join that team
      if (teamId) {
        const team = match.teams.find(t => t.id === teamId);
        if (!team) {
          return reply.code(404).send({ error: 'Team not found' });
        }

        // Check if already in team
        const existingMember = team.members.find(m => m.userId === userId);
        if (existingMember) {
          return reply.code(400).send({ error: 'Already in this team' });
        }

        // Check team size (max 5 per team)
        if (team.members.length >= 5) {
          return reply.code(400).send({ error: 'Team is full' });
        }

        // Add to team
        await prisma.teamMember.create({
          data: {
            teamId,
            userId,
          },
        });

        return { message: 'Joined team successfully' };
      }

      // If no teamId, check if user is already in any team
      const userInTeam = match.teams.some(team =>
        team.members.some(member => member.userId === userId)
      );

      if (userInTeam) {
        return reply.code(400).send({ error: 'Already in a team' });
      }

      // Find team with space (or create new team if needed)
      // Always ensure we have both teams available
      let teamAlpha = match.teams.find(t => t.name === 'Team Alpha');
      let teamBravo = match.teams.find(t => t.name === 'Team Bravo');

      if (!teamAlpha) {
        teamAlpha = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Alpha',
            side: 'ATTACKER',
          },
          include: {
            members: true,
          },
        });
      } else {
        // Reload team with members if it exists
        teamAlpha = await prisma.team.findUnique({
          where: { id: teamAlpha.id },
          include: {
            members: true,
          },
        });
      }

      if (!teamBravo) {
        teamBravo = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Bravo',
            side: 'DEFENDER',
          },
          include: {
            members: true,
          },
        });
      } else {
        // Reload team with members if it exists
        teamBravo = await prisma.team.findUnique({
          where: { id: teamBravo.id },
          include: {
            members: true,
          },
        });
      }

      if (!teamAlpha || !teamBravo) {
        return reply.code(500).send({ error: 'Failed to create teams' });
      }

      // Find team with space (prefer Alpha first)
      let targetTeam = teamAlpha.members.length < 5 ? teamAlpha : 
                       teamBravo.members.length < 5 ? teamBravo : null;
      
      if (!targetTeam) {
        // Both teams full - shouldn't happen if we check properly
        return reply.code(400).send({ error: 'Match is full' });
      }

      // Add to team
      await prisma.teamMember.create({
        data: {
          teamId: targetTeam.id,
          userId,
        },
      });

      return { message: 'Joined match successfully', teamId: targetTeam.id };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Leave match
  fastify.post('/:id/leave', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Find team member
      let teamMember = null;
      for (const team of match.teams) {
        teamMember = team.members.find(m => m.userId === userId);
        if (teamMember) {
          await prisma.teamMember.delete({
            where: { id: teamMember.id },
          });
          return { message: 'Left match successfully' };
        }
      }

      return reply.code(400).send({ error: 'Not in this match' });
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Delete match (only creator or admin)
  fastify.delete('/:id', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;

      // Only admins can delete matches for now
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      await prisma.match.delete({
        where: { id: matchId },
      });

      return { message: 'Match deleted successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Start captain voting phase (when 10 players ready)
  fastify.patch('/:id/start-captain-voting', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
      
      if (!isAdmin && totalPlayers < 10) {
        return reply.code(400).send({ error: 'Not enough players (need 10)' });
      }

      if (match.status !== 'DRAFT') {
        return reply.code(400).send({ error: 'Match must be in DRAFT status' });
      }

      // Update match status to CAPTAIN_VOTING
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'CAPTAIN_VOTING' },
      });

      return { message: 'Captain voting phase started' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Finalize captains (after voting completes)
  fastify.patch('/:id/finalize-captains', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match || match.status !== 'CAPTAIN_VOTING') {
        return reply.code(400).send({ error: 'Match not in captain voting phase' });
      }

      // Get votes
      const votes = await prisma.matchVote.findMany({
        where: { matchId },
      });

      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      if (votes.length < totalPlayers) {
        return reply.code(400).send({ error: 'Not all players have voted yet' });
      }

      // Count votes
      const voteCounts: Record<string, number> = {};
      votes.forEach(vote => {
        if (vote.votedForTeamId) {
          voteCounts[vote.votedForTeamId] = (voteCounts[vote.votedForTeamId] || 0) + 1;
        }
      });

      // Sort by votes
      const sorted = Object.entries(voteCounts)
        .sort((a, b) => b[1] - a[1]);

      const captain1Id = sorted[0]?.[0];
      const captain2Id = sorted[1]?.[0];

      if (!captain1Id || !captain2Id) {
        return reply.code(400).send({ error: 'Could not determine captains' });
      }

      // Ensure we have 2 teams
      let team1 = match.teams.find(t => t.name === 'Team Alpha');
      let team2 = match.teams.find(t => t.name === 'Team Bravo');

      if (!team1) {
        team1 = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Alpha',
            side: 'ATTACKER',
            captainId: captain1Id,
          },
        }) as any;
      } else {
        await prisma.team.update({
          where: { id: team1.id },
          data: { captainId: captain1Id },
        });
      }

      if (!team2) {
        team2 = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Bravo',
            side: 'DEFENDER',
            captainId: captain2Id,
          },
        }) as any;
      } else {
        await prisma.team.update({
          where: { id: team2.id },
          data: { captainId: captain2Id },
        });
      }

      // Move to TEAM_SELECTION phase
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'TEAM_SELECTION' },
      });

      return { message: 'Captains finalized', captain1Id, captain2Id };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Finalize team allocation (move to MAP_PICK_BAN)
  fastify.patch('/:id/finalize-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match || match.status !== 'TEAM_SELECTION') {
        return reply.code(400).send({ error: 'Match not in team selection phase' });
      }

      // Verify both teams have 5 players
      const team1 = match.teams.find(t => t.name === 'Team Alpha');
      const team2 = match.teams.find(t => t.name === 'Team Bravo');

      if (!team1 || !team2) {
        return reply.code(400).send({ error: 'Teams not found' });
      }

      if (team1.members.length !== 5 || team2.members.length !== 5) {
        return reply.code(400).send({ error: 'Both teams must have exactly 5 players' });
      }

      // Update match status to MAP_PICK_BAN
      await prisma.match.update({
        where: { id: matchId },
        data: { status: 'MAP_PICK_BAN' },
      });

      return { message: 'Teams finalized, moving to map pick/ban' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Start team selection phase (deprecated - use start-captain-voting instead)
  fastify.patch('/:id/start-team-selection', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      allocationMethod: 'random' | 'elo' | 'captain';
      captainMethod?: 'voting' | 'elo' | 'random';
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;
      const { allocationMethod, captainMethod } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if user is admin or all players are in
      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
      
      if (!isAdmin && totalPlayers < 10) {
        return reply.code(400).send({ error: 'Not enough players (need 10)' });
      }

      // Update match status
      const updatedMatch = await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'TEAM_SELECTION',
        },
        include: {
          teams: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      username: true,
                      discordId: true,
                      avatar: true,
                      elo: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // If captain method specified, select captains
      if (allocationMethod === 'captain' && captainMethod) {
        await selectCaptains(matchId, captainMethod, isAdmin, userId, fastify);
      }

      return updatedMatch;
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Vote for captain
  fastify.post('/:id/captain-vote', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { candidateId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;
      const { candidateId } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match || !['CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match not in captain voting or team selection phase' });
      }

      // Check if user is in match
      const userInMatch = match.teams.some(team =>
        team.members.some(member => member.userId === userId)
      );

      if (!userInMatch) {
        return reply.code(400).send({ error: 'Not in this match' });
      }

      // Store vote in MatchVote (reusing votedForTeamId for captain candidate ID)
      await prisma.matchVote.upsert({
        where: {
          matchId_userId: {
            matchId,
            userId,
          },
        },
        update: {
          votedForTeamId: candidateId, // Reusing this field for captain candidate
        },
        create: {
          matchId,
          userId,
          votedForTeamId: candidateId,
        },
      });

      // Check if we have enough votes to determine captains
      const totalPlayers = match.teams.reduce((sum, team) => sum + team.members.length, 0);
      const votes = await prisma.matchVote.findMany({
        where: { matchId },
      });

      // If all players have voted, determine captains
      if (votes.length >= totalPlayers) {
        // Count votes
        const voteCounts: Record<string, number> = {};
        votes.forEach(vote => {
          if (vote.votedForTeamId) {
            voteCounts[vote.votedForTeamId] = (voteCounts[vote.votedForTeamId] || 0) + 1;
          }
        });

        // Sort by votes
        const sorted = Object.entries(voteCounts)
          .sort((a, b) => b[1] - a[1]);

        // Check for tie (if top 2 have same votes)
        let captain1Id = sorted[0]?.[0];
        let captain2Id = sorted[1]?.[0];
        const topVotes = sorted[0]?.[1];
        const secondVotes = sorted[1]?.[1];

        // If tie, use coinflip
        if (topVotes === secondVotes && sorted.length >= 2) {
          // For tie, we'll return the tied candidates and let frontend handle coinflip
          return reply.send({
            message: 'Vote recorded',
            needsCoinflip: true,
            candidates: [captain1Id, captain2Id],
            voteCounts,
          });
        }

        // Ensure we have 2 teams
        let team1 = match.teams.find(t => t.name === 'Team Alpha');
        let team2 = match.teams.find(t => t.name === 'Team Bravo');

        if (!team1) {
          team1 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Alpha',
              side: 'ATTACKER',
              captainId: captain1Id,
            },
          }) as any;
        } else {
          await prisma.team.update({
            where: { id: team1.id },
            data: { captainId: captain1Id },
          });
        }

        if (!team2) {
          team2 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Bravo',
              side: 'DEFENDER',
              captainId: captain2Id,
            },
          }) as any;
        } else {
          await prisma.team.update({
            where: { id: team2.id },
            data: { captainId: captain2Id },
          });
        }
      }

      return { message: 'Vote recorded', voteCounts: {} };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get captain vote results
  fastify.get('/:id/captain-votes', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;

      const votes = await prisma.matchVote.findMany({
        where: { matchId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      });

      // Count votes
      const voteCounts: Record<string, number> = {};
      votes.forEach(vote => {
        if (vote.votedForTeamId) {
          voteCounts[vote.votedForTeamId] = (voteCounts[vote.votedForTeamId] || 0) + 1;
        }
      });

      return {
        votes: votes.map(v => ({
          userId: v.userId,
          username: v.user?.username,
          candidateId: v.votedForTeamId,
        })),
        voteCounts,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Assign teams (random, elo, or manual)
  fastify.patch('/:id/assign-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      method: 'random' | 'elo' | 'manual';
      assignments?: Array<{ userId: string; teamId: string }>;
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const userRole = (request as any).user.role;
      const { id: matchId } = request.params;
      const { method, assignments } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: {
                include: {
                  user: {
                    select: {
                      id: true,
                      elo: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Get all players
      const allPlayers = match.teams.flatMap(team =>
        team.members.map(member => ({
          userId: member.userId,
          elo: member.user.elo,
        }))
      );

      if (allPlayers.length !== 10) {
        return reply.code(400).send({ error: 'Need exactly 10 players' });
      }

      // Ensure we have 2 teams
      let team1 = match.teams.find(t => t.name === 'Team Alpha');
      let team2 = match.teams.find(t => t.name === 'Team Bravo');

      if (!team1 || !team2) {
        // Create teams if needed
        if (!team1) {
          team1 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Alpha',
              side: 'ATTACKER',
            },
          }) as any;
        }
        if (!team2) {
          team2 = await prisma.team.create({
            data: {
              matchId,
              name: 'Team Bravo',
              side: 'DEFENDER',
            },
          }) as any;
        }
      }

      // Clear existing team members
      await prisma.teamMember.deleteMany({
        where: {
          teamId: { in: [team1.id, team2.id] },
        },
      });

      if (method === 'manual' && assignments) {
        // Manual assignment (admin or captain)
        const isAdmin = ['ADMIN', 'ROOT'].includes(userRole);
        if (!isAdmin) {
          // Check if user is captain
          const isCaptain = match.teams.some(team => team.captainId === userId);
          if (!isCaptain) {
            return reply.code(403).send({ error: 'Only captains or admins can manually assign' });
          }
        }

        for (const assignment of assignments) {
          await prisma.teamMember.create({
            data: {
              teamId: assignment.teamId,
              userId: assignment.userId,
            },
          });
        }
      } else if (method === 'elo') {
        // Sort by Elo and split
        const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);
        // Snake draft: highest Elo to team1, 2nd to team2, 3rd to team1, etc.
        for (let i = 0; i < sorted.length; i++) {
          const teamId = i % 2 === 0 ? team1.id : team2.id;
          await prisma.teamMember.create({
            data: {
              teamId,
              userId: sorted[i].userId,
            },
          });
        }
      } else {
        // Random assignment
        const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
        for (let i = 0; i < shuffled.length; i++) {
          const teamId = i % 2 === 0 ? team1.id : team2.id;
          await prisma.teamMember.create({
            data: {
              teamId,
              userId: shuffled[i].userId,
            },
          });
        }
      }

      // Don't update status yet - let frontend show preview and finalize
      // Status stays as TEAM_SELECTION until user clicks "Finalize Teams"

      return { message: 'Teams assigned successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Captain picks a player
  fastify.post('/:id/captain-pick', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { playerId: string; teamId: string };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.userId;
      const { id: matchId } = request.params;
      const { playerId, teamId } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if user is captain of this team
      const team = match.teams.find(t => t.id === teamId);
      if (!team || team.captainId !== userId) {
        return reply.code(403).send({ error: 'Only team captain can pick players' });
      }

      // Check if player is already in a team
      const playerInTeam = match.teams.some(t =>
        t.members.some(m => m.userId === playerId)
      );

      if (playerInTeam) {
        return reply.code(400).send({ error: 'Player already in a team' });
      }

      // Check team size
      if (team.members.length >= 5) {
        return reply.code(400).send({ error: 'Team is full' });
      }

      // Add player to team
      await prisma.teamMember.create({
        data: {
          teamId,
          userId: playerId,
        },
      });

      return { message: 'Player picked successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Perform coinflip
  fastify.post('/:id/coinflip', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: { purpose: string }; // e.g., 'captain_selection', 'map_side'
  }>, reply: FastifyReply) => {
    try {
      const { id: matchId } = request.params;
      const { purpose } = request.body;

      // Random coinflip (0 or 1)
      const result = Math.random() < 0.5 ? 0 : 1;
      const winner = result === 0 ? 'heads' : 'tails';

      // Log coinflip result (could store in match details or audit log)
      await prisma.auditLog.create({
        data: {
          action: 'ADMIN_OVERRIDE',
          entity: 'Match',
          entityId: matchId,
          details: {
            coinflip: {
              purpose,
              result: winner,
            },
          },
          matchId,
        },
      });

      return { result: winner, value: result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Add test users to match (ROOT only)
  fastify.post('/:id/add-test-users', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      // Only ROOT can add test users
      if (userRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can add test users' });
      }

      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is joinable
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match is not in a joinable state' });
      }

      // Get test users (Discord IDs starting with 10000000000000000)
      const testUsers = await prisma.user.findMany({
        where: {
          discordId: {
            startsWith: '10000000000000000',
          },
        },
      });

      if (testUsers.length === 0) {
        return reply.code(404).send({ error: 'No test users found. Run: npm run test-users' });
      }

      // Ensure both teams exist
      let teamAlpha = match.teams.find(t => t.name === 'Team Alpha');
      let teamBravo = match.teams.find(t => t.name === 'Team Bravo');

      if (!teamAlpha) {
        teamAlpha = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Alpha',
            side: 'ATTACKER',
          },
          include: {
            members: true,
          },
        });
      } else {
        teamAlpha = await prisma.team.findUnique({
          where: { id: teamAlpha.id },
          include: {
            members: true,
          },
        });
      }

      if (!teamBravo) {
        teamBravo = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Bravo',
            side: 'DEFENDER',
          },
          include: {
            members: true,
          },
        });
      } else {
        teamBravo = await prisma.team.findUnique({
          where: { id: teamBravo.id },
          include: {
            members: true,
          },
        });
      }

      if (!teamAlpha || !teamBravo) {
        return reply.code(500).send({ error: 'Failed to create teams' });
      }

      // Get all current members
      const currentMembers = match.teams.flatMap(team =>
        team.members.map(member => member.userId)
      );

      // Calculate how many users we can add (max 10 total)
      const maxPlayers = 10
      const currentPlayerCount = currentMembers.length
      const playersNeeded = maxPlayers - currentPlayerCount

      if (playersNeeded <= 0) {
        return reply.code(400).send({ error: 'Match is already full (10/10 players)' });
      }

      // Filter out users already in match
      const usersToAdd = testUsers.filter(user => !currentMembers.includes(user.id));

      if (usersToAdd.length === 0) {
        return reply.code(400).send({ error: 'All test users are already in the match' });
      }

      // Only add up to the number needed to reach 10 players
      const usersToActuallyAdd = usersToAdd.slice(0, playersNeeded)

      // Add users to teams (alternating between Alpha and Bravo)
      // HARD LIMIT: Max 5 players per team
      const addedUsers: Array<{ userId: string; username: string; teamId: string }> = [];
      
      for (let i = 0; i < usersToActuallyAdd.length; i++) {
        const user = usersToActuallyAdd[i];
        
        // Reload teams to get current member count
        const currentTeamAlpha = await prisma.team.findUnique({
          where: { id: teamAlpha!.id },
          include: { members: true },
        });
        const currentTeamBravo = await prisma.team.findUnique({
          where: { id: teamBravo!.id },
          include: { members: true },
        });

        if (!currentTeamAlpha || !currentTeamBravo) {
          break;
        }

        // Check which team has space (strict 5 limit)
        const alphaHasSpace = currentTeamAlpha.members.length < 5;
        const bravoHasSpace = currentTeamBravo.members.length < 5;

        // If both teams are full, stop
        if (!alphaHasSpace && !bravoHasSpace) {
          break;
        }

        // Determine target team (alternate, but respect limits)
        let targetTeam = null;
        if (i % 2 === 0) {
          // Prefer Alpha, but use Bravo if Alpha is full
          targetTeam = alphaHasSpace ? currentTeamAlpha : (bravoHasSpace ? currentTeamBravo : null);
        } else {
          // Prefer Bravo, but use Alpha if Bravo is full
          targetTeam = bravoHasSpace ? currentTeamBravo : (alphaHasSpace ? currentTeamAlpha : null);
        }

        if (!targetTeam || targetTeam.members.length >= 5) {
          // Skip if no team available or team is full
          break;
        }

        await prisma.teamMember.create({
          data: {
            teamId: targetTeam.id,
            userId: user.id,
          },
        });
        addedUsers.push({ userId: user.id, username: user.username, teamId: targetTeam.id });
      }

      return {
        message: `Added ${addedUsers.length} test users to match (${currentMembers.length + addedUsers.length}/10 total)`,
        addedUsers,
        totalPlayers: currentMembers.length + addedUsers.length,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Manually add user to match by user ID - ROOT/ADMIN only
  fastify.post('/:id/add-user-manual', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      userId: string; // Changed from discordId to userId
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      // Only ADMIN/ROOT can manually add users
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const { id: matchId } = request.params;
      const { userId } = request.body;

      if (!userId) {
        return reply.code(400).send({ error: 'userId is required' });
      }

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is joinable
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Match is not in a joinable state' });
      }

      // Find user
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Check if user is already in the match
      const existingMember = match.teams.some(team =>
        team.members.some(member => member.userId === user.id)
      );

      if (existingMember) {
        return reply.code(400).send({ error: 'User is already in this match' });
      }

      // Create a "pool" team for unassigned players if it doesn't exist
      let poolTeam = match.teams.find(t => t.name === 'Player Pool');
      
      if (!poolTeam) {
        poolTeam = await prisma.team.create({
          data: {
            matchId,
            name: 'Player Pool',
            side: 'ATTACKER', // Doesn't matter for pool
          },
        }) as any;
      }

      // Add user to player pool (not assigned to Alpha/Bravo yet)
      await prisma.teamMember.create({
        data: {
          teamId: poolTeam.id,
          userId: user.id,
        },
      });

      fastify.log.info(`Manually added user ${user.username} to player pool in match ${matchId}`);

      return {
        message: `Added ${user.username} to player pool`,
        user: {
          id: user.id,
          username: user.username,
          discordId: user.discordId,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ROOT Override: Manually assign teams - ROOT only
  fastify.post('/:id/root-assign-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      teamAlpha: Array<{ userId: string }>;
      teamBravo: Array<{ userId: string }>;
      alphaCaptainId?: string;
      bravoCaptainId?: string;
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      if (userRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can use admin override' });
      }

      const { id: matchId } = request.params;
      const { teamAlpha, teamBravo, alphaCaptainId, bravoCaptainId } = request.body;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Ensure teams exist
      let alphaTeam = match.teams.find(t => t.name === 'Team Alpha');
      let bravoTeam = match.teams.find(t => t.name === 'Team Bravo');
      let playerPool = match.teams.find(t => t.name === 'Player Pool');

      if (!alphaTeam) {
        alphaTeam = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Alpha',
            side: 'ATTACKER',
          },
        }) as any;
      }

      if (!bravoTeam) {
        bravoTeam = await prisma.team.create({
          data: {
            matchId,
            name: 'Team Bravo',
            side: 'DEFENDER',
          },
        }) as any;
      }

      if (!playerPool) {
        playerPool = await prisma.team.create({
          data: {
            matchId,
            name: 'Player Pool',
            side: 'ATTACKER',
          },
        }) as any;
      }

      // Clear ONLY Team Alpha and Team Bravo assignments (keep Player Pool intact)
      await prisma.teamMember.deleteMany({
        where: { teamId: alphaTeam.id },
      });
      await prisma.teamMember.deleteMany({
        where: { teamId: bravoTeam.id },
      });

      // Get all users currently in the match
      const allMatchUserIds = match.teams.flatMap(t => t.members.map(m => m.userId));
      const assignedUserIds = [...teamAlpha.map(m => m.userId), ...teamBravo.map(m => m.userId)];
      const unassignedUserIds = allMatchUserIds.filter(id => !assignedUserIds.includes(id));

      // Assign Team Alpha (and remove from Player Pool)
      for (const member of teamAlpha) {
        // Remove from Player Pool if they're there
        await prisma.teamMember.deleteMany({
          where: {
            teamId: playerPool.id,
            userId: member.userId,
          },
        });
        // Add to Team Alpha
        await prisma.teamMember.create({
          data: {
            teamId: alphaTeam.id,
            userId: member.userId,
          },
        });
      }

      // Assign Team Bravo (and remove from Player Pool)
      for (const member of teamBravo) {
        // Remove from Player Pool if they're there
        await prisma.teamMember.deleteMany({
          where: {
            teamId: playerPool.id,
            userId: member.userId,
          },
        });
        // Add to Team Bravo
        await prisma.teamMember.create({
          data: {
            teamId: bravoTeam.id,
            userId: member.userId,
          },
        });
      }

      // Move unassigned players back to Player Pool
      for (const userId of unassignedUserIds) {
        // Remove from Player Pool first (in case they're already there)
        await prisma.teamMember.deleteMany({
          where: {
            teamId: playerPool.id,
            userId: userId,
          },
        });
        // Add to Player Pool
        await prisma.teamMember.create({
          data: {
            teamId: playerPool.id,
            userId: userId,
          },
        });
      }

      // Set captains
      if (alphaCaptainId) {
        await prisma.team.update({
          where: { id: alphaTeam.id },
          data: { captainId: alphaCaptainId },
        });
      }

      if (bravoCaptainId) {
        await prisma.team.update({
          where: { id: bravoTeam.id },
          data: { captainId: bravoCaptainId },
        });
      }

      fastify.log.info(`ROOT override: Teams assigned for match ${matchId}`);

      return {
        message: 'Teams assigned successfully',
        teamAlpha: teamAlpha.length,
        teamBravo: teamBravo.length,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ROOT Override: Set match status - ROOT only
  fastify.post('/:id/root-set-status', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      status: 'DRAFT' | 'CAPTAIN_VOTING' | 'TEAM_SELECTION' | 'MAP_PICK_BAN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      if (userRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can use admin override' });
      }

      const { id: matchId } = request.params;
      const { status } = request.body;

      await prisma.match.update({
        where: { id: matchId },
        data: { status },
      });

      fastify.log.info(`ROOT override: Match ${matchId} status set to ${status}`);

      return {
        message: `Match status set to ${status}`,
        status,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // ROOT Override: Set map selections - ROOT only
  fastify.post('/:id/root-set-maps', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
      maps: Array<{
        mapName: string;
        action: 'PICK' | 'BAN';
        teamId?: string;
        wasPlayed?: boolean;
      }>;
    };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      if (userRole !== 'ROOT') {
        return reply.code(403).send({ error: 'Only ROOT can use admin override' });
      }

      const { id: matchId } = request.params;
      const { maps } = request.body;

      // Validate maps
      if (!maps || !Array.isArray(maps)) {
        return reply.code(400).send({ error: 'Maps must be an array' });
      }

      // Filter out invalid maps
      const validMaps = maps.filter(m => m.mapName && m.action);
      
      if (validMaps.length === 0) {
        return reply.code(400).send({ error: 'No valid maps provided' });
      }

      // Delete existing map selections
      await prisma.mapSelection.deleteMany({
        where: { matchId },
      });

      // Create new map selections
      for (const map of validMaps) {
        await prisma.mapSelection.create({
          data: {
            matchId,
            mapName: map.mapName,
            action: map.action,
            teamId: map.teamId || null,
            wasPlayed: map.wasPlayed || false,
            order: validMaps.indexOf(map),
          },
        });
      }

      fastify.log.info(`ROOT override: Maps set for match ${matchId}`);

      return {
        message: 'Maps set successfully',
        mapsCount: maps.length,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Reset teams (clear all team members) - ROOT/ADMIN only
  fastify.post('/:id/reset-teams', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
  }>, reply: FastifyReply) => {
    try {
      const userRole = (request as any).user.role;
      
      // Only ADMIN/ROOT can reset teams
      if (!['ADMIN', 'ROOT'].includes(userRole)) {
        return reply.code(403).send({ error: 'Insufficient permissions' });
      }

      const { id: matchId } = request.params;

      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: true,
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Check if match is in a state that allows reset
      if (!['DRAFT', 'CAPTAIN_VOTING', 'TEAM_SELECTION'].includes(match.status)) {
        return reply.code(400).send({ error: 'Can only reset teams in DRAFT, CAPTAIN_VOTING, or TEAM_SELECTION status' });
      }

      // Clear all team members
      const teamIds = match.teams.map(team => team.id);
      await prisma.teamMember.deleteMany({
        where: {
          teamId: { in: teamIds },
        },
      });

      // Reset captains
      await prisma.team.updateMany({
        where: {
          matchId,
        },
        data: {
          captainId: null,
        },
      });

      // Reset match status to DRAFT if it was in TEAM_SELECTION
      if (match.status === 'TEAM_SELECTION') {
        await prisma.match.update({
          where: { id: matchId },
          data: { status: 'DRAFT' },
        });
      }

      return { message: 'Teams reset successfully' };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Submit match stats and calculate Elo (Admin only)
  fastify.post('/:id/stats', {
    onRequest: [fastify.authenticate],
  }, async (request: FastifyRequest<{
    Params: { id: string };
    Body: {
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
    };
  }>, reply: FastifyReply) => {
    try {
      const userId = (request.user as any).id;
      const matchId = request.params.id;

      // Check if user is admin
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (!user || (user.role !== 'ROOT' && user.role !== 'ADMIN')) {
        return reply.code(403).send({ error: 'Admin access required' });
      }

      const { maps, winnerTeamId, adminOverride } = request.body;

      // Get match
      const match = await prisma.match.findUnique({
        where: { id: matchId },
        include: {
          teams: {
            include: {
              members: {
                include: { user: true },
              },
            },
          },
        },
      });

      if (!match) {
        return reply.code(404).send({ error: 'Match not found' });
      }

      // Validate all required players have stats
      const teamAlpha = match.teams.find(t => t.name === 'Team Alpha');
      const teamBravo = match.teams.find(t => t.name === 'Team Bravo');

      if (!teamAlpha || !teamBravo) {
        return reply.code(400).send({ error: 'Teams not found' });
      }

      const allPlayerIds = new Set([
        ...teamAlpha.members.map(m => m.userId),
        ...teamBravo.members.map(m => m.userId),
      ]);

      // Collect stats from all maps
      const aggregatedStats = new Map<string, {
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
        damageDelta: number;
      }>();

      // Process each map's stats
      for (const mapData of maps) {
        // Update map selection with winner
        await prisma.mapSelection.updateMany({
          where: {
            matchId,
            mapName: mapData.mapName,
          },
          data: {
            wasPlayed: true,
            winnerTeamId: mapData.winnerTeamId,
          },
        });

        // Aggregate stats for each player
        for (const stat of mapData.playerStats) {
          const existing = aggregatedStats.get(stat.userId);
          if (existing) {
            // Aggregate stats across maps
            existing.kills += stat.kills;
            existing.deaths += stat.deaths;
            existing.assists += stat.assists;
            existing.acs = Math.round((existing.acs + stat.acs) / 2); // Average ACS
            existing.adr = Math.round((existing.adr + stat.adr) / 2); // Average ADR
            existing.headshotPercent = (existing.headshotPercent + stat.headshotPercent) / 2;
            existing.firstKills += stat.firstKills;
            existing.firstDeaths += stat.firstDeaths;
            existing.kast = (existing.kast + stat.kast) / 2;
            existing.multiKills += stat.multiKills;
            existing.damageDelta = (existing.damageDelta || 0) + (stat.damageDelta || 0);
          } else {
            aggregatedStats.set(stat.userId, {
              ...stat,
              damageDelta: stat.damageDelta || 0,
            });
          }
        }
      }

      // Validate all players have stats
      for (const playerId of allPlayerIds) {
        if (!aggregatedStats.has(playerId)) {
          return reply.code(400).send({ error: `Missing stats for player ${playerId}` });
        }
      }

      // Save player stats
      const eloService = new EloService();
      const eloResults: Array<{
        userId: string;
        oldElo: number;
        newElo: number;
        change: number;
      }> = [];

      // Update team scores
      const mapsWon = {
        alpha: maps.filter(m => {
          const team = m.winnerTeamId === teamAlpha.id ? teamAlpha : teamBravo;
          return team.name === 'Team Alpha';
        }).length,
        bravo: maps.filter(m => {
          const team = m.winnerTeamId === teamBravo.id ? teamBravo : teamAlpha;
          return team.name === 'Team Bravo';
        }).length,
      };

      await prisma.team.update({
        where: { id: teamAlpha.id },
        data: { mapsWon: mapsWon.alpha },
      });

      await prisma.team.update({
        where: { id: teamBravo.id },
        data: { mapsWon: mapsWon.bravo },
      });

      // Calculate average Elos for Elo calculation
      const winnerTeam = match.teams.find(t => t.id === winnerTeamId);
      const loserTeam = match.teams.find(t => t.id !== winnerTeamId);

      if (!winnerTeam || !loserTeam) {
        return reply.code(400).send({ error: 'Invalid winner team' });
      }

      const winnerAvgElo = await eloService.getTeamAverageElo(winnerTeam.members.map(m => m.userId));
      const loserAvgElo = await eloService.getTeamAverageElo(loserTeam.members.map(m => m.userId));

      // Save stats and calculate Elo for each player
      for (const [playerId, stats] of aggregatedStats.entries()) {
        const playerTeam = match.teams.find(t => t.id === stats.teamId);
        if (!playerTeam) continue;

        // Calculate derived stats
        const kd = stats.deaths > 0 ? stats.kills / stats.deaths : stats.kills;
        const plusMinus = stats.kills - stats.deaths;

        // Save/update player stats
        await prisma.playerMatchStats.upsert({
          where: {
            matchId_userId: {
              matchId,
              userId: playerId,
            },
          },
          create: {
            matchId,
            userId: playerId,
            teamId: stats.teamId,
            kills: stats.kills,
            deaths: stats.deaths,
            assists: stats.assists,
            acs: stats.acs,
            adr: stats.adr,
            headshotPercent: stats.headshotPercent,
            firstKills: stats.firstKills,
            firstDeaths: stats.firstDeaths,
            kast: stats.kast,
            multiKills: stats.multiKills,
            kd,
            plusMinus,
            wpr: 0, // TODO: Calculate WPR using WeightProfile
          },
          update: {
            kills: stats.kills,
            deaths: stats.deaths,
            assists: stats.assists,
            acs: stats.acs,
            adr: stats.adr,
            headshotPercent: stats.headshotPercent,
            firstKills: stats.firstKills,
            firstDeaths: stats.firstDeaths,
            kast: stats.kast,
            multiKills: stats.multiKills,
            kd,
            plusMinus,
          },
        });

        // Calculate Elo
        const won = playerTeam.id === winnerTeamId;
        const eloResult = await eloService.calculateElo({
          userId: playerId,
          matchId,
          won,
          seriesType: match.seriesType,
          opponentAvgElo: won ? loserAvgElo : winnerAvgElo,
        });

        eloResults.push({
          userId: playerId,
          oldElo: eloResult.oldElo,
          newElo: eloResult.newElo,
          change: eloResult.change,
        });
      }

      // Update match status
      await prisma.match.update({
        where: { id: matchId },
        data: {
          status: 'COMPLETED',
          winnerTeamId,
          completedAt: new Date(),
        },
      });

      // Log audit
      await prisma.auditLog.create({
        data: {
          action: 'MATCH_STATS_SUBMITTED',
          entity: 'Match',
          entityId: matchId,
          userId,
          matchId,
          details: {
            mapsCount: maps.length,
            winnerTeamId,
            adminOverride: adminOverride || false,
          },
        },
      });

      return {
        message: 'Match stats submitted and Elo calculated',
        eloResults,
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message || 'Internal server error' });
    }
  });
}

// Helper function to select captains
async function selectCaptains(
  matchId: string,
  method: 'voting' | 'elo' | 'random',
  isAdmin: boolean,
  adminUserId: string,
  fastify: FastifyInstance
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      teams: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  elo: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!match) return;

  const allPlayers = match.teams.flatMap(team =>
    team.members.map(member => member.user)
  );

  if (allPlayers.length < 2) return;

  let captain1: { id: string; username: string; elo: number } | null = null;
  let captain2: { id: string; username: string; elo: number } | null = null;

  if (method === 'elo') {
    // Select 2 highest Elo players
    const sorted = [...allPlayers].sort((a, b) => b.elo - a.elo);
    captain1 = sorted[0];
    captain2 = sorted[1];
  } else if (method === 'random') {
    // Random selection
    const shuffled = [...allPlayers].sort(() => Math.random() - 0.5);
    captain1 = shuffled[0];
    captain2 = shuffled[1];
  } else {
    // Voting - will be handled by frontend voting system
    // For now, just return - captains will be set after voting
    return;
  }

  // Ensure teams exist
  let team1 = match.teams.find(t => t.name === 'Team Alpha');
  let team2 = match.teams.find(t => t.name === 'Team Bravo');

  if (!team1) {
    team1 = await prisma.team.create({
      data: {
        matchId,
        name: 'Team Alpha',
        side: 'ATTACKER',
        captainId: captain1.id,
      },
    }) as any;
  } else {
    await prisma.team.update({
      where: { id: team1.id },
      data: { captainId: captain1.id },
    });
  }

  if (!team2) {
    team2 = await prisma.team.create({
      data: {
        matchId,
        name: 'Team Bravo',
        side: 'DEFENDER',
        captainId: captain2.id,
      },
    }) as any;
  } else {
    await prisma.team.update({
      where: { id: team2.id },
      data: { captainId: captain2.id },
    });
  }
}

