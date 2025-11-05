"use client"

import { motion } from "framer-motion"
import { useEffect, useState } from "react"

interface CoinflipAnimationProps {
  result: 'heads' | 'tails'
  onComplete: () => void
}

export function CoinflipAnimation({ result, onComplete }: CoinflipAnimationProps) {
  const [isFlipping, setIsFlipping] = useState(true)
  const [displayResult, setDisplayResult] = useState<'heads' | 'tails' | null>(null)

  useEffect(() => {
    // Show flipping animation for 2 seconds
    const flipTimer = setTimeout(() => {
      setIsFlipping(false)
      setDisplayResult(result)
    }, 2000)

    // Complete after 4 seconds total
    const completeTimer = setTimeout(() => {
      onComplete()
    }, 4000)

    return () => {
      clearTimeout(flipTimer)
      clearTimeout(completeTimer)
    }
  }, [result, onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        className="relative"
      >
        <div className="relative w-32 h-32">
          {/* Coin */}
          <motion.div
            animate={{
              rotateY: isFlipping ? [0, 180, 360, 540, 720] : displayResult === 'heads' ? 0 : 180,
            }}
            transition={{
              duration: isFlipping ? 2 : 0.5,
              ease: "easeInOut",
            }}
            style={{ transformStyle: "preserve-3d" }}
            className="relative w-full h-full"
          >
            {/* Heads side */}
            <div
              className={`absolute inset-0 rounded-full border-4 ${
                displayResult === 'heads' || isFlipping
                  ? 'border-matrix-500 bg-matrix-500/20'
                  : 'border-terminal-border bg-terminal-panel'
              } flex items-center justify-center`}
              style={{ backfaceVisibility: "hidden", transform: "rotateY(0deg)" }}
            >
              <span className="text-4xl font-bold text-matrix-500">H</span>
            </div>

            {/* Tails side */}
            <div
              className={`absolute inset-0 rounded-full border-4 ${
                displayResult === 'tails' || isFlipping
                  ? 'border-cyber-500 bg-cyber-500/20'
                  : 'border-terminal-border bg-terminal-panel'
              } flex items-center justify-center`}
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              <span className="text-4xl font-bold text-cyber-500">T</span>
            </div>
          </motion.div>

          {/* Glow effect */}
          {!isFlipping && displayResult && (
            <motion.div
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: 1.5, opacity: [0, 1, 0] }}
              transition={{ duration: 1, repeat: Infinity }}
              className={`absolute inset-0 rounded-full ${
                displayResult === 'heads' ? 'bg-matrix-500/30' : 'bg-cyber-500/30'
              } blur-xl`}
            />
          )}
        </div>

        {/* Result text */}
        {!isFlipping && displayResult && (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="mt-6 text-center"
          >
            <p className="text-2xl font-bold font-mono uppercase text-matrix-500">
              {displayResult === 'heads' ? 'HEADS' : 'TAILS'}
            </p>
            <p className="text-sm font-mono text-terminal-muted mt-2">
              {displayResult === 'heads' ? 'Team Alpha wins!' : 'Team Bravo wins!'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

