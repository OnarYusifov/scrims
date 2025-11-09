"use client"

import { SessionProvider } from "next-auth/react"

interface AuthSessionProviderProps {
  children: React.ReactNode
}

export function AuthSessionProvider({ children }: AuthSessionProviderProps) {
  return (
    <SessionProvider basePath="/api/web-auth" refetchOnWindowFocus={false}>
      {children}
    </SessionProvider>
  )
}


