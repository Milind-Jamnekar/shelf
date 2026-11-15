import { z } from "zod";
import { pageOf, timestampSchema } from "./common.ts";

const NAME_RULE = "Must be 1 to 100 characters";

const name = z.string().trim().min(1, NAME_RULE).max(100, NAME_RULE);
const description = z.string().max(500, "Must be at most 500 characters").nullable();

// What the API returns.
export const collectionSchema = z.object({
    id: z.uuid(),
    name: z.string(),
    description: z.string().nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
});
export type Collection = z.infer<typeof collectionSchema>;

export const collectionPageSchema = pageOf(collectionSchema);

// What the client may send.
export const createCollectionSchema = z.object({
    name,
    description: description.default(null),
});
export type CreateCollectionInput = z.output<typeof createCollectionSchema>;

export const updateCollectionSchema = z.object({ name, description }).partial();
export type UpdateCollectionInput = z.output<typeof updateCollectionSchema>;
