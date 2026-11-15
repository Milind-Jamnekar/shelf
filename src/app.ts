import express from "express";
import swaggerUi from "swagger-ui-express";
import { buildOpenApiDocument } from "./docs/openapi.ts";
import { errorHandler, routeNotFound } from "./errors.ts";
import { collectionsRouter } from "./routes/collections.ts";
import { itemsRouter } from "./routes/items.ts";
import { systemRouter } from "./routes/system.ts";

export const app = express();

// Parses JSON request bodies into req.body. Must come before the routers.
app.use(express.json());

app.use(systemRouter);
app.use(collectionsRouter);
app.use(itemsRouter);

// API docs, generated from the route definitions above.
const openApiDocument = buildOpenApiDocument();
app.get("/openapi.json", (_req, res) => {
    res.json(openApiDocument);
});
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

// Order matters: these two must come after every route.
app.use(routeNotFound);
app.use(errorHandler);
