# Instructions for Claude: My gym

Read `AGENTS.md` first: it holds the shared rules, the file map and the data contract for both platforms. This file adds what is specific to the Claude variant: `my-gym.html` published as the user's private page from Claude Code. Before changing anything, also read the comment at the top of the HTML file. The user may speak Polish or English; the interface of the page is in Polish.

## First session

The user has just downloaded the repository and opened the folder in Claude Code. Whatever they write first, do the whole job: publish the page, give the link, write in the plan.

1. Publish `my-gym.html` as described below and give the user the link. Tell them to open it on the phone signed in to the same Claude account, then "Share" and "Add to Home Screen" in Safari.
2. Ask about their plan: exercises, sets, reps, weights, rest times, which exercises go in pairs; and about them for `PROFIL` (experience, goal, limitations, where the plan comes from). Write it into the file, check the syntax (`node --check` on the extracted script if node is available), publish again at the same address.
3. Say in three sentences how the page works: tick sets, the timer runs the rests, everything is saved as you go; at home ask Claude to review the log or change the plan.

Do not stop at a plan of work or a list of options. Do not ask whether they want the ChatGPT variant: they opened this in Claude Code.

## Publishing

- Publish `my-gym.html` with the Artifact tool and `capabilities: {"db": {}, "sample": {}}`. Without `db` results will not be saved; without `sample` the "Zapytaj Claude'a" (Ask Claude) button will not work.
- On every later publish use the same file and the same URL, so the user never has to change the link on their phone.
- After the first publish give the user the link and tell them to open it on their phone, signed in to their own Claude account.

## The plan

- In this variant the plan lives in the file: the `PLAN`, `TABS`, `SOON` and `PROFIL` constants between the comments `CZYSTE START` and `CZYSTE KONIEC`. Field by field the schema is in `AGENTS.md` (Plan document).
- When writing a plan from dictation, ask for what the user did not give (weights, rest times, which exercises are paired). Never invent weights.
- Fill `PROFIL` from the conversation: training experience, goal, days per week, health limitations, where the plan comes from. It is sent with every question asked inside the app.
- Choose the warm-up and cool-down for the body part. Keep them short.
- An old plan does not have to disappear: give it `archived: true` and it stays visible in the Log and charts, without a tab.

## Results

- They are saved in the page's database: collection `sesje`, document `YYYY-MM-DD_tN` (shape in `AGENTS.md`, Workout document).
- Read them with the ArtifactData tool. When the user asks you to copy a workout into their journal, write it in readable form to a journal file in their folder (e.g. `journal.md` or `dziennik.md`) and propose weights for next time. Take the numbers from the saved sets, never from memory.
- When you enter a workout on the user's behalf (for example one done without the phone), create a document in the same shape with `finished: true`.

## Targets for the next workout

- To set weights or reps for the next time without republishing the file, write a document to collection `cele`, document id = training id (`t1`, `t3`, ...): `{ trening, ex: { A1: { kg, reps, note } }, note, updatedAt }` with `updatedAt` as the current ISO time. Use ArtifactData `set` for the whole document or `update` for one exercise.
- The page shows it as "Cel na dziś" and prefills the fields. A target older than the last recorded workout of that training is ignored, so set it after reading the latest results.
- Targets never change history. If the user wants a past workout corrected, edit that document in `sesje`.

## Rules

- The user's words come first. Write exercise names the way the user names them.
- With pain or injury advise carefully: a lighter variant or a substitute, and for pain that gets worse a pause and a physiotherapist or doctor. Do not diagnose.
- Do not change the page logic (anything outside `PLAN`, `PROFIL`, `SOON`, `TABS`) unless the user explicitly asks. If you do: check the syntax (`node --check` on the extracted script), run `node build.mjs` so the Sites page stays in step, and publish again.
- Add no external scripts or services. The page stays a single file.
- The `sites/` folder is the ChatGPT Sites variant. Claude Code cannot deploy it and has no access to its database; do not try. If the user asks about it, point them to `docs/chatgpt-sites.md`.
