// Validation of everything that comes from outside (page, MCP tools). Throws AppError(400) with a message
// the caller (a person or a model) can act on. Returns normalised copies with only the known fields.
import type { CheckItem, Exercise, Group, PlanDoc, SetEntry, Target, Training, Workout } from "./types.ts";

export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const ID_WORKOUT = /^\d{4}-\d{2}-\d{2}_t\d{1,2}$/;
const ID_TRAINING = /^t\d{1,2}$/;
const ID_SHORT = /^[A-Za-z][A-Za-z0-9_-]{0,15}$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}T/;
const FEEL = new Set(["lekko", "ok", "ciezko"]);
const MAX_JSON = 200_000;

function bad(msg: string): never { throw new AppError(400, msg); }
function isObj(x: unknown): x is Record<string, unknown> { return typeof x === "object" && x !== null && !Array.isArray(x); }
function str(x: unknown, field: string, max: number, opt = false): string {
  if (x === undefined || x === null) { if (opt) return ""; bad(`${field}: required string`); }
  if (typeof x !== "string") bad(`${field}: must be a string`);
  if (x.length > max) bad(`${field}: longer than ${max} characters`);
  return x;
}
function num(x: unknown, field: string, min: number, max: number): number {
  if (typeof x !== "number" || !Number.isFinite(x)) bad(`${field}: must be a number`);
  if (x < min || x > max) bad(`${field}: must be between ${min} and ${max}`);
  return x;
}
function numOrNull(x: unknown, field: string, min: number, max: number): number | null {
  return x === null || x === undefined ? null : num(x, field, min, max);
}
function int(x: unknown, field: string, min: number, max: number): number {
  const n = num(x, field, min, max);
  if (!Number.isInteger(n)) bad(`${field}: must be an integer`);
  return n;
}
function intOrNull(x: unknown, field: string, min: number, max: number): number | null {
  return x === null || x === undefined ? null : int(x, field, min, max);
}
function bool(x: unknown, field: string, opt = false): boolean {
  if (x === undefined && opt) return false;
  if (typeof x !== "boolean") bad(`${field}: must be true or false`);
  return x;
}
function strList(x: unknown, field: string, maxItems: number, maxLen: number): string[] {
  if (x === undefined || x === null) return [];
  if (!Array.isArray(x)) bad(`${field}: must be a list of strings`);
  if (x.length > maxItems) bad(`${field}: more than ${maxItems} items`);
  return x.map((s, i) => str(s, `${field}[${i}]`, maxLen));
}
function shortId(x: unknown, field: string): string {
  const s = str(x, field, 16);
  if (!ID_SHORT.test(s)) bad(`${field}: '${s}' is not a valid id (letters, digits, _ or -, starting with a letter)`);
  return s;
}
function sizeOk(x: unknown, what: string): void {
  if (JSON.stringify(x).length > MAX_JSON) bad(`${what}: larger than ${MAX_JSON} characters of JSON`);
}

export function validateTrainingId(x: unknown, field = "training"): string {
  const s = str(x, field, 4);
  if (!ID_TRAINING.test(s)) bad(`${field}: '${s}' is not a training id (t1, t2, ...)`);
  return s;
}

