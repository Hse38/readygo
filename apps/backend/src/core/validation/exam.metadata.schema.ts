import { z } from "zod";

export const examMetadataSchema = z.object({
  subject: z.string().min(1).optional(),
  examCode: z.string().min(1).optional(),
  seatNo: z.string().min(1).optional(),
});
