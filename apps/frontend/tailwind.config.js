/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './src/pages/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Matrix Theme Colors - Improved readability
        matrix: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#6ee7b7',  // Brighter for better readability
          500: '#34d399',  // Primary Matrix Green - brighter and more readable
          600: '#22c55e',  // Medium green for accents
          700: '#16a34a',  // Darker for borders
          800: '#15803d',
          900: '#14532d',
          950: '#052e16',
        },
        cyber: {
          50: '#ecfeff',
          100: '#cffafe',
          200: '#a5f3fc',
          300: '#67e8f9',
          400: '#5ee7f0',  // Brighter cyan for better readability
          500: '#22d3ee',  // Primary Cyan - brighter
          600: '#06b6d4',  // Medium cyan for accents
          700: '#0891b2',
          800: '#155e75',
          900: '#164e63',
          950: '#083344',
        },
        terminal: {
          bg: '#0a0e0a',
          panel: '#0f1410',
          border: '#1a251a',
          text: '#4ade80',  // Brighter green for better readability
          'text-bright': '#6ee7b7',  // Even brighter for emphasis
          muted: '#6b7280',  // Gray instead of green for muted text
          // Light mode colors
          'bg-light': '#f9fafb',
          'panel-light': '#ffffff',
          'border-light': '#e5e7eb',
          'text-light': '#16a34a',  // Darker green for light mode
          'muted-light': '#6b7280',
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        "fade-out": {
          from: { opacity: 1 },
          to: { opacity: 0 },
        },
        "slide-in-from-top": {
          from: { transform: "translateY(-100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-bottom": {
          from: { transform: "translateY(100%)" },
          to: { transform: "translateY(0)" },
        },
        "slide-in-from-left": {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(0)" },
        },
        "slide-in-from-right": {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0)" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 3px #34d399, 0 0 6px #34d399",
          },
          "50%": {
            boxShadow: "0 0 8px #4ade80, 0 0 12px #4ade80",
          },
        },
        "terminal-blink": {
          "0%, 49%": { opacity: 1 },
          "50%, 100%": { opacity: 0 },
        },
        "matrix-fall": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-in",
        "fade-out": "fade-out 0.3s ease-out",
        "slide-in-from-top": "slide-in-from-top 0.3s ease-out",
        "slide-in-from-bottom": "slide-in-from-bottom 0.3s ease-out",
        "slide-in-from-left": "slide-in-from-left 0.3s ease-out",
        "slide-in-from-right": "slide-in-from-right 0.3s ease-out",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "terminal-blink": "terminal-blink 1s step-end infinite",
        "matrix-fall": "matrix-fall 10s linear infinite",
      },
      boxShadow: {
        'neon-green': '0 0 3px #34d399, 0 0 6px #34d399',
        'neon-cyan': '0 0 3px #22d3ee, 0 0 6px #22d3ee',
        'terminal': '0 0 10px rgba(52, 211, 153, 0.2)',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
