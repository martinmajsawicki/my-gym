# Instructions for Claude: My gym

This folder holds one workout page (`my-gym.html`) that belongs to the person who downloaded it. Your jobs: publish it as that person's private page, write in their plan, read their results and help them plan. Before changing anything, read the comment at the top of the HTML file. The user may speak Polish or English; the interface of the page is in Polish.

## Publishing

- Publish with the Artifact tool and `capabilities: {"db": {}, "sample": {}}`. Without `db` results will not be saved; without `sample` the "Zapytaj Claude'a" (Ask Claude) button will not work.
- On every later publish use the same file and the same URL, so the user never has to change the link on their phone.
- After the first publish give the user the link and tell them to open it on their phone, signed in to their own Claude account.

## The plan

- The plan lives in the `PLAN` object, between the comments `CZYSTE START` and `CZYSTE KONIEC`. One workout is one object (`t1`, `t2`, `t3`...). The tabs are built from the `TABS` array; a workout missing from `PLAN` shows a placeholder from `SOON`.
- A group in `supersets` with one exercise is plain straight sets. A group with two exercises is a superset: the first, then straight away the second, and the rest only after the pair. The same construct handles a drop set (working set, then immediately a lighter set).
- Exercise fields: `id` (unique within the workout, e.g. `A1`), `name`, `short`, `sets`, `kg` (starting weight; `null` when unknown; `0` for bodyweight), `lo` and `hi` (rep range), `step` (progression step in the exercise's unit; `null` when the step is "one plate on the stack"), `stepLabel`, `unit` (`"szt."` for assisted machines, then `assist: true` and a negative `step`, because fewer assistance plates means harder), `perHand` (weight per hand), `perSide` (reps per side), `bar` (draws plates for a 20 kg bar), `cue` (one sentence of advice).
- Group fields: `id` (a letter), `station`, `sub` (line under the heading), `rest` (rest after the group, in seconds).
- When writing a plan from dictation, ask for what the user did not give (weights, rest times, which exercises are paired). Never invent weights. You may propose rep ranges and progression steps, but say they are your proposal.
- Fill the `PROFIL` constant from the conversation: training experience, goal, days per week, health limitations, where the plan comes from. It is sent with every question asked inside the app.
- Choose the warm-up and cool-down for the body part. Keep them short.
- An old plan does not have to disappear: give it `archived: true` and it stays visible in the Log and charts, without a tab.

## Results

- They are saved in the page's database: collection `sesje`, document `YYYY-MM-DD_tN`. Fields: `sets` (per exercise an array of sets `{kg, reps, done}`), `fb` (ratings: `feel` lekko/ok/ciezko, `pain` list of places), `warm`, `cool`, `notes`, `finished`, `updatedAt`.
- Read them with the ArtifactData tool. When the user asks you to copy a workout into their journal, write it in readable form to a journal file in their folder (e.g. `journal.md` or `dziennik.md`) and propose weights for next time. Take the numbers from the saved sets, never from memory.
- When you enter a workout on the user's behalf (for example one done without the phone), create a document in the same shape with `finished: true`.

## Rules

- The user's words come first. Write exercise names the way the user names them.
- With pain or injury advise carefully: a lighter variant or a substitute, and for pain that gets worse a pause and a physiotherapist or doctor. Do not diagnose.
- Do not change the page logic (anything outside `PLAN`, `PROFIL`, `SOON`, `TABS`) unless the user explicitly asks. If you do, check the syntax (`node --check` on the extracted script) and publish again.
- Add no external scripts or services. The page stays a single file.
