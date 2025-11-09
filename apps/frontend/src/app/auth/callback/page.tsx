"use client"

import { useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { signIn } from "next-auth/react"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const token = searchParams.get("token")
    const error = searchParams.get("error")

    if (error) {
      router.push(`/login?error=${error}`)
      return
    }

    if (!token) {
      router.push("/login?error=no_token")
      return
    }

    let cancelled = false

    const completeSignIn = async () => {
      const result = await signIn("trayb-backend", {
        token,
        redirect: false,
      })

      if (cancelled) return

      if (result?.error) {
        router.push(`/login?error=${encodeURIComponent(result.error)}`)
        return
      }

      router.replace("/dashboard")
    }

    void completeSignIn()

    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="container relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        <Loader2 className="h-12 w-12 text-matrix-500 animate-spin mx-auto mb-4" />
        <p className="text-lg font-mono text-matrix-500">
          Authenticating<span className="animate-terminal-blink">_</span>
        </p>
        <p className="text-sm font-mono text-terminal-muted mt-2">
          Please wait...
        </p>
      </motion.div>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="container relative flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-12 w-12 text-matrix-500 animate-spin" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

