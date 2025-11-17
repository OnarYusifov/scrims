import { auth } from "@/auth";
import { headers } from "next/headers";
import { Navbar } from "./navbar";

// Pages where navbar should NOT be shown
const AUTH_PAGES = [
  "/login",
  "/register",
  "/verify-email",
  "/device-verify",
  "/reset-password",
];

export async function NavbarWrapper() {
  // Get pathname from headers
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || headersList.get("referer") || "";
  
  // Check if current path is an auth page
  const isAuthPage = AUTH_PAGES.some((page) => pathname.includes(page));
  
  // Don't render navbar on auth pages
  if (isAuthPage) {
    return null;
  }

  const session = await auth();
  
  // Determine view type based on user role or guest status
  let viewType: "Player" | "Viewer" | "Guest" = "Guest";
  if (session?.user) {
    // You can determine this based on user preferences or role
    // For now, defaulting to Viewer for logged-in users
    viewType = "Viewer";
  }

  return (
    <Navbar
      viewType={viewType}
      hub="Series"
      queueType="Unranked"
      user={
        session?.user
          ? {
              id: session.user.id || "",
              username: session.user.name || session.user.email?.split("@")[0] || "User",
              email: session.user.email || "",
              image: undefined,
            }
          : null
      }
    />
  );
}

