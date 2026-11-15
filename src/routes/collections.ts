import * as controller from "../controllers/collections.ts";
import { defineRoutes } from "../docs/registry.ts";
import { collectionPageSchema, collectionSchema, createCollectionSchema, updateCollectionSchema } from "../schemas/collections.ts";
import { pageQuerySchema } from "../schemas/common.ts";
import { itemPageSchema, listCollectionItemsQuerySchema } from "../schemas/items.ts";

export const collectionsRouter = defineRoutes("Collections", [
    {
        method: "post",
        path: "/collections",
        summary: "Create a collection",
        body: createCollectionSchema,
        success: { status: 201, description: "The new collection", schema: collectionSchema },
        errors: [409, 422],
        handler: controller.createCollection,
    },
    {
        method: "get",
        path: "/collections",
        summary: "List collections, newest first",
        query: pageQuerySchema,
        success: { status: 200, description: "A page of collections", schema: collectionPageSchema },
        errors: [422],
        handler: controller.listCollections,
    },
    {
        method: "get",
        path: "/collections/:id",
        summary: "Get one collection",
        success: { status: 200, description: "The collection", schema: collectionSchema },
        errors: [404],
        handler: controller.getCollection,
    },
    {
        method: "patch",
        path: "/collections/:id",
        summary: "Change a collection's name or description",
        body: updateCollectionSchema,
        success: { status: 200, description: "The updated collection", schema: collectionSchema },
        errors: [404, 409, 422],
        handler: controller.updateCollection,
    },
    {
        method: "delete",
        path: "/collections/:id",
        summary: "Delete a collection",
        description: "The collection's items are not deleted. They stay, with `collectionId` set to `null`.",
        success: { status: 204, description: "Deleted. No body" },
        errors: [404],
        handler: controller.deleteCollection,
    },
    {
        method: "get",
        path: "/collections/:id/items",
        summary: "List the items in a collection, newest first",
        description: "The same as `GET /items?collectionId=:id`, with the same filters.",
        query: listCollectionItemsQuerySchema,
        success: { status: 200, description: "A page of items", schema: itemPageSchema },
        errors: [404, 422],
        handler: controller.listCollectionItems,
    },
]);
