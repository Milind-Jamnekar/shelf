import http from "node:http";

const routes: Record<string, Record<string, () => string>> = {
    "/health": { GET: () => JSON.stringify({ "status": "ok" }) },
    "/time": { GET: () => JSON.stringify({ "time": new Date().toISOString() }) }
}

http.
    createServer((request, response) => {
        response.setHeader("Content-Type", "application/json");
        const { method = "GET", url = "" } = request;
        const path = new URL(url, "http://localhost").pathname

        const route = routes[path];
        if (!route) {
            response.statusCode = 404;
            response.end(JSON.stringify({ error: "url not allowed" }));
            return
        }
        const handler = route[method]
        if (!handler) {
            response.statusCode = 405;
            response.end(JSON.stringify({ error: "method not allowed" }));
            return
        }
        response.end(handler())
    }).listen(3000)