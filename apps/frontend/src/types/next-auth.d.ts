import type { User as TraybUser } from "@/types"

declare module "next-auth" {
  interface Session {
    user?: TraybUser | null
    backendToken?: string | null
  }

  interface User extends TraybUser {
    backendToken?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    user?: TraybUser
    backendToken?: string
  }
}


