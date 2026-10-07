// Shared data contract of My gym (see AGENTS.md). The same shapes are used by the page, the Claude variant
// (documents in the page database) and the ChatGPT Sites variant (rows in D1 holding the same JSON).

export type SetEntry = { kg: number | null; reps: number | null; done: boolean };
export type Feedback = { feel?: "lekko" | "ok" | "ciezko" | null; pain?: string[] };

/** One performed workout: the historical record. Id is `YYYY-MM-DD_tN`. */
export type Workout = {
  id: string;
  trening: string;
  data: string;
  warm: Record<string, boolean>;
  cool: Record<string, boolean>;
  sets: Record<string, SetEntry[]>;
  fb: Record<string, Feedback>;
  notes: string;
  finished: boolean;
  updatedAt: string | null;
};

export type Exercise = {
  id: string; name: string; short: string; sets: number; kg: number | null; lo: number; hi: number;
  step: number | null; stepLabel: string; unit?: string; assist?: boolean; perHand?: boolean; perSide?: boolean;
  bar?: boolean; cue?: string;
};
export type Group = { id: string; station: string; sub: string; rest: number; ex: Exercise[] };
export type CheckItem = { id: string; text: string; detail?: string; kg?: number | null };
export type Training = {
  id: string; name: string; title: string; h1: string; h1sub?: string; minutes: string | number; lead: string;
  remember: string[]; howto: string[]; warmupMin?: number; warmup?: CheckItem[]; warmupSets?: CheckItem[];
  supersets: Group[]; cooldownMin?: number; cooldown?: CheckItem[]; archived?: boolean;
};
/** The plan document: what the page shows. In the Claude variant it lives in my-gym.html; in Sites in D1. */
export type PlanDoc = {
  plans: Record<string, Training>;
  tabs?: { id: string; label: string }[];
  soon?: Record<string, { name: string; h: string; hs?: string }>;
  profil?: string;
};
export type PlanRecord = { plan: PlanDoc; updatedAt: string };

/** Targets for the next workout of one training. Separate from history: changing them never touches workouts. */
export type TargetEx = { kg?: number | null; reps?: number | null; note?: string };
export type Target = { trening: string; ex: Record<string, TargetEx>; note?: string; updatedAt: string };

/** Storage interface used by the application operations. Every method is scoped to one user. */
export interface Store {
  getPlan(userId: string): Promise<PlanRecord | null>;
  putPlan(userId: string, plan: PlanDoc, updatedAt: string): Promise<void>;
  listWorkouts(userId: string, opts: { training?: string; limit: number }): Promise<Workout[]>;
  getWorkout(userId: string, id: string): Promise<Workout | null>;
  putWorkout(userId: string, workout: Workout): Promise<void>;
  listTargets(userId: string): Promise<Target[]>;
  getTarget(userId: string, training: string): Promise<Target | null>;
  putTarget(userId: string, target: Target): Promise<void>;
}

/** The part of Cloudflare D1 this code uses (prepare/bind/first/all/run). */
export interface D1Like {
  prepare(sql: string): D1Stmt;
}
export interface D1Stmt {
  bind(...values: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  run(): Promise<unknown>;
}

export type Env = {
  DB: D1Like;
  ASSETS?: { fetch(request: Request): Promise<Response> };
  MCP_ALLOWED_ORIGINS?: string;
};
