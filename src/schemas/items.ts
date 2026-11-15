import { z } from "zod";
import { pageOf, pageQuerySchema, timestampSchema } from "./common.ts";

const TITLE_RULE = "Must be 1 to 200 characters";
const TAG_LENGTH_RULE = "Must be 1 to 30 characters";
const TYPE_RULE = 'Must be "link" or "note"';

// The rules for each field, written once and reused below.
const url = z
    .string()
    .max(2048, "Must be at most 2,048 characters")
    .regex(/^https?:\/\//i, { error: "Must start with http:// or https://", abort: true })
    .refine((value) => URL.canParse(value), "Must be a valid URL");
const title = z.string().trim().min(1, TITLE_RULE).max(200, TITLE_RULE);
const content = z.string().max(10_000, "Must be at most 10,000 characters");
const tag = z
    .string()
    .min(1, { error: TAG_LENGTH_RULE, abort: true })
    .max(30, TAG_LENGTH_RULE)
    .regex(/^[a-zA-Z0-9-]+$/, "Only a-z, 0-9 and hyphens are allowed")
    .toLowerCase();
const tags = z.array(tag).max(10, "At most 10 tags are allowed");
const collectionId = z.uuid("Must be a collection id (UUID)").nullable();
const isFavorite = z.boolean();

// What the API returns.
export const itemSchema = z.object({
    id: z.uuid(),
    type: z.enum(["link", "note"]),
    url: z.string().nullable(),
    title: z.string(),
    content: z.string().nullable(),
    tags: z.array(z.string()),
    collectionId: z.uuid().nullable(),
    isFavorite: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
});
export type Item = z.infer<typeof itemSchema>;

export const itemPageSchema = pageOf(itemSchema);

// What the client may send. A link and a note have different required fields,
// so each gets its own schema and `type` decides which one applies.
const linkInputSchema = z.object({
    type: z.literal("link"),
    url,
    title: title.optional(),
    content: content.nullable().default(null),
    tags: tags.default([]),
    collectionId: collectionId.default(null),
    isFavorite: isFavorite.default(false),
});

const noteInputSchema = z.object({
    type: z.literal("note"),
    url: z.never({ error: "Not allowed on a note" }).optional(),
    title,
    content: content.min(1, "Must be 1 to 10,000 characters"),
    tags: tags.default([]),
    collectionId: collectionId.default(null),
    isFavorite: isFavorite.default(false),
});

export const createItemSchema = z.discriminatedUnion("type", [linkInputSchema, noteInputSchema], {
    error: (issue) => (issue.code === "invalid_union" ? TYPE_RULE : undefined),
});
export type ItemInput = z.output<typeof createItemSchema>;

// PATCH: every field is optional, and `type` is not accepted.
export const updateItemSchema = z
    .object({ url, title, content: content.nullable(), tags, collectionId, isFavorite })
    .partial();

export const listItemsQuerySchema = pageQuerySchema.extend({
    type: z.enum(["link", "note"], TYPE_RULE).optional(),
    tag: tag.optional(),
    collectionId: z.uuid("Must be a collection id (UUID)").optional(),
    favorite: z.enum(["true", "false"], 'Must be "true" or "false"').optional(),
    q: z.string().min(1).optional(),
});
export type ListItemsQuery = z.output<typeof listItemsQuerySchema>;

// GET /collections/:id/items takes the collection from the URL instead.
export const listCollectionItemsQuerySchema = listItemsQuerySchema.omit({ collectionId: true });
