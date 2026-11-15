import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, test } from "node:test";
import { app } from "../src/app.ts";

let server: Server;
let baseUrl: string;

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
});

after(() => {
    server.close();
});

async function api(method: string, path: string, body?: unknown) {
    const response = await fetch(baseUrl + path, {
        method,
        ...(body !== undefined && {
            headers: { "Content-Type": "application/json" },
            body: typeof body === "string" ? body : JSON.stringify(body),
        }),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
}

function fields(body: any): string[] {
    return body.error.details.map((detail: { field: string }) => detail.field);
}

test("creates a link: title defaults to the URL, tags are lowercased and de-duplicated", async () => {
    const { status, body } = await api("POST", "/items", {
        type: "link",
        url: "https://example.com/postgres-indexes",
        tags: ["Postgres", "performance", "postgres"],
    });
    assert.equal(status, 201);
    assert.equal(body.title, "https://example.com/postgres-indexes");
    assert.equal(body.content, null);
    assert.deepEqual(body.tags, ["postgres", "performance"]);
    assert.equal(body.collectionId, null);
    assert.equal(body.isFavorite, false);
});

test("an invalid URL returns 422 naming the url field", async () => {
    const { status, body } = await api("POST", "/items", { type: "link", url: "ftp://example.com" });
    assert.equal(status, 422);
    assert.equal(body.error.code, "VALIDATION_ERROR");
    assert.deepEqual(body.error.details, [{ field: "url", message: "Must start with http:// or https://" }]);
});

test("validation errors name every bad field, including positions inside tags", async () => {
    const { status, body } = await api("POST", "/items", {
        type: "link",
        url: "nope",
        tags: ["ok", "also-ok", "not ok!"],
    });
    assert.equal(status, 422);
    assert.deepEqual(fields(body), ["url", "tags[2]"]);
});

test("a note needs title and content, and must not have a url", async () => {
    const missing = await api("POST", "/items", { type: "note", title: "Ideas for my talk" });
    assert.equal(missing.status, 422);
    assert.deepEqual(missing.body.error.details, [{ field: "content", message: "Required" }]);

    const withUrl = await api("POST", "/items", { type: "note", title: "T", content: "C", url: "https://example.com" });
    assert.equal(withUrl.status, 422);
    assert.deepEqual(withUrl.body.error.details, [{ field: "url", message: "Not allowed on a note" }]);
});

test("a missing or unknown type is a validation error on type", async () => {
    const { status, body } = await api("POST", "/items", { url: "https://example.com" });
    assert.equal(status, 422);
    assert.deepEqual(fields(body), ["type"]);
});

test("a collectionId that does not exist is a 422 on collectionId", async () => {
    const { status, body } = await api("POST", "/items", {
        type: "link",
        url: "https://example.com",
        collectionId: "3f6c2a9e-8b1d-4c57-9a0e-2d4b7f1e6c10",
    });
    assert.equal(status, 422);
    assert.deepEqual(fields(body), ["collectionId"]);
});

test("collection names are unique ignoring case", async () => {
    const first = await api("POST", "/collections", { name: "Databases" });
    assert.equal(first.status, 201);
    assert.equal(first.body.description, null);

    const second = await api("POST", "/collections", { name: "databases" });
    assert.equal(second.status, 409);
    assert.equal(second.body.error.code, "CONFLICT");

    const other = await api("POST", "/collections", { name: "Reading list" });
    const renamed = await api("PATCH", `/collections/${other.body.id}`, { name: "DATABASES" });
    assert.equal(renamed.status, 409);
});

test("paging through 50 items with limit=10 returns each item exactly once", async () => {
    const created: string[] = [];
    for (let i = 0; i < 50; i++) {
        const { body } = await api("POST", "/items", { type: "note", title: `Note ${i}`, content: "x", tags: ["paging"] });
        created.push(body.id);
    }

    const seen: string[] = [];
    let cursor: string | null = null;
    let pages = 0;
    do {
        const query: string = `/items?tag=paging&limit=10${cursor ? `&cursor=${cursor}` : ""}`;
        const { status, body } = await api("GET", query);
        assert.equal(status, 200);
        assert.equal(body.data.length, 10);
        seen.push(...body.data.map((item: { id: string }) => item.id));
        cursor = body.nextCursor;
        pages++;

        // A new item arriving in the middle of paging must not disturb later pages.
        if (pages === 2) {
            await api("POST", "/items", { type: "note", title: "Late arrival", content: "x", tags: ["paging"] });
        }
    } while (cursor !== null);

    assert.equal(pages, 5);
    assert.equal(new Set(seen).size, 50);
    assert.deepEqual([...seen].sort(), [...created].sort());
});

test("list filters combine with AND", async () => {
    const collection = await api("POST", "/collections", { name: "Filters" });
    const base = { tags: ["filter-test"], collectionId: collection.body.id };
    await api("POST", "/items", { ...base, type: "link", url: "https://example.com/a", title: "Postgres indexes" });
    await api("POST", "/items", { ...base, type: "note", title: "Postgres talk", content: "x", isFavorite: true });
    await api("POST", "/items", { type: "note", title: "Unrelated", content: "x", tags: ["filter-test"] });

    const titles = async (query: string) =>
        (await api("GET", query)).body.data.map((item: { title: string }) => item.title).sort();

    assert.deepEqual(await titles("/items?tag=Filter-Test"), ["Postgres indexes", "Postgres talk", "Unrelated"]);
    assert.deepEqual(await titles("/items?tag=filter-test&type=note&favorite=true"), ["Postgres talk"]);
    assert.deepEqual(await titles("/items?tag=filter-test&q=POSTGRES"), ["Postgres indexes", "Postgres talk"]);
    assert.deepEqual(await titles(`/collections/${collection.body.id}/items`), ["Postgres indexes", "Postgres talk"]);
    assert.deepEqual(await titles(`/collections/${collection.body.id}/items?type=link`), ["Postgres indexes"]);
});

test("bad query parameters are a 422", async () => {
    const limit = await api("GET", "/items?limit=500");
    assert.equal(limit.status, 422);
    assert.deepEqual(fields(limit.body), ["limit"]);

    const cursor = await api("GET", "/items?cursor=garbage");
    assert.equal(cursor.status, 422);
    assert.deepEqual(fields(cursor.body), ["cursor"]);
});

test("PATCH changes fields, refuses a type change, and keeps the item valid", async () => {
    const collection = await api("POST", "/collections", { name: "Patch target" });
    const note = await api("POST", "/items", {
        type: "note",
        title: "Before",
        content: "Body",
        collectionId: collection.body.id,
    });
    const path = `/items/${note.body.id}`;

    const updated = await api("PATCH", path, { title: "After", isFavorite: true, collectionId: null });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.title, "After");
    assert.equal(updated.body.isFavorite, true);
    assert.equal(updated.body.collectionId, null);
    assert.equal(updated.body.content, "Body");

    const typeChange = await api("PATCH", path, { type: "link" });
    assert.equal(typeChange.status, 422);
    assert.deepEqual(fields(typeChange.body), ["type"]);

    const urlOnNote = await api("PATCH", path, { url: "https://example.com" });
    assert.equal(urlOnNote.status, 422);
    assert.deepEqual(fields(urlOnNote.body), ["url"]);

    const emptied = await api("PATCH", path, { content: null });
    assert.equal(emptied.status, 422);
    assert.deepEqual(fields(emptied.body), ["content"]);

    assert.equal((await api("PATCH", "/items/does-not-exist", { title: "x" })).status, 404);
});

test("deleting a collection keeps its items with collectionId null", async () => {
    const collection = await api("POST", "/collections", { name: "To delete" });
    const item = await api("POST", "/items", {
        type: "link",
        url: "https://example.com/keep-me",
        collectionId: collection.body.id,
    });

    const deleted = await api("DELETE", `/collections/${collection.body.id}`);
    assert.equal(deleted.status, 204);
    assert.equal(deleted.body, null);

    const after = await api("GET", `/items/${item.body.id}`);
    assert.equal(after.status, 200);
    assert.equal(after.body.collectionId, null);
    assert.equal((await api("GET", `/collections/${collection.body.id}/items`)).status, 404);
});

test("errors always use the same format", async () => {
    const invalidJson = await api("POST", "/items", "{not json");
    assert.equal(invalidJson.status, 400);
    assert.equal(invalidJson.body.error.code, "INVALID_JSON");

    const noRoute = await api("GET", "/nope");
    assert.equal(noRoute.status, 404);
    assert.equal(noRoute.body.error.code, "NOT_FOUND");

    const noItem = await api("DELETE", "/items/does-not-exist");
    assert.equal(noItem.status, 404);
    assert.deepEqual(noItem.body, { error: { code: "NOT_FOUND", message: "Item not found" } });
});

test("every endpoint is listed in the API docs", async () => {
    const { status, body } = await api("GET", "/openapi.json");
    assert.equal(status, 200);

    const listed = Object.entries(body.paths).flatMap(([path, methods]) =>
        Object.keys(methods as object).map((method) => `${method.toUpperCase()} ${path}`),
    );
    assert.deepEqual(listed.sort(), [
        "DELETE /collections/{id}",
        "DELETE /items/{id}",
        "GET /collections",
        "GET /collections/{id}",
        "GET /collections/{id}/items",
        "GET /health",
        "GET /items",
        "GET /items/{id}",
        "PATCH /collections/{id}",
        "PATCH /items/{id}",
        "POST /collections",
        "POST /items",
    ]);

    const docsPage = await fetch(`${baseUrl}/docs/`);
    assert.equal(docsPage.status, 200);
    assert.match(await docsPage.text(), /swagger-ui/);
});
