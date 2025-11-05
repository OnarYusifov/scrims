"use client"

import { useEffect, useRef, memo } from "react"

export const MatrixRain = memo(function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    // Matrix characters
    const katakana = "アァカサタナハマヤャラワガザダバパイィキシチニヒミリヰギジヂビピウゥクスツヌフムユュルグズブヅプエェケセテネヘメレヱゲゼデベペオォコソトノホモヨョロヲゴゾドボポヴッン"
    const latin = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    const nums = "0123456789"
    const chars = (katakana + latin + nums).split("")

    const fontSize = 18 // Slightly larger for fewer columns
    const columns = Math.floor(canvas.width / fontSize)

    // Reduce number of columns on mobile for better performance
    const maxColumns = window.innerWidth < 768 ? 40 : 80
    const actualColumns = Math.min(columns, maxColumns)

    // Initialize drops array
    const drops: number[] = []
    for (let i = 0; i < actualColumns; i++) {
      drops[i] = Math.random() * -100
    }

    // Animation function
    function draw() {
      if (!ctx || !canvas) return

      // Create fade effect
      ctx.fillStyle = "rgba(10, 14, 10, 0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Set text style
      ctx.fillStyle = "#22c55e"
      ctx.font = `${fontSize}px monospace`

      // Draw characters (optimized)
      for (let i = 0; i < drops.length; i++) {
        // Only draw if drop is visible
        if (drops[i] * fontSize > -50 && drops[i] * fontSize < canvas.height + 50) {
          // Random character
          const text = chars[Math.floor(Math.random() * chars.length)]
          const x = i * fontSize
          const y = drops[i] * fontSize

          ctx.fillText(text, x, y)
        }

        // Reset drop to top randomly
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }

        drops[i]++
      }
    }

    // Use requestAnimationFrame for smoother, more efficient animation
    let animationFrameId: number
    let lastTime = 0
    const targetFPS = 30 // Reduce to 30 FPS for better performance
    const frameInterval = 1000 / targetFPS

    function animate(currentTime: number) {
      if (currentTime - lastTime >= frameInterval) {
        draw()
        lastTime = currentTime
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    animationFrameId = requestAnimationFrame(animate)

    // Handle resize with debouncing
    let resizeTimeout: NodeJS.Timeout
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(() => {
        canvas.width = window.innerWidth
        canvas.height = window.innerHeight
        // Recalculate columns on resize
        const newColumns = Math.floor(canvas.width / fontSize)
        const newMaxColumns = window.innerWidth < 768 ? 40 : 80
        const newActualColumns = Math.min(newColumns, newMaxColumns)
        
        // Adjust drops array if needed
        if (drops.length !== newActualColumns) {
          drops.length = newActualColumns
          for (let i = 0; i < newActualColumns; i++) {
            if (!drops[i]) drops[i] = Math.random() * -100
          }
        }
      }, 250) // Debounce resize
    }

    window.addEventListener("resize", handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="matrix-rain-container"
      aria-hidden="true"
      style={{ pointerEvents: 'none' }}
    />
  )
})

