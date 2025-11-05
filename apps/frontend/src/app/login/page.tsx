"use client"

import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Terminal, Zap, Shield, AlertCircle } from "lucide-react"
import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/dashboard")
    }
  }, [isAuthenticated, authLoading, router])

  // Handle error messages from URL params
  useEffect(() => {
    const error = searchParams.get("error")
    if (error) {
      let errorMessage = "Authentication failed"
      
      switch (error) {
        case "access_denied":
          errorMessage = "Access denied. Authorization cancelled."
          break
        case "not_whitelisted":
          errorMessage = "Your Discord account is not whitelisted. Contact an admin."
          break
        case "banned":
          errorMessage = "Your account has been banned."
          break
        case "auth_failed":
          errorMessage = "Authentication failed. Please try again."
          break
        case "no_token":
          errorMessage = "No authentication token received."
          break
      }

      toast({
        title: "AUTHENTICATION ERROR",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }, [searchParams, toast])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="container relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg font-mono text-matrix-500">
            CHECKING_AUTH<span className="animate-terminal-blink">_</span>
          </p>
        </motion.div>
      </div>
    )
  }

  // If authenticated, don't show login page (redirect will happen)
  if (isAuthenticated) {
    return null
  }

  const handleDiscordLogin = () => {
    setIsLoading(true)
    
    toast({
      title: "INITIALIZING CONNECTION",
      description: "Redirecting to Discord...",
      variant: "default",
    })

    // Redirect to Discord OAuth
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001'}/api/auth/discord`
  }

  return (
    <div className="container relative flex min-h-[calc(100vh-4rem)] items-center justify-center py-10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-matrix-500 shadow-neon-green">
          <CardHeader className="space-y-4">
            <motion.div
              initial={{ y: -20 }}
              animate={{ y: 0 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="flex justify-center"
            >
              <Terminal className="h-16 w-16 text-matrix-500" />
            </motion.div>

            <div className="space-y-2 text-center">
              <CardTitle className="text-3xl">ACCESS TERMINAL</CardTitle>
              <CardDescription>
                Discord authentication required for system access
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Messages */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="space-y-2 rounded-md border-2 border-terminal-border bg-terminal-bg p-4 font-mono text-xs"
            >
              <p className="text-matrix-500">
                <span className="text-terminal-muted">[INFO]</span> System: ONLINE
              </p>
              <p className="text-matrix-500">
                <span className="text-terminal-muted">[INFO]</span> Auth: READY
              </p>
              <p className="text-matrix-500">
                <span className="text-terminal-muted">[INFO]</span> Whitelist: ACTIVE
              </p>
              <p className="text-cyber-500 animate-terminal-blink">
                <span className="text-terminal-muted">[WAIT]</span> Awaiting credentials_
              </p>
            </motion.div>

            {/* Discord Login Button */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{ position: 'relative', zIndex: 50 }}
            >
              <Button
                onClick={handleDiscordLogin}
                disabled={isLoading}
                className="w-full h-12 text-base relative z-50"
                size="lg"
                style={{ pointerEvents: 'auto' } as React.CSSProperties}
              >
                {isLoading ? (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>CONNECTING...</span>
                    </div>
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-5 w-5" />
                    LOGIN WITH DISCORD
                  </>
                )}
              </Button>
            </motion.div>

            {/* Warning */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="flex items-start gap-2 rounded-md border-2 border-yellow-600 bg-yellow-950/20 p-3"
            >
              <AlertCircle className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-mono font-bold uppercase text-yellow-500">
                  RESTRICTED ACCESS
                </p>
                <p className="text-xs font-mono text-yellow-400/80">
                  Only whitelisted Discord accounts can access this system. 
                  Unauthorized access attempts will be logged.
                </p>
              </div>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="space-y-2 text-sm"
            >
              <div className="flex items-center gap-2 text-terminal-muted">
                <Shield className="h-4 w-4 text-matrix-500" />
                <span className="font-mono">Secure Discord OAuth 2.0</span>
              </div>
              <div className="flex items-center gap-2 text-terminal-muted">
                <Shield className="h-4 w-4 text-matrix-500" />
                <span className="font-mono">Whitelist-only access</span>
              </div>
              <div className="flex items-center gap-2 text-terminal-muted">
                <Shield className="h-4 w-4 text-matrix-500" />
                <span className="font-mono">Crew members only</span>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        {/* Terminal Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="mt-6 text-center text-sm text-terminal-muted font-mono"
        >
          <p>
            <span className="text-matrix-500">&gt;</span> Need access?
            <br />
            <span className="text-matrix-500">&gt;</span> Contact crew admin on Discord
            <span className="animate-terminal-blink ml-1">_</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="container relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  )
}

