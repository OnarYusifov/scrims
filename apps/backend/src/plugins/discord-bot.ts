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

