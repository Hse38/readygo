import { z } from "zod";

export const flightMetadataSchema = z.object({
  domestic: z.boolean().optional(),
  terminal: z.string().min(1).optional(),
  airline: z.string().min(1).optional(),
});
