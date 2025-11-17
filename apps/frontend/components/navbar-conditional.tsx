"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Check if current path is an auth page
  const isAuthPage = AUTH_PAGES.some((page) => pathname?.startsWith(page));

  useEffect(() => {
    if (isAuthPage) {
      setLoading(false);
      return;
    }

    // Fetch user data
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (response.ok && data.authenticated) {
          setUser(data.user);
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [isAuthPage]);

  // Don't render navbar on auth pages
  if (isAuthPage || loading) {
    return null;
  }

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
              username: user.username || user.email?.split("@")[0] || "User",
              email: user.email || "",
              image: user.image || undefined,
            }
          : null
      }
    />
  );
}

