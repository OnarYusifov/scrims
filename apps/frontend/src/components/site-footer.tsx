import Link from "next/link"
import { Terminal, Github, Twitter, MessageCircle } from "lucide-react"

import { memo } from "react"

export const SiteFooter = memo(function SiteFooter() {
  return (
    <footer className="border-t-2 border-gray-200 dark:border-terminal-border bg-white/50 dark:bg-terminal-panel/50 backdrop-blur">
      <div className="container py-8 md:py-12">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center space-x-2">
              <Terminal className="h-5 w-5 text-matrix-600 dark:text-matrix-500" />
              <span className="text-lg font-bold font-mono uppercase text-matrix-600 dark:text-matrix-500">
                TRAYB
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-terminal-muted font-mono">
              Elite Valorant customs platform.
              <br />
              Matrix-themed. Discord-integrated.
              <br />
              <span className="text-matrix-600 dark:text-matrix-500">Crew only.</span>
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold font-mono uppercase text-matrix-600 dark:text-matrix-500">
              Navigation
            </h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/dashboard"
                className="text-sm font-mono text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/matches"
                className="text-sm font-mono text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500 transition-colors"
              >
                Matches
              </Link>
              <Link
                href="/leaderboard"
                className="text-sm font-mono text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500 transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/profile"
                className="text-sm font-mono text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500 transition-colors"
              >
                Profile
              </Link>
            </nav>
          </div>

          {/* Resources */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold font-mono uppercase text-matrix-600 dark:text-matrix-500">
              Resources
            </h3>
            <nav className="flex flex-col gap-2">
              <Link
                href="/docs"
                className="text-sm font-mono text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500 transition-colors"
              >
                Documentation
              </Link>
              <Link
                href="/rules"
                className="text-sm font-mono text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500 transition-colors"
              >
                Rules
              </Link>
              <Link
                href="/stats"
                className="text-sm font-mono text-gray-600 dark:text-terminal-muted hover:text-matrix-600 dark:hover:text-matrix-500 transition-colors"
              >
                Stats Guide
              </Link>
            </nav>
          </div>

          {/* Social */}
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-bold font-mono uppercase text-matrix-600 dark:text-matrix-500">
              Connect
            </h3>
            <div className="flex gap-2">
              <a
                href="https://discord.gg/trayb"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-gray-200 dark:border-terminal-border bg-white dark:bg-terminal-panel text-gray-600 dark:text-terminal-muted hover:border-matrix-600 dark:hover:border-matrix-500 hover:text-matrix-600 dark:hover:text-matrix-500 transition-all"
              >
                <MessageCircle className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com/traybgg"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-gray-200 dark:border-terminal-border bg-white dark:bg-terminal-panel text-gray-600 dark:text-terminal-muted hover:border-matrix-600 dark:hover:border-matrix-500 hover:text-matrix-600 dark:hover:text-matrix-500 transition-all"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://github.com/trayb/customs"
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-md border-2 border-gray-200 dark:border-terminal-border bg-white dark:bg-terminal-panel text-gray-600 dark:text-terminal-muted hover:border-matrix-600 dark:hover:border-matrix-500 hover:text-matrix-600 dark:hover:text-matrix-500 transition-all"
              >
                <Github className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t-2 border-gray-200 dark:border-terminal-border pt-8 text-center">
          <p className="text-sm font-mono text-gray-600 dark:text-terminal-muted">
            <span className="text-matrix-600 dark:text-matrix-500">&copy;</span> {new Date().getFullYear()} TRAYB CUSTOMS.
            All systems operational.
            <br />
            <span className="text-xs">Built with Next.js, TypeScript, and Matrix rain.</span>
          </p>
        </div>
      </div>
    </footer>
  )
})

