"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search, Building2 } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiGet } from "@/lib/api";
import { toast } from "sonner";

interface Hub {
  id: string;
  name: string;
  game: "valorant" | "cs2";
  type: "global" | "private";
  memberCount?: number;
  activeMatches?: number;
  totalMatches?: number;
  createdAt: string;
}

export default function HubsPage() {
  const [hubs, setHubs] = useState<Hub[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchHubs();
  }, []);

  const fetchHubs = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiGet<{ hubs: Hub[] }>("/admin/hubs");
      // setHubs(data.hubs);
      
      // Temporary mock data for development
      setHubs([
        {
          id: "1",
          name: "Global Trayb Series - Valorant",
          game: "valorant",
          type: "global",
          memberCount: 150,
          activeMatches: 2,
          totalMatches: 450,
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          name: "Elite Private Hub",
          game: "cs2",
          type: "private",
          memberCount: 25,
          activeMatches: 0,
          totalMatches: 120,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch hubs:", error);
      toast.error("Failed to load hubs");
    } finally {
      setLoading(false);
    }
  };

  const filteredHubs = hubs.filter((hub) =>
    hub.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h1 className="text-3xl font-bold tracking-tight">Hub Management</h1>
            <p className="text-muted-foreground mt-2">
              Manage hubs, whitelists, and hub settings
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button asChild>
                  <Link href="/admin/hubs/create">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Hub
                  </Link>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Create a new hub</p>
              </TooltipContent>
            </Tooltip>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>All Hubs</CardTitle>
              <CardDescription>
                View and manage all hubs in the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search hubs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 transition-all duration-200 focus:scale-[1.02]"
                  />
                </div>
              </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">Loading hubs...</p>
            </div>
          ) : filteredHubs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No hubs found matching your search" : "No hubs found"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Game</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Members</TableHead>
                  <TableHead>Active Matches</TableHead>
                  <TableHead>Total Matches</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHubs.map((hub, index) => (
                  <TableRow
                    key={hub.id}
                    className="transition-all duration-200 hover:bg-muted/50"
                    style={{
                      animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                    }}
                  >
                    <TableCell className="font-medium">{hub.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {hub.game === "valorant" ? "Valorant" : "CS2"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={hub.type === "global" ? "default" : "secondary"}
                      >
                        {hub.type === "global" ? "Global" : "Private"}
                      </Badge>
                    </TableCell>
                    <TableCell>{hub.memberCount || 0}</TableCell>
                    <TableCell>{hub.activeMatches || 0}</TableCell>
                    <TableCell>{hub.totalMatches || 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/admin/hubs/${hub.id}`}>View</Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>View hub details</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}