export function validateWorkout(x: unknown): Workout {
  if (!isObj(x)) bad("workout: must be an object");
  sizeOk(x, "workout");
  const id = str(x.id, "workout.id", 16);
  if (!ID_WORKOUT.test(id)) bad(`workout.id: '${id}' must look like 2026-10-07_t1`);
  const data = id.slice(0, 10), trening = id.slice(11);
  if (x.data !== undefined && x.data !== data) bad(`workout.data: must equal the date in the id (${data})`);
  if (x.trening !== undefined && x.trening !== trening) bad(`workout.trening: must equal the training in the id (${trening})`);

  const sets: Record<string, SetEntry[]> = {};
  if (x.sets !== undefined) {
    if (!isObj(x.sets)) bad("workout.sets: must be an object keyed by exercise id");
    const keys = Object.keys(x.sets);
    if (keys.length > 40) bad("workout.sets: more than 40 exercises");
    for (const k of keys) {
      shortId(k, "workout.sets key");
      const arr = x.sets[k];
      if (!Array.isArray(arr)) bad(`workout.sets.${k}: must be a list of sets`);
      if (arr.length > 12) bad(`workout.sets.${k}: more than 12 sets`);
      sets[k] = arr.map((s, i) => {
        if (!isObj(s)) bad(`workout.sets.${k}[${i}]: must be an object {kg, reps, done}`);
        return { kg: numOrNull(s.kg, `workout.sets.${k}[${i}].kg`, 0, 500), reps: intOrNull(s.reps, `workout.sets.${k}[${i}].reps`, 0, 100), done: bool(s.done, `workout.sets.${k}[${i}].done`, true) };
      });
    }
  }
  const fb: Workout["fb"] = {};
  if (x.fb !== undefined) {
    if (!isObj(x.fb)) bad("workout.fb: must be an object keyed by exercise id");
    if (Object.keys(x.fb).length > 40) bad("workout.fb: more than 40 exercises");
    for (const k of Object.keys(x.fb)) {
      shortId(k, "workout.fb key");
      const f = x.fb[k];
      if (f === null || f === undefined) continue;
      if (!isObj(f)) bad(`workout.fb.${k}: must be an object {feel, pain}`);
      const out: Workout["fb"][string] = {};
      if (f.feel !== undefined && f.feel !== null) {
        if (typeof f.feel !== "string" || !FEEL.has(f.feel)) bad(`workout.fb.${k}.feel: must be lekko, ok or ciezko`);
        out.feel = f.feel as "lekko" | "ok" | "ciezko";
      } else out.feel = null;
      out.pain = strList(f.pain, `workout.fb.${k}.pain`, 8, 20);
      fb[k] = out;
    }
  }
  const checks = (v: unknown, field: string): Record<string, boolean> => {
    const out: Record<string, boolean> = {};
    if (v === undefined || v === null) return out;
    if (!isObj(v)) bad(`${field}: must be an object of booleans`);
    if (Object.keys(v).length > 40) bad(`${field}: more than 40 items`);
    for (const k of Object.keys(v)) out[shortId(k, `${field} key`)] = bool(v[k], `${field}.${k}`);
    return out;
  };
  let updatedAt: string | null = null;
  if (x.updatedAt !== undefined && x.updatedAt !== null) {
    updatedAt = str(x.updatedAt, "workout.updatedAt", 40);
    if (!ISO_DATE.test(updatedAt)) bad("workout.updatedAt: must be an ISO date-time");
  }
  return {
    id, trening, data,
    warm: checks(x.warm, "workout.warm"), cool: checks(x.cool, "workout.cool"),
    sets, fb,
    notes: str(x.notes, "workout.notes", 2000, true),
    finished: bool(x.finished, "workout.finished", true),
    updatedAt,
  };
}

function checkItems(v: unknown, field: string): CheckItem[] | undefined {
  if (v === undefined || v === null) return undefined;
  if (!Array.isArray(v)) bad(`${field}: must be a list`);
  if (v.length > 20) bad(`${field}: more than 20 items`);
  return v.map((c, i) => {
    if (!isObj(c)) bad(`${field}[${i}]: must be an object {id, text, detail}`);
    const out: CheckItem = { id: shortId(c.id, `${field}[${i}].id`), text: str(c.text, `${field}[${i}].text`, 200) };
    if (c.detail !== undefined && c.detail !== null) out.detail = str(c.detail, `${field}[${i}].detail`, 300);
    if (c.kg !== undefined) out.kg = numOrNull(c.kg, `${field}[${i}].kg`, 0, 500);
    return out;
  });
}

