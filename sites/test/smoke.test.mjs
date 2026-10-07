// Local checks of the Sites backend against an in-memory Store (no D1, no network).
// Run: node --test sites/test/   (Node 24 strips TypeScript types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../src/index.ts";

function memoryStore() {
  const plans = new Map(), workouts = new Map(), targets = new Map();
  const key = (u, id) => u + "\u0000" + id;
  return {
    async getPlan(u) { return plans.get(u) ?? null; },
    async putPlan(u, plan, updatedAt) { plans.set(u, { plan, updatedAt }); },
    async listWorkouts(u, { training, limit }) {
      return [...workouts.values()].filter((w) => w.u === u && (!training || w.w.trening === training))
        .sort((a, b) => b.w.data.localeCompare(a.w.data) || b.w.id.localeCompare(a.w.id)).slice(0, limit).map((x) => structuredClone(x.w));
    },
    async getWorkout(u, id) { const x = workouts.get(key(u, id)); return x ? structuredClone(x.w) : null; },
    async putWorkout(u, w) { workouts.set(key(u, w.id), { u, w: structuredClone(w) }); },
    async listTargets(u) { return [...targets.values()].filter((t) => t.u === u).map((t) => structuredClone(t.t)); },
    async getTarget(u, training) { const x = targets.get(key(u, training)); return x ? structuredClone(x.t) : null; },
    async putTarget(u, t) { targets.set(key(u, t.trening), { u, t: structuredClone(t) }); },
  };
}

const ORIGIN = "https://gym.example.test";
const USER = "user_a";
let clock = 0;
const deps = () => ({ store: memoryStore(), now: () => new Date(Date.UTC(2026, 9, 7, 10, 0, clock++)).toISOString() });

function req(path, { method = "GET", body, user = USER, headers = {}, page = false } = {}) {
  const h = {};
  if (user) h["oai-authenticated-user-id"] = user;
  if (page) { h["x-requested-with"] = "my-gym"; h["origin"] = ORIGIN; h["sec-fetch-site"] = "same-origin"; }
  Object.assign(h, headers);   // explicit headers win, so a test can send a foreign Origin
  const init = { method, headers: h };
  if (body !== undefined) { init.body = typeof body === "string" ? body : JSON.stringify(body); h["content-type"] = "application/json"; }
  return new Request(ORIGIN + path, init);
}
const rpc = (method, params, id = 1) => ({ jsonrpc: "2.0", id, method, params });
const META = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientInfo": { name: "test", version: "0" }, "io.modelcontextprotocol/clientCapabilities": {} };
function modernReq(method, params = {}, extraHeaders = {}) {
  const headers = { "mcp-protocol-version": "2026-07-28", "mcp-method": method, ...extraHeaders };
  if (method === "tools/call" && !("mcp-name" in extraHeaders)) headers["mcp-name"] = params.name;
  return req("/mcp", { method: "POST", body: rpc(method, { ...params, _meta: META }), headers });
}

const PLAN = { plans: { t1: { name: "Trening 1", title: "Klatka", h1: "Klatka", minutes: "40", supersets: [
  { id: "A", station: "Ławka", sub: "", rest: 120, ex: [
    { id: "A1", name: "Wyciskanie", short: "Wyciskanie", sets: 3, kg: 50, lo: 8, hi: 10, step: 2.5, stepLabel: "+2,5 kg", bar: true },
    { id: "A2", name: "Dobicie", short: "Dobicie", sets: 3, kg: 40, lo: 6, hi: 8, step: 2.5, stepLabel: "+2,5 kg" } ] } ] } },
  tabs: [{ id: "t1", label: "1 · Klatka" }], profil: "test" };
const WORKOUT = { id: "2026-10-05_t1", sets: { A1: [{ kg: 50, reps: 8, done: true }, { kg: 50, reps: 8, done: true }, { kg: 50, reps: 7, done: false }] }, fb: { A1: { feel: "ok", pain: [] } }, notes: "test", finished: true, updatedAt: "2026-10-05T10:00:00.000Z" };

