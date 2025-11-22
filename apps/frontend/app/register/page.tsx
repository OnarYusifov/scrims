"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    // Always drive to /login with register tab to keep a single animated surface
    router.replace("/login?tab=register");
  }, [router]);

  return null;
}
