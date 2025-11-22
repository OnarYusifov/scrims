"use client";

import * as React from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  Trophy,
  Calendar,
  Users,
  Building2,
  Clock,
  Video,
  BarChart3,
  Settings,
  FileText,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { useSession } from "next-auth/react";

/**
 * Admin Sidebar - Using shadcn/ui components only
 */
export function AdminSidebar() {
  const { data: session } = useSession();
  const user = session?.user;

  const navItems = [
    {
      title: "Dashboard",
      url: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "Match Management",
      url: "/admin/matches",
      icon: Trophy,
      items: [
        { title: "Active Matches", url: "/admin/matches" },
        { title: "Match History", url: "/admin/matches/history" },
        { title: "Create Match", url: "/admin/matches/create" },
        { title: "Import Stats", url: "/admin/matches/import-stats" },
      ],
    },
    {
      title: "Tournament Management",
      url: "/admin/tournaments",
      icon: Calendar,
      items: [
        { title: "Active Tournaments", url: "/admin/tournaments" },
        { title: "Create Tournament", url: "/admin/tournaments/create" },
        { title: "Registrations", url: "/admin/tournaments/registrations" },
      ],
    },
    {
      title: "Player Management",
      url: "/admin/players",
      icon: Users,
      items: [
        { title: "All Players", url: "/admin/players" },
        { title: "Search Players", url: "/admin/players/search" },
        { title: "Role Assignment", url: "/admin/players/roles" },
        { title: "Ban Management", url: "/admin/players/bans" },
      ],
    },
    {
      title: "Hub Management",
      url: "/admin/hubs",
      icon: Building2,
      items: [
        { title: "All Hubs", url: "/admin/hubs" },
        { title: "Create Hub", url: "/admin/hubs/create" },
        { title: "Whitelist Management", url: "/admin/hubs/whitelist" },
      ],
    },
    {
      title: "Queue Management",
      url: "/admin/queues",
      icon: Clock,
      items: [
        { title: "Trayb Series Schedule", url: "/admin/queues/schedule" },
        { title: "Queue Status", url: "/admin/queues" },
        { title: "Active Queues", url: "/admin/queues/active" },
      ],
    },
    {
      title: "Recordings",
      url: "/admin/recordings",
      icon: Video,
      items: [
        { title: "Recording Library", url: "/admin/recordings" },
        { title: "Access Logs", url: "/admin/recordings/logs" },
      ],
    },
    {
      title: "Statistics",
      url: "/admin/stats",
      icon: BarChart3,
    },
    {
      title: "Settings",
      url: "/admin/settings",
      icon: Settings,
    },
    {
      title: "Audit Logs",
      url: "/admin/audit-logs",
      icon: FileText,
    },
  ];

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/admin">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <LayoutDashboard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Trayb Admin</span>
                  <span className="text-xs">Dashboard</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      {user && (
        <SidebarFooter>
          <NavUser
            user={{
              name: user.name || user.email?.split("@")[0] || "Admin",
              email: user.email || "",
              avatar: "",
            }}
          />
        </SidebarFooter>
      )}
      <SidebarRail />
    </Sidebar>
  );
}
