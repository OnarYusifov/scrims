"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { apiPost } from "@/lib/api";
import { toast } from "sonner";

const hubFormSchema = z.object({
  name: z.string().min(1, "Hub name is required").max(100),
  description: z.string().optional(),
  game: z.enum(["valorant", "cs2"], {
    required_error: "Please select a game",
  }),
  type: z.enum(["global", "private"], {
    required_error: "Please select a hub type",
  }),
  queueTypes: z.array(z.string()).min(1, "At least one queue type is required"),
  draftOptions: z.array(z.string()).optional(),
  recordingPolicy: z.enum(["always", "optional", "never"]).default("optional"),
});

type HubFormValues = z.infer<typeof hubFormSchema>;

export default function CreateHubPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<HubFormValues>({
    resolver: zodResolver(hubFormSchema),
    defaultValues: {
      name: "",
      description: "",
      game: undefined,
      type: "private",
      queueTypes: [],
      draftOptions: [],
      recordingPolicy: "optional",
    },
  });

  const onSubmit = async (data: HubFormValues) => {
    try {
      setIsSubmitting(true);
      
      // TODO: Replace with actual API endpoint when backend is ready
      // await apiPost("/admin/hubs", data);
      
      // Temporary success for development
      await new Promise((resolve) => setTimeout(resolve, 500));
      
      toast.success("Hub created successfully!");
      router.push("/admin/hubs");
    } catch (error) {
      console.error("Failed to create hub:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create hub"
      );
    } finally {
      setIsSubmitting(false);
    }
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
                <Link href="/admin/hubs">
                  <ArrowLeft className="h-4 w-4" />
                </Link>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Back to hubs</p>
            </TooltipContent>
          </Tooltip>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Hub</h1>
            <p className="text-muted-foreground mt-2">
              Create a new hub for players to join and play matches
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardHeader>
              <CardTitle>Hub Details</CardTitle>
              <CardDescription>
                Configure the basic settings for your hub
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hub Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="My Awesome Hub"
                            {...field}
                            className="transition-all duration-200 focus:scale-[1.01]"
                          />
                        </FormControl>
                        <FormDescription>
                          The display name for this hub
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your hub..."
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Optional description for the hub
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
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
                            <SelectValue placeholder="Select a game" />
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
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hub Type</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="global">Global (Public)</SelectItem>
                          <SelectItem value="private">Private (Whitelist)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Global hubs are public, private hubs require whitelist
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="queueTypes"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Queue Types Allowed</FormLabel>
                      <FormDescription>
                        Select which queue types are allowed in this hub
                      </FormDescription>
                    </div>
                    {["unranked", "ranked"].map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="queueTypes"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal capitalize">
                                {item}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="draftOptions"
                render={() => (
                  <FormItem>
                    <div className="mb-4">
                      <FormLabel>Draft Options</FormLabel>
                      <FormDescription>
                        Select which draft methods are allowed
                      </FormDescription>
                    </div>
                    {["random", "elo_balanced", "captain"].map((item) => (
                      <FormField
                        key={item}
                        control={form.control}
                        name="draftOptions"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, item])
                                      : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item === "random"
                                  ? "Random"
                                  : item === "elo_balanced"
                                  ? "ELO Balanced"
                                  : "Captain Draft"}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="recordingPolicy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Recording Policy</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select policy" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="always">Always Record</SelectItem>
                        <SelectItem value="optional">Optional</SelectItem>
                        <SelectItem value="never">Never Record</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Default recording behavior for matches in this hub
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating..." : "Create Hub"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
        </motion.div>
      </motion.div>
    </TooltipProvider>
  );
}

