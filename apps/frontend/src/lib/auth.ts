import { User } from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001"

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("auth_token")
}

export function setToken(token: string): void {
  localStorage.setItem("auth_token", token)
}

export function removeToken(): void {
  localStorage.removeItem("auth_token")
}

export function isAuthenticated(): boolean {
  // Check if we have a token in localStorage
  // Cookie-based auth will be verified by the backend
  return !!getToken()
}

export async function getCurrentUser(): Promise<User | null> {
  // Try to get token from localStorage first (for backward compatibility)
  const token = getToken()

  try {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      credentials: 'include', // Include cookies (cookie-based auth)
      headers: {
        // Only send Authorization header if we have a token in localStorage
        // Cookie-based auth will work without it
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      // If auth fails, clear localStorage token (cookie might be expired)
      if (token) {
        removeToken()
      }
      return null
    }

    const user = await response.json()
    
    // Build avatar URL from Discord avatar hash
    if (user.avatar && user.discordId) {
      user.avatarUrl = `https://cdn.discordapp.com/avatars/${user.discordId}/${user.avatar}.png?size=128`
    } else if (user.discordId) {
      // Fallback to default Discord avatar
      user.avatarUrl = `https://cdn.discordapp.com/embed/avatars/${parseInt(user.discordId) % 5}.png`
    }
    
    return user
  } catch (error) {
    console.error("Failed to fetch current user:", error)
    return null
  }
}

export function initiateDiscordLogin(): void {
  window.location.href = `${API_URL}/api/auth/discord`
}

export async function logout(): Promise<void> {
  try {
    // Call backend to clear cookie
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch (error) {
    console.error('Error logging out:', error)
  }
  
  // Clear localStorage token
  removeToken()
  window.location.href = "/login"
}

