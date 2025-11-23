"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, Search, X } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { toast } from "sonner";

interface Player {
  id: string;
  username: string;
  email: string;
  elo?: number;
}

interface WhitelistMember extends Player {
  addedAt: string;
  addedBy: string;
}

export default function HubWhitelistPage() {
  const params = useParams();
  const router = useRouter();
  const hubId = params.id as string;
  const [whitelist, setWhitelist] = useState<WhitelistMember[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [addPlayerDialogOpen, setAddPlayerDialogOpen] = useState(false);
  const [playerSearchQuery, setPlayerSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchWhitelist();
  }, [hubId]);

  const fetchWhitelist = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiGet<{ members: WhitelistMember[] }>(`/admin/hubs/${hubId}/whitelist`);
      // setWhitelist(data.members);
      
      // Temporary mock data
      setWhitelist([
        {
          id: "1",
          username: "player1",
          email: "player1@example.com",
          elo: 1500,
          addedAt: new Date().toISOString(),
          addedBy: "admin",
        },
        {
          id: "2",
          username: "player2",
          email: "player2@example.com",
          elo: 1600,
          addedAt: new Date().toISOString(),
          addedBy: "admin",
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch whitelist:", error);
      toast.error("Failed to load whitelist");
    } finally {
      setLoading(false);
    }
  };

  const searchPlayers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiGet<{ players: Player[] }>(`/admin/players?search=${encodeURIComponent(query)}`);
      // Filter out players already in whitelist
      // const filtered = data.players.filter(p => !whitelist.some(w => w.id === p.id));
      // setSearchResults(filtered);
      
      // Temporary mock data
      setSearchResults([
        {
          id: "3",
          username: "player3",
          email: "player3@example.com",
          elo: 1400,
        },
        {
          id: "4",
          username: "player4",
          email: "player4@example.com",
          elo: 1700,
        },
      ].filter(p => !whitelist.some(w => w.id === p.id)));
    } catch (error) {
      console.error("Failed to search players:", error);
      toast.error("Failed to search players");
    } finally {
      setSearching(false);
    }
  };

  const handleAddPlayer = async (player: Player) => {
    try {
      // TODO: Replace with actual API endpoint when backend is ready
      // await apiPost(`/admin/hubs/${hubId}/whitelist`, { playerId: player.id });
      
      // Temporary success
      setWhitelist([
        ...whitelist,
        {
          ...player,
          addedAt: new Date().toISOString(),
          addedBy: "admin",
        },
      ]);
      
      toast.success(`Added ${player.username} to whitelist`);
      setAddPlayerDialogOpen(false);
      setPlayerSearchQuery("");
      setSearchResults([]);
    } catch (error) {
      console.error("Failed to add player:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to add player"
      );
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    try {
      setRemoving(playerId);
      // TODO: Replace with actual API endpoint when backend is ready
      // await apiDelete(`/admin/hubs/${hubId}/whitelist/${playerId}`);
      
      // Temporary success
      setWhitelist(whitelist.filter((p) => p.id !== playerId));
      
      toast.success("Player removed from whitelist");
    } catch (error) {
      console.error("Failed to remove player:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove player"
      );
    } finally {
      setRemoving(null);
    }
  };

  const filteredWhitelist = whitelist.filter((member) =>
    member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-4"
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/admin/hubs/${hubId}`}>
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back to hub</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Whitelist Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage the whitelist for this private hub
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={() => setAddPlayerDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Player
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a player to the whitelist</p>
            </TooltipContent>
          </Tooltip>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Whitelisted Players</CardTitle>
              <CardDescription>
                Players who have access to this private hub ({whitelist.length} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search whitelist..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 transition-all duration-200 focus:scale-[1.02]"
                  />
                </div>
              </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading whitelist...</p>
            </div>
          ) : filteredWhitelist.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No players found matching your search"
                  : "No players in whitelist"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>ELO</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredWhitelist.map((member, index) => (
                  <TableRow
                    key={member.id}
                    className="transition-all duration-200 hover:bg-muted/50"
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <TableCell className="font-medium">
                      {member.username}
                    </TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell>
                      {member.elo ? (
                        <Badge variant="outline">{member.elo}</Badge>
                      ) : (
                        <span className="text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(member.addedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemovePlayer(member.id)}
                            disabled={removing === member.id}
                          >
                            {removing === member.id ? (
                              "Removing..."
                            ) : (
                              <>
                                <X className="mr-2 h-4 w-4" />
                                Remove
                              </>
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Remove from whitelist</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <Dialog open={addPlayerDialogOpen} onOpenChange={setAddPlayerDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Player to Whitelist</DialogTitle>
            <DialogDescription>
              Search for a player to add to the whitelist
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Command className="rounded-lg border">
              <CommandInput
                placeholder="Search players by username or email..."
                value={playerSearchQuery}
                onValueChange={(value) => {
                  setPlayerSearchQuery(value);
                  searchPlayers(value);
                }}
              />
              <CommandList>
                {searching ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Searching...
                  </div>
                ) : searchResults.length === 0 ? (
                  <CommandEmpty>
                    {playerSearchQuery.length < 2
                      ? "Type at least 2 characters to search"
                      : "No players found"}
                  </CommandEmpty>
                ) : (
                  <CommandGroup>
                    {searchResults.map((player) => (
                      <CommandItem
                        key={player.id}
                        onSelect={() => handleAddPlayer(player)}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{player.username}</span>
                          <span className="text-xs text-muted-foreground">
                            {player.email}
                            {player.elo && ` • ELO: ${player.elo}`}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddPlayerDialogOpen(false);
                setPlayerSearchQuery("");
                setSearchResults([]);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
    </TooltipProvider>
  );
}