test("page is served with no-store and without Claude runtime calls", async () => {
  const r = await handle(req("/", { user: null }), deps());
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/html/);
  assert.equal(r.headers.get("cache-control"), "no-store");
  const body = await r.text();
  assert.ok(body.includes("ADAPTER START: ChatGPT Sites"));
  assert.ok(!body.includes("window.claude"));
  assert.equal((await handle(req("/nope", { user: null }), deps())).status, 404);
});

test("data routes need the Sites identity header", async () => {
  const d = deps();
  assert.equal((await handle(req("/api/plan", { user: null }), d)).status, 401);
  assert.equal((await handle(req("/api/workouts", { user: "" }), d)).status, 401);
  const r = await handle(req("/mcp", { method: "POST", user: null, body: rpc("ping") }), d);
  assert.equal(r.status, 401);
});

test("page saves a workout, lists it, and another user cannot see it", async () => {
  const d = deps();
  const put = await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: WORKOUT, page: true }), d);
  assert.equal(put.status, 200, await put.text());
  const list = await (await handle(req("/api/workouts?limit=10"), d)).json();
  assert.equal(list.workouts.length, 1);
  assert.equal(list.workouts[0].sets.A1[0].kg, 50);
  const other = await (await handle(req("/api/workouts", { user: "user_b" }), d)).json();
  assert.equal(other.workouts.length, 0);
  const last = await (await handle(req("/api/workouts/last?training=t1"), d)).json();
  assert.equal(last.workout.id, "2026-10-05_t1");
  assert.equal((await handle(req("/api/workouts/last?training=t2"), d)).status, 200);
  assert.equal((await (await handle(req("/api/workouts/last?training=t2"), d)).json()).workout, null);
});

test("writes without the page's header or from a foreign origin are rejected", async () => {
  const d = deps();
  const noHeader = await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: WORKOUT }), d);
  assert.equal(noHeader.status, 403);
  const foreign = await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: WORKOUT, page: true, headers: { origin: "https://evil.example" } }), d);
  assert.equal(foreign.status, 403);
  const crossSite = await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: WORKOUT, page: true, headers: { "sec-fetch-site": "cross-site" } }), d);
  assert.equal(crossSite.status, 403);
});

test("validation: bad ids and shapes answer 400 with a reason", async () => {
  const d = deps();
  const bad = await handle(req("/api/workouts/nope", { method: "PUT", body: { id: "nope" }, page: true }), d);
  assert.equal(bad.status, 400);
  assert.match((await bad.json()).error, /2026-10-07_t1/);
  const mismatch = await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: { ...WORKOUT, id: "2026-10-06_t1" }, page: true }), d);
  assert.equal(mismatch.status, 400);
  const badPlan = await handle(req("/api/plan", { method: "PUT", body: { plan: { plans: {} } }, page: true }), d);
  assert.equal(badPlan.status, 400);
  const badSet = await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: { id: "2026-10-05_t1", sets: { A1: [{ kg: 9999, reps: 8, done: true }] } }, page: true }), d);
  assert.equal(badSet.status, 400);
  assert.match((await badSet.json()).error, /between 0 and 500/);
});

test("plan: stored, read back, and the targets are checked against it", async () => {
  const d = deps();
  assert.equal((await (await handle(req("/api/plan"), d)).json()).plan, null);
  const put = await handle(req("/api/plan", { method: "PUT", body: { plan: PLAN }, page: true }), d);
  assert.equal(put.status, 200, await put.text());
  const got = await (await handle(req("/api/plan"), d)).json();
  assert.equal(got.plan.plans.t1.supersets[0].ex[1].id, "A2");
  const unknown = await handle(req("/api/targets/t1", { method: "PATCH", body: { exercise: "Z9", kg: 10 }, page: true }), d);
  assert.equal(unknown.status, 400);
  assert.match((await unknown.json()).error, /A1, A2/);
  const ok = await handle(req("/api/targets/t1", { method: "PATCH", body: { exercise: "A1", kg: 52.5, reps: 8, note: "od trenera" }, page: true }), d);
  assert.equal(ok.status, 200, await ok.text());
  const targets = await (await handle(req("/api/targets"), d)).json();
  assert.deepEqual(targets.targets.t1.ex.A1, { kg: 52.5, reps: 8, note: "od trenera" });
  assert.ok(targets.targets.t1.updatedAt.startsWith("2026-10-07T10:00"));
});

