import { z } from "zod";
import { games } from "@trayb/types";

export const adminSettingsSystemSchema = z.object({
  maintenanceMode: z.boolean().default(false),
  supportEmail: z.string().email(),
  discordInviteUrl: z.string().url(),
  frontendUrl: z.string().url(),
  announcements: z
    .object({
      enabled: z.boolean(),
      message: z.string(),
      severity: z.enum(["info", "warning", "critical"]).default("info"),
    })
    .optional(),
});

export const adminMapSchema = z.object({
  id: z.string(),
  name: z.string(),
  game: z.enum(games),
  enabled: z.boolean().default(true),
  rotationWeight: z.number().min(0).max(100).default(10),
});

export const adminSettingsMapsSchema = z.object({
  maps: z.array(adminMapSchema),
});

export const adminWeightProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  isDefault: z.boolean().default(false),
  weights: z
    .record(z.number().min(0))
    .refine(
      (value) => Object.values(value).every((weight) => weight <= 1),
      "Weights must be between 0 and 1"
    ),
});

export const adminSettingsWeightProfilesSchema = z.object({
  profiles: z.array(adminWeightProfileSchema),
});

export type AdminSystemSettings = z.infer<typeof adminSettingsSystemSchema>;
export type AdminMapsSettings = z.infer<typeof adminSettingsMapsSchema>;
export type AdminWeightProfilesSettings = z.infer<
  typeof adminSettingsWeightProfilesSchema
>;
