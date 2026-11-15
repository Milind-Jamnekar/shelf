import { validationError } from "./errors.ts";

interface Sortable {
    id: string;
    createdAt: string;
}

export interface Page<T> {
    data: T[];
    nextCursor: string | null;
}

// Newest first. Rows created in the same millisecond are ordered by id, so the
// order is total: no two rows ever compare as equal.
function newestFirst(a: Sortable, b: Sortable): number {
    if (a.createdAt !== b.createdAt) {
        return a.createdAt > b.createdAt ? -1 : 1;
    }
    if (a.id !== b.id) {
        return a.id > b.id ? -1 : 1;
    }
    return 0;
}

// The cursor is the sort position of the last row on the page, not a row number.
function encodeCursor(row: Sortable): string {
    return Buffer.from(JSON.stringify({ createdAt: row.createdAt, id: row.id })).toString("base64url");
}

function decodeCursor(cursor: string): Sortable {
    try {
        const value = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
        if (typeof value?.createdAt === "string" && typeof value?.id === "string") {
            return { createdAt: value.createdAt, id: value.id };
        }
    } catch {
        // Fall through to the error below.
    }
    throw validationError([{ field: "cursor", message: "Not a valid cursor" }], "Query parameters are invalid");
}

export function paginate<T extends Sortable>(rows: T[], options: { limit: number; cursor?: string | undefined }): Page<T> {
    let remaining = [...rows].sort(newestFirst);
    if (options.cursor !== undefined) {
        const position = decodeCursor(options.cursor);
        // Keep only the rows that sort after the cursor position.
        remaining = remaining.filter((row) => newestFirst(position, row) < 0);
    }

    const data = remaining.slice(0, options.limit);
    const hasMore = remaining.length > data.length;
    return { data, nextCursor: hasMore ? encodeCursor(data[data.length - 1]!) : null };
}
