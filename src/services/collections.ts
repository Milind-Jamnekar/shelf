import { randomUUID } from "node:crypto";
import { conflict } from "../errors.ts";
import { paginate, type Page } from "../pagination.ts";
import type { Collection, CreateCollectionInput, UpdateCollectionInput } from "../schemas/collections.ts";
import type { PageQuery } from "../schemas/common.ts";

// In-memory store: data is lost when the server restarts.
const collections = new Map<string, Collection>();

// Names are unique ignoring case: "Databases" and "databases" are the same name.
function assertNameIsFree(name: string, exceptId?: string): void {
    const wanted = name.toLowerCase();
    for (const collection of collections.values()) {
        if (collection.id !== exceptId && collection.name.toLowerCase() === wanted) {
            throw conflict(`A collection named "${collection.name}" already exists`);
        }
    }
}

export function listCollections(query: PageQuery): Page<Collection> {
    return paginate([...collections.values()], query);
}

export function getCollection(id: string): Collection | undefined {
    return collections.get(id);
}

export function createCollection(input: CreateCollectionInput): Collection {
    assertNameIsFree(input.name);
    const now = new Date().toISOString();
    const collection: Collection = { id: randomUUID(), ...input, createdAt: now, updatedAt: now };
    collections.set(collection.id, collection);
    return collection;
}

export function updateCollection(id: string, changes: UpdateCollectionInput): Collection | undefined {
    const collection = collections.get(id);
    if (!collection) {
        return undefined;
    }
    if (changes.name !== undefined) {
        assertNameIsFree(changes.name, id);
        collection.name = changes.name;
    }
    if (changes.description !== undefined) {
        collection.description = changes.description;
    }
    collection.updatedAt = new Date().toISOString();
    return collection;
}

export function deleteCollection(id: string): boolean {
    return collections.delete(id);
}
