# Build Spec: Personal To-Do Desktop App (Windows, Offline)

Feed this whole file to your AI coding agent (Claude Code, Cursor, etc.) as the project brief. It's written as a set of instructions *to the agent*, not to you.

## 1. What we're building

A **general-purpose personal task manager** — not themed around any subject, job, or hobby. Think "clean, modern to-do app," not a mechanical-engineering job sheet, not a student planner. No drawing numbers, no engineering terminology, no niche visual metaphors. It should feel like something anyone would be comfortable using for any kind of task — errands, work, personal projects, whatever.

Three things make this more than a plain list:
1. A **calendar tab/view** where tasks appear on the days they're due.
2. **Native Windows desktop notifications** that fire on their own, even if the app window is closed (as long as the app is running in the background/tray).
3. **Fully local storage** — no account, no cloud sync, no internet dependency. Everything lives in a file on the user's own machine.

## 2. Non-negotiable constraints

- Must run as an installable **Windows desktop app** (a `.exe`), not a website, not something that needs a browser tab open.
- Must work **fully offline**.
- Data is stored **only on the local machine** — no external servers, no telemetry, no third-party sync.
- No engineering/CAD/technical-drawing theming anywhere in copy, labels, or visuals. Categories, icons, and language should be generic and adaptable to any use case.

## 3. Recommended tech stack

**Use Electron.** Reasoning: it's the most mature option for exactly this kind of project — native `Notification` API that produces real Windows toast notifications out of the box, a huge ecosystem of battle-tested packages, well-documented system tray support, and `electron-builder` gives a one-command path to a Windows installer. It's also the stack an AI coding agent is most likely to get right on the first few tries, since there's a decade of examples to draw from.

(If bundle size or RAM usage becomes a real concern later, Tauri is a lighter-weight alternative — smaller installers, lower idle memory — but it needs some Rust for custom native behavior and has a smaller plugin ecosystem. Not recommended as the starting point here; only mention it as a possible future rewrite.)

Suggested packages:
- **Storage:** `better-sqlite3` (preferred, handles relational data like subtasks cleanly) or a simple JSON file via `electron-store` if the agent wants to keep it lighter. Either is fine — pick one and be consistent.
- **Notifications:** Electron's built-in `Notification` module (no extra package needed for Windows toast notifications).
- **Scheduling:** a simple `setInterval` in the main process checking every 30–60 seconds for tasks that just became due, or crossed a reminder threshold. No need for a heavy cron library at this scale.
- **Tray/background running:** Electron's `Tray` API — closing the window should minimize to tray instead of quitting, so reminders can still fire.
- **Packaging:** `electron-builder`, targeting an NSIS Windows installer.
- **Auto-launch at login (optional, user-toggleable in Settings):** `auto-launch` npm package, or Electron's built-in `app.setLoginItemSettings`.

## 4. Reference prototype (optional starting point)

There's an existing single-file HTML/CSS/JS prototype (a browser-based to-do list) with decent working logic for: filtering by due-date urgency (overdue/today/this week), sorting, category color-coding, inline editing, and completion animations. The agent can reuse that *logic* as a starting point for the renderer if it's provided, but must:
- Strip all "job sheet" / drawing-number / "mech eng edition" theming and copy.
- Replace the hardcoded categories (Assignment, Lab, Exam, Project) with a small generic default set — e.g. **Work, Personal, Errands, Health, Other** — and make categories **user-editable** (add/rename/recolor/delete), not fixed.
- Rebuild it inside an actual Electron app rather than a browser artifact using `window.storage` (that API doesn't exist outside Claude's artifact environment — real local storage needs to be implemented per Section 3).

If no prototype file is provided to the agent, ignore this section and build from scratch using the feature list below.

## 5. Feature list

### Task fields
- Title (required)
- Notes/description (optional, free text)
- Due date (optional)
- Due time (optional — a task can have a date with no specific time)
- Priority: Low / Medium / High
- Category/tag: user-defined, color-coded, multiple selectable defaults but fully editable
- Subtasks/checklist (optional list of smaller steps within a task, each with its own checkbox)
- Recurrence: None / Daily / Weekly / Monthly / Custom (e.g. "every 2 weeks", "every weekday") — on completion, a recurring task regenerates its next occurrence automatically
- Reminder lead time: e.g. "at due time," "15 min before," "1 hour before," "1 day before," or custom, and a task can have more than one reminder

