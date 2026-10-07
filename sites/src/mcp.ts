// MCP endpoint (POST /mcp) for ChatGPT: the same application operations as the HTTP API, exposed as tools.
// Dual-era, stateless, hand-written against the published specification (no SDK, no dependencies):
//  - modern revision 2026-07-28: per-request _meta, header/body validation, server/discover, resultType in results;
//  - legacy revisions 2025-03-26 .. 2025-11-25: initialize handshake, notifications/initialized, ping.
// The era is taken from the request itself: a body carrying _meta["io.modelcontextprotocol/protocolVersion"] is modern.
// See docs/chatgpt-sites.md for what was read in the spec and what remains unverified against ChatGPT's client.
import type { App } from "./app.ts";
import { AppError } from "./validate.ts";

export const MODERN_VERSIONS = ["2026-07-28"];
export const LEGACY_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"];
export const SERVER_INFO = { name: "my-gym", title: "My gym", version: "0.1.0" };

const META_VERSION = "io.modelcontextprotocol/protocolVersion";
const META_CLIENT_CAPS = "io.modelcontextprotocol/clientCapabilities";
const META_SERVER_INFO = "io.modelcontextprotocol/serverInfo";
const MAX_BODY = 262_144;

export const INSTRUCTIONS = [
  "My gym is a private workout log of the signed-in user. The page on the phone is where workouts happen; these tools are for planning and review.",
  "Identifiers: trainings t1, t2, ...; exercises A1, B2, ... (letter = group, digit = position in the group); workouts YYYY-MM-DD_tN.",
  "Workouts are history. Never rewrite a finished workout to express a plan change: use update_plan for the plan and update_next_workout for next-time targets.",
  "A remark in a workout's notes is information, not an instruction to change the plan. Change the plan only when the user asks for it.",
  "Weights are in the exercise's unit (kg by default). Exercises with unit 'szt.' run on assisted machines: the number counts assistance plates, fewer is harder, and step is negative.",
  "A group in supersets with one exercise is straight sets; with two it is a superset (rest after the pair). Never invent weights: use null when unknown.",
].join(" ");

