# My gym

[Polski](README.pl.md)

A simple workout app for your phone. It remembers your plan, times the rest between sets, logs your results and tells you when to add weight. One file. The app itself is mechanical; Claude does the thinking: it writes your plan into the file, reads your log and answers questions about weights.

It started as a private tool of one lifter who, after years with a coach, began training alone. He knew the technique. What he lacked was the plan at hand, a stopwatch and a log.

## Who it is for

- You have a Claude subscription (Pro or Max) and the Claude desktop app with the **Code** tab. Without it the app cannot save results or answer questions.
- You know the technique of your exercises. The app shows no videos or illustrations.
- You have a plan from a coach, or you can build one with Claude.

## How it works

**At home.** You dictate exercises, sets, weights and rest times to Claude. Claude writes them into the app and publishes your private page.

**At the gym.** You open the page on your phone. You see today's plan with weights filled in. You do a set, tap "Done", the phone counts down the rest. If you did something else, you correct the numbers. You mark whether it was easy, hard, or whether something hurt.

**After the workout.** The results are already saved. Next time, each exercise shows what you did last time, and the app suggests when to add weight. At home you can ask Claude to copy the workout into your journal in a folder, summarise the month, or change the plan.

**Inside the app** there is also an "Ask Claude" button: it proposes today's weights from your history and answers questions, for example what to replace an exercise with when it hurts. Each question uses the limit of your own Claude account.

## Install in five steps

1. **Download the file `my-gym.html`.** On this page click the green "Code" button, then "Download ZIP", and unpack it. Keep the file in a folder of its own, for example `Documents/gym`.
2. **Open the Claude desktop app**, go to the Code tab and choose that folder as the project.
3. **Paste this to Claude:**

   > Publish the file my-gym.html as my private page, with a database and with the ability to ask Claude. Then ask me about my workout plan and write it into the file.

4. **Claude returns a link to your page.** Open it on your phone, signed in to the same Claude account. In Safari choose "Share", then "Add to Home Screen", to get an icon like a regular app.
5. **Dictate your plan to Claude:** exercises, sets, reps, weights, rest times, which exercises go in pairs. Claude writes the plan in and publishes the page again at the same address.

The file ships with two example workouts (chest and biceps, legs) without weights. They show what the app looks like. Replace them with your own.

## Everyday use

- **Before the workout** open the page. The weights in the fields are suggestions from last time.
- **During the workout** tick off sets. Ticking a set starts the rest timer. At each exercise you can mark: easy, just right, hard, pain.
- **After the workout** tap "Finish workout". The Log tab shows all workouts and weight charts.
- **Every now and then** tell Claude on the computer: "copy the recent workouts into my journal" or "summarise the last month and suggest changes".
- **A new plan from your coach?** Dictate it to Claude. Old results stay in the log.

## Where your data lives

Results are saved in the database of your page, on your Claude account. Nobody else sees them. Claude reaches them only in a session on your account, when you ask. The author of the app runs no server and collects no data.

If you note pain or injuries, remember that Claude's suggestions do not replace a doctor or a physiotherapist. If pain gets worse, stop the exercise.

## What the app does not do

- It does not show exercise technique.
- It does not work without a Claude account: saving results and asking questions need you to be signed in.
- There is no voice input during the workout. You type the numbers.
- It does not sync with watches or other apps.

## Updates

When a new version of the file appears, download it and tell Claude: "update my page with the new file, keep my plan and my results". The log stays in the database, so nothing is lost.

## Changing it

It is one HTML file. Everything about your plan is changed by Claude at your request. If you want to change more, say the length of rest times, the look, or the rule for adding weight, tell Claude as well. Its instructions are in `CLAUDE.md`.

The interface is in Polish. An English interface is on the list.

## Author and licence

Marcin Sawicki, [rewolucjaai.com](https://rewolucjaai.com). MIT licence: you may use, change and share it.