### Task actions
- Add, edit, delete
- Mark complete/incomplete with an undo option (don't make delete/complete feel destructive or hard to reverse)
- Manual drag-to-reorder within a list
- Bulk actions optional (select multiple → delete/complete) — nice to have, not required for v1

### Views / navigation
- **Today** — everything due today plus overdue items
- **Upcoming** — everything with a future due date, grouped by day
- **All tasks**
- **Completed/Archive** — hidden from main views by default, viewable on demand, permanently deletable
- **Calendar tab** — month grid (and ideally a week view toggle) showing tasks on the days they're due; clicking a day shows/adds tasks for that date
- Filter by category and priority
- Search across all tasks (title + notes)

### Notifications (native Windows)
- Fire a real Windows toast notification when a task's reminder time is reached, using its configured lead time
- Clicking a notification should bring the app window to focus (ideally scrolled/highlighted to that task)
- Avoid duplicate notifications — once a specific reminder has fired, mark it as sent in storage so it doesn't repeat if the app restarts
- Handle the case where the app was closed when a reminder time passed: on next launch, check for anything missed and notify (or silently mark as passed — agent's judgement, but don't let old reminders silently vanish without at least being visible as "overdue" in the UI)
- Optional nice-to-have: a daily digest notification each morning summarizing what's due today + overdue count

### Background/tray behavior
- Closing the window (the X button) minimizes to the system tray rather than quitting the app, so reminders keep working
- Tray icon menu: Open, Quick-add task, Quit
- A genuine "Quit" option must fully exit the app (don't trap users with no way out)
- Settings toggle: "Launch at Windows startup" and "Start minimized to tray"

### Data & settings
- All data in a single local file in the app's user-data directory (e.g. `%APPDATA%/<appname>/`)
- **Export/backup** to a JSON file the user can save anywhere
- **Import/restore** from that JSON file
- Settings panel: default reminder lead time, theme (light/dark/follow system), startup behavior toggles above

### UX/visual polish
- Clean, modern, neutral design — should NOT look like a generic unstyled template. Deliberate typography, spacing, and a coherent accent color.
- Light and dark themes, ideally following the OS setting by default with a manual override
- Empty states with a friendly message rather than a blank screen
- Keyboard shortcuts: e.g. `N` for new task, `/` to focus search, `Enter` to submit a quick-add
- Smooth but subtle transitions (task completion, adding/removing) — nothing gimmicky
- Fully usable at different window sizes

## 6. Suggested data model (per task)

```
id, title, notes, category, priority (low/med/high),
dueDate, dueTime, recurrence { type, interval, endDate },
subtasks: [{ id, text, done }],
reminders: [{ leadMinutes, sent: bool }],
done, completedAt, createdAt, order
```

## 7. Suggested project structure

```
/main.js            → Electron main process: window, tray, notification scheduler
/preload.js          → safe bridge between main and renderer (contextIsolation on)
/storage.js          → all read/write logic for the local data file
/notifications.js    → checks due reminders on an interval, fires Notification
/renderer/
  index.html
  styles.css
  app.js             → task list logic, add/edit/delete/filter/search
  calendar.js         → calendar tab rendering
  settings.js
/package.json
```

## 8. Build order (milestones for the agent)

1. Scaffold the Electron app (main + renderer, basic window, dev tooling).
2. Build the storage layer (create/read/update/delete tasks, persisted to disk) and confirm data survives an app restart.
3. Build the core task list UI: add, edit, delete, complete/undo, priorities, user-editable categories.
4. Add subtasks and recurring-task logic.
5. Add filtering, search, and the Today/Upcoming/All/Completed views.
6. Build the Calendar tab (month grid, tasks per day, add/view tasks from a clicked date).
7. Build the notification scheduler + system tray + minimize-to-tray behavior + startup settings.
8. Build the Settings panel + JSON export/import.
9. Visual polish pass: light/dark theme, empty states, keyboard shortcuts, responsive layout.
10. Package with `electron-builder` into a Windows installer; test the full flow including notifications firing while the window is closed/minimized to tray.

## 9. Testing checklist before calling it done

- [ ] Add, edit, delete, complete/undo a task — data persists after fully closing and reopening the app
- [ ] A recurring task regenerates correctly after being completed
- [ ] A notification fires at the correct time for a task due in ~2 minutes (use a short test case, don't wait a full day)
- [ ] Closing the window doesn't kill the app — it's still in the tray and still checking reminders
- [ ] Quitting from the tray menu fully exits the process
- [ ] Calendar tab correctly shows tasks on their due dates and lets you add a task from a clicked day
- [ ] Export produces a valid JSON file; import restores it correctly on a clean install
- [ ] Dark/light theme both look intentional, not just inverted colors
- [ ] App works with zero internet connection at every step
