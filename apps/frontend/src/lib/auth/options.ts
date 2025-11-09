import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import type { User } from "@/types"

const DEFAULT_API_URL = "http://localhost:4001"

if (!process.env.AUTH_SECRET) {
  console.warn("[auth] AUTH_SECRET is not set. Generate a strong secret to secure NextAuth sessions.")
}

function buildAvatarUrl(user: { discordId?: string; avatar?: string | null }): string {
  const discordId = user.discordId ?? ""

  if (discordId && user.avatar) {
    return `https://cdn.discordapp.com/avatars/${discordId}/${user.avatar}.png?size=256`
  }

  const hash = Number.parseInt(discordId, 10)
  if (Number.isFinite(hash)) {
    const index = Math.abs(hash) % 5
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`
  }

  return "https://cdn.discordapp.com/embed/avatars/0.png"
}

function mapBackendUser(raw: any, token: string): User & { backendToken: string } {
  const discordId = raw.discordId ? String(raw.discordId) : ""

  return {
    ...raw,
    discordId,
    avatarUrl: buildAvatarUrl({ discordId, avatar: raw.avatar }),
    backendToken: token,
  }
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "trayb-backend",
      name: "TRAYB Backend",
      credentials: {
        token: { label: "Token", type: "text" },
      },
      async authorize(credentials) {
        const token = credentials?.token?.trim()
        if (!token) {
          return null
        }

        const apiBase = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL

        try {
          const response = await fetch(`${apiBase}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
            cache: "no-store",
          })

          if (!response.ok) {
            return null
          }

          const user = await response.json()

          return mapBackendUser(user, token)
        } catch (error) {
          console.error("[auth] Failed to verify backend token:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const { backendToken, ...rest } = user as User & { backendToken?: string }

        token.user = rest
        token.backendToken = backendToken
      }
      return token
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = token.user as User
      }
      if (token.backendToken) {
        session.backendToken = token.backendToken as string
      }
      return session
    },
  },
}