function exercise(e: unknown, field: string): Exercise {
  if (!isObj(e)) bad(`${field}: must be an object`);
  const out: Exercise = {
    id: shortId(e.id, `${field}.id`),
    name: str(e.name, `${field}.name`, 120),
    short: str(e.short, `${field}.short`, 40),
    sets: int(e.sets, `${field}.sets`, 1, 10),
    kg: numOrNull(e.kg, `${field}.kg`, 0, 500),
    lo: int(e.lo, `${field}.lo`, 1, 100),
    hi: int(e.hi, `${field}.hi`, 1, 100),
    step: numOrNull(e.step, `${field}.step`, -50, 50),
    stepLabel: str(e.stepLabel, `${field}.stepLabel`, 40),
  };
  if (out.lo > out.hi) bad(`${field}: lo must not be greater than hi`);
  if (e.unit !== undefined && e.unit !== null) out.unit = str(e.unit, `${field}.unit`, 10);
  for (const flag of ["assist", "perHand", "perSide", "bar"] as const) {
    if (e[flag] !== undefined && e[flag] !== null) out[flag] = bool(e[flag], `${field}.${flag}`);
  }
  if (e.cue !== undefined && e.cue !== null) out.cue = str(e.cue, `${field}.cue`, 300);
  return out;
}

function training(t: unknown, key: string): Training {
  const field = `plan.plans.${key}`;
  if (!isObj(t)) bad(`${field}: must be an object`);
  if (t.id !== undefined && t.id !== key) bad(`${field}.id: must equal '${key}'`);
  if (!Array.isArray(t.supersets) || !t.supersets.length) bad(`${field}.supersets: must be a non-empty list of groups`);
  if (t.supersets.length > 12) bad(`${field}.supersets: more than 12 groups`);
  const seen = new Set<string>();
  const supersets: Group[] = t.supersets.map((g, i) => {
    const gf = `${field}.supersets[${i}]`;
    if (!isObj(g)) bad(`${gf}: must be an object`);
    if (!Array.isArray(g.ex) || !g.ex.length || g.ex.length > 4) bad(`${gf}.ex: must hold 1 to 4 exercises`);
    const ex = g.ex.map((e, j) => exercise(e, `${gf}.ex[${j}]`));
    for (const e of ex) { if (seen.has(e.id)) bad(`${field}: exercise id '${e.id}' is used twice`); seen.add(e.id); }
    return { id: shortId(g.id, `${gf}.id`), station: str(g.station, `${gf}.station`, 120), sub: str(g.sub, `${gf}.sub`, 200, true), rest: int(g.rest, `${gf}.rest`, 0, 900), ex };
  });
  const minutes = typeof t.minutes === "number" ? int(t.minutes, `${field}.minutes`, 1, 300) : str(t.minutes, `${field}.minutes`, 10, true);
  const out: Training = {
    id: key,
    name: str(t.name, `${field}.name`, 120),
    title: str(t.title, `${field}.title`, 120),
    h1: str(t.h1, `${field}.h1`, 60),
    minutes,
    lead: str(t.lead, `${field}.lead`, 400, true),
    remember: strList(t.remember, `${field}.remember`, 12, 300),
    howto: strList(t.howto, `${field}.howto`, 12, 300),
    supersets,
  };
  if (t.h1sub !== undefined && t.h1sub !== null) out.h1sub = str(t.h1sub, `${field}.h1sub`, 60);
  if (t.warmupMin !== undefined && t.warmupMin !== null) out.warmupMin = num(t.warmupMin, `${field}.warmupMin`, 0, 60);
  if (t.cooldownMin !== undefined && t.cooldownMin !== null) out.cooldownMin = num(t.cooldownMin, `${field}.cooldownMin`, 0, 60);
  const warmup = checkItems(t.warmup, `${field}.warmup`); if (warmup) out.warmup = warmup;
  const warmupSets = checkItems(t.warmupSets, `${field}.warmupSets`); if (warmupSets) out.warmupSets = warmupSets;
  const cooldown = checkItems(t.cooldown, `${field}.cooldown`); if (cooldown) out.cooldown = cooldown;
  if (t.archived !== undefined && t.archived !== null) out.archived = bool(t.archived, `${field}.archived`);
  return out;
}

