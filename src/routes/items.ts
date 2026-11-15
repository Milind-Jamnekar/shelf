import * as controller from "../controllers/items.ts";
import { defineRoutes } from "../docs/registry.ts";
import { createItemSchema, itemPageSchema, itemSchema, listItemsQuerySchema, updateItemSchema } from "../schemas/items.ts";

export const itemsRouter = defineRoutes("Items", [
    {
        method: "post",
        path: "/items",
        summary: "Create a link or a note",
        description: "A link needs `url`. A note needs `title` and `content`, and must not have `url`.",
        body: createItemSchema,
        success: { status: 201, description: "The new item", schema: itemSchema },
        errors: [422],
        handler: controller.createItem,
    },
    {
        method: "get",
        path: "/items",
        summary: "List items, newest first",
        description: "Filters combine with AND. Pass `nextCursor` from one page as `cursor` to get the next.",
        query: listItemsQuerySchema,
        success: { status: 200, description: "A page of items", schema: itemPageSchema },
        errors: [422],
        handler: controller.listItems,
    },
    {
        method: "get",
        path: "/items/:id",
        summary: "Get one item",
        success: { status: 200, description: "The item", schema: itemSchema },
        errors: [404],
        handler: controller.getItem,
    },
    {
        method: "patch",
        path: "/items/:id",
        summary: "Change an item",
        description:
            "Send only the fields to change. `type` cannot be changed. " +
            "Setting `collectionId` to `null` removes the item from its collection. " +
            "The result must still be a valid link or note.",
        body: updateItemSchema,
        success: { status: 200, description: "The updated item", schema: itemSchema },
        errors: [404, 422],
        handler: controller.updateItem,
    },
    {
        method: "delete",
        path: "/items/:id",
        summary: "Delete an item",
        success: { status: 204, description: "Deleted. No body" },
        errors: [404],
        handler: controller.deleteItem,
    },
]);
