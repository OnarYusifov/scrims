import type { Metadata } from "next"
import { JetBrains_Mono, Inter } from "next/font/google"
import "@/styles/globals.css"
import { MatrixRain } from "@/components/matrix-rain"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ThemeProvider } from "@/components/theme-provider"

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
  preload: true,
  fallback: ["monospace"],
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
  preload: false, // Only preload the primary font
  fallback: ["system-ui", "arial"],
})

export const metadata: Metadata = {
  title: "TRAYB CUSTOMS - Elite Valorant Stats & Matchmaking",
  description: "Terminal-themed esports dashboard for competitive Valorant customs. Track stats, Elo, and dominate the leaderboard.",
  keywords: ["valorant", "customs", "esports", "stats", "elo", "leaderboard", "gaming"],
  authors: [{ name: "TRAYB" }],
  openGraph: {
    title: "TRAYB CUSTOMS",
    description: "Elite Valorant customs platform with Matrix-themed terminal interface",
    type: "website",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetbrainsMono.variable} ${inter.variable} font-mono antialiased`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange={false}
        >
          <MatrixRain />
          <div className="relative z-10 flex min-h-screen flex-col" style={{ pointerEvents: 'auto' }}>
            <SiteHeader />
            <main className="flex-1 relative z-10" style={{ pointerEvents: 'auto' }}>{children}</main>
            <SiteFooter />
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