test("legacy MCP: initialize, initialized, tools/list, tools/call, finished workout is protected", async () => {
  const d = deps();
  await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: WORKOUT, page: true }), d);
  const init = await handle(req("/mcp", { method: "POST", body: rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "x", version: "1" } }) }), d);
  assert.equal(init.status, 200);
  const ir = await init.json();
  assert.equal(ir.result.protocolVersion, "2025-06-18");
  assert.deepEqual(ir.result.capabilities, { tools: {} });
  assert.equal(ir.result.resultType, undefined);
  const future = await (await handle(req("/mcp", { method: "POST", body: rpc("initialize", { protocolVersion: "2099-01-01", capabilities: {}, clientInfo: { name: "x", version: "1" } }) }), d)).json();
  assert.equal(future.result.protocolVersion, "2025-11-25");
  const note = await handle(req("/mcp", { method: "POST", body: { jsonrpc: "2.0", method: "notifications/initialized" }, headers: { "mcp-protocol-version": "2025-06-18" } }), d);
  assert.equal(note.status, 202);
  const list = await (await handle(req("/mcp", { method: "POST", body: rpc("tools/list"), headers: { "mcp-protocol-version": "2025-06-18" } }), d)).json();
  assert.deepEqual(list.result.tools.map((t) => t.name), ["get_plan", "update_plan", "list_workouts", "get_last_workout", "save_workout", "update_next_workout"]);
  assert.ok(list.result.tools.every((t) => !JSON.stringify(t.inputSchema).includes("user_id")));
  const last = await (await handle(req("/mcp", { method: "POST", body: rpc("tools/call", { name: "get_last_workout", arguments: { training: "t1" } }), headers: { "mcp-protocol-version": "2025-06-18" } }), d)).json();
  assert.equal(last.result.isError, false);
  assert.equal(last.result.structuredContent.workout.id, "2026-10-05_t1");
  assert.equal(JSON.parse(last.result.content[0].text).workout.id, "2026-10-05_t1");
  const clash = await (await handle(req("/mcp", { method: "POST", body: rpc("tools/call", { name: "save_workout", arguments: { workout: { ...WORKOUT, notes: "rewritten" } } }) }), d)).json();
  assert.equal(clash.result.isError, true);
  assert.match(clash.result.content[0].text, /overwrite/);
  const still = await (await handle(req("/api/workouts/2026-10-05_t1"), d)).json();
  assert.equal(still.workout.notes, "test");
  const unknownTool = await (await handle(req("/mcp", { method: "POST", body: rpc("tools/call", { name: "nope", arguments: {} }) }), d)).json();
  assert.equal(unknownTool.error.code, -32602);
  const unknownMethod = await handle(req("/mcp", { method: "POST", body: rpc("resources/list") }), d);
  assert.equal(unknownMethod.status, 200);
  assert.equal((await unknownMethod.json()).error.code, -32601);
  const badVersion = await handle(req("/mcp", { method: "POST", body: rpc("ping"), headers: { "mcp-protocol-version": "1999-01-01" } }), d);
  assert.equal(badVersion.status, 400);
  const modernHeaderNoMeta = await handle(req("/mcp", { method: "POST", body: rpc("ping"), headers: { "mcp-protocol-version": "2026-07-28", "mcp-method": "ping" } }), d);
  assert.equal(modernHeaderNoMeta.status, 400);
  assert.equal((await modernHeaderNoMeta.json()).error.code, -32602);
});

