# My gym

[Polski](README.pl.md)

A simple workout app for your phone. It remembers your plan, times the rest between sets, logs your results and tells you when to add weight. One file. The app itself is mechanical; Claude does the thinking: it writes your plan into the file, reads your log and answers questions about weights.

It started as a private tool of one lifter who, after years with a coach, began training alone. He knew the technique. What he lacked was the plan at hand, a stopwatch and a log.

It runs in two places. As a private page on your Claude account: this is the version that exists and is in use. Or as a private ChatGPT Site with its own database and tools for ChatGPT: this version is prepared in the repository and waits for its first deployment (see [ChatGPT Sites version](#chatgpt-sites-version)).

## Who it is for

- For the Claude version: you have a Claude subscription (Pro or Max) and the Claude desktop app with the **Code** tab. Without it the app cannot save results or answer questions.
- For the ChatGPT Sites version: you have a paid ChatGPT plan with Sites and an agent that can deploy a Site (ChatGPT Work or Codex).
- You know the technique of your exercises. The app shows no videos or illustrations.
- You have a plan from a coach, or you can build one with Claude.

## How it works

**At home.** You dictate exercises, sets, weights and rest times to Claude. Claude writes them into the app and publishes your private page.

**At the gym.** You open the page on your phone. You see today's plan with weights filled in. You do a set, tap "Done", the phone counts down the rest. If you did something else, you correct the numbers. You mark whether it was easy, hard, or whether something hurt.

**After the workout.** The results are already saved. Next time, each exercise shows what you did last time, and the app suggests when to add weight. At home you can ask Claude to copy the workout into your journal in a folder, summarise the month, or change the plan.

**Inside the app** (Claude version) there is also an "Ask Claude" button: it proposes today's weights from your history and answers questions, for example what to replace an exercise with when it hurts. Each question uses the limit of your own Claude account.

## Install

1. **Download the repository.** On this page click the green "Code" button, then "Download ZIP", and unpack it into a folder of its own, for example `Documents/gym`.
2. **Open that folder in your agent:** the Claude desktop app (Code tab) for the Claude version, or ChatGPT Work or Codex for the ChatGPT Sites version.
3. **Write one sentence**, for example: "Set up this app for me." The agent reads the instructions in the folder, publishes your private page, gives you the link and asks for your plan.
4. **Open the link on your phone**, signed in to the same account. In Safari choose "Share", then "Add to Home Screen", to get an icon like a regular app.
5. **Dictate your plan:** exercises, sets, reps, weights, rest times, which exercises go in pairs. The agent writes it in and the page shows it.

The file ships with two example workouts (chest and biceps, legs) without weights. They show what the app looks like. Replace them with your own.

## ChatGPT Sites version

The folder `sites/` holds the same app for ChatGPT Sites: the page, a small backend with a database (Cloudflare Worker and D1) and tools that ChatGPT uses to read your log and to change your plan or the targets for next time. The workout itself happens on the page, without a chat. There is no "Ask ChatGPT" button inside the page: you ask in ChatGPT, which reaches your data through the tools.

Install it the same way: open the folder in ChatGPT Work or Codex and write one sentence. The agent deploys the Site, gives you the link, and offers the Site's plugin so that ChatGPT can read your log and change your plan. The notes for the agent, including what nobody has verified yet, are in [docs/chatgpt-sites.md](docs/chatgpt-sites.md). Status: prepared in the repository, local checks pass, waiting for its first deployment.

## Everyday use

- **Before the workout** open the page. The weights in the fields are suggestions from last time.
- **During the workout** tick off sets. Ticking a set starts the rest timer. At each exercise you can mark: easy, just right, hard, pain.
- **After the workout** tap "Finish workout". The Log tab shows all workouts and weight charts.
- **Every now and then** tell Claude on the computer: "copy the recent workouts into my journal" or "summarise the last month and suggest changes".
- **A new plan from your coach?** Dictate it to Claude. Old results stay in the log.

## Where your data lives

Results are saved in the database of your page, on your Claude account. Nobody else sees them. Claude reaches them only in a session on your account, when you ask. The author of the app runs no server and collects no data.

In the ChatGPT Sites version the results sit in your Site's database on OpenAI's platform. The platform makes no promise about where the data is kept, so do not put health details into the profile or the notes.

If you note pain or injuries, remember that Claude's suggestions do not replace a doctor or a physiotherapist. If pain gets worse, stop the exercise.

## What the app does not do

- It does not show exercise technique.
- It does not work without an account on the platform it runs on (Claude, or ChatGPT in the Sites version): saving results needs you to be signed in.
- The two versions do not share data. If you run both, you have two logs.
- There is no voice input during the workout. You type the numbers.
- It does not sync with watches or other apps.

## Updates

When a new version of the file appears, download it and tell Claude: "update my page with the new file, keep my plan and my results". The log stays in the database, so nothing is lost.

## Changing it

It is one HTML file. Everything about your plan is changed by Claude at your request. If you want to change more, say the length of rest times, the look, or the rule for adding weight, tell Claude as well. Its instructions are in `CLAUDE.md`; the rules shared by both versions and the description of the data are in `AGENTS.md`.

The interface is in Polish. An English interface is on the list.

## Author and licence

Marcin Sawicki, [rewolucjaai.com](https://rewolucjaai.com). MIT licence: you may use, change and share it.
