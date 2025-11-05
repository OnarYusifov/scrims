import { PrismaClient } from '@prisma/client';
import { Discord } from 'arctic';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const discord = new Discord(
  process.env.DISCORD_CLIENT_ID!,
  process.env.DISCORD_CLIENT_SECRET!,
  process.env.DISCORD_REDIRECT_URI!
);

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  email?: string;
}

export class AuthService {
  private readonly whitelistedIds: Set<string>;

  constructor() {
    const whitelist = process.env.DISCORD_WHITELISTED_IDS || '';
    this.whitelistedIds = new Set(whitelist.split(',').filter(id => id.trim()));
  }

  /**
   * Check if a Discord ID is whitelisted
   */
  isWhitelisted(discordId: string): boolean {
    return this.whitelistedIds.has(discordId);
  }

  /**
   * Create or update user from Discord OAuth
   */
  async handleDiscordCallback(code: string): Promise<{ user: any; isNewUser: boolean }> {
    // Exchange code for access token
    const tokens = await discord.validateAuthorizationCode(code);

    // Get user info from Discord API
    const response = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }
    
    const discordUser = await response.json() as DiscordUser;

    // Check whitelist
    if (!this.isWhitelisted(discordUser.id)) {
      throw new Error('User is not whitelisted');
    }

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { discordId: discordUser.id },
    });

    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          discordId: discordUser.id,
          username: discordUser.username,
          discriminator: discordUser.discriminator || null,
          avatar: discordUser.avatar,
          email: discordUser.email,
          isWhitelisted: true,
          lastLogin: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'USER_CREATED',
          entity: 'User',
          entityId: user.id,
          userId: user.id,
          details: { method: 'discord_oauth' },
        },
      });
    } else {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          username: discordUser.username,
          discriminator: discordUser.discriminator || null,
          avatar: discordUser.avatar,
          email: discordUser.email,
          lastLogin: new Date(),
        },
      });

      await prisma.auditLog.create({
        data: {
          action: 'USER_LOGIN',
          entity: 'User',
          entityId: user.id,
          userId: user.id,
          details: { method: 'discord_oauth' },
        },
      });
    }

    return { user, isNewUser };
  }

  /**
   * Create root admin account (non-Discord)
   */
  async createAdminAccount(username: string, password: string): Promise<any> {
    // Check if admin already exists
    const existing = await prisma.admin.findUnique({
      where: { username },
    });

    if (existing) {
      throw new Error('Admin account already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin
    const admin = await prisma.admin.create({
      data: {
        username,
        password: hashedPassword,
        role: 'ROOT',
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'SYSTEM_INIT',
        entity: 'Admin',
        entityId: admin.id,
        details: { username },
      },
    });

    return { id: admin.id, username: admin.username, role: admin.role };
  }

  /**
   * Authenticate admin account
   */
  async authenticateAdmin(username: string, password: string): Promise<any> {
    const admin = await prisma.admin.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new Error('Invalid credentials');
    }

    const valid = await bcrypt.compare(password, admin.password);

    if (!valid) {
      throw new Error('Invalid credentials');
    }

    await prisma.admin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() },
    });

    return { id: admin.id, username: admin.username, role: admin.role };
  }

  /**
   * Add Discord ID to whitelist
   */
  addToWhitelist(discordId: string): void {
    this.whitelistedIds.add(discordId);
  }

  /**
   * Remove Discord ID from whitelist
   */
  removeFromWhitelist(discordId: string): void {
    this.whitelistedIds.delete(discordId);
  }
}

export const authService = new AuthService();

