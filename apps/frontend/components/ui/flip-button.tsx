"use client";

import * as React from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface FlipButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  frontText: string;
  backText: string;
  isFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
}

export function FlipButton({
  frontText,
  backText,
  isFlipped = false,
  onFlipChange,
  className,
  onMouseEnter,
  onMouseLeave,
  ...props
}: FlipButtonProps) {
  const [flipped, setFlipped] = React.useState(isFlipped);

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    setFlipped(true);
    onFlipChange?.(true);
    onMouseEnter?.(e);
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
    setFlipped(false);
    onFlipChange?.(false);
    onMouseLeave?.(e);
  };

  return (
    <button
      className={cn("relative overflow-hidden", className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
      {...props}
    >
      <motion.div
        animate={{ rotateX: flipped ? 180 : 0 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        style={{
          transformStyle: "preserve-3d",
          position: "relative",
          width: "100%",
          height: "100%",
        }}
        className="w-full h-full"
      >
        {/* Front side */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateX(0deg)",
          }}
          className="absolute inset-0 flex items-center justify-center w-full h-full"
        >
          {frontText}
        </div>
        {/* Back side */}
        <div
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateX(180deg)",
          }}
          className="absolute inset-0 flex items-center justify-center w-full h-full"
        >
          {backText}
        </div>
      </motion.div>
    </button>
  );
}

