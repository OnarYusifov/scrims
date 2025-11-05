"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { User } from "@/types"
import { getCurrentUser, isAuthenticated as checkAuth, logout as performLogout } from "@/lib/auth"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const router = useRouter()
  const hasLoadedRef = useRef(false)
  const isLoadingRef = useRef(false)

  const loadUser = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoadingRef.current) return
    
    isLoadingRef.current = true
    setIsLoading(true)
    try {
      // Always try to get user (cookie-based auth will work even without localStorage token)
      // This allows the backend cookie to authenticate even if localStorage is empty
      const currentUser = await getCurrentUser()
      if (currentUser) {
        setUser(currentUser)
        setIsAuthenticated(true)
        // If we got a user but no token in localStorage, we might have a cookie
        // The token in localStorage is just a backup/fallback
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error("Failed to load user:", error)
      setUser(null)
      setIsAuthenticated(false)
    } finally {
      setIsLoading(false)
      isLoadingRef.current = false
      hasLoadedRef.current = true
    }
  }, [])

  useEffect(() => {
    // Only load once on mount
    if (!hasLoadedRef.current) {
      loadUser()
    }
    
    // Listen for storage events (from other tabs/windows)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'auth_token') {
        loadUser()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, []) // Empty dependency array - only run once on mount

  const logout = async () => {
    await performLogout()
    setUser(null)
    setIsAuthenticated(false)
    hasLoadedRef.current = false
    router.push('/login')
  }

  return {
    user,
    isAuthenticated,
    isLoading,
    logout,
    refreshUser: loadUser, // Expose refresh function for manual refresh
  }
}