const exerciseSchema = {
  type: "object",
  required: ["id", "name", "short", "sets", "lo", "hi", "stepLabel"],
  properties: {
    id: { type: "string", description: "Unique within the training, e.g. A1" },
    name: { type: "string" }, short: { type: "string", description: "Short name for tight spaces" },
    sets: { type: "integer", minimum: 1, maximum: 10 },
    kg: { type: ["number", "null"], description: "Starting weight in the exercise's unit; null when unknown; 0 for bodyweight" },
    lo: { type: "integer", minimum: 1 }, hi: { type: "integer", minimum: 1, description: "Rep range lo..hi" },
    step: { type: ["number", "null"], description: "Progression step in the unit; null means 'one plate on the stack'; negative for assisted machines" },
    stepLabel: { type: "string", description: "How the step is shown, e.g. '+2,5 kg'" },
    unit: { type: "string", description: "'szt.' for assisted machines (then assist: true)" },
    assist: { type: "boolean" }, perHand: { type: "boolean", description: "Weight per hand (dumbbells)" },
    perSide: { type: "boolean", description: "Reps per side (lunges)" }, bar: { type: "boolean", description: "Draw plates for a 20 kg bar" },
    cue: { type: "string", description: "One sentence of advice" },
  },
};
const checkItemSchema = { type: "object", required: ["id", "text"], properties: { id: { type: "string" }, text: { type: "string" }, detail: { type: "string" }, kg: { type: ["number", "null"] } } };
const trainingSchema = {
  type: "object",
  required: ["name", "title", "h1", "supersets"],
  properties: {
    id: { type: "string", description: "Same as the key (t1, t2, ...)" },
    name: { type: "string", description: "e.g. 'Trening 1'" }, title: { type: "string", description: "e.g. 'Klatka + biceps'" },
    h1: { type: "string" }, h1sub: { type: "string" }, minutes: { type: ["string", "integer"] }, lead: { type: "string" },
    remember: { type: "array", items: { type: "string" } }, howto: { type: "array", items: { type: "string" } },
    warmupMin: { type: "number" }, warmup: { type: "array", items: checkItemSchema }, warmupSets: { type: "array", items: checkItemSchema },
    supersets: {
      type: "array", minItems: 1,
      items: { type: "object", required: ["id", "station", "rest", "ex"], properties: {
        id: { type: "string", description: "A, B, C ..." }, station: { type: "string", description: "Heading: the station or exercise" },
        sub: { type: "string", description: "Line under the heading" }, rest: { type: "integer", minimum: 0, maximum: 900, description: "Rest after the group, seconds" },
        ex: { type: "array", minItems: 1, maxItems: 4, items: exerciseSchema, description: "One exercise = straight sets; two = superset" },
      } },
    },
    cooldownMin: { type: "number" }, cooldown: { type: "array", items: checkItemSchema },
    archived: { type: "boolean", description: "Old plan kept for the log and charts, without a tab" },
  },
};
const planSchema = {
  type: "object",
  required: ["plans"],
  properties: {
    plans: { type: "object", description: "Trainings keyed by id (t1, t2, ...)", additionalProperties: trainingSchema },
    tabs: { type: "array", items: { type: "object", required: ["id", "label"], properties: { id: { type: "string" }, label: { type: "string" } } }, description: "Tab order and labels; a 'log' tab is added when missing" },
    soon: { type: "object", description: "Placeholders for trainings not written yet, keyed by id", additionalProperties: { type: "object", required: ["name", "h"], properties: { name: { type: "string" }, h: { type: "string" }, hs: { type: "string" } } } },
    profil: { type: "string", description: "User profile used when answering questions: experience, goal, limits, where the plan comes from" },
  },
};
const setSchema = { type: "object", properties: { kg: { type: ["number", "null"] }, reps: { type: ["integer", "null"] }, done: { type: "boolean" } } };
const workoutSchema = {
  type: "object",
  required: ["id"],
  properties: {
    id: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}_t\\d{1,2}$", description: "YYYY-MM-DD_tN" },
    trening: { type: "string" }, data: { type: "string" },
    sets: { type: "object", description: "Per exercise id: a list of sets {kg, reps, done}", additionalProperties: { type: "array", items: setSchema } },
    fb: { type: "object", description: "Per exercise id: {feel: lekko|ok|ciezko|null, pain: [places]}", additionalProperties: { type: "object", properties: { feel: { type: ["string", "null"], enum: ["lekko", "ok", "ciezko", null] }, pain: { type: "array", items: { type: "string" } } } } },
    warm: { type: "object", additionalProperties: { type: "boolean" } }, cool: { type: "object", additionalProperties: { type: "boolean" } },
    notes: { type: "string" }, finished: { type: "boolean" }, updatedAt: { type: ["string", "null"] },
  },
};

type ToolDef = {
  name: string; title: string; description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; destructiveHint: boolean; idempotentHint: boolean; openWorldHint: boolean };
};
type ToolFn = (app: App, userId: string, args: Record<string, unknown>) => Promise<unknown>;

