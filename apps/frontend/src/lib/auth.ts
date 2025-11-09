const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001"

export function initiateDiscordLogin(): void {
  window.location.href = `${API_URL}/api/core-auth/discord`
}

export async function revokeBackendSession(): Promise<void> {
  try {
    await fetch(`${API_URL}/api/core-auth/logout`, {
      method: "POST",
      credentials: "include",
    })
  } catch (error) {
    console.error("Failed to revoke backend session:", error)
  }
}


