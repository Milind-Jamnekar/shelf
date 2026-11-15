import { z } from "zod";
import { defineRoutes } from "../docs/registry.ts";

export const systemRouter = defineRoutes("System", [
    {
        method: "get",
        path: "/health",
        summary: "Check that the server is running",
        success: { status: 200, description: "The server is up", schema: z.object({ status: z.literal("ok") }) },
        handler: (_req, res) => {
            res.json({ status: "ok" });
        },
    },
]);
