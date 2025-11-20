"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Navbar } from "./navbar";

// Pages where navbar should NOT be shown (all authentication-related pages)
const AUTH_PAGES = [
  "/login",
  "/register",
  "/verify-email",
  "/device-verify",
  "/reset-password",
  "/forgot-password",
];

export function NavbarConditional() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Check if current path is an auth page
  const isAuthPage = AUTH_PAGES.some((page) => pathname?.startsWith(page));

  // Don't render navbar on auth pages or while loading
  if (isAuthPage || status === "loading") {
    return null;
  }

  const user = session?.user;

  // Determine view type based on user role or guest status
  let viewType: "Player" | "Viewer" | "Guest" = "Guest";
  if (user) {
    viewType = "Viewer"; // You can determine this based on user preferences or role
  }

  return (
    <Navbar
      viewType={viewType}
      hub="Series"
      queueType="Unranked"
      user={
        user
          ? {
              id: user.id || "",
              username: user.name || user.email?.split("@")[0] || "User",
              email: user.email || "",
              image: undefined,
            }
          : null
      }
    />
  );
}

