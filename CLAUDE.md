# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step — open `index.html` directly in a browser:

```powershell
Start-Process index.html
```

There are no tests, no package manager, and no dev server. All changes are visible immediately on page reload.

## Architecture

Three files, no framework, no bundler:

- **`js/database.js`** — pure data, loaded first. Defines the global `DB` object with care data for 7 plant types (13 varieties). Each variety has `waterIntervalDays`, `stageDays[]`, `stageAdvice[]`, `stages[]`, and display metadata. Three helpers are attached directly to `DB`: `getVariety(typeKey, varietyKey)`, `getVarietyList(typeKey)`, `getAllTypes()`.

- **`js/app.js`** — all logic and rendering, loaded after `database.js`. Single `State` object is the source of truth. No virtual DOM — every render function writes directly to `innerHTML`. Page navigation works by toggling `.hidden` on page `<div>`s (see `PAGE_MAP`). `localStorage` keys: `rassada_v3` (plants), `rassada_reminders` (user reminders).

- **`css/style.css`** — desktop-first layout. Key design tokens in `:root`. The layout is `sidebar (188px fixed) + app-content (flex column)`. The overview page layers: sky scene → glass panels → soil cross-section → stats bar.

## Key data shapes

Plant object stored in `localStorage`:
```js
{ id, typeKey, varietyKey, plantedAt, lastWatered, stage? }
```
`stage` is optional — if absent, it's computed from `daysSince(plantedAt)` against `v.stageDays[]`. If present, it was manually advanced by the user.

## SVG plant rendering

`buildPotSVG(plant, size)` uses `viewBox="-8 -50 116 200"` — the extra headroom above the pot origin (`y=0`) is intentional to prevent clipping of stage-2 and stage-3 leaves. The plant group is translated to `(50, 43)` inside the SVG coordinate system. Do not shrink this viewBox.

## Adding a new plant type

1. Add an entry to `DB` in `database.js` following the existing structure (all fields required: `name`, `emoji`, `accentColor`, `varieties{}` with at least one variety containing all variety fields).
2. No changes needed in `app.js` or `index.html` — `DB.getAllTypes()` drives the modal and glossary dynamically.

## Notification system

Notifications are generated at render time from plant water status — there is no separate notification state. `generateRemindersFromPlants()` returns auto-entries; `allReminders()` merges them with user-added reminders from `State.reminders`. The badge count reflects urgency-flagged entries only.
