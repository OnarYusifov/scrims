import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { DiscordBot } from '../bot/discordBot';

declare module 'fastify' {
  interface FastifyInstance {
    discordBot?: DiscordBot;
  }
}

export default fp(async (fastify: FastifyInstance) => {
  const token = process.env.DISCORD_BOT_TOKEN;
  const guildId = process.env.DISCORD_GUILD_ID;
  const lobbyChannelId =
    process.env.DISCORD_LOBBY_CHANNEL_ID || '1436009958469533726';
  const teamAlphaChannelId =
    process.env.DISCORD_TEAM_ALPHA_CHANNEL_ID || '1426994984300712027';
  const teamBravoChannelId =
    process.env.DISCORD_TEAM_BRAVO_CHANNEL_ID || '1426995070590255186';
  const resultsChannelId =
    process.env.DISCORD_RESULTS_CHANNEL_ID || '1436464923365605426';
  const unrankedRoleId =
    process.env.DISCORD_ROLE_UNRANKED || '1436586571590533281';
  const rankRoles = [
    {
      roleId: process.env.DISCORD_ROLE_WOOD || '1436456144737407046',
      minElo: 0,
      maxElo: 499,
    },
    {
      roleId: process.env.DISCORD_ROLE_BRONZE || '1436456904728641606',
      minElo: 500,
      maxElo: 799,
    },
    {
      roleId: process.env.DISCORD_ROLE_SILVER || '1436457063935901706',
      minElo: 800,
      maxElo: 1099,
    },
    {
      roleId: process.env.DISCORD_ROLE_GOLD || '1436457209994285218',
      minElo: 1100,
      maxElo: 1299,
    },
    {
      roleId: process.env.DISCORD_ROLE_PLATINUM || '1436457318911836210',
      minElo: 1300,
      maxElo: 1499,
    },
    {
      roleId: process.env.DISCORD_ROLE_DIAMOND || '1436457405977460786',
      minElo: 1500,
      maxElo: 1699,
    },
    {
      roleId: process.env.DISCORD_ROLE_EMERALD || '1436457518938324992',
      minElo: 1700,
      maxElo: 1849,
    },
    {
      roleId: process.env.DISCORD_ROLE_RUBY || '1436457553885270218',
      minElo: 1850,
      maxElo: 1999,
    },
    {
      roleId: process.env.DISCORD_ROLE_GOD || '1436457820609450125',
      minElo: 2000,
    },
  ];

  if (!token || !guildId) {
    fastify.log.warn(
      'Discord bot not initialized. DISCORD_BOT_TOKEN or DISCORD_GUILD_ID missing.',
    );
    return;
  }

  const bot = new DiscordBot({
    token,
    guildId,
    lobbyChannelId,
    teamAlphaChannelId,
    teamBravoChannelId,
    resultsChannelId,
    rankRoles,
    unrankedRoleId,
    logger: fastify.log,
  });

  try {
    await bot.init();
    fastify.decorate('discordBot', bot);
    fastify.log.info('Discord bot plugin initialized');
  } catch (err) {
    fastify.log.error({ err }, 'Failed to initialize Discord bot');
    return;
  }

  fastify.addHook('onClose', async () => {
    try {
      await bot.shutdown();
    } catch (err) {
      fastify.log.error({ err }, 'Error while shutting down Discord bot');
    }
  });
});

