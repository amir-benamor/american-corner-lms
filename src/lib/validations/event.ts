import { z } from "zod";

export const eventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  type: z.enum(["english_club", "tech_workshop", "study_info", "cultural", "other"]),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  location: z.string().min(1, "Location is required"),
  max_capacity: z.coerce.number().int().min(1, "Capacity must be at least 1"),
  cover_image: z.string().url().optional().or(z.literal("")),
});

export type EventInput = z.infer<typeof eventSchema>;
