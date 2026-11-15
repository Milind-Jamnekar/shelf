import type { RequestHandler } from "express";
import { notFound, validationError } from "../errors.ts";
import { createCollectionSchema, updateCollectionSchema } from "../schemas/collections.ts";
import { pageQuerySchema } from "../schemas/common.ts";
import { listCollectionItemsQuerySchema } from "../schemas/items.ts";
import * as collectionsService from "../services/collections.ts";
import * as itemsService from "../services/items.ts";
import { parse } from "../validation.ts";

type IdParams = { id: string };

export const listCollections: RequestHandler = (req, res) => {
    const query = parse(pageQuerySchema, req.query, "query");
    res.json(collectionsService.listCollections(query));
};

export const createCollection: RequestHandler = (req, res) => {
    const input = parse(createCollectionSchema, req.body);
    res.status(201).json(collectionsService.createCollection(input));
};

export const getCollection: RequestHandler<IdParams> = (req, res) => {
    const collection = collectionsService.getCollection(req.params.id);
    if (!collection) {
        throw notFound("Collection");
    }
    res.json(collection);
};

export const updateCollection: RequestHandler<IdParams> = (req, res) => {
    const changes = parse(updateCollectionSchema, req.body);
    if (Object.keys(changes).length === 0) {
        throw validationError([{ field: "body", message: "Provide at least one field to change" }]);
    }
    const collection = collectionsService.updateCollection(req.params.id, changes);
    if (!collection) {
        throw notFound("Collection");
    }
    res.json(collection);
};

export const deleteCollection: RequestHandler<IdParams> = (req, res) => {
    if (!collectionsService.deleteCollection(req.params.id)) {
        throw notFound("Collection");
    }
    // The items survive; they just no longer belong to a collection.
    itemsService.unassignCollection(req.params.id);
    res.status(204).end();
};

export const listCollectionItems: RequestHandler<IdParams> = (req, res) => {
    if (!collectionsService.getCollection(req.params.id)) {
        throw notFound("Collection");
    }
    const query = parse(listCollectionItemsQuerySchema, req.query, "query");
    res.json(itemsService.listItems({ ...query, collectionId: req.params.id }));
};
