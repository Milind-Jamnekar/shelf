import { z } from "zod";
import { errorSchema } from "../schemas/common.ts";
import { documentedRoutes } from "./registry.ts";

type Json = Record<string, any>;

const ERROR_DESCRIPTIONS: Record<number, string> = {
    400: "INVALID_JSON: the body is not valid JSON",
    404: "NOT_FOUND: the id does not exist",
    409: "CONFLICT: a collection with that name already exists",
    422: "VALIDATION_ERROR: the body or query parameters break a rule",
};

// "input" describes what a client sends; "output" describes what it gets back.
function jsonSchema(schema: z.ZodType, io: "input" | "output"): Json {
    const { $schema, ...rest } = z.toJSONSchema(schema, { io }) as Json;
    return rest;
}

function jsonContent(schema: Json): Json {
    return { "application/json": { schema } };
}

function pathParameters(path: string): Json[] {
    return [...path.matchAll(/:(\w+)/g)].map((match) => ({
        name: match[1],
        in: "path",
        required: true,
        schema: { type: "string", format: "uuid" },
    }));
}

function queryParameters(schema: z.ZodType): Json[] {
    const { properties = {}, required = [] } = jsonSchema(schema, "input");
    return Object.entries(properties).map(([name, property]) => ({
        name,
        in: "query",
        required: required.includes(name),
        schema: property,
    }));
}

// Builds the OpenAPI document from the routes registered with defineRoutes().
export function buildOpenApiDocument(): Json {
    const paths: Json = {};
    const error = jsonSchema(errorSchema, "output");

    for (const route of documentedRoutes) {
        const responses: Json = {
            [route.success.status]: {
                description: route.success.description,
                ...(route.success.schema && { content: jsonContent(jsonSchema(route.success.schema, "output")) }),
            },
        };
        const errorStatuses = [...(route.body ? [400] : []), ...(route.errors ?? [])].sort();
        for (const status of errorStatuses) {
            responses[status] = { description: ERROR_DESCRIPTIONS[status] ?? "Error", content: jsonContent(error) };
        }

        const openApiPath = route.path.replace(/:(\w+)/g, "{$1}");
        paths[openApiPath] ??= {};
        paths[openApiPath][route.method] = {
            tags: [route.group],
            summary: route.summary,
            ...(route.description && { description: route.description }),
            parameters: [...pathParameters(route.path), ...(route.query ? queryParameters(route.query) : [])],
            ...(route.body && { requestBody: { required: true, content: jsonContent(jsonSchema(route.body, "input")) } }),
            responses,
        };
    }

    return {
        openapi: "3.1.0",
        info: {
            title: "Shelf API",
            version: "1.0.0",
            description: "Save links and notes, tag them, and organise them into collections.",
        },
        paths,
    };
}
