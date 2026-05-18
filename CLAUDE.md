# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the app

No build step — open `app.html` (app) or `index.html` (marketing page) directly in a browser:

```powershell
Start-Process app.html
```

There are no tests, no package manager, and no dev server. All changes are visible immediately on page reload.

## Pages

- **`app.html`** — the actual app (plant tracker). Light windowsill aesthetic with semi-transparent glass panels.
- **`index.html`** — marketing landing page in **light** aesthetic. Self-contained: all CSS inline in `<style>`, no external JS. Nav anchors (`#how`, `#benefits`, `#ai`, `#voices`, `#pricing`) use `scroll-behavior: smooth` with `scroll-margin-top: 90px` to clear the sticky header. CTAs route as follows: "Начать бесплатно" → `app.html`; "Войти" and all `.plan-cta` buttons → `in-development.html`. All other interactive elements (brand link, footer links, price-toggle, "Подписаться", testimonials) are non-clickable via an injected CSS block before `</style>` — do not remove that block.
- **`in-development.html`** — stub page used for unimplemented features. Same light palette as landing.

## Architecture

Three files, no framework, no bundler:

- **`js/database.js`** — pure data, loaded first. Defines the global `DB` object with care data for **15 plant types** (48+ varieties). Each variety has `waterIntervalDays` (supports fractional values, e.g. `1.5` = 36 h), `stageDays[]`, `stageAdvice[]`, `stages[]`, and display metadata. Three helpers are attached directly to `DB`: `getVariety(typeKey, varietyKey)`, `getVarietyList(typeKey)`, `getAllTypes()`.

- **`js/app.js`** — all logic and rendering, loaded after `database.js`. Single `State` object is the source of truth. No virtual DOM — every render function writes directly to `innerHTML`. Page navigation works by toggling `.hidden` on page `<div>`s (see `PAGE_MAP`). `PAGE_TITLES` maps page keys to Russian labels shown in the app header. `localStorage` keys: `rassada_v3` (plants), `rassada_reminders` (user reminders).

- **`css/style.css`** — desktop-first layout. Key design tokens in `:root`. The layout is `sidebar (212px fixed) + app-content (flex column)`. The overview page layers: sky scene → glass panels → windowsill (plants-section) → stats bar. Weather data is fetched live from Open-Meteo API on load and refreshed periodically.

## Key data shapes

Plant object stored in `localStorage`:
```js
{ id, typeKey, varietyKey, plantedAt, lastWatered, stage?, waterHistory? }
```
`stage` is optional — if absent, it's computed from `daysSince(plantedAt)` against `v.stageDays[]`. If present, it was manually advanced by the user.

`waterHistory` is optional — array of ISO date strings, newest first, capped at 20 entries. Written by `waterPlant()` each time the user waters a plant.

## Watering intervals

`waterIntervalDays` supports fractional values — the code multiplies by 24 everywhere to get hours:
- `1` = 24 h (daily) — огурцы, капуста, базилик, редис, салат, укроп
- `1.25` = 30 h — базилик лимонный
- `1.5` = 36 h — кабачки (all), морковь амстердамская
- `2` = 48 h — томаты, большинство перцев, баклажаны, морковь, свёкла, лук-батун, петрушка, клубника
- `2.25` = 54 h — баклажан белый
- `2.5` = 60 h — халапеньо, огонёк, лук красный

The warn threshold fires at 72 % of the interval. `nextWaterLabel()` shows hours for < 24 h, "Завтра" for ~24 h, and "Через N д M ч" for fractional multi-day intervals.

## SVG plant rendering

`buildPotSVG(plant, size)` uses `viewBox="-8 -50 116 200"` — the extra headroom above the pot origin (`y=0`) is intentional to prevent clipping of stage-2 and stage-3 leaves. The plant group is translated to `(50, 43)` inside the SVG coordinate system. Do not shrink this viewBox.

Current call site in `renderPlantsSection`: `buildPotSVG(plant, 104)` — width 104 px, height ≈ 179 px (`size × 200/116`).

## Adding a new plant type

1. Add an entry to `DB` in `database.js` following the existing structure (all fields required: `name`, `emoji`, `accentColor`, `varieties{}` with at least one variety containing all variety fields).
2. Add the new `typeKey` to the `FRUITS` map in `app.js` (maps typeKey → emoji string used in SVG stage-3 rendering).
3. No other changes needed — `DB.getAllTypes()` drives the modal and glossary dynamically. The stats bar also reads `DB.getAllTypes().length` for the "из N" counter.

## Overview page layout constraints

The sky scene (`.sky-bg`) fills remaining vertical space via `flex: 1`. The three glass panels (`.overview-panels`) are absolutely positioned inside it with a fixed grid: `250px 240px 210px`. The middle column (daylight arc) is intentionally fixed-width to prevent it from stretching.

**Plant cards (`.plant-card`)** are a unified element inside each `.plant-slot` — they contain both the info header (name, variety, stage, water bar, next-watering label) and the pot SVG below it. There is no separate `.plant-display` or side water bar. `.plants-section` (height 360 px) uses `overflow: visible` so that the card's hover animation (`translateY(-8px)`) is never clipped. Do not change this back to `overflow: hidden`.

The stats bar icons (`.stat-icon`) use SVG inside a colored `34×34 px` rounded box: green for progress/collection, blue for next watering.

The sky scene is hardcoded as **nighttime** (Moscow, ~01:00 MSK): dark gradient with star dots baked into `background-image`, `.moon-anim` CSS crescent, dark clouds. If updating to daytime, swap `.moon-anim` back to `.sun-anim` in HTML and CSS, restore the day gradient, and restore white cloud color.

## Notification system

Notifications are generated at render time from plant water status — there is no separate notification state. `generateRemindersFromPlants()` returns auto-entries; `allReminders()` merges them with user-added reminders from `State.reminders`. The badge count reflects urgency-flagged entries only.
