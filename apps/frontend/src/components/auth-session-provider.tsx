"use client"

import { SessionProvider } from "next-auth/react"

interface AuthSessionProviderProps {
  children: React.ReactNode
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return <SessionProvider refetchOnWindowFocus={false}>{children}</SessionProvider>
}


