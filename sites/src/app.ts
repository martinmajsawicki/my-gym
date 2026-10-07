// Application operations shared by the HTTP routes (the page) and the MCP tools (ChatGPT).
// Both entry points call these functions; nothing here knows about HTTP or JSON-RPC.
import type { PlanRecord, Store, Target, Workout } from "./types.ts";
import { AppError, validatePlan, validateTargetPatch, validateTrainingId, validateWorkout } from "./validate.ts";

export { AppError };

export type App = ReturnType<typeof createApp>;

function hasDoneSet(w: Workout): boolean {
  return Object.values(w.sets || {}).some((arr) => arr.some((s) => s && s.done));
}

export function createApp(store: Store, now: () => string = () => new Date().toISOString()) {
  return {
    /** The stored plan, or null when the user has not written one yet (the page then shows the example from the file). */
    getPlan(userId: string): Promise<PlanRecord | null> {
      return store.getPlan(userId);
    },

    /** Replaces the whole plan. Never touches workouts or targets. */
    async updatePlan(userId: string, input: unknown): Promise<PlanRecord> {
      const plan = validatePlan(input);
      const updatedAt = now();
      await store.putPlan(userId, plan, updatedAt);
      return { plan, updatedAt };
    },

    /** Workouts, newest first. */
    async listWorkouts(userId: string, opts: { training?: unknown; limit?: unknown } = {}): Promise<Workout[]> {
      const training = opts.training === undefined || opts.training === null || opts.training === "" ? undefined : validateTrainingId(opts.training);
      let limit = 50;
      if (opts.limit !== undefined && opts.limit !== null && opts.limit !== "") {
        const n = Number(opts.limit);
        if (!Number.isInteger(n) || n < 1 || n > 400) throw new AppError(400, "limit: must be an integer between 1 and 400");
        limit = n;
      }
      return store.listWorkouts(userId, { training, limit });
    },

    /** The most recent workout with at least one done set (or the most recent one at all). */
    async getLastWorkout(userId: string, training?: unknown): Promise<Workout | null> {
      const list = await this.listWorkouts(userId, { training, limit: 30 });
      return list.find(hasDoneSet) ?? list[0] ?? null;
    },

    async getWorkout(userId: string, id: unknown): Promise<Workout | null> {
      if (typeof id !== "string" || !/^\d{4}-\d{2}-\d{2}_t\d{1,2}$/.test(id)) throw new AppError(400, "workout id must look like 2026-10-07_t1");
      return store.getWorkout(userId, id);
    },

    /**
     * Writes one workout (upsert by id). The page owns today's record and always overwrites it.
     * A tool call refuses to replace a finished workout unless overwrite is true, so history is not rewritten by accident.
     */
    async saveWorkout(userId: string, input: unknown, opts: { source: "page" | "tool"; overwrite?: boolean }): Promise<Workout> {
      const w = validateWorkout(input);
      if (opts.source === "tool" && !opts.overwrite) {
        const existing = await store.getWorkout(userId, w.id);
        if (existing && existing.finished) throw new AppError(409, `Workout ${w.id} is already saved and finished. Pass overwrite: true to replace it.`);
      }
      if (!w.updatedAt) w.updatedAt = now();
      await store.putWorkout(userId, w);
      return w;
    },

    async getTargets(userId: string): Promise<Record<string, Target>> {
      const out: Record<string, Target> = {};
      for (const t of await store.listTargets(userId)) out[t.trening] = t;
      return out;
    },

    /**
     * Sets the target for one exercise of the next workout of a training (kg, reps, note; null clears a field).
     * Only targets change: the history of performed workouts stays as it is.
     */
    async updateNextWorkout(userId: string, input: unknown): Promise<Target> {
      const p = validateTargetPatch(input);
      const rec = await store.getPlan(userId);
      if (rec) {
        const tr = rec.plan.plans[p.training];
        if (!tr) throw new AppError(400, `Unknown training ${p.training}. The plan has: ${Object.keys(rec.plan.plans).join(", ")}`);
        const ids = tr.supersets.flatMap((g) => g.ex.map((e) => e.id));
        if (!ids.includes(p.exercise)) throw new AppError(400, `Unknown exercise ${p.exercise} in ${p.training}. It has: ${ids.join(", ")}`);
      }
      const cur: Target = (await store.getTarget(userId, p.training)) ?? { trening: p.training, ex: {}, updatedAt: "" };
      const ex = { ...(cur.ex[p.exercise] ?? {}) };
      if (p.kg !== undefined) { if (p.kg === null) delete ex.kg; else ex.kg = p.kg; }
      if (p.reps !== undefined) { if (p.reps === null) delete ex.reps; else ex.reps = p.reps; }
      if (p.note !== undefined) { if (p.note === null || p.note === "") delete ex.note; else ex.note = p.note; }
      if (ex.kg === undefined && ex.reps === undefined && ex.note === undefined) delete cur.ex[p.exercise];
      else cur.ex[p.exercise] = ex;
      cur.updatedAt = now();
      await store.putTarget(userId, cur);
      return cur;
    },
  };
}
