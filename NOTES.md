# Stage 1: design decisions

Each decision the spec left open, what was chosen, and why.

## 1. Sorting items with the same `createdAt`

**Decision:** sort by `createdAt` newest first, then by `id` descending.

**Why:** `createdAt` has millisecond precision, so two items can share a value.
Pagination needs a total order (no two rows ever tie), otherwise a row on a page
boundary can be skipped or repeated. The `id` is unique, so adding it as a
tie-breaker guarantees that. The order between two items created in the same
millisecond is arbitrary (ids are random), but it is the same on every request,
which is what matters.

## 2. `PATCH` with `"collectionId": null`

**Decision:** it removes the item from its collection.

**Why:** in a PATCH, leaving a field out means "don't change it", so `null` is
the only way left to say "clear it". It also matches what `DELETE /collections/:id`
does to the items it leaves behind.

## 3. `collectionId` pointing to a collection that does not exist

**Decision:** `422 VALIDATION_ERROR` with `field: "collectionId"`.

**Why:** a 404 says "the URL you called does not exist". Here the URL
(`POST /items` or `PATCH /items/:id`) is fine; the problem is a value inside the
body. A 404 on `PATCH /items/:id` would also be ambiguous: the client could not
tell whether the item or the collection was missing.

## 4. Keeping the cursor valid when new items are added

**Decision:** cursor pagination. The cursor is the last row's `createdAt` and
`id`, as base64url-encoded JSON. The next page is "every row that sorts after
this position".

**Why:** the cursor is a position in the sort order, not a row count.

- A new item is always newer than everything already listed, so it sorts before
  the cursor and never shifts the pages that come after it. With `offset`, a new
  item pushes every row down by one and the next page repeats a row.
- If the row the cursor points at is deleted, the cursor still works, because
  the server compares values and never looks that row up.
- The trade-off: a client cannot jump to "page 7", only go forward.

A cursor that cannot be decoded returns `422` with `field: "cursor"`.

## 5. Deleting a collection

**Decision (from the spec):** its items are kept and their `collectionId`
becomes `null`. Their `updatedAt` changes too, because the item did change.

## Smaller choices

- **Unknown fields in a body are ignored**, not rejected. The exception is
  `url` on a note, which the spec forbids, and `type` in a PATCH.
- **PATCH with no changeable fields is a 422**, so a typo in a field name does
  not look like a successful update.
- **PATCH is validated as a whole item.** The changes are applied to the
  current item and the result is checked with the same rules as POST, so a
  PATCH cannot produce an item that POST would have rejected (for example, a
  note with no content).
- **A link's title follows its URL** when the title was never set and the URL
  is changed.
- **The 10-tag limit counts tags as sent**, before duplicates are removed.
- **A non-existent `collectionId` filter on `GET /items` returns an empty
  page**, not an error. `GET /collections/:id/items` returns 404 instead,
  because there the collection is part of the URL.
- **An id that is not a UUID returns 404**, the same as any other unknown id.