export function validatePlan(x: unknown): PlanDoc {
  if (!isObj(x)) bad("plan: must be an object {plans, tabs, soon, profil}");
  sizeOk(x, "plan");
  if (!isObj(x.plans) || !Object.keys(x.plans).length) bad("plan.plans: must be an object with at least one training (t1, t2, ...)");
  const keys = Object.keys(x.plans);
  if (keys.length > 12) bad("plan.plans: more than 12 trainings");
  const plans: Record<string, Training> = {};
  for (const k of keys) { validateTrainingId(k, "plan.plans key"); plans[k] = training(x.plans[k], k); }
  const out: PlanDoc = { plans };
  if (x.tabs !== undefined && x.tabs !== null) {
    if (!Array.isArray(x.tabs) || x.tabs.length > 12) bad("plan.tabs: must be a list of up to 12 {id, label}");
    out.tabs = x.tabs.map((tb, i) => {
      if (!isObj(tb)) bad(`plan.tabs[${i}]: must be an object {id, label}`);
      return { id: shortId(tb.id, `plan.tabs[${i}].id`), label: str(tb.label, `plan.tabs[${i}].label`, 40) };
    });
  }
  if (x.soon !== undefined && x.soon !== null) {
    if (!isObj(x.soon) || Object.keys(x.soon).length > 12) bad("plan.soon: must be an object keyed by training id");
    out.soon = {};
    for (const k of Object.keys(x.soon)) {
      const s = x.soon[k];
      if (!isObj(s)) bad(`plan.soon.${k}: must be an object {name, h, hs}`);
      const item: { name: string; h: string; hs?: string } = { name: str(s.name, `plan.soon.${k}.name`, 120), h: str(s.h, `plan.soon.${k}.h`, 60) };
      if (s.hs !== undefined && s.hs !== null) item.hs = str(s.hs, `plan.soon.${k}.hs`, 60);
      out.soon[validateTrainingId(k, "plan.soon key")] = item;
    }
  }
  if (x.profil !== undefined && x.profil !== null) out.profil = str(x.profil, "plan.profil", 2000);
  return out;
}

export type TargetPatch = { training: string; exercise: string; kg?: number | null; reps?: number | null; note?: string | null };

export function validateTargetPatch(x: unknown): TargetPatch {
  if (!isObj(x)) bad("target: must be an object {training, exercise, kg, reps, note}");
  const out: TargetPatch = { training: validateTrainingId(x.training), exercise: shortId(x.exercise, "exercise") };
  let any = false;
  if (x.kg !== undefined) { out.kg = numOrNull(x.kg, "kg", 0, 500); any = true; }
  if (x.reps !== undefined) { out.reps = intOrNull(x.reps, "reps", 1, 100); any = true; }
  if (x.note !== undefined) { out.note = x.note === null ? null : str(x.note, "note", 200); any = true; }
  if (!any) bad("target: give at least one of kg, reps, note (null clears a field)");
  return out;
}

export function validateTarget(x: unknown): Target {
  if (!isObj(x)) bad("target: must be an object");
  const trening = validateTrainingId(x.trening, "target.trening");
  const ex: Target["ex"] = {};
  if (isObj(x.ex)) {
    for (const k of Object.keys(x.ex)) {
      const e = x.ex[k];
      if (!isObj(e)) continue;
      const item: Target["ex"][string] = {};
      if (e.kg !== undefined) item.kg = numOrNull(e.kg, `target.ex.${k}.kg`, 0, 500);
      if (e.reps !== undefined) item.reps = intOrNull(e.reps, `target.ex.${k}.reps`, 1, 100);
      if (e.note !== undefined && e.note !== null) item.note = str(e.note, `target.ex.${k}.note`, 200);
      ex[shortId(k, "target.ex key")] = item;
    }
  }
  const out: Target = { trening, ex, updatedAt: str(x.updatedAt, "target.updatedAt", 40, true) };
  if (x.note !== undefined && x.note !== null) out.note = str(x.note, "target.note", 300);
  return out;
}
