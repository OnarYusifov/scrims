import {
  AttachmentBuilder,
  ChannelType,
  Client,
  EmbedBuilder,
  Events,
  GatewayIntentBits,
  Guild,
  PermissionsBitField,
  TextChannel,
  VoiceBasedChannel,
  VoiceChannel,
  Partials,
} from 'discord.js';
import type { FastifyBaseLogger } from 'fastify';
import { generateLeaderboardImage } from './leaderboard-image';
import {
  DiscordIdentity,
  MatchResultPayload,
  TeamAssignmentPayload,
  LobbySyncPayload,
} from './types';

interface DiscordBotConfig {
  token: string;
  guildId: string;
  lobbyChannelId: string;
  teamAlphaChannelId: string;
  teamBravoChannelId: string;
  resultsChannelId: string;
  rankRoles: Array<{ roleId: string; minElo: number; maxElo?: number }>;
  unrankedRoleId?: string;
  logger?: FastifyBaseLogger;
}

interface ChannelState {
  lobby?: VoiceChannel;
  teamAlpha?: VoiceChannel;
  teamBravo?: VoiceChannel;
  results?: TextChannel;
}

export class DiscordBot {
  private readonly client: Client;
  private readonly config: DiscordBotConfig;
  private readonly logger?: FastifyBaseLogger;
  private guild: Guild | null = null;
  private readyPromise: Promise<void> | null = null;
  private channels: ChannelState = {};
  private readonly rankRoles: Array<{ roleId: string; minElo: number; maxElo?: number }>;
  private readonly unrankedRoleId?: string;

