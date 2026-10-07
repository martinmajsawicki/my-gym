# Instructions for agents: My gym

This repository holds one workout app for the phone and two ways of running it. Read this file first, whichever agent you are. `CLAUDE.md` adds what is specific to the Claude variant; `docs/chatgpt-sites.md` adds what is specific to ChatGPT Sites.

## Start here

The person who opened this folder wants one thing: **a private web page on their phone that they can use at the gym today.** They downloaded the repository and opened it in their agent. Whatever their first message says ("set this up", "zrób mi tę appkę", or a question), do the whole job and do not stop at a plan or at a list of options:

1. **Pick the variant from where you run.** In Claude Code (Claude desktop app, Code tab): the Claude variant, see `CLAUDE.md`. In ChatGPT, Codex or any environment with ChatGPT Sites: the Sites variant, see `docs/chatgpt-sites.md`. Do not ask the user which one; they chose by opening the folder where they did.
2. **Get the page running** with its storage: publish `my-gym.html` as a private page (Claude), or deploy `sites/` as a private Site with its database and tools (Sites). If something in this repository does not match your platform's current documentation, follow the platform, adjust the code, and note the change in `docs/chatgpt-sites.md` or `CLAUDE.md`.
3. **Hand over the link** and say how to put it on the phone: open it signed in to the same account, then "Share" and "Add to Home Screen" in Safari.
4. **Ask for the plan** (exercises, sets, reps, weights, rest times, which exercises go in pairs), write it in, and make sure it shows on the page. The file ships with two example workouts without weights; they are a demonstration, not the user's plan.
5. **Tell the user how the page works** in three sentences: tick sets, the timer runs the rests, everything is saved as you go; at home ask the assistant to review the log or change the plan.

Keep the user's data private: the page is for its owner only, nothing is public, nothing leaves their account except through the platform they chose.

## What the app is

A page that shows the user's plan with weights, lets them tick off sets, times the rest, records what they did and how it felt, and shows the log with charts. **The page is the primary interface.** During a workout the user never opens a chat and never types results into one.

The conversation with an assistant (Claude or ChatGPT) is optional and happens at home: writing the plan, reading the history, setting targets for the next workout.

The plan and the history are data of the app. They do not live in a chat thread and they are never kept only in the browser's localStorage (localStorage holds a draft of today's session as a safety net, nothing more).

## Files

| Path | Role | Platform |
|---|---|---|
| `my-gym.html` | The whole app in one file: shared interface and logic plus the **Claude adapter**. Everything outside the block `// ==== ADAPTER START` .. `// ==== ADAPTER END ====` is shared code. | shared + Claude |
| `sites/adapter.js` | The browser adapter for ChatGPT Sites (talks to `/api/...` on the same origin). | Sites |
| `build.mjs` | Builds the Sites page: swaps the adapter block of `my-gym.html` for `sites/adapter.js` and writes `sites/public/index.html` and `sites/src/page.ts`. `node build.mjs --check` fails when they are stale. | Sites |
| `sites/src/index.ts` | Cloudflare Worker: routes, identity, same-origin checks, serves the page. | Sites |
| `sites/src/app.ts` | Application operations used by both the HTTP routes and the MCP tools. | Sites |
| `sites/src/validate.ts` | Validation of plan, workout and target documents. | Sites |
| `sites/src/db.ts` | Store on D1 (parametrised SQL, one statement per `prepare`). | Sites |
| `sites/src/mcp.ts` | MCP endpoint `POST /mcp` with the tools for ChatGPT. | Sites |
| `sites/src/page.ts`, `sites/public/index.html` | **Generated** by `build.mjs`. Do not edit. | Sites |
| `sites/migrations/0001_init.sql` | D1 schema. | Sites |
| `sites/test/` | Local checks against an in-memory store. | Sites |
| `docs/chatgpt-sites.md` | Deployment notes for the Sites variant and what remains unverified. | Sites |
| `CLAUDE.md` | Additions for the Claude variant. | Claude |
| `README.md`, `README.pl.md` | For people. | |

## Which variant the user means

- Claude, claude.ai, Claude Code, "Code tab", a private page with a link: **Claude variant**. Publish `my-gym.html` as the user's private page; the plan lives in the file; results live in the page's database. Details in `CLAUDE.md`.
- ChatGPT, Sites, Codex, D1, plugin, MCP: **Sites variant**. Deploy `sites/`; plan, workouts and targets live in D1; ChatGPT reaches them through the MCP tools. Details in `docs/chatgpt-sites.md`.

Do not assume the tools of the other platform exist. Claude Code has no D1 and no MCP endpoint of this app; ChatGPT has no Artifact tool and no page database. If your environment lacks what the chosen variant needs, say so. Do not replace the missing piece with a "sync" through the conversation, through localStorage or by asking the user to copy data.

The two variants do not share data. A user who runs both has two separate logs.

## Rules that hold on both platforms

1. **The user's words come first.** Write exercise names the way the user names them.
2. **A performed workout is history.** Changing the plan or a target never modifies a saved workout. A note the user left in a workout is information, not an instruction to change anything.
3. **Never invent weights.** `kg: null` when the user did not say. You may propose rep ranges and progression steps, but say they are your proposal.
4. **Pain and injuries:** advise a lighter variant or a substitute; for pain that gets worse, a pause and a physiotherapist or doctor. Do not diagnose.
5. **Save errors must be visible.** The page shows "nie zapisano" when a write fails; never report a save as done when it was not.
6. **The page stays one file.** No external scripts or services beyond Google Fonts. Interface in Polish (English is on the list).
7. **Do not change the page logic** (anything outside `PLAN`, `PROFIL`, `SOON`, `TABS`) unless the user asks. After any change to `my-gym.html` or `sites/adapter.js`: check the syntax, run `node build.mjs`, run `cd sites && npm run check`.
8. Logic that needs no DOM lives between `// ==== CZYSTE START` and `// ==== CZYSTE KONIEC` and is testable in node.

