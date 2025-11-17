"use client";

import type React from "react";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";

type VerifyPageLayoutProps = {
  children?: React.ReactNode;
};

export function VerifyPageLayout({ children }: VerifyPageLayoutProps) {
  return (
    <main className="relative h-screen md:overflow-hidden lg:grid lg:grid-cols-2">
      <div className="relative hidden h-full flex-col border-r bg-secondary p-10 lg:flex dark:bg-secondary/20">
        <Logo className="mr-auto h-8" />
      </div>
      <div className="relative flex h-screen flex-col justify-center overflow-hidden p-4">
        <div
          aria-hidden
          className="-z-10 absolute inset-0 isolate opacity-60 contain-strict"
        >
          <div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-140 rounded-full bg-[radial-gradient(68.54%_68.72%_at_55.02%_31.46%,--theme(--color-foreground/.06)_0,hsla(0,0%,55%,.02)_50%,--theme(--color-foreground/.01)_80%)]" />
          <div className="absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)] [translate:5%_-50%]" />
          <div className="-translate-y-87.5 absolute top-0 right-0 h-320 w-60 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,--theme(--color-foreground/.04)_0,--theme(--color-foreground/.01)_80%,transparent_100%)]" />
        </div>
        <Button 
          className="absolute top-7 right-5" 
          variant="ghost"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            window.location.href = "/login";
          }}
        >
          Sign Out
        </Button>
        <div className="mx-auto w-full max-w-sm space-y-3 py-4">
          <Logo className="h-8 lg:hidden" />
          {children}
        </div>
      </div>
    </main>
  );
}

