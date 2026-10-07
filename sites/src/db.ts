// Store on Cloudflare D1. One SQL statement per prepare(), every value bound as a parameter,
// every query scoped by user_id. The schema is in ../migrations (never created here).
import type { D1Like, PlanDoc, PlanRecord, Store, Target, Workout } from "./types.ts";
import { validateTarget, validateWorkout } from "./validate.ts";

type Row = { json: string; updated_at?: string };

function parse<T>(json: string): T { return JSON.parse(json) as T; }

export function d1Store(db: D1Like): Store {
  return {
    async getPlan(userId: string): Promise<PlanRecord | null> {
      const row = await db.prepare("SELECT plan_json AS json, updated_at FROM plans WHERE user_id = ?").bind(userId).first<Row>();
      return row ? { plan: parse<PlanDoc>(row.json), updatedAt: row.updated_at ?? "" } : null;
    },
    async putPlan(userId: string, plan: PlanDoc, updatedAt: string): Promise<void> {
      await db.prepare(
        "INSERT INTO plans (user_id, plan_json, updated_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(user_id) DO UPDATE SET plan_json = excluded.plan_json, updated_at = excluded.updated_at",
      ).bind(userId, JSON.stringify(plan), updatedAt).run();
    },
    async listWorkouts(userId: string, opts: { training?: string; limit: number }): Promise<Workout[]> {
      const res = opts.training
        ? await db.prepare("SELECT workout_json AS json FROM workouts WHERE user_id = ? AND training = ? ORDER BY date DESC, id DESC LIMIT ?").bind(userId, opts.training, opts.limit).all<Row>()
        : await db.prepare("SELECT workout_json AS json FROM workouts WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?").bind(userId, opts.limit).all<Row>();
      return res.results.map((r) => validateWorkout(parse<unknown>(r.json)));
    },
    async getWorkout(userId: string, id: string): Promise<Workout | null> {
      const row = await db.prepare("SELECT workout_json AS json FROM workouts WHERE user_id = ? AND id = ?").bind(userId, id).first<Row>();
      return row ? validateWorkout(parse<unknown>(row.json)) : null;
    },
    async putWorkout(userId: string, w: Workout): Promise<void> {
      await db.prepare(
        "INSERT INTO workouts (user_id, id, date, training, finished, workout_json, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?) " +
        "ON CONFLICT(user_id, id) DO UPDATE SET date = excluded.date, training = excluded.training, finished = excluded.finished, " +
        "workout_json = excluded.workout_json, updated_at = excluded.updated_at",
      ).bind(userId, w.id, w.data, w.trening, w.finished ? 1 : 0, JSON.stringify(w), w.updatedAt ?? "").run();
    },
    async listTargets(userId: string): Promise<Target[]> {
      const res = await db.prepare("SELECT target_json AS json FROM targets WHERE user_id = ? ORDER BY training").bind(userId).all<Row>();
      return res.results.map((r) => validateTarget(parse<unknown>(r.json)));
    },
    async getTarget(userId: string, training: string): Promise<Target | null> {
      const row = await db.prepare("SELECT target_json AS json FROM targets WHERE user_id = ? AND training = ?").bind(userId, training).first<Row>();
      return row ? validateTarget(parse<unknown>(row.json)) : null;
    },
    async putTarget(userId: string, t: Target): Promise<void> {
      await db.prepare(
        "INSERT INTO targets (user_id, training, target_json, updated_at) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(user_id, training) DO UPDATE SET target_json = excluded.target_json, updated_at = excluded.updated_at",
      ).bind(userId, t.trening, JSON.stringify(t), t.updatedAt).run();
    },
  };
}
