import type { RequestHandler } from "express";
import { notFound, validationError } from "../errors.ts";
import { createItemSchema, listItemsQuerySchema, updateItemSchema } from "../schemas/items.ts";
import * as collectionsService from "../services/collections.ts";
import * as itemsService from "../services/items.ts";
import { parse } from "../validation.ts";

type IdParams = { id: string };

function assertCollectionExists(collectionId: string | null): void {
    if (collectionId !== null && !collectionsService.getCollection(collectionId)) {
        throw validationError([{ field: "collectionId", message: "Collection does not exist" }]);
    }
}

export const listItems: RequestHandler = (req, res) => {
    const query = parse(listItemsQuerySchema, req.query, "query");
    res.json(itemsService.listItems(query));
};

export const createItem: RequestHandler = (req, res) => {
    const input = parse(createItemSchema, req.body);
    assertCollectionExists(input.collectionId);
    res.status(201).json(itemsService.createItem(input));
};

export const getItem: RequestHandler<IdParams> = (req, res) => {
    const item = itemsService.getItem(req.params.id);
    if (!item) {
        throw notFound("Item");
    }
    res.json(item);
};

export const updateItem: RequestHandler<IdParams> = (req, res) => {
    const existing = itemsService.getItem(req.params.id);
    if (!existing) {
        throw notFound("Item");
    }

    const changes = parse(updateItemSchema, req.body);
    if (req.body.type !== undefined && req.body.type !== existing.type) {
        throw validationError([{ field: "type", message: "Cannot be changed after create" }]);
    }
    if (Object.keys(changes).length === 0) {
        throw validationError([{ field: "body", message: "Provide at least one field to change" }]);
    }

    // Apply the changes on top of the current item, then check the result
    // against the same rules as a new item. That way a PATCH can never leave
    // an item in a state that POST would have rejected.
    const { id, createdAt, updatedAt, url, ...current } = existing;
    const merged: Record<string, unknown> = { ...current, ...(url !== null && { url }), ...changes };

    // A link whose title was just its URL follows the URL when the URL changes.
    if (existing.title === existing.url && changes.url !== undefined && changes.title === undefined) {
        delete merged.title;
    }

    const input = parse(createItemSchema, merged);
    if (changes.collectionId !== undefined) {
        assertCollectionExists(input.collectionId);
    }
    res.json(itemsService.updateItem(id, input));
};

export const deleteItem: RequestHandler<IdParams> = (req, res) => {
    if (!itemsService.deleteItem(req.params.id)) {
        throw notFound("Item");
    }
    res.status(204).end();
};
