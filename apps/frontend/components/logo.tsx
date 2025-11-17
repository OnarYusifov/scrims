"use client";

import type React from "react";
import { useTheme } from "next-themes";

// Logo icon based on favicon - adapts to theme
export const LogoIcon = (props: React.ComponentProps<"svg">) => (
  <svg fill="currentColor" viewBox="0 0 1000 1000" {...props}>
    <path
      fillRule="evenodd"
      d="M992.1,882.74l-328.07,109.36-164.03-109.33-164.03,109.33L7.9,882.74,335.97,7.9l164.03,656.13L664.03,7.9l328.07,874.84ZM500,773.44l164.01-109.41L500,7.9l-164.17,656.13,164.17,109.41Z"
    />
  </svg>
);

export const Logo = ({ className, ...props }: React.ComponentProps<"div">) => {
  const { theme, systemTheme } = useTheme();
  // Check if we're on client side (this is a client component, so window should be available)
  const isClient = typeof window !== "undefined";

  // Determine if we're in dark mode
  // If theme is "system", use systemTheme, otherwise use theme
  const isDark = isClient && (theme === "dark" || (theme === "system" && systemTheme === "dark"));

  return (
    <div className={className} {...props}>
      <LogoIcon 
        className={`h-full w-auto transition-colors ${
          isDark ? "text-white" : "text-black"
        }`}
      />
    </div>
  );
};