## Data contract

Identifiers: trainings `t1`, `t2`, ...; exercises `A1`, `B2`, ... (letter = group, digit = position in the group); workouts `YYYY-MM-DD_tN`.

### Plan document

```
{ plans: { t1: Training, t3: Training }, tabs: [{ id, label }], soon: { t2: { name, h, hs } }, profil: "..." }
```

In the Claude variant the parts of this document are the constants `PLAN`, `TABS`, `SOON`, `PROFIL` in `my-gym.html`. In the Sites variant the whole document is one row in D1 and the constants in the file are only an example shown until a plan is stored.

**Training:** `id`, `name` ("Trening 1"), `title` ("Klatka + biceps"), `h1`, `h1sub`, `minutes`, `lead`, `remember[]`, `howto[]`, `warmupMin`, `warmup[]`, `warmupSets[]`, `supersets[]`, `cooldownMin`, `cooldown[]`, `archived` (an old plan kept for the log and charts, without a tab).

**Group** (in `supersets`): `id` (a letter), `station` (heading), `sub` (line under the heading), `rest` (seconds after the group), `ex[]`. One exercise = straight sets. Two exercises = a superset: the first, then straight away the second, rest only after the pair. A drop set is the same construct (working set, then a lighter set).

**Exercise:** `id`, `name`, `short`, `sets`, `kg` (starting weight; `null` unknown; `0` bodyweight), `lo`, `hi` (rep range), `step` (progression step in the exercise's unit; `null` = "one plate on the stack"), `stepLabel`, `unit` (`"szt."` for assisted machines, then `assist: true` and a negative `step`, because fewer assistance plates means harder), `perHand` (weight per hand), `perSide` (reps per side), `bar` (draws plates for a 20 kg bar), `cue` (one sentence of advice).

**Checklist item** (`warmup`, `warmupSets`, `cooldown`): `id`, `text`, `detail`, `kg` (for warm-up sets with plates).

### Workout document (history)

```
{ id: "2026-10-07_t1", trening: "t1", data: "2026-10-07",
  sets: { A1: [{ kg: 50, reps: 8, done: true }, ...], ... },
  fb: { A1: { feel: "lekko" | "ok" | "ciezko" | null, pain: ["bark", ...] } },
  warm: { w1: true }, cool: { c1: true }, notes: "", finished: false, updatedAt: "2026-10-07T10:12:00.000Z" }
```

Each set carries its own actual weight and reps. The newest `updatedAt` wins when two devices wrote the same document. Claude variant: collection `sesje`, document id = workout id. Sites variant: table `workouts`.

### Target document (next workout of one training)

```
{ trening: "t1", ex: { A1: { kg: 52.5, reps: 8, note: "od trenera" } }, note: "", updatedAt: "2026-10-07T18:00:00.000Z" }
```

The page shows a target as "Cel na dziś" and prefills the fields. A target set before the last recorded workout of that training is consumed and ignored. Claude variant: collection `cele`, document id = training id. Sites variant: table `targets`.

### Operations

| Operation | The page | Claude variant | Sites variant |
|---|---|---|---|
| Read the plan | from the file, or `store.loadPlan()` | Claude reads `my-gym.html` | `get_plan`, `GET /api/plan` |
| Write the plan | never | Claude edits `PLAN` in the file and publishes again | `update_plan`, `PUT /api/plan` |
| Read history | `store.listSessions(limit)` | ArtifactData, collection `sesje` | `list_workouts`, `GET /api/workouts` |
| Last workout | computed in the page | ArtifactData | `get_last_workout`, `GET /api/workouts/last` |
| Save a workout | `store.saveSession(session)` | ArtifactData `set` on `sesje/<id>` | `save_workout`, `PUT /api/workouts/{id}` |
| Read targets | `store.loadTargets()` | ArtifactData, collection `cele` | `GET /api/targets` |
| Set a target | never | ArtifactData `set` on `cele/<tN>` | `update_next_workout`, `PATCH /api/targets/{tN}` |

### Adapter contract (the block in `my-gym.html`)

```
ADAPTER.assistantName   { nom, gen, dat }: the assistant's name in the cases the Polish strings need
ADAPTER.localNote       sentence shown when there is no store and the page saves only to localStorage
ADAPTER.connect()       Promise<store | null>; null = no store
  store.loadPlan()        Promise<planDoc | null>; null = use the plan from the file
  store.listSessions(n)   Promise<workout[]>, newest first
  store.saveSession(w)    Promise<void>; must reject on failure
  store.loadTargets()     Promise<{ [training]: target }>
ADAPTER.assistant()     Promise<assistant | null>; null hides the "Zapytaj" section
  assistant.json(prompt, { signal })            Promise<object>
  assistant.text(prompt, { signal, onText })    Promise<{ text, truncated }>
```

## Local checks

```
node build.mjs            # regenerate the Sites page after editing my-gym.html or sites/adapter.js
node build.mjs --check    # are the generated files up to date?
cd sites && npm install && npm run check   # build check, tsc --noEmit, node --test (in-memory store, no D1)
```

The tests run on Node 24 (it strips TypeScript types itself). They prove the routes, validation, isolation between users and the MCP protocol handling. They do not prove anything about the Sites platform; see `docs/chatgpt-sites.md`.
