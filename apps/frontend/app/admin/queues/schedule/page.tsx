"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Plus, Edit, Trash2, Clock } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/animate-ui/components/base/alert-dialog";

interface ScheduleEntry {
  id: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  game: "valorant" | "cs2";
  isActive: boolean;
  timezone: string;
  createdAt: string;
}

const scheduleFormSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  game: z.enum(["valorant", "cs2"]),
  isActive: z.boolean().default(true),
  timezone: z.string().default("UTC"),
});

type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function QueueSchedulePage() {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleEntry | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: {
      dayOfWeek: 0,
      startTime: "20:00",
      endTime: "22:00",
      game: "valorant",
      isActive: true,
      timezone: "UTC",
    },
  });

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiGet<{ schedules: ScheduleEntry[] }>("/admin/queue/schedule");
      // setSchedules(data.schedules);
      
      // Temporary mock data
      setSchedules([
        {
          id: "1",
          dayOfWeek: 5, // Friday
          startTime: "20:00",
          endTime: "22:00",
          game: "valorant",
          isActive: true,
          timezone: "UTC",
          createdAt: new Date().toISOString(),
        },
        {
          id: "2",
          dayOfWeek: 6, // Saturday
          startTime: "18:00",
          endTime: "20:00",
          game: "cs2",
          isActive: true,
          timezone: "UTC",
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
      toast.error("Failed to load schedules");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: ScheduleFormValues) => {
    try {
      if (editingSchedule) {
        // TODO: Replace with actual API endpoint
        // await apiPut(`/admin/queue/schedule/${editingSchedule.id}`, data);
        setSchedules((prev) =>
          prev.map((s) => (s.id === editingSchedule.id ? { ...s, ...data } : s))
        );
        toast.success("Schedule updated successfully!");
      } else {
        // TODO: Replace with actual API endpoint
        // const newSchedule = await apiPost("/admin/queue/schedule", data);
        const newSchedule: ScheduleEntry = {
          id: Date.now().toString(),
          ...data,
          createdAt: new Date().toISOString(),
        };
        setSchedules((prev) => [...prev, newSchedule]);
        toast.success("Schedule created successfully!");
      }
      setDialogOpen(false);
      setEditingSchedule(null);
      form.reset();
    } catch (error) {
      console.error("Failed to save schedule:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save schedule"
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // TODO: Replace with actual API endpoint
      // await apiDelete(`/admin/queue/schedule/${id}`);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      toast.success("Schedule deleted successfully!");
      setDeletingId(null);
    } catch (error) {
      console.error("Failed to delete schedule:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to delete schedule"
      );
    }
  };

  const handleEdit = (schedule: ScheduleEntry) => {
    setEditingSchedule(schedule);
    form.reset({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      game: schedule.game,
      isActive: schedule.isActive,
      timezone: schedule.timezone,
    });
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingSchedule(null);
    form.reset({
      dayOfWeek: 0,
      startTime: "20:00",
      endTime: "22:00",
      game: "valorant",
      isActive: true,
      timezone: "UTC",
    });
    setDialogOpen(true);
  };

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
                <Link href="/admin/queues">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back to queues</p>
            </TooltipContent>
          </Tooltip>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">Queue Schedule</h1>
            <p className="text-muted-foreground mt-2">
              Manage Trayb Series queue schedule windows
            </p>
          </div>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button onClick={handleNew}>
                <Plus className="mr-2 h-4 w-4" />
                Add Schedule
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Add a new schedule entry</p>
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
              <CardTitle>Scheduled Queue Windows</CardTitle>
              <CardDescription>
                Configure recurring queue times for Trayb Series
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading schedules...</p>
                </div>
              ) : schedules.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">No schedules configured</p>
                  <Button onClick={handleNew}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Schedule
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Day</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timezone</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schedules.map((schedule, index) => (
                      <TableRow
                        key={schedule.id}
                        className="transition-all duration-200 hover:bg-muted/50"
                        style={{
                          animation: `fadeIn 0.3s ease-out ${index * 0.05}s both`,
                        }}
                      >
                        <TableCell className="font-medium">
                          {DAYS_OF_WEEK[schedule.dayOfWeek]}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {schedule.game === "valorant" ? "Valorant" : "CS2"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={schedule.isActive ? "default" : "secondary"}
                          >
                            {schedule.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{schedule.timezone}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Edit schedule</p>
                              </TooltipContent>
                            </Tooltip>
                            <AlertDialog>
                              <AlertDialogTrigger
                                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-8 px-3"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </AlertDialogTrigger>
                              <AlertDialogPopup>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete this schedule entry?
                                    This action cannot be undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(schedule.id)}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogPopup>
                            </AlertDialog>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingSchedule ? "Edit Schedule" : "Create Schedule"}
              </DialogTitle>
              <DialogDescription>
                Configure a queue schedule window
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="dayOfWeek"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Day of Week</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        value={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select day" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day, index) => (
                            <SelectItem key={index} value={index.toString()}>
                              {day}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="game"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Game</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select game" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="valorant">Valorant</SelectItem>
                          <SelectItem value="cs2">CS2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>Active</FormLabel>
                        <FormDescription>
                          Enable or disable this schedule entry
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingSchedule(null);
                      form.reset();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingSchedule ? "Update" : "Create"} Schedule
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TooltipProvider>
  );
}

