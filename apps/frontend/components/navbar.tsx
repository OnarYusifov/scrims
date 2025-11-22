"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Menu,
  User,
  LogOut,
  Settings,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { ThemeSwitcher } from "@/components/theme-switcher";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { signOut } from "next-auth/react";

type ViewType = "Player" | "Viewer" | "Guest";
type HubType = "Series" | "Public Hub" | "Private Hub";
type QueueType = "Unranked" | "Ranked" | "Week 1" | "Week 2" | string;

interface NavbarProps {
  viewType?: ViewType;
  hub?: HubType;
  queueType?: QueueType;
  user?: {
    id: string;
    username: string;
    email: string;
    image?: string;
  } | null;
}

export function Navbar({
  viewType = "Guest",
  hub,
  queueType,
  user,
}: NavbarProps) {
  const router = useRouter();
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Local state for breadcrumb selections (can be synced with URL/route later)
  const [selectedViewType, setSelectedViewType] =
    React.useState<ViewType>(viewType);
  const [selectedHub, setSelectedHub] = React.useState<HubType | undefined>(
    hub
  );
  const [selectedQueueType, setSelectedQueueType] = React.useState<
    QueueType | undefined
  >(queueType);

  // Update local state when props change
  React.useEffect(() => {
    setSelectedViewType(viewType);
    setSelectedHub(hub);
    setSelectedQueueType(queueType);
  }, [viewType, hub, queueType]);

  // Determine if queue type should be shown (only for Public Hub)
  const showQueueType = selectedHub === "Public Hub";

  const handleLogout = async () => {
    try {
      await signOut({ redirect: true, callbackUrl: "/login" });
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const getInitials = (username: string) => {
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className=" flex h-16 items-center gap-4 px-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6" />
          </Link>

          {/* Breadcrumbs with Dropdowns */}
          <Breadcrumb className="hidden md:flex">
            <BreadcrumbList>
              {/* View Type Dropdown */}
              <BreadcrumbItem>
                {selectedViewType === "Guest" ? (
                  <span className="text-muted-foreground">
                    {selectedViewType}
                  </span>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 font-normal text-foreground hover:text-foreground data-[state=open]:text-foreground"
                      >
                        {selectedViewType === "Player"
                          ? "Competitor"
                          : selectedViewType}
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedViewType("Viewer");
                          // TODO: Update route/state
                        }}
                      >
                        Viewer
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedViewType("Player");
                          // TODO: Update route/state
                        }}
                      >
                        Competitor
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </BreadcrumbItem>

              {/* Hub Type Dropdown */}
              {selectedHub && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-normal text-foreground hover:text-foreground data-[state=open]:text-foreground"
                        >
                          {selectedHub}
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedHub("Series");
                            setSelectedQueueType(undefined); // Hide queue type for Series
                            // TODO: Update route/state
                          }}
                        >
                          Series
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedHub("Public Hub");
                            // Set default queue type if not already set
                            if (!selectedQueueType) {
                              setSelectedQueueType("Unranked");
                            }
                            // TODO: Update route/state
                          }}
                        >
                          Public Hub
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedHub("Private Hub");
                            setSelectedQueueType(undefined);
                            // TODO: Update route/state
                          }}
                        >
                          Private Hub
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                </>
              )}

              {/* Queue Type Dropdown (only for Public Hub) */}
              {showQueueType && selectedQueueType && (
                <>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 font-normal text-foreground hover:text-foreground data-[state=open]:text-foreground"
                        >
                          {selectedQueueType}
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedQueueType("Ranked");
                            // TODO: Update route/state
                          }}
                        >
                          Ranked
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedQueueType("Unranked");
                            // TODO: Update route/state
                          }}
                        >
                          Unranked
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>

          {/* Search Bar - Center */}
          <div className="flex-1 flex justify-center">
            <Button
              variant="outline"
              className={cn(
                "relative h-9 w-full max-w-sm justify-start rounded-md border bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12",
                "hover:bg-accent hover:text-accent-foreground"
              )}
              onClick={() => setSearchOpen(true)}
            >
              <Search className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline-flex">Search anything...</span>
              <span className="sm:hidden">Search...</span>
              <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>

          {/* Right Side - Profile/Menu */}
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.image} alt={user.username} />
                        <AvatarFallback>
                          {getInitials(user.username)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {user.username}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="cursor-pointer">
                        <Settings className="mr-2 h-4 w-4" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-9 w-9">
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href="/matches" className="cursor-pointer">
                        Matches
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/teams" className="cursor-pointer">
                        Teams
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/leaderboard" className="cursor-pointer">
                        Leaderboard
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Button asChild variant="default" size="sm">
                <Link href="/login">
                  <LogIn className="mr-2 h-4 w-4" />
                  Log in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </nav>

      {/* Search Dialog */}
      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <CommandInput placeholder="Search for matches, teams, players..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Quick Actions">
            <CommandItem onSelect={() => router.push("/matches")}>
              <Search className="mr-2 h-4 w-4" />
              <span>View Matches</span>
            </CommandItem>
            <CommandItem onSelect={() => router.push("/teams")}>
              <Search className="mr-2 h-4 w-4" />
              <span>Browse Teams</span>
            </CommandItem>
            <CommandItem onSelect={() => router.push("/leaderboard")}>
              <Search className="mr-2 h-4 w-4" />
              <span>Leaderboard</span>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => router.push("/")}>
              <Search className="mr-2 h-4 w-4" />
              <span>Home</span>
            </CommandItem>
            {user && (
              <CommandItem onSelect={() => router.push("/profile")}>
                <Search className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </CommandItem>
            )}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
