import { z } from "zod";

export const bookSchema = z.object({
  title: z.string().min(1, "Title is required"),
  author: z.string().min(1, "Author is required"),
  isbn: z.string().regex(/^(?:\d{10}|\d{13})$/, "Invalid ISBN (10 or 13 digits)"),
  description: z.string().optional().default(""),
  genre: z.string().min(1, "Genre is required"),
  language: z.enum(["english", "french", "arabic"]),
  cefr_level: z
    .enum(["A1", "A2", "B1", "B2", "C1", "C2", ""])
    .optional()
    .default(""),
  cover_url: z.string().url().optional().or(z.literal("")),
  shelf_location: z.string().optional().default(""),
  total_copies: z.coerce.number().int().min(1, "At least 1 copy required"),
});

export type BookInput = z.infer<typeof bookSchema>;
