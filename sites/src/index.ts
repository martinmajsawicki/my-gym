// Cloudflare Worker for My gym on ChatGPT Sites.
//   GET  /                      the page (sites/src/page.ts, generated from my-gym.html by build.mjs)
//   /api/...                    JSON for the page (same origin): plan, workouts, targets
//   POST /mcp                   MCP tools for ChatGPT (sites/src/mcp.ts)
// Identity comes only from the header the Sites platform sets on authenticated requests
// (oai-authenticated-user-id). Without it every data route answers 401. No secrets live in the page.
import { createApp, AppError } from "./app.ts";
import type { App } from "./app.ts";
import { d1Store } from "./db.ts";
import { handleMcp } from "./mcp.ts";
import { PAGE } from "./page.ts";
import type { Env, Store } from "./types.ts";

export type Deps = {
  store: Store;
  assets?: { fetch(request: Request): Promise<Response> };
  allowedOrigins?: string[];
  now?: () => string;
};

const USER_HEADER = "oai-authenticated-user-id";
const MAX_BODY = 262_144;
const NO_STORE = { "cache-control": "no-store", "x-content-type-options": "nosniff" };

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", ...NO_STORE } });
}
function text(status: number, body: string, extra: Record<string, string> = {}): Response {
  return new Response(body, { status, headers: { "content-type": "text/plain; charset=utf-8", ...NO_STORE, ...extra } });
}
function html(body: string): Response {
  return new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8", "referrer-policy": "no-referrer", ...NO_STORE } });
}

/** The signed-in user's id as set by the Sites platform; null when the request carries no identity. */
export function identity(request: Request): string | null {
  const v = (request.headers.get(USER_HEADER) || "").trim();
  return v.length >= 1 && v.length <= 200 ? v : null;
}

/** Writes from the page must come from the page: same origin and a custom header no cross-site form can send. */
function sameOriginWrite(request: Request, url: URL): boolean {
  const origin = request.headers.get("origin");
  if (origin !== null && origin !== url.origin) return false;
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin" && site !== "none") return false;
  return request.headers.get("x-requested-with") === "my-gym";
}

/** MCP: an Origin header, when present, must be our own or an explicitly allowed one (DNS rebinding protection). */
function originAllowed(request: Request, url: URL, allowed: string[] = []): boolean {
  const origin = request.headers.get("origin");
  return origin === null || origin === url.origin || allowed.includes(origin);
}

async function readJson(request: Request): Promise<unknown> {
  const t = await request.text();
  if (t.length > MAX_BODY) throw new AppError(413, `body larger than ${MAX_BODY} characters`);
  try { return t ? JSON.parse(t) : null; } catch { throw new AppError(400, "body is not valid JSON"); }
}

async function handleApi(request: Request, url: URL, app: App, userId: string): Promise<Response> {
  const seg = url.pathname.slice("/api/".length).split("/").filter(Boolean).map(decodeURIComponent);
  const m = request.method;
  const write = m === "PUT" || m === "PATCH" || m === "POST" || m === "DELETE";
  if (write && !sameOriginWrite(request, url)) return json(403, { error: "write rejected: not a same-origin request from the page" });
  try {
    if (seg[0] === "plan" && seg.length === 1) {
      if (m === "GET") return json(200, (await app.getPlan(userId)) ?? { plan: null, updatedAt: null });
      if (m === "PUT") { const body = await readJson(request); return json(200, await app.updatePlan(userId, isObj(body) && "plan" in body ? body.plan : body)); }
      return text(405, "Method Not Allowed", { allow: "GET, PUT" });
    }
    if (seg[0] === "workouts") {
      if (seg.length === 1) {
        if (m === "GET") return json(200, { workouts: await app.listWorkouts(userId, { training: url.searchParams.get("training") ?? undefined, limit: url.searchParams.get("limit") ?? 400 }) });
        return text(405, "Method Not Allowed", { allow: "GET" });
      }
      if (seg.length === 2 && seg[1] === "last") {
        if (m === "GET") return json(200, { workout: await app.getLastWorkout(userId, url.searchParams.get("training") ?? undefined) });
        return text(405, "Method Not Allowed", { allow: "GET" });
      }
      if (seg.length === 2) {
        if (m === "GET") return json(200, { workout: await app.getWorkout(userId, seg[1]) });
        if (m === "PUT") {
          const body = await readJson(request);
          if (!isObj(body) || body.id !== seg[1]) throw new AppError(400, "workout.id in the body must equal the id in the path");
          return json(200, { workout: await app.saveWorkout(userId, body, { source: "page", overwrite: true }) });
        }
        return text(405, "Method Not Allowed", { allow: "GET, PUT" });
      }
    }
    if (seg[0] === "targets") {
      if (seg.length === 1) {
        if (m === "GET") return json(200, { targets: await app.getTargets(userId) });
        return text(405, "Method Not Allowed", { allow: "GET" });
      }
      if (seg.length === 2) {
        if (m === "PATCH") { const body = await readJson(request); return json(200, { target: await app.updateNextWorkout(userId, { ...(isObj(body) ? body : {}), training: seg[1] }) }); }
        return text(405, "Method Not Allowed", { allow: "PATCH" });
      }
    }
    return json(404, { error: "not found" });
  } catch (e) {
    if (e instanceof AppError) return json(e.status, { error: e.message });
    throw e;
  }
}

function isObj(x: unknown): x is Record<string, unknown> { return typeof x === "object" && x !== null && !Array.isArray(x); }

export async function handle(request: Request, deps: Deps): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const app = createApp(deps.store, deps.now);

  if (path === "/mcp") {
    if (request.method !== "POST") return text(405, "Method Not Allowed", { allow: "POST" });
    if (!originAllowed(request, url, deps.allowedOrigins)) return json(403, { jsonrpc: "2.0", error: { code: -32600, message: "Forbidden: origin not allowed" } });
    const userId = identity(request);
    if (!userId) return json(401, { jsonrpc: "2.0", error: { code: 401, message: "Unauthenticated: the request carries no Sites identity" } });
    return handleMcp(request, app, userId);
  }
  if (path === "/api" || path.startsWith("/api/")) {
    const userId = identity(request);
    if (!userId) return json(401, { error: "unauthenticated" });
    return handleApi(request, url, app, userId);
  }
  if (request.method === "GET" || request.method === "HEAD") {
    if (deps.assets) {
      const r = await deps.assets.fetch(request);
      if (r.status !== 404) {
        const h = new Headers(r.headers);
        for (const [k, v] of Object.entries(NO_STORE)) h.set(k, v);
        return new Response(r.body, { status: r.status, headers: h });
      }
    }
    if (path === "/" || path === "/index.html") return html(PAGE);
  }
  return text(404, "Not found");
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = (env.MCP_ALLOWED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    return handle(request, { store: d1Store(env.DB), assets: env.ASSETS, allowedOrigins });
  },
};