test("modern MCP: discover, tools/call with mirrored headers, header mismatch, unsupported version, unknown method", async () => {
  const d = deps();
  const disc = await handle(modernReq("server/discover"), d);
  assert.equal(disc.status, 200);
  const dr = await disc.json();
  assert.equal(dr.result.resultType, "complete");
  assert.deepEqual(dr.result.supportedVersions, ["2026-07-28"]);
  assert.equal(dr.result._meta["io.modelcontextprotocol/serverInfo"].name, "my-gym");
  const setT = await handle(modernReq("tools/call", { name: "update_next_workout", arguments: { training: "t1", exercise: "A1", kg: 55, reps: 6 } }), d);
  const sr = await setT.json();
  assert.equal(setT.status, 200, JSON.stringify(sr));
  assert.equal(sr.result.resultType, "complete");
  assert.equal(sr.result.structuredContent.target.ex.A1.kg, 55);
  const enc = "=?base64?" + Buffer.from("update_next_workout", "utf8").toString("base64") + "?=";
  const encoded = await handle(modernReq("tools/call", { name: "update_next_workout", arguments: { training: "t1", exercise: "A1", note: "lekko" } }, { "mcp-name": enc }), d);
  assert.equal(encoded.status, 200, await encoded.text());
  const noMethod = await handle(req("/mcp", { method: "POST", body: rpc("ping", { _meta: META }), headers: { "mcp-protocol-version": "2026-07-28" } }), d);
  assert.equal(noMethod.status, 400);
  assert.equal((await noMethod.json()).error.code, -32020);
  const wrongName = await handle(modernReq("tools/call", { name: "get_plan", arguments: {} }, { "mcp-name": "other" }), d);
  assert.equal(wrongName.status, 400);
  assert.equal((await wrongName.json()).error.code, -32020);
  const old = await handle(req("/mcp", { method: "POST", body: rpc("ping", { _meta: { ...META, "io.modelcontextprotocol/protocolVersion": "1900-01-01" } }), headers: { "mcp-protocol-version": "1900-01-01", "mcp-method": "ping" } }), d);
  assert.equal(old.status, 400);
  const oe = await old.json();
  assert.equal(oe.error.code, -32022);
  assert.deepEqual(oe.error.data.supported, ["2026-07-28"]);
  const noCaps = await handle(req("/mcp", { method: "POST", body: rpc("ping", { _meta: { "io.modelcontextprotocol/protocolVersion": "2026-07-28" } }), headers: { "mcp-protocol-version": "2026-07-28", "mcp-method": "ping" } }), d);
  assert.equal(noCaps.status, 400);
  assert.equal((await noCaps.json()).error.code, -32602);
  const unknown = await handle(modernReq("resources/list"), d);
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json()).error.code, -32601);
  const notif = await handle(req("/mcp", { method: "POST", body: { jsonrpc: "2.0", method: "notifications/something", params: { _meta: META } }, headers: { "mcp-protocol-version": "2026-07-28", "mcp-method": "notifications/something" } }), d);
  assert.equal(notif.status, 202);
});

test("transport guards: GET /mcp is 405, a foreign Origin is 403, an own Origin passes, batches are rejected", async () => {
  const d = deps();
  assert.equal((await handle(req("/mcp"), d)).status, 405);
  assert.equal((await handle(req("/mcp", { method: "POST", body: rpc("ping"), headers: { origin: "https://evil.example" } }), d)).status, 403);
  assert.equal((await handle(req("/mcp", { method: "POST", body: rpc("ping"), headers: { origin: ORIGIN } }), d)).status, 200);
  const batch = await handle(req("/mcp", { method: "POST", body: [rpc("ping")] }), d);
  assert.equal(batch.status, 400);
  const notJson = await handle(req("/mcp", { method: "POST", body: "{" }), d);
  assert.equal(notJson.status, 400);
  assert.equal((await notJson.json()).error.code, -32700);
});

test("update_plan via MCP replaces the plan and leaves workouts and targets alone", async () => {
  const d = deps();
  await handle(req("/api/workouts/2026-10-05_t1", { method: "PUT", body: WORKOUT, page: true }), d);
  await handle(modernReq("tools/call", { name: "update_next_workout", arguments: { training: "t1", exercise: "A1", kg: 55 } }), d);
  const r = await handle(modernReq("tools/call", { name: "update_plan", arguments: { plan: PLAN } }), d);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).result.isError, false);
  const w = await (await handle(req("/api/workouts/2026-10-05_t1"), d)).json();
  assert.equal(w.workout.sets.A1[0].kg, 50);
  const t = await (await handle(req("/api/targets"), d)).json();
  assert.equal(t.targets.t1.ex.A1.kg, 55);
  const badPlan = await handle(modernReq("tools/call", { name: "update_plan", arguments: { plan: { plans: { t1: { name: "x" } } } } }), d);
  const bp = await badPlan.json();
  assert.equal(bp.result.isError, true);
  assert.match(bp.result.content[0].text, /supersets/);
});
