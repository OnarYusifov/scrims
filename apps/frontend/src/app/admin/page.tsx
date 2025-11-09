"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  Users,
  Settings,
  FileText,
  Search,
  Ban,
  UserCheck,
  UserX,
  Crown,
  UserCog,
  AlertCircle,
  Plus,
  Save,
  Power,
  Loader2,
  ExternalLink,
} from "lucide-react"
import {
  fetchUsers,
  updateUserRole,
  banUser,
  addToWhitelist,
  removeFromWhitelist,
  fetchAuditLogs,
  fetchWeightProfiles,
  createWeightProfile,
  updateWeightProfile,
  activateWeightProfile,
  resetApplicationData,
  User,
  AuditLog,
  WeightProfile,
} from "@/lib/api"
import { cn, formatTimestamp } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRealtimeStream } from "@/hooks/use-realtime"

type AdminTab = "users" | "weights" | "audit"

export default function AdminPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<AdminTab>("users")
  
  // Users tab state
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showWhitelistDialog, setShowWhitelistDialog] = useState(false)
  const [whitelistDiscordId, setWhitelistDiscordId] = useState("")
  const [isResetting, setIsResetting] = useState(false)
  
  // Weight profiles tab state
  const [weightProfiles, setWeightProfiles] = useState<WeightProfile[]>([])
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<WeightProfile | null>(null)
  const [showProfileDialog, setShowProfileDialog] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [profileForm, setProfileForm] = useState({
    name: "",
    killWeight: 0.25,
    deathWeight: 0.15,
    assistWeight: 0.10,
    acsWeight: 0.20,
    adrWeight: 0.10,
    kastWeight: 0.10,
    firstKillWeight: 0.05,
    clutchWeight: 0.05,
  })
  
  // Audit logs tab state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const usersFetchingRef = useRef(false)
  const profilesFetchingRef = useRef(false)
  const auditFetchingRef = useRef(false)
  const pendingUsersReloadRef = useRef(false)
  const pendingProfilesReloadRef = useRef(false)
  const pendingAuditReloadRef = useRef(false)

  const loadUsers = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (usersFetchingRef.current) {
        if (silent) {
          pendingUsersReloadRef.current = true
        }
        return
      }

      usersFetchingRef.current = true
      if (!silent) {
        setIsLoadingUsers(true)
      }

      try {
        const response = await fetchUsers({
          limit: 100,
          search: searchQuery || undefined,
        })
        setUsers(response.users)
      } catch (error: any) {
        console.error("Failed to load users:", error)
      } finally {
        usersFetchingRef.current = false
        if (!silent) {
          setIsLoadingUsers(false)
        }
        if (pendingUsersReloadRef.current) {
          pendingUsersReloadRef.current = false
          void loadUsers({ silent: true })
        }
      }
    },
    [searchQuery],
  )

  const loadWeightProfiles = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (profilesFetchingRef.current) {
        if (silent) {
          pendingProfilesReloadRef.current = true
        }
        return
      }

      profilesFetchingRef.current = true
      if (!silent) {
        setIsLoadingProfiles(true)
      }

      try {
        const profiles = await fetchWeightProfiles()
        setWeightProfiles(profiles)
      } catch (error: any) {
        console.error("Failed to load weight profiles:", error)
      } finally {
        profilesFetchingRef.current = false
        if (!silent) {
          setIsLoadingProfiles(false)
        }
        if (pendingProfilesReloadRef.current) {
          pendingProfilesReloadRef.current = false
          void loadWeightProfiles({ silent: true })
        }
      }
    },
    [],
  )

  const loadAuditLogs = useCallback(
    async (options?: { silent?: boolean }) => {
      const silent = options?.silent ?? false

      if (auditFetchingRef.current) {
        if (silent) {
          pendingAuditReloadRef.current = true
        }
        return
      }

      auditFetchingRef.current = true
      if (!silent) {
        setIsLoadingLogs(true)
      }

      try {
        const response = await fetchAuditLogs({ limit: 100 })
        setAuditLogs(response.logs)
      } catch (error: any) {
        console.error("Failed to load audit logs:", error)
      } finally {
        auditFetchingRef.current = false
        if (!silent) {
          setIsLoadingLogs(false)
        }
        if (pendingAuditReloadRef.current) {
          pendingAuditReloadRef.current = false
          void loadAuditLogs({ silent: true })
        }
      }
    },
    [],
  )

  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !user) {
      router.push("/login")
      return
    }

    if (user && !['ADMIN', 'ROOT'].includes(user.role)) {
      router.push("/dashboard")
      return
    }

    if (activeTab === "users") {
      void loadUsers()
    } else if (activeTab === "weights") {
      void loadWeightProfiles()
    } else if (activeTab === "audit") {
      void loadAuditLogs()
    }
  }, [isAuthenticated, authLoading, user, activeTab, router, loadUsers, loadWeightProfiles, loadAuditLogs])


  async function handleUpdateRole(userId: string, newRole: 'USER' | 'MODERATOR' | 'ADMIN' | 'ROOT') {
    try {
      await updateUserRole(userId, newRole)
      console.log(`User role changed to ${newRole}`)
      setShowRoleDialog(false)
      await loadUsers()
    } catch (error: any) {
      console.error("Failed to update role:", error)
    }
  }

  async function handleBanUser(userId: string, banned: boolean) {
    try {
      await banUser(userId, banned)
      console.log(`User has been ${banned ? "banned" : "unbanned"}`)
      await loadUsers()
    } catch (error: any) {
      console.error("Failed to ban user:", error)
    }
  }

  async function handleAddToWhitelist() {
    try {
      await addToWhitelist(whitelistDiscordId)
      setShowWhitelistDialog(false)
      setWhitelistDiscordId("")
      await loadUsers()
    } catch (error: any) {
      console.error("Failed to whitelist user:", error)
    }
  }

  async function handleRemoveFromWhitelist(userId: string) {
    try {
      await removeFromWhitelist(userId)
      await loadUsers()
    } catch (error: any) {
      console.error("Failed to remove from whitelist:", error)
    }
  }

  async function handleAddUserToWhitelist(discordId: string) {
    try {
      await addToWhitelist(discordId)
      await loadUsers()
    } catch (error: any) {
      console.error("Failed to whitelist user:", error)
    }
  }

  async function handleApplicationReset() {
    if (isResetting) return
    const confirmed = window.confirm(
      "This will delete all matches, stats, map history, and reset every player's Elo back to 800 while preserving account information.\n\nAre you absolutely sure you want to continue?",
    )
    if (!confirmed) {
      return
    }

    try {
      setIsResetting(true)
      const result = await resetApplicationData()
      toast({
        title: "Application data reset",
        description: `Removed ${result.matchCount} matches and recalibrated ${result.usersUpdated} users.`,
      })

      // Refresh relevant data in the background
      if (activeTab === "users") {
        void loadUsers({ silent: true })
      }
      void loadAuditLogs({ silent: true })
    } catch (error: any) {
      const message =
        error?.message || "Failed to reset application data. Please check server logs."
      console.error("Failed to reset application data:", error)
      toast({
        title: "Reset failed",
        description: message,
        variant: "destructive",
      })
    } finally {
      setIsResetting(false)
    }
  }

  async function handleSaveWeightProfile() {
    try {
      if (isEditing && selectedProfile) {
        await updateWeightProfile(selectedProfile.id, profileForm)
      } else {
        await createWeightProfile(profileForm)
      }
      setShowProfileDialog(false)
      setIsEditing(false)
      setSelectedProfile(null)
      setProfileForm({
        name: "",
        killWeight: 0.25,
        deathWeight: 0.15,
        assistWeight: 0.10,
        acsWeight: 0.20,
        adrWeight: 0.10,
        kastWeight: 0.10,
        firstKillWeight: 0.05,
        clutchWeight: 0.05,
      })
      await loadWeightProfiles()
    } catch (error: any) {
        console.error("Failed to save weight profile:", error)
    }
  }

  async function handleActivateProfile(profileId: string) {
    try {
      await activateWeightProfile(profileId)
      await loadWeightProfiles()
    } catch (error: any) {
      console.error("Failed to activate profile:", error)
    }
  }

  const realtimeHandlers = useMemo(
    () => ({
      "match:updated": () => {
        if (activeTab === "audit") {
          void loadAuditLogs({ silent: true })
        }
      },
      "match:deleted": () => {
        if (activeTab === "audit") {
          void loadAuditLogs({ silent: true })
        }
      },
      "match:created": () => {
        if (activeTab === "audit") {
          void loadAuditLogs({ silent: true })
        }
      },
    }),
    [activeTab, loadAuditLogs],
  )

  useRealtimeStream({
    enabled: isAuthenticated,
    events: realtimeHandlers,
    onError: (error) => {
      console.error("Realtime stream error", error)
    },
  })

  function openEditProfile(profile: WeightProfile) {
    setSelectedProfile(profile)
    setProfileForm({
      name: profile.name,
      killWeight: profile.killWeight,
      deathWeight: profile.deathWeight,
      assistWeight: profile.assistWeight,
      acsWeight: profile.acsWeight,
      adrWeight: profile.adrWeight,
      kastWeight: profile.kastWeight,
      firstKillWeight: profile.firstKillWeight,
      clutchWeight: profile.clutchWeight,
    })
    setIsEditing(true)
    setShowProfileDialog(true)
  }

  function openNewProfile() {
    setSelectedProfile(null)
    setProfileForm({
      name: "",
      killWeight: 0.25,
      deathWeight: 0.15,
      assistWeight: 0.10,
      acsWeight: 0.20,
      adrWeight: 0.10,
      kastWeight: 0.10,
      firstKillWeight: 0.05,
      clutchWeight: 0.05,
    })
    setIsEditing(false)
    setShowProfileDialog(true)
  }

  const roleColors: Record<string, string> = {
    ROOT: "text-purple-500",
    ADMIN: "text-red-500",
    MODERATOR: "text-blue-500",
    USER: "text-terminal-muted",
  }

  if (authLoading) {
    return (
      <div className="container relative py-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-mono text-matrix-500">
              CHECKING_AUTH<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  // Show loading/redirecting state while not authenticated or not admin
  if (!isAuthenticated || !user) {
    return (
      <div className="container relative py-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-mono text-matrix-500">
              REDIRECTING_TO_LOGIN<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (!['ADMIN', 'ROOT'].includes(user.role)) {
    return (
      <div className="container relative py-10">
        <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <div className="h-12 w-12 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-lg font-mono text-matrix-500">
              REDIRECTING_TO_DASHBOARD<span className="animate-terminal-blink">_</span>
            </p>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="container relative z-10 py-10 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold font-mono uppercase text-gray-900 dark:text-matrix-500">
            ADMIN PANEL
          </h1>
          <p className="text-terminal-muted font-mono mt-1">
            System management and moderation<span className="animate-terminal-blink">_</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-matrix-500" />
          <span className="font-mono text-sm text-matrix-500 uppercase">{user.role}</span>
        </div>
      </motion.div>

      {user?.role === "ROOT" && (
        <Card className="border-red-500 bg-red-500/10 dark:border-red-500/40">
          <CardHeader>
            <CardTitle className="font-mono text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
              <Power className="h-4 w-4" />
              Global Data Reset
            </CardTitle>
            <CardDescription className="font-mono text-sm text-red-600/80 dark:text-red-300/80">
              Deletes every match, stat line, map selection, and Elo history. User accounts remain intact but are reset to fresh calibration.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="font-mono text-xs text-red-700 dark:text-red-300">
              This action cannot be undone. Run it only on empty queues or before a new season launch.
            </p>
            <Button
              variant="destructive"
              className="font-mono uppercase"
              onClick={handleApplicationReset}
              disabled={isResetting}
              style={{ pointerEvents: 'auto' }}
            >
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <Power className="mr-2 h-4 w-4" />
                  RESET APP DATA
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2 border-b-2 border-terminal-border"
      >
        <Button
          variant={activeTab === "users" ? "default" : "ghost"}
          onClick={() => setActiveTab("users")}
          className="font-mono uppercase relative z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <Users className="mr-2 h-4 w-4" />
          USERS
        </Button>
        <Button
          variant={activeTab === "weights" ? "default" : "ghost"}
          onClick={() => setActiveTab("weights")}
          className="font-mono uppercase relative z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <Settings className="mr-2 h-4 w-4" />
          WEIGHT PROFILES
        </Button>
        <Button
          variant={activeTab === "audit" ? "default" : "ghost"}
          onClick={() => setActiveTab("audit")}
          className="font-mono uppercase relative z-10"
          style={{ pointerEvents: 'auto' }}
        >
          <FileText className="mr-2 h-4 w-4" />
          AUDIT LOGS
        </Button>
      </motion.div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Search and Actions */}
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-terminal-muted" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    loadUsers()
                  }
                }}
                className="pl-10 font-mono relative z-10"
                style={{ pointerEvents: 'auto' }}
              />
            </div>
            <Button
              onClick={() => loadUsers()}
              variant="outline"
              className="font-mono relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <Search className="mr-2 h-4 w-4" />
              SEARCH
            </Button>
            <Dialog open={showWhitelistDialog} onOpenChange={setShowWhitelistDialog}>
              <DialogTrigger asChild>
                <Button className="font-mono relative z-10" style={{ pointerEvents: 'auto' }}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  ADD TO WHITELIST
                </Button>
              </DialogTrigger>
              <DialogContent className="border-matrix-500 bg-terminal-panel">
                <DialogHeader>
                  <DialogTitle className="font-mono text-matrix-500">ADD TO WHITELIST</DialogTitle>
                  <DialogDescription className="font-mono text-terminal-muted">
                    Enter Discord ID to whitelist
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="discordId" className="font-mono">Discord ID</Label>
                    <Input
                      id="discordId"
                      value={whitelistDiscordId}
                      onChange={(e) => setWhitelistDiscordId(e.target.value)}
                      className="font-mono"
                      placeholder="123456789012345678"
                    />
                  </div>
                  <Button
                    onClick={handleAddToWhitelist}
                    className="w-full font-mono"
                    style={{ pointerEvents: 'auto' }}
                  >
                    <UserCheck className="mr-2 h-4 w-4" />
                    WHITELIST USER
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Users Table */}
          <Card className="border-terminal-border">
            <CardHeader>
              <CardTitle className="font-mono uppercase">USERS</CardTitle>
              <CardDescription className="font-mono">Manage user accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-terminal-muted mx-auto mb-4 opacity-50" />
                  <p className="text-terminal-muted font-mono">No users found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Elo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id} className="hover:bg-terminal-panel/40">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 border border-terminal-border/70">
                                {u.avatar ? (
                                  <AvatarImage
                                    src={`https://cdn.discordapp.com/avatars/${u.discordId}/${u.avatar}.png?size=64`}
                                    alt={u.username}
                                  />
                                ) : (
                                  <AvatarFallback className="bg-terminal-panel text-matrix-500 text-xs">
                                    {u.username?.charAt(0).toUpperCase() || "U"}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p className="text-sm text-matrix-500">{u.username}</p>
                                <p className="text-xs text-terminal-muted">{u.discordId}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className={cn("text-xs", roleColors[u.role] || roleColors.USER)}>
                              {u.role}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-matrix-500">{u.elo}</span>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {u.isBanned && (
                                <span className="rounded bg-red-500/20 px-2 py-1 text-xs text-red-500">
                                  BANNED
                                </span>
                              )}
                              {u.isWhitelisted && (
                                <span className="rounded bg-green-500/20 px-2 py-1 text-xs text-green-500">
                                  WHITELISTED
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(u)
                                  setShowRoleDialog(true)
                                }}
                                className="font-mono text-xs"
                                style={{ pointerEvents: "auto" }}
                                title="Change Role"
                              >
                                <UserCog className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleBanUser(u.id, !u.isBanned)}
                                className="font-mono text-xs"
                                style={{ pointerEvents: "auto" }}
                                title={u.isBanned ? "Unban User" : "Ban User"}
                              >
                                {u.isBanned ? (
                                  <UserCheck className="h-3 w-3" />
                                ) : (
                                  <Ban className="h-3 w-3" />
                                )}
                              </Button>
                              {u.isWhitelisted ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleRemoveFromWhitelist(u.id)}
                                  className="font-mono text-xs text-red-500 hover:text-red-400"
                                  style={{ pointerEvents: "auto" }}
                                  title="Remove from Whitelist"
                                >
                                  <UserX className="h-3 w-3" />
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleAddUserToWhitelist(u.discordId)}
                                  className="font-mono text-xs text-green-500 hover:text-green-400"
                                  style={{ pointerEvents: "auto" }}
                                  title="Add to Whitelist"
                                >
                                  <UserCheck className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Import Match Tab - REMOVED */}
      {/* Weight Profiles Tab */}
      {activeTab === "weights" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <div className="flex justify-between items-center">
            <CardDescription className="font-mono">
              Configure WPR (Weighted Performance Rating) weight profiles
            </CardDescription>
            <Button
              onClick={openNewProfile}
              className="font-mono relative z-10"
              style={{ pointerEvents: 'auto' }}
            >
              <Plus className="mr-2 h-4 w-4" />
              NEW PROFILE
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {isLoadingProfiles ? (
              <div className="col-span-2 flex items-center justify-center py-12">
                <div className="h-8 w-8 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : weightProfiles.length === 0 ? (
              <Card className="col-span-2 border-terminal-muted">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Settings className="h-12 w-12 text-terminal-muted mb-4 opacity-50" />
                  <p className="text-terminal-muted font-mono">No weight profiles</p>
                </CardContent>
              </Card>
            ) : (
              weightProfiles.map((profile) => (
                <Card
                  key={profile.id}
                  className={`border-2 ${profile.isActive ? 'border-matrix-500' : 'border-terminal-border'}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="font-mono uppercase">{profile.name}</CardTitle>
                      {profile.isActive && (
                        <span className="px-2 py-1 text-xs font-mono bg-matrix-500/20 text-matrix-500 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div className="flex justify-between">
                        <span className="text-terminal-muted">Kill:</span>
                        <span className="text-matrix-500">{(profile.killWeight * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-terminal-muted">Death:</span>
                        <span className="text-matrix-500">{(profile.deathWeight * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-terminal-muted">ACS:</span>
                        <span className="text-matrix-500">{(profile.acsWeight * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-terminal-muted">ADR:</span>
                        <span className="text-matrix-500">{(profile.adrWeight * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditProfile(profile)}
                        className="flex-1 font-mono text-xs relative z-10"
                        style={{ pointerEvents: 'auto' }}
                      >
                        EDIT
                      </Button>
                      {!profile.isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivateProfile(profile.id)}
                          className="flex-1 font-mono text-xs relative z-10"
                          style={{ pointerEvents: 'auto' }}
                        >
                          <Power className="h-3 w-3 mr-1" />
                          ACTIVATE
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </motion.div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === "audit" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          <Card className="border-terminal-border">
            <CardHeader>
              <CardTitle className="font-mono uppercase">AUDIT LOGS</CardTitle>
              <CardDescription className="font-mono">System activity and changes</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingLogs ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 border-2 border-matrix-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-terminal-muted mx-auto mb-4 opacity-50" />
                  <p className="text-terminal-muted font-mono">No audit logs</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3 rounded border border-terminal-border bg-terminal-panel/50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm text-matrix-500">
                            {log.action} • {log.entity}
                          </p>
                          <p className="font-mono text-xs text-terminal-muted">
                            {log.user?.username || "System"} • {formatTimestamp(log.createdAt)}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-terminal-muted">{log.entityId.slice(0, 8)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="border-matrix-500 bg-terminal-panel">
          <DialogHeader>
            <DialogTitle className="font-mono text-matrix-500">CHANGE ROLE</DialogTitle>
            <DialogDescription className="font-mono text-terminal-muted">
              {selectedUser?.username}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {(['USER', 'MODERATOR', 'ADMIN', 'ROOT'] as const).map((role) => (
                <Button
                  key={role}
                  variant={selectedUser?.role === role ? "default" : "outline"}
                  onClick={() => selectedUser && handleUpdateRole(selectedUser.id, role)}
                  className="font-mono"
                  disabled={role === 'ROOT' && user.role !== 'ROOT'}
                  style={{ pointerEvents: 'auto' }}
                >
                  {role === 'ROOT' && <Crown className="mr-1 h-3 w-3" />}
                  {role}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Weight Profile Dialog */}
      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="border-matrix-500 bg-terminal-panel max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-matrix-500">
              {isEditing ? "EDIT PROFILE" : "NEW PROFILE"}
            </DialogTitle>
            <DialogDescription className="font-mono text-terminal-muted">
              Configure WPR weights (should sum to 1.0)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="profileName" className="font-mono">Profile Name</Label>
              <Input
                id="profileName"
                value={profileForm.name}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="font-mono"
                placeholder="Default Profile"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: 'killWeight', label: 'Kill Weight' },
                { key: 'deathWeight', label: 'Death Weight' },
                { key: 'assistWeight', label: 'Assist Weight' },
                { key: 'acsWeight', label: 'ACS Weight' },
                { key: 'adrWeight', label: 'ADR Weight' },
                { key: 'kastWeight', label: 'KAST Weight' },
                { key: 'firstKillWeight', label: 'First Kill Weight' },
                { key: 'clutchWeight', label: 'Clutch Weight' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <Label htmlFor={key} className="font-mono text-xs">{label}</Label>
                  <Input
                    id={key}
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    value={profileForm[key as keyof typeof profileForm]}
                    onChange={(e) => setProfileForm({
                      ...profileForm,
                      [key]: parseFloat(e.target.value) || 0,
                    })}
                    className="font-mono"
                  />
                </div>
              ))}
            </div>
            <div className="p-3 rounded border border-terminal-border bg-terminal-panel/50">
              <p className="font-mono text-sm text-terminal-muted">
                Total: {(
                  profileForm.killWeight +
                  profileForm.deathWeight +
                  profileForm.assistWeight +
                  profileForm.acsWeight +
                  profileForm.adrWeight +
                  profileForm.kastWeight +
                  profileForm.firstKillWeight +
                  profileForm.clutchWeight
                ).toFixed(2)}
              </p>
            </div>
            <Button
              onClick={handleSaveWeightProfile}
              className="w-full font-mono"
              disabled={!profileForm.name}
              style={{ pointerEvents: 'auto' }}
            >
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? "UPDATE PROFILE" : "CREATE PROFILE"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
