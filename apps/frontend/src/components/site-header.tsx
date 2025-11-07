"use client"

import { memo } from "react"
import Link from "next/link"
import { Terminal, Menu, LogOut, User as UserIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/use-auth"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const SiteHeader = memo(function SiteHeader() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()

  return (
    <header className="sticky top-0 z-40 w-full border-b-2 border-gray-200 dark:border-terminal-border bg-white/95 dark:bg-terminal-bg/95 backdrop-blur supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-terminal-bg/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2 group">
          <Terminal className="h-6 w-6 text-matrix-600 dark:text-matrix-500 group-hover:text-matrix-500 dark:group-hover:text-matrix-400 transition-colors" />
          <span className="text-xl font-bold font-mono uppercase tracking-wider text-matrix-600 dark:text-matrix-500">
            TRAYB
          </span>
        </Link>

        {/* Desktop Navigation */}
        {isAuthenticated && (
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className="text-sm font-medium font-mono uppercase tracking-wide transition-colors text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500"
            >
              Dashboard
            </Link>
            <Link
              href="/matches"
              className="text-sm font-medium font-mono uppercase tracking-wide transition-colors text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500"
            >
              Matches
            </Link>
            <Link
              href="/leaderboard"
              className="text-sm font-medium font-mono uppercase tracking-wide transition-colors text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500"
            >
              Leaderboard
            </Link>
            <Link
              href="/profile"
              className="text-sm font-medium font-mono uppercase tracking-wide transition-colors text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500"
            >
              Profile
            </Link>
          </nav>
        )}

        {/* Auth Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {isLoading ? (
            <div className="h-9 w-20 animate-pulse bg-terminal-panel rounded" />
          ) : isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9 border-2 border-matrix-600 dark:border-matrix-500">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.username} />
                    ) : (
                      <AvatarFallback className="bg-gray-100 dark:bg-terminal-panel text-matrix-600 dark:text-matrix-500">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    )}
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 border-matrix-600 dark:border-matrix-500 bg-white dark:bg-terminal-panel shadow-lg dark:shadow-neon-green">
                <DropdownMenuLabel className="font-mono">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      {user.avatarUrl ? (
                        <AvatarImage src={user.avatarUrl} alt={user.username} />
                      ) : (
                        <AvatarFallback className="bg-gray-100 dark:bg-terminal-panel text-matrix-600 dark:text-matrix-500">
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none text-matrix-600 dark:text-matrix-500">{user.username}</p>
                      <p className="text-xs leading-none text-gray-600 dark:text-terminal-muted">
                        Elo: {user.elo || 1000}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="cursor-pointer">
                    <UserIcon className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                {(user.role === 'ADMIN' || user.role === 'ROOT') && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="cursor-pointer">
                      <Terminal className="mr-2 h-4 w-4" />
                      Admin Panel
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild>
              <Link href="/login">
                <Terminal className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
          )}

          {/* Mobile Menu */}
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  )
})