export const TOOLS: ToolDef[] = [
  {
    name: "get_plan", title: "Get the workout plan",
    description: "Returns the user's stored plan (trainings, exercises, weights, rep ranges) or plan: null when none is stored yet; the page then shows the example plan.",
    inputSchema: { type: "object", additionalProperties: false },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "update_plan", title: "Replace the workout plan",
    description: "Replaces the whole plan document. Build it from the current plan (get_plan) and the user's words; never invent weights (use null). Workouts and targets are not touched.",
    inputSchema: { type: "object", required: ["plan"], additionalProperties: false, properties: { plan: planSchema } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "list_workouts", title: "List workouts",
    description: "Performed workouts, newest first, optionally for one training.",
    inputSchema: { type: "object", additionalProperties: false, properties: { training: { type: "string", description: "t1, t2, ... (optional)" }, limit: { type: "integer", minimum: 1, maximum: 400, default: 20 } } },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "get_last_workout", title: "Get the last workout",
    description: "The most recent workout with done sets (optionally for one training): sets with weights and reps, ratings (feel, pain), notes.",
    inputSchema: { type: "object", additionalProperties: false, properties: { training: { type: "string", description: "t1, t2, ... (optional)" } } },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "save_workout", title: "Save a performed workout",
    description: "Writes one performed workout as history, e.g. one done without the phone. Refuses to replace a finished workout unless overwrite is true.",
    inputSchema: { type: "object", required: ["workout"], additionalProperties: false, properties: { workout: workoutSchema, overwrite: { type: "boolean", default: false } } },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  },
  {
    name: "update_next_workout", title: "Set a target for the next workout",
    description: "Sets the weight, target reps or a note for one exercise of the next workout of a training. The page shows it as 'Cel na dziś'. Null clears a field. History is not changed.",
    inputSchema: { type: "object", required: ["training", "exercise"], additionalProperties: false, properties: {
      training: { type: "string", description: "t1, t2, ..." }, exercise: { type: "string", description: "Exercise id in that training, e.g. A1" },
      kg: { type: ["number", "null"], description: "Weight in the exercise's unit" }, reps: { type: ["integer", "null"], minimum: 1, maximum: 100 },
      note: { type: ["string", "null"], description: "Short note shown next to the target" },
    } },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

const IMPL: Record<string, ToolFn> = {
  get_plan: async (app, userId) => (await app.getPlan(userId)) ?? { plan: null, updatedAt: null },
  update_plan: (app, userId, a) => app.updatePlan(userId, a.plan),
  list_workouts: async (app, userId, a) => ({ workouts: await app.listWorkouts(userId, { training: a.training, limit: a.limit }) }),
  get_last_workout: async (app, userId, a) => ({ workout: await app.getLastWorkout(userId, a.training) }),
  save_workout: async (app, userId, a) => ({ workout: await app.saveWorkout(userId, a.workout, { source: "tool", overwrite: a.overwrite === true }) }),
  update_next_workout: async (app, userId, a) => ({ target: await app.updateNextWorkout(userId, a) }),
};

type Json = Record<string, unknown>;
type RpcId = string | number;

function isObj(x: unknown): x is Json { return typeof x === "object" && x !== null && !Array.isArray(x); }
function rpcError(id: RpcId | null, code: number, message: string, data?: unknown): Json {
  const e: Json = { code, message };
  if (data !== undefined) e.data = data;
  return id === null ? { jsonrpc: "2.0", error: e } : { jsonrpc: "2.0", id, error: e };
}
function respond(status: number, body: Json): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" } });
}
function accepted(): Response { return new Response(null, { status: 202, headers: { "cache-control": "no-store" } }); }

/** Decodes the Base64 sentinel form "=?base64?...?=" used for non-ASCII header values. */
export function decodeHeaderValue(v: string | null): string | null {
  if (v === null) return null;
  if (v.startsWith("=?base64?") && v.endsWith("?=")) {
    try {
      const bin = atob(v.slice(9, -2));
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch { return null; }
  }
  return v;
}

async function callTool(app: App, userId: string, params: Json): Promise<{ result?: Json; error?: Json }> {
  const name = params.name;
  if (typeof name !== "string" || !(name in IMPL)) return { error: { code: -32602, message: `Unknown tool: ${String(name)}` } };
  const args = isObj(params.arguments) ? params.arguments : {};
  try {
    const structured = await IMPL[name](app, userId, args);
    return { result: { content: [{ type: "text", text: JSON.stringify(structured) }], structuredContent: structured, isError: false } };
  } catch (e) {
    if (e instanceof AppError) return { result: { content: [{ type: "text", text: e.message }], isError: true } };
    throw e;
  }
}

export async function handleMcp(request: Request, app: App, userId: string): Promise<Response> {
  let text: string;
  try { text = await request.text(); } catch { return respond(400, rpcError(null, -32700, "Parse error: unreadable body")); }
  if (text.length > MAX_BODY) return respond(413, rpcError(null, -32600, `Request too large (over ${MAX_BODY} characters)`));
  let msg: unknown;
  try { msg = JSON.parse(text); } catch { return respond(400, rpcError(null, -32700, "Parse error: body is not JSON")); }
  if (!isObj(msg) || msg.jsonrpc !== "2.0" || typeof msg.method !== "string") {
    return respond(400, rpcError(null, -32600, "Invalid Request: expected one JSON-RPC 2.0 request or notification"));
  }
  const method = msg.method;
  const rawId = msg.id;
  const isNotification = rawId === undefined;
  if (!isNotification && typeof rawId !== "string" && typeof rawId !== "number") {
    return respond(400, rpcError(null, -32600, "Invalid Request: id must be a string or a number"));
  }
  const id = (isNotification ? null : rawId) as RpcId | null;
  const params: Json = isObj(msg.params) ? msg.params : {};
  const meta = isObj(params._meta) ? params._meta : null;
  const modern = meta !== null && typeof meta[META_VERSION] === "string";
  return modern ? handleModern(request, app, userId, method, id, params, meta) : handleLegacy(request, app, userId, method, id, params);
}

async function handleModern(request: Request, app: App, userId: string, method: string, id: RpcId | null, params: Json, meta: Json): Promise<Response> {
  const version = meta[META_VERSION] as string;
  const hv = request.headers.get("mcp-protocol-version");
  if (hv !== version) return respond(400, rpcError(id, -32020, hv === null ? "Header mismatch: MCP-Protocol-Version header is missing" : `Header mismatch: MCP-Protocol-Version header '${hv}' does not match body value '${version}'`));
  const hm = request.headers.get("mcp-method");
  if (hm !== method) return respond(400, rpcError(id, -32020, hm === null ? "Header mismatch: Mcp-Method header is missing" : `Header mismatch: Mcp-Method header '${hm}' does not match body value '${method}'`));
  if (method === "tools/call") {
    const hn = decodeHeaderValue(request.headers.get("mcp-name"));
    if (hn === null || hn !== params.name) return respond(400, rpcError(id, -32020, hn === null ? "Header mismatch: Mcp-Name header is missing or malformed" : `Header mismatch: Mcp-Name header '${hn}' does not match body value '${String(params.name)}'`));
  }
  if (!MODERN_VERSIONS.includes(version)) return respond(400, rpcError(id, -32022, "Unsupported protocol version", { supported: MODERN_VERSIONS, requested: version }));
  if (!isObj(meta[META_CLIENT_CAPS])) return respond(400, rpcError(id, -32602, `Invalid params: _meta is missing ${META_CLIENT_CAPS}`));
  if (id === null) return accepted();

  let result: Json;
  switch (method) {
    case "server/discover": result = { supportedVersions: MODERN_VERSIONS, capabilities: { tools: {} }, instructions: INSTRUCTIONS }; break;
    case "ping": result = {}; break;
    case "tools/list": result = { tools: TOOLS }; break;
    case "tools/call": {
      const r = await callTool(app, userId, params);
      if (r.error) return respond(200, { jsonrpc: "2.0", id, error: r.error });
      result = r.result as Json; break;
    }
    default: return respond(404, rpcError(id, -32601, `Method not found: ${method}`));
  }
  return respond(200, { jsonrpc: "2.0", id, result: { resultType: "complete", ...result, _meta: { [META_SERVER_INFO]: SERVER_INFO } } });
}

async function handleLegacy(request: Request, app: App, userId: string, method: string, id: RpcId | null, params: Json): Promise<Response> {
  const hv = request.headers.get("mcp-protocol-version");
  if (hv !== null && MODERN_VERSIONS.includes(hv)) {
    return respond(400, rpcError(id, -32602, `Invalid params: a request for protocol version ${hv} must carry params._meta with ${META_VERSION} and ${META_CLIENT_CAPS}`));
  }
  if (hv !== null && !LEGACY_VERSIONS.includes(hv)) {
    return respond(400, rpcError(id, -32600, `Unsupported MCP-Protocol-Version header: ${hv}`, { supported: LEGACY_VERSIONS }));
  }
  if (id === null) return accepted();   // notifications/initialized, notifications/cancelled, ...

  let result: Json;
  switch (method) {
    case "initialize": {
      const requested = params.protocolVersion;
      const protocolVersion = typeof requested === "string" && LEGACY_VERSIONS.includes(requested) ? requested : LEGACY_VERSIONS[0];
      result = { protocolVersion, capabilities: { tools: {} }, serverInfo: SERVER_INFO, instructions: INSTRUCTIONS };
      break;
    }
    case "ping": result = {}; break;
    case "tools/list": result = { tools: TOOLS }; break;
    case "tools/call": {
      const r = await callTool(app, userId, params);
      if (r.error) return respond(200, { jsonrpc: "2.0", id, error: r.error });
      result = r.result as Json; break;
    }
    default: return respond(200, rpcError(id, -32601, `Method not found: ${method}`));
  }
  return respond(200, { jsonrpc: "2.0", id, result });
}
