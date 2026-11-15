import { randomUUID } from "node:crypto";
import { paginate, type Page } from "../pagination.ts";
import type { Item, ItemInput, ListItemsQuery } from "../schemas/items.ts";

// In-memory store: data is lost when the server restarts.
const items = new Map<string, Item>();

// Turns validated input into the fields that are stored.
function toFields(input: ItemInput) {
    const shared = {
        content: input.content,
        tags: [...new Set(input.tags)], // remove duplicate tags
        collectionId: input.collectionId,
        isFavorite: input.isFavorite,
    };
    if (input.type === "link") {
        // A link without a title uses its URL as the title.
        return { type: input.type, url: input.url, title: input.title ?? input.url, ...shared };
    }
    return { type: input.type, url: null, title: input.title, ...shared };
}

// All filters combine with AND.
export function listItems(query: ListItemsQuery): Page<Item> {
    const search = query.q?.toLowerCase();
    const matches = [...items.values()].filter(
        (item) =>
            (query.type === undefined || item.type === query.type) &&
            (query.tag === undefined || item.tags.includes(query.tag)) &&
            (query.collectionId === undefined || item.collectionId === query.collectionId) &&
            (query.favorite === undefined || item.isFavorite === (query.favorite === "true")) &&
            (search === undefined || item.title.toLowerCase().includes(search)),
    );
    return paginate(matches, query);
}

export function getItem(id: string): Item | undefined {
    return items.get(id);
}

export function createItem(input: ItemInput): Item {
    const now = new Date().toISOString();
    const item: Item = { id: randomUUID(), ...toFields(input), createdAt: now, updatedAt: now };
    items.set(item.id, item);
    return item;
}

// `input` is the complete new state of the item, not just the changed fields.
export function updateItem(id: string, input: ItemInput): Item | undefined {
    const existing = items.get(id);
    if (!existing) {
        return undefined;
    }
    const item: Item = { ...existing, ...toFields(input), updatedAt: new Date().toISOString() };
    items.set(id, item);
    return item;
}

export function deleteItem(id: string): boolean {
    return items.delete(id);
}

// Detach every item from a collection that is being deleted.
export function unassignCollection(collectionId: string): void {
    const now = new Date().toISOString();
    for (const item of items.values()) {
        if (item.collectionId === collectionId) {
            item.collectionId = null;
            item.updatedAt = now;
        }
    }
}
