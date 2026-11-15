import { Router, type RequestHandler } from "express";
import type { z } from "zod";

// One endpoint: how to route it and how to describe it in the API docs.
// Keeping both in one place means an endpoint cannot exist without docs.
export interface RouteDefinition {
    method: "get" | "post" | "patch" | "delete";
    path: string; // Express style, e.g. "/items/:id"
    summary: string;
    description?: string;
    query?: z.ZodType;
    body?: z.ZodType;
    success: { status: number; description: string; schema?: z.ZodType };
    errors?: number[]; // the error statuses this endpoint can return
    // `any` because each handler declares its own URL parameters.
    handler: RequestHandler<any>;
}

export type DocumentedRoute = Omit<RouteDefinition, "handler"> & { group: string };

// Every route defined through defineRoutes(), in order. Read by openapi.ts.
export const documentedRoutes: DocumentedRoute[] = [];

export function defineRoutes(group: string, routes: RouteDefinition[]): Router {
    const router = Router();
    for (const { handler, ...docs } of routes) {
        router[docs.method](docs.path, handler);
        documentedRoutes.push({ ...docs, group });
    }
    return router;
}