  constructor(config: DiscordBotConfig) {
    this.config = config;
    this.logger = config.logger;
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
      ],
      partials: [Partials.GuildMember, Partials.User],
    });

    this.client.on('error', (err) => {
      this.logger?.error({ err }, 'Discord client error');
    });

    this.client.on('warn', (message) => {
      this.logger?.warn({ message }, 'Discord client warning');
    });

    this.rankRoles = [...config.rankRoles].sort((a, b) => a.minElo - b.minElo);
    this.unrankedRoleId = config.unrankedRoleId;
  }

  async init(): Promise<void> {
    if (!this.readyPromise) {
      this.readyPromise = new Promise<void>((resolve, reject) => {
        const onReady = async () => {
          try {
            this.guild = await this.client.guilds.fetch(this.config.guildId);
            await this.resolveChannels();
            this.logger?.info('Discord bot connected and ready');
            resolve();
          } catch (err) {
            this.logger?.error({ err }, 'Failed to resolve Discord guild or channels');
            reject(err);
          }
        };

        this.client.once(Events.ClientReady, onReady);
        this.client.once('error', (err) => {
          reject(err);
        });
      });

      await this.client.login(this.config.token);
    }

    return this.readyPromise;
  }

  private async resolveChannels(): Promise<void> {
    if (!this.guild) {
      throw new Error('Guild not available');
    }

    const lobby = await this.fetchVoiceChannel(this.config.lobbyChannelId);
    const alpha = await this.fetchVoiceChannel(this.config.teamAlphaChannelId);
    const bravo = await this.fetchVoiceChannel(this.config.teamBravoChannelId);
    const results = await this.fetchTextChannel(this.config.resultsChannelId);

    this.channels = {
      lobby,
      teamAlpha: alpha,
      teamBravo: bravo,
      results,
    };
  }

  private async fetchVoiceChannel(channelId: string): Promise<VoiceChannel> {
    if (!this.guild) {
      throw new Error('Guild not initialized');
    }

    const channel = await this.guild.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildVoice) {
      throw new Error(`Voice channel ${channelId} not found or not a voice channel`);
    }
    return channel;
  }

  private async fetchTextChannel(channelId: string): Promise<TextChannel> {
    if (!this.guild) {
      throw new Error('Guild not initialized');
    }

    const channel = await this.guild.channels.fetch(channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      throw new Error(`Text channel ${channelId} not found or not a text channel`);
    }
    return channel;
  }

  private async ensureReady(): Promise<void> {
    if (!this.readyPromise) {
      throw new Error('Discord bot not initialized. Call init() first.');
    }
    await this.readyPromise;
  }

  async shutdown(): Promise<void> {
    this.logger?.info('Shutting down Discord bot');
    await this.client.destroy();
    this.readyPromise = null;
    this.guild = null;
    this.channels = {};
  }

  async updateRankRole({
    discordId,
    elo,
    isCalibrating,
  }: {
    discordId: string;
    elo: number;
    isCalibrating: boolean;
  }): Promise<void> {
    if (!this.guild) {
      return;
    }

    try {
      await this.ensureReady();
    } catch (err) {
      this.logger?.error({ err }, 'Discord bot not ready for rank role update');
      return;
    }

    try {
      const member = await this.guild.members.fetch(discordId);

      const roleIdsToConsider = [
        ...this.rankRoles.map((role) => role.roleId),
        ...(this.unrankedRoleId ? [this.unrankedRoleId] : []),
      ];

      const rolesToRemove = member.roles.cache.filter((role) =>
        roleIdsToConsider.includes(role.id),
      );

      if (rolesToRemove.size > 0) {
        await member.roles.remove(
          Array.from(rolesToRemove.keys()),
          'TrayB Customs rank role update - cleanup',
        );
      }

      let targetRoleId: string | undefined;
      if (isCalibrating) {
        targetRoleId = this.unrankedRoleId;
      } else {
        const role = this.rankRoles.find(
          (entry) =>
            elo >= entry.minElo &&
            (entry.maxElo === undefined || elo <= entry.maxElo),
        );
        targetRoleId = role?.roleId ?? this.rankRoles[this.rankRoles.length - 1]?.roleId;
      }

      if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
        await member.roles.add(targetRoleId, 'TrayB Customs rank role update');
      }
    } catch (err) {
      this.logger?.error(
        { err, discordId },
        'Failed to update Discord rank role',
      );
    }
  }

  async syncLobby(payload: LobbySyncPayload): Promise<void> {
    if (payload.players.length === 0) {
      return;
    }

    try {
      await this.ensureReady();
    } catch (err) {
      this.logger?.error({ err }, 'Discord bot not ready for lobby sync');
      return;
    }

    const lobby = this.channels.lobby;
    if (!lobby) {
      this.logger?.error('Lobby channel not resolved');
      return;
    }

    const operations = payload.players.map(async (player) => {
      if (!player.discordId) {
        return;
      }
      try {
        const member = await lobby.guild.members.fetch(player.discordId);
        if (!member.voice?.channel) {
          this.logger?.warn(
            { player: player.discordId },
            'Player is not connected to a voice channel, skipping move to lobby',
          );
          return;
        }
        if (member.voice.channelId === lobby.id) {
          return;
        }
        await member.voice.setChannel(lobby, `TrayB Customs match lobby sync (${payload.matchId})`);
      } catch (err) {
        this.logger?.error(
          { err, player: player.discordId },
          'Failed to move player to lobby voice channel',
        );
      }
    });

    await Promise.all(operations);

    await this.enforceVoiceLimit(lobby, 10);
  }

  async assignTeams(payload: TeamAssignmentPayload): Promise<void> {
    try {
      await this.ensureReady();
    } catch (err) {
      this.logger?.error({ err }, 'Discord bot not ready for team assignment');
      return;
    }

    const alphaChannel = this.channels.teamAlpha;
    const bravoChannel = this.channels.teamBravo;
    if (!alphaChannel || !bravoChannel) {
      this.logger?.error('Team voice channels not resolved');
      return;
    }

    const movePlayers = async (channel: VoiceChannel, players: DiscordIdentity[]) => {
      const moves = players.map(async (player) => {
        if (!player.discordId) {
          return;
        }
        try {
          const member = await channel.guild.members.fetch(player.discordId);
          if (!member.voice?.channel) {
            this.logger?.warn(
              { player: player.discordId },
              'Player is not connected to a voice channel, cannot assign to team channel',
            );
            return;
          }

          if (member.voice.channelId === channel.id) {
            return;
          }

          await member.voice.setChannel(
            channel,
            `TrayB Customs team assignment (${payload.matchId})`,
          );
        } catch (err) {
          this.logger?.error(
            { err, player: player.discordId, channel: channel.id },
            'Failed to move player into team voice channel',
          );
        }
      });

      await Promise.all(moves);
      await this.enforceVoiceLimit(channel, 5);
    };

    await movePlayers(alphaChannel, payload.teamAlpha);
    await movePlayers(bravoChannel, payload.teamBravo);
  }

  async finalizeMatch(payload: MatchResultPayload): Promise<void> {
    try {
      await this.ensureReady();
    } catch (err) {
      this.logger?.error({ err }, 'Discord bot not ready to finalize match');
      return;
    }

    const lobby = this.channels.lobby;
    const alphaChannel = this.channels.teamAlpha;
    const bravoChannel = this.channels.teamBravo;

    if (!lobby || !alphaChannel || !bravoChannel) {
      this.logger?.error('Voice channels not resolved before finalizing match');
      return;
    }

    const playersToMove: DiscordIdentity[] = [
      ...payload.teamAlpha.players,
      ...payload.teamBravo.players,
    ];

    const moveBack = playersToMove.map(async (player) => {
      if (!player.discordId) return;
      try {
        const member = await lobby.guild.members.fetch(player.discordId);
        if (!member.voice?.channel) {
          return;
        }
        if (member.voice.channelId === lobby.id) {
          return;
        }
        await member.voice.setChannel(
          lobby,
          `TrayB Customs match completion (${payload.matchId})`,
        );
      } catch (err) {
        this.logger?.error(
          { err, player: player.discordId },
          'Failed to move player back to lobby after match completion',
        );
      }
    });

    await Promise.all(moveBack);
    await this.resetVoiceChannel(alphaChannel);
    await this.resetVoiceChannel(bravoChannel);
    await this.enforceVoiceLimit(lobby, 10);

    await this.postMatchResults(payload);
  }

  private async enforceVoiceLimit(channel: VoiceChannel, limit: number): Promise<void> {
    try {
      if (channel.userLimit !== limit) {
        await channel.setUserLimit(limit);
      }

      const everyoneRole = channel.guild.roles.everyone;
      if (!everyoneRole) {
        return;
      }

      if (channel.members.size >= limit) {
        await channel.permissionOverwrites.edit(everyoneRole, {
          Connect: false,
        });
      } else {
        const overwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
        if (overwrite && overwrite.deny.has(PermissionsBitField.Flags.Connect)) {
          await channel.permissionOverwrites.edit(everyoneRole, { Connect: null });
        }
      }
    } catch (err) {
      this.logger?.error({ err, channel: channel.id }, 'Failed to enforce voice channel limit');
    }
  }

  private async resetVoiceChannel(channel: VoiceBasedChannel): Promise<void> {
    if (!(channel instanceof VoiceChannel)) {
      return;
    }
    try {
      if (channel.userLimit !== 0) {
        await channel.setUserLimit(0);
      }
      const everyoneRole = channel.guild.roles.everyone;
      if (everyoneRole) {
        const overwrite = channel.permissionOverwrites.cache.get(everyoneRole.id);
        if (overwrite && overwrite.deny.has(PermissionsBitField.Flags.Connect)) {
          await channel.permissionOverwrites.edit(everyoneRole, { Connect: null });
        }
      }
    } catch (err) {
      this.logger?.error({ err, channel: channel.id }, 'Failed to reset voice channel');
    }
  }

  private async postMatchResults(payload: MatchResultPayload): Promise<void> {
    try {
      await this.ensureReady();
    } catch (err) {
      this.logger?.error({ err }, 'Discord bot not ready to post match results');
      return;
    }

    const resultsChannel = this.channels.results;
    if (!resultsChannel) {
      this.logger?.error('Results text channel not resolved');
      return;
    }

    try {
      const leaderboardBuffer = generateLeaderboardImage(payload);
      const attachmentName = `match-${payload.matchId}-leaderboard.png`;
      const attachment = new AttachmentBuilder(leaderboardBuffer, { name: attachmentName });

      const embed = new EmbedBuilder()
        .setTitle(`Match Results – ${payload.teamAlpha.score} : ${payload.teamBravo.score}`)
        .setColor(payload.winner === 'ALPHA' ? 0x38bdf8 : payload.winner === 'BRAVO' ? 0xf97316 : 0x94a3b8)
        .setImage(`attachment://${attachmentName}`)
        .setTimestamp(payload.completedAt ?? new Date())
        .setFooter({ text: `Series: ${payload.seriesType}` });

      const formatTeamField = (team: MatchResultPayload['teamAlpha']) => {
        const lines = team.players
          .map((player) => {
            const eloDelta = player.elo ? formatEloDelta(player.elo.change) : '';
            return `• ${player.username ?? 'Unknown'} ${eloDelta}`.trim();
          })
          .join('\n');
        return `Score: ${team.score}\n${lines || 'No players reported'}`;
      };

      embed.addFields(
        {
          name: payload.teamAlpha.name,
          value: formatTeamField(payload.teamAlpha),
          inline: true,
        },
        {
          name: payload.teamBravo.name,
          value: formatTeamField(payload.teamBravo),
          inline: true,
        },
      );

      if (payload.mvp) {
        embed.addFields({
          name: 'MVP',
          value: `${payload.mvp.username ?? 'Unknown'} – ${payload.mvp.kills}/${payload.mvp.deaths}/${
            payload.mvp.assists
          } (ACS ${Math.round(payload.mvp.acs)})`,
        });
      }

      if (payload.maps.length > 0) {
        const mapLines = payload.maps
          .map(
            (map) =>
              `${map.mapName}: ${map.scoreAlpha}-${map.scoreBravo} (${map.winner === 'TIE' ? 'Tie' : map.winner === 'ALPHA' ? payload.teamAlpha.name : payload.teamBravo.name})`,
          )
          .join('\n');
        embed.addFields({
          name: 'Maps',
          value: mapLines,
        });
      }

      await resultsChannel.send({
        content: `Match ${payload.matchId} has concluded!`,
        embeds: [embed],
        files: [attachment],
      });
    } catch (err) {
      this.logger?.error({ err }, 'Failed to broadcast match results to Discord');
    }
  }
}

function formatEloDelta(change: number): string {
  if (Number.isNaN(change) || change === 0) {
    return '(±0)';
  }
  const prefix = change > 0 ? '+' : '';
  return `(${prefix}${change})`;
}

