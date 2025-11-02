
import { z } from "zod";

export const paginationQuery = z.object({
  limit: z.coerce.number().int().positive().max(50).default(20),
  cursor: z.string().min(1).optional(),
  sort: z.enum(["asc", "desc"]).default("desc"),
  createdBefore: z.coerce.date().optional(),
  createdAfter: z.coerce.date().optional(),
});

export type PaginationQuery = z.infer<typeof paginationQuery>;