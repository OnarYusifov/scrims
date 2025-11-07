import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium font-mono uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-matrix-500 focus-visible:ring-offset-2 focus-visible:ring-offset-terminal-bg disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-matrix-600 text-white shadow-neon-green hover:bg-matrix-500 hover:shadow-neon-green active:scale-95",
        destructive:
          "bg-red-600 text-white shadow-lg hover:bg-red-500 active:scale-95",
        outline:
          "border-2 border-matrix-600 dark:border-matrix-500 bg-transparent text-matrix-600 dark:text-matrix-500 hover:bg-matrix-600/10 dark:hover:bg-matrix-500/10 hover:shadow-neon-green active:scale-95",
        secondary:
          "bg-cyber-600 text-white shadow-neon-cyan hover:bg-cyber-500 hover:shadow-neon-cyan active:scale-95",
        ghost:
          "text-matrix-500 hover:bg-matrix-500/10 hover:text-matrix-400 active:scale-95",
        link: "text-matrix-500 underline-offset-4 hover:underline",
        terminal:
          "border-2 border-terminal-border bg-terminal-panel text-matrix-500 hover:border-matrix-500 hover:shadow-terminal active:scale-95",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }

