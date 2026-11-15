import type { z } from "zod";
import { validationError } from "./errors.ts";

// ["tags", 2] -> "tags[2]". An empty path means the whole body (or query) is wrong.
function fieldName(path: PropertyKey[], source: string): string {
    if (path.length === 0) {
        return source;
    }
    return path
        .map((part, index) => (typeof part === "number" ? `[${part}]` : index === 0 ? String(part) : `.${String(part)}`))
        .join("");
}

// Checks `data` against a schema. Returns the cleaned-up value, or throws a 422
// listing every field that broke a rule.
export function parse<T extends z.ZodType>(schema: T, data: unknown, source: "body" | "query" = "body"): z.output<T> {
    const result = schema.safeParse(data, {
        // Used only where the schema has no message of its own.
        error: (issue) => (issue.input === undefined ? "Required" : undefined),
    });
    if (result.success) {
        return result.data;
    }

    const details = result.error.issues.map((issue) => ({
        field: fieldName(issue.path, source),
        message: issue.message,
    }));
    throw validationError(details, source === "body" ? "Request body is invalid" : "Query parameters are invalid");
}
