import { z } from "zod";

const LIMIT_RULE = "Must be a whole number from 1 to 100";

export const pageQuerySchema = z.object({
    limit: z.coerce.number({ error: LIMIT_RULE }).int(LIMIT_RULE).min(1, LIMIT_RULE).max(100, LIMIT_RULE).default(20),
    cursor: z.string().min(1).optional(),
});
export type PageQuery = z.output<typeof pageQuerySchema>;

export const timestampSchema = z.iso.datetime();

// The response shape of every list endpoint.
export function pageOf<T extends z.ZodType>(row: T) {
    return z.object({
        data: z.array(row),
        nextCursor: z.string().nullable(),
    });
}

// The one error format used by every endpoint.
export const errorSchema = z.object({
    error: z.object({
        code: z.enum(["INVALID_JSON", "BAD_REQUEST", "NOT_FOUND", "CONFLICT", "VALIDATION_ERROR", "INTERNAL_ERROR"]),
        message: z.string(),
        details: z.array(z.object({ field: z.string(), message: z.string() })).optional(),
    }),
});
