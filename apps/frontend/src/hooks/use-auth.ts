"use client"

import { useCallback } from "react"
import { signOut, useSession } from "next-auth/react"
import type { User } from "@/types"
import { revokeBackendSession } from "@/lib/auth"

export function useAuth() {
  const { data: session, status, update } = useSession()

  const logout = useCallback(async () => {
    await revokeBackendSession()
    await signOut({ callbackUrl: "/login" })
  }, [])

  const refreshUser = useCallback(async () => {
    try {
      await update()
    } catch (error) {
      console.error("Failed to refresh auth session:", error)
    }
  }, [update])

  return {
    user: (session?.user as User | undefined) ?? null,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    backendToken: (session?.backendToken as string | undefined) ?? null,
    logout,
    refreshUser,
  }
}



