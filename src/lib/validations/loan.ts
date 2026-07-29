import { z } from "zod";

export const checkoutSchema = z.object({
  user_barcode: z.string().min(1, "User barcode is required"),
  book_barcode: z.string().min(1, "Book barcode is required"),
});

export const returnSchema = z.object({
  book_barcode: z.string().min(1, "Book barcode is required"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
