'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   APP.JS v3 — Seedling Tracker
   State → Render → Events
════════════════════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────────────────
const State = {
  plants: [],
  view: 'main',         // 'main' | 'detail'
  selectedId: null,
  currentPage: 'overview',
  glossaryFilter: 'all',
  modal: { open: false, step: 1, typeKey: null, varietyKey: null },
  notifOpen: false,
  reminders: [],        // { id, text, time, done }
};

function loadState() {
  try {
    const saved = localStorage.getItem('rassada_v3');
    if (saved) State.plants = JSON.parse(saved);
  } catch (_) { State.plants = []; }
  try {
    const r = localStorage.getItem('rassada_reminders');
    if (r) State.reminders = JSON.parse(r);
  } catch (_) { State.reminders = []; }
}

function saveState() {
  localStorage.setItem('rassada_v3', JSON.stringify(State.plants));
}

function saveReminders() {
  localStorage.setItem('rassada_reminders', JSON.stringify(State.reminders));
}

// ── Time helpers ─────────────────────────────────────────────────────────────
function daysSince(isoDate) {
  return Math.max(0, Math.floor((Date.now() - new Date(isoDate).getTime()) / 86_400_000));
}

function hoursSince(isoDate) {
  if (!isoDate) return Infinity;
  return (Date.now() - new Date(isoDate).getTime()) / 3_600_000;
}

function hoursUntilWater(plant) {
  const v = DB.getVariety(plant.typeKey, plant.varietyKey);
  if (!plant.lastWatered) return 0;
  const nextMs = new Date(plant.lastWatered).getTime() + v.waterIntervalDays * 86_400_000;
  return Math.max(0, Math.round((nextMs - Date.now()) / 3_600_000));
}

function waterStatus(plant) {
  const v = DB.getVariety(plant.typeKey, plant.varietyKey);
  if (!plant.lastWatered) return 'bad';
  const h = hoursSince(plant.lastWatered);
  const total = v.waterIntervalDays * 24;
  if (h >= total) return 'bad';
  if (h >= total * 0.72) return 'warn';
  return 'ok';
}

function waterPercent(plant) {
  const v = DB.getVariety(plant.typeKey, plant.varietyKey);
  if (!plant.lastWatered) return 0;
  const h = hoursSince(plant.lastWatered);
  const total = v.waterIntervalDays * 24;
  return Math.round(Math.max(0, Math.min(100, (1 - h / total) * 100)));
}

function currentStage(plant) {
  if (plant.stage !== undefined) {
    const v = DB.getVariety(plant.typeKey, plant.varietyKey);
    return Math.min(plant.stage, v.stages.length - 1);
  }
  const v = DB.getVariety(plant.typeKey, plant.varietyKey);
  const d = daysSince(plant.plantedAt);
  let s = 0;
  for (let i = 0; i < v.stageDays.length; i++) {
    if (d >= v.stageDays[i]) s = i;
  }
  return Math.min(s, v.stages.length - 1);
}

function daysToFinalStage(plant) {
  const v = DB.getVariety(plant.typeKey, plant.varietyKey);
  if (currentStage(plant) >= v.stages.length - 1) return 0;
  const lastDay = v.stageDays[v.stageDays.length - 1];
  return Math.max(0, lastDay - daysSince(plant.plantedAt));
}

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function timeAgo(iso) {
  if (!iso) return 'ещё не поливали';
  const h = Math.round(hoursSince(iso));
  if (h < 1)  return 'только что';
  if (h < 24) return `${h} ч назад`;
  const d = Math.floor(h / 24);
  return `${d} дн назад`;
}

function nextWaterLabel(plant) {
  const ws = waterStatus(plant);
  if (ws === 'bad') return 'Сейчас!';
  const h = hoursUntilWater(plant);
  if (h < 1)  return 'Меньше часа';
  if (h < 24) return `Через ${h} ч`;
  const d = Math.floor(h / 24);
  const rem = Math.round(h % 24);
  if (d === 1 && rem < 2) return 'Завтра';
  if (rem >= 2) return `Через ${d} д ${rem} ч`;
  return `Через ${d} дн`;
}

// ── SVG Pot & Plant ───────────────────────────────────────────────────────────
const POT_COLORS = [
  { body: '#C87848', hi: '#E09868', lo: '#944E1A', rim: '#D88858' },
  { body: '#BC6438', hi: '#DC8458', lo: '#8C4218', rim: '#CC7448' },
  { body: '#D08448', hi: '#F0AC6A', lo: '#A06020', rim: '#E09458' },
  { body: '#AC6238', hi: '#CC8258', lo: '#7E3E18', rim: '#BC7248' },
];
const SOIL_COLOR = '#3A1C08';

/* Type-specific fruit/vegetable drawn on stage-3 branches */
function stage3Fruits(typeKey) {
  // Fruit placement: two main positions on lower branches
  const L = [-22, -26]; // left branch area
  const R = [20, -28];  // right branch area

  const fr = {
    tomato: (x, y) =>
      `<circle cx="${x}" cy="${y}" r="7" fill="#E53935"/>
       <path d="M${x-3},${y-6} Q${x},${y-10} ${x+3},${y-6} Q${x},${y-8} ${x-3},${y-6}Z" fill="#4CAF50"/>
       <ellipse cx="${x-2}" cy="${y-1}" rx="2" ry="1.5" fill="rgba(255,255,255,0.18)"/>`,

    pepper: (x, y) =>
      `<path d="M${x},${y-8} C${x-5},${y-4} ${x-6},${y+6} ${x},${y+9} C${x+6},${y+6} ${x+5},${y-4} ${x},${y-8}Z" fill="#E64A19"/>
       <line x1="${x}" y1="${y-8}" x2="${x}" y2="${y-12}" stroke="#388E3C" stroke-width="1.5" stroke-linecap="round"/>`,

    cucumber: (x, y) =>
      `<ellipse cx="${x}" cy="${y+3}" rx="4.5" ry="9" fill="#43A047"/>
       <ellipse cx="${x-1}" cy="${y-2}" rx="1.5" ry="3.5" fill="#81C784" opacity="0.5"/>
       <circle cx="${x}" cy="${y+10}" r="2.2" fill="#FDD835"/>`,

    eggplant: (x, y) =>
      `<ellipse cx="${x}" cy="${y+4}" rx="6" ry="9" fill="#6A1B9A"/>
       <path d="M${x-3},${y-4} Q${x},${y-8} ${x+3},${y-4} Q${x},${y-6} ${x-3},${y-4}Z" fill="#4CAF50"/>
       <ellipse cx="${x-2}" cy="${y}" rx="1.8" ry="3" fill="rgba(255,255,255,0.12)"/>`,

    cabbage: (x, y) =>
      `<circle cx="${x}" cy="${y}" r="10" fill="#2E7D32"/>
       <circle cx="${x}" cy="${y}" r="7" fill="#43A047"/>
       <circle cx="${x}" cy="${y}" r="4" fill="#81C784"/>
       <ellipse cx="${x-2}" cy="${y-2}" rx="2.5" ry="2" fill="rgba(255,255,255,0.18)"/>`,

    basil: (x, y) =>
      `<ellipse cx="${x}" cy="${y-2}" rx="5.5" ry="8" fill="#338A3E"/>
       <circle cx="${x}" cy="${y-10}" r="3.5" fill="#FFFFFF" opacity="0.92"/>
       <circle cx="${x}" cy="${y-10}" r="1.8" fill="#F0F0F0"/>`,

    zucchini: (x, y) =>
      `<ellipse cx="${x+2}" cy="${y+3}" rx="4" ry="9" fill="#558B2F" transform="rotate(12 ${x+2} ${y+3})"/>
       <ellipse cx="${x+2}" cy="${y+3}" rx="1.5" ry="7" fill="#7CB342" opacity="0.5" transform="rotate(12 ${x+2} ${y+3})"/>
       <circle cx="${x-4}" cy="${y-5}" r="2.8" fill="#F9A825"/>`,

    carrot: (x, y) =>
      `<line x1="${x-4}" y1="${y-4}" x2="${x-6}" y2="${y-14}" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/>
       <line x1="${x}" y1="${y-4}" x2="${x}" y2="${y-15}" stroke="#43A047" stroke-width="2.2" stroke-linecap="round"/>
       <line x1="${x+4}" y1="${y-4}" x2="${x+6}" y2="${y-14}" stroke="#388E3C" stroke-width="2" stroke-linecap="round"/>`,

    beet: (x, y) =>
      `<ellipse cx="${x}" cy="${y+3}" rx="7.5" ry="7" fill="#880E4F"/>
       <ellipse cx="${x-2}" cy="${y}" rx="2.5" ry="2" fill="rgba(255,255,255,0.12)"/>
       <line x1="${x}" y1="${y-4}" x2="${x-3}" y2="${y-12}" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/>
       <line x1="${x}" y1="${y-4}" x2="${x+3}" y2="${y-12}" stroke="#43A047" stroke-width="2" stroke-linecap="round"/>`,

    onion: (x, y) =>
      `<ellipse cx="${x}" cy="${y+5}" rx="7" ry="6" fill="#F57F17"/>
       <path d="M${x-7},${y+5} Q${x-4},${y-1} ${x},${y-1} Q${x+4},${y-1} ${x+7},${y+5}" fill="#FDD835"/>
       <line x1="${x-2}" y1="${y-1}" x2="${x-4}" y2="${y-11}" stroke="#4CAF50" stroke-width="2" stroke-linecap="round"/>
       <line x1="${x+2}" y1="${y-1}" x2="${x+4}" y2="${y-11}" stroke="#43A047" stroke-width="2" stroke-linecap="round"/>`,

    radish: (x, y) =>
      `<circle cx="${x}" cy="${y+2}" r="7.5" fill="#E53935"/>
       <path d="M${x-7},${y+5} Q${x-3},${y+10} ${x},${y+10} Q${x+3},${y+10} ${x+7},${y+5}Z" fill="#FAFAFA"/>
       <line x1="${x}" y1="${y+10}" x2="${x}" y2="${y+13}" stroke="#E53935" stroke-width="1.5" stroke-linecap="round"/>
       <ellipse cx="${x-2}" cy="${y-1}" rx="2" ry="1.5" fill="rgba(255,255,255,0.20)"/>`,

    lettuce: (x, y) =>
      `<circle cx="${x}" cy="${y}" r="11" fill="#AED581"/>
       <circle cx="${x}" cy="${y}" r="7.5" fill="#C5E1A5"/>
       <path d="M${x-11},${y+2} C${x-7},${y-5} ${x-3},${y-6} ${x},${y+2} C${x+3},${y-6} ${x+7},${y-5} ${x+11},${y+2}" stroke="#66BB6A" stroke-width="1.5" fill="none" stroke-linecap="round"/>`,

    dill: (x, y) =>
      `<circle cx="${x}" cy="${y}" r="7.5" fill="#FDD835"/>
       <circle cx="${x-5}" cy="${y+6}" r="4" fill="#81C784"/>
       <circle cx="${x+5}" cy="${y+6}" r="4" fill="#81C784"/>
       <circle cx="${x}" cy="${y+9}" r="3.5" fill="#A5D6A7"/>`,

    parsley: (x, y) =>
      `<ellipse cx="${x}" cy="${y}" rx="8" ry="10" fill="#2E7D32"/>
       <ellipse cx="${x-6}" cy="${y+5}" rx="5.5" ry="7" fill="#388E3C" transform="rotate(-20 ${x-6} ${y+5})"/>
       <ellipse cx="${x+6}" cy="${y+5}" rx="5.5" ry="7" fill="#388E3C" transform="rotate(20 ${x+6} ${y+5})"/>
       <ellipse cx="${x-1}" cy="${y-4}" rx="2.5" ry="3" fill="#4CAF50" opacity="0.5"/>`,

    strawberry: (x, y) =>
      `<path d="M${x},${y+9} C${x-5},${y+5} ${x-6},${y-3} ${x-2},${y-5} C${x},${y-6} ${x+2},${y-5} ${x+6},${y-3} C${x+9},${y} ${x+5},${y+5} ${x},${y+9}Z" fill="#E53935"/>
       <ellipse cx="${x-2}" cy="${y}" rx="2.5" ry="3.5" fill="rgba(255,255,255,0.18)"/>
       <circle cx="${x-2}" cy="${y+5}" r="1" fill="#FDD835"/>
       <circle cx="${x+2}" cy="${y+5}" r="1" fill="#FDD835"/>
       <circle cx="${x}" cy="${y+2}" r="1" fill="#FDD835"/>
       <path d="M${x-3},${y-5} Q${x},${y-9} ${x+3},${y-5} Q${x},${y-7} ${x-3},${y-5}Z" fill="#4CAF50"/>`,
  };

  const draw = fr[typeKey];
  if (!draw) return '';
  return draw(L[0], L[1]) + draw(R[0], R[1]);
}

/* Fixed: viewBox expanded so leaves are never clipped on any side */
function buildPotSVG(plant, size = 92) {
  const v     = DB.getVariety(plant.typeKey, plant.varietyKey);
  const c     = POT_COLORS[v.potColor % POT_COLORS.length];
  const stage = currentStage(plant);
  const uid   = `pt${plant.id}`;

  // viewBox: left-8 top-50 width116 height208 — 50px headroom for tall stage-3 plants,
  // 8px extra at bottom so the pot shadow ellipse (cy=147 ry=5.5 → y=152.5) is never clipped
  const vb = '-8 -50 116 208';
  const w  = size;
  const h  = Math.round(size * (208 / 116));

  return `<svg viewBox="${vb}" width="${w}" height="${h}"
    xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="pb-${uid}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%"   stop-color="${c.lo}"/>
      <stop offset="22%"  stop-color="${c.body}"/>
      <stop offset="62%"  stop-color="${c.body}"/>
      <stop offset="84%"  stop-color="${c.hi}"/>
      <stop offset="100%" stop-color="${c.body}"/>
    </linearGradient>
    <radialGradient id="sg-${uid}" cx="40%" cy="35%" r="65%">
      <stop offset="0%"   stop-color="#6B4022"/>
      <stop offset="55%"  stop-color="${SOIL_COLOR}"/>
      <stop offset="100%" stop-color="#1A0A04"/>
    </radialGradient>
    <filter id="gl-${uid}">
      <feGaussianBlur stdDeviation="2.5" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>

  <!-- Plant (origin = soil surface at y=43) -->
  <g transform="translate(50,43)">${plantSVG(stage, plant.typeKey)}</g>

  <!-- Drop shadow -->
  <ellipse cx="50" cy="147" rx="42" ry="5.5" fill="rgba(0,0,0,0.25)"/>

  <!-- Pot body -->
  <path d="M18,52 L12,138 Q12,147 50,147 Q88,147 88,138 L82,52Z"
        fill="url(#pb-${uid})"/>

  <!-- Left shadow strip -->
  <path d="M18,52 L12,138 Q14,145 27,146 L26,54Z"
        fill="rgba(0,0,0,0.15)"/>
  <!-- Right highlight strip -->
  <path d="M82,52 L88,138 Q86,145 73,146 L74,54Z"
        fill="rgba(255,255,255,0.10)"/>

  <!-- Groove -->
  <path d="M21,95 Q50,101 79,95"
        stroke="rgba(0,0,0,0.10)" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- Rim -->
  <ellipse cx="50" cy="50" rx="38" ry="10"   fill="${c.rim}"/>
  <ellipse cx="50" cy="46" rx="36" ry="9"    fill="${c.hi}"/>
  <ellipse cx="50" cy="46" rx="32" ry="7.5"  fill="#281006"/>

  <!-- Soil -->
  <ellipse cx="50" cy="44" rx="31" ry="7"    fill="url(#sg-${uid})"/>
  <ellipse cx="42" cy="42" rx="7"  ry="2"    fill="rgba(255,255,255,0.04)"/>
  <ellipse cx="59" cy="44" rx="5"  ry="1.5"  fill="rgba(255,255,255,0.03)"/>
</svg>`;
}

function buildRootSVG(w = 86) {
  const h = 54;
  return `<svg class="root-svg" width="${w}" height="${h}"
    viewBox="0 0 86 54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <line x1="43" y1="0"  x2="43" y2="38" stroke="#7A4820" stroke-width="2.8" stroke-linecap="round" opacity="0.80"/>
    <line x1="43" y1="11" x2="21" y2="30" stroke="#6B3E18" stroke-width="1.9" stroke-linecap="round" opacity="0.70"/>
    <line x1="43" y1="11" x2="65" y2="30" stroke="#6B3E18" stroke-width="1.9" stroke-linecap="round" opacity="0.70"/>
    <line x1="43" y1="23" x2="11" y2="46" stroke="#5C3414" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>
    <line x1="43" y1="23" x2="75" y2="46" stroke="#5C3414" stroke-width="1.4" stroke-linecap="round" opacity="0.55"/>
    <line x1="21" y1="30" x2="7"  y2="42" stroke="#4E2C10" stroke-width="1.0" stroke-linecap="round" opacity="0.42"/>
    <line x1="21" y1="30" x2="29" y2="44" stroke="#4E2C10" stroke-width="1.0" stroke-linecap="round" opacity="0.42"/>
    <line x1="65" y1="30" x2="57" y2="44" stroke="#4E2C10" stroke-width="1.0" stroke-linecap="round" opacity="0.42"/>
    <line x1="65" y1="30" x2="79" y2="42" stroke="#4E2C10" stroke-width="1.0" stroke-linecap="round" opacity="0.42"/>
    <line x1="43" y1="38" x2="43" y2="52" stroke="#3E2208" stroke-width="0.9" stroke-linecap="round" opacity="0.30"/>
  </svg>`;
}

function plantSVG(stage, typeKey) {
  if (stage === 0) return '';

  if (stage === 1) return `
    <line x1="0" y1="0" x2="0" y2="-26"
          stroke="#44A046" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M0,-20 C-3,-28 -18,-29 -16,-19 C-14,-10 -3,-18 0,-20Z"
          fill="#6EC870"/>
    <path d="M0,-20 C3,-28  18,-29  16,-19 C 14,-10  3,-18  0,-20Z"
          fill="#5AB85C"/>
    <circle cx="0" cy="-29" r="3.5" fill="#88D878"/>`;

  if (stage === 2) return `
    <line x1="0" y1="0" x2="0" y2="-50"
          stroke="#2E8232" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="0" y1="-16" x2="-20" y2="-27" stroke="#3A9040" stroke-width="2" stroke-linecap="round"/>
    <path d="M-20,-27 C-27,-37 -44,-32 -40,-22 C-36,-13 -22,-24 -20,-27Z"
          fill="#52B050"/>
    <line x1="0" y1="-16" x2="20" y2="-27" stroke="#3A9040" stroke-width="2" stroke-linecap="round"/>
    <path d="M20,-27 C27,-37 44,-32 40,-22 C36,-13 22,-24 20,-27Z"
          fill="#48A848"/>
    <line x1="0" y1="-35" x2="-16" y2="-45" stroke="#3A9040" stroke-width="2" stroke-linecap="round"/>
    <path d="M-16,-45 C-22,-55 -36,-51 -33,-41 C-30,-33 -18,-43 -16,-45Z"
          fill="#6CC668"/>
    <line x1="0" y1="-35" x2="16" y2="-45" stroke="#3A9040" stroke-width="2" stroke-linecap="round"/>
    <path d="M16,-45 C22,-55 36,-51 33,-41 C30,-33 18,-43 16,-45Z"
          fill="#6CC668"/>`;

  // Stage 3 — full plant with inline fruits on branches
  const fruits3 = stage3Fruits(typeKey);
  return `
    <line x1="0" y1="0" x2="0" y2="-62"
          stroke="#1A6622" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="0" y1="-20" x2="-24" y2="-33" stroke="#2A7A30" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M-24,-33 C-33,-44 -52,-38 -47,-27 C-42,-17 -26,-30 -24,-33Z"
          fill="#3A8E3C"/>
    <line x1="0" y1="-20" x2="24" y2="-33" stroke="#2A7A30" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M24,-33 C33,-44 52,-38 47,-27 C42,-17 26,-30 24,-33Z"
          fill="#3A8E3C"/>
    <line x1="0" y1="-43" x2="-18" y2="-54" stroke="#2A7A30" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-18,-54 C-25,-65 -40,-61 -36,-51 C-32,-42 -20,-52 -18,-54Z"
          fill="#4CA84C"/>
    <line x1="0" y1="-43" x2="18" y2="-54" stroke="#2A7A30" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M18,-54 C25,-65 40,-61 36,-51 C32,-42 20,-52 18,-54Z"
          fill="#4CA84C"/>
    ${fruits3}`;
}

// ── Location ──────────────────────────────────────────────────────────────────
const LOCATION_KEY    = 'rassada_location';
const DEFAULT_LOCATION = { name: 'Москва', latitude: 55.75, longitude: 37.62 };

function getLocation() {
  try {
    const saved = localStorage.getItem(LOCATION_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  return DEFAULT_LOCATION;
}

function saveLocation(loc) {
  localStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
}

// ── Weather API ───────────────────────────────────────────────────────────────
function buildWeatherURL(lat, lon) {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    '&current=temperature_2m,relative_humidity_2m,wind_speed_10m,surface_pressure,weather_code,uv_index,apparent_temperature' +
    '&daily=sunrise,sunset,weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m,weather_code&timezone=auto&forecast_days=7';
}

const WEATHER_CACHE_KEY = 'rassada_weather_v2';
const WeatherState = { temp: null, humidity: null, uvIndex: 0, weatherCode: 0, isDay: false };
const WEATHER_TTL_MS = 30 * 60 * 1000;

function wmoIcon(code, isDay) {
  if (code === 0)   return isDay ? '☀️' : '🌙';
  if (code <= 2)    return isDay ? '🌤️' : '🌙';
  if (code === 3)   return '☁️';
  if (code <= 48)   return '🌫️';
  if (code <= 55)   return '🌦️';
  if (code <= 65)   return '🌧️';
  if (code <= 77)   return '🌨️';
  if (code <= 82)   return '🌦️';
  return '⛈️';
}

function wmoDesc(code) {
  if (code === 0)   return 'Ясно';
  if (code === 1)   return 'Преим. ясно';
  if (code === 2)   return 'Облачно';
  if (code === 3)   return 'Пасмурно';
  if (code <= 48)   return 'Туман';
  if (code <= 55)   return 'Морось';
  if (code <= 65)   return 'Дождь';
  if (code <= 77)   return 'Снег';
  if (code <= 82)   return 'Ливень';
  return 'Гроза';
}

function fmtHhmm(isoStr) {
  return new Date(isoStr).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function applyWeather(data) {
  const cur    = data.current;
  const hourly = data.hourly;
  const daily  = data.daily;

  // API returns all times in city local time (timezone=auto).
  // Use utc_offset_seconds to compute city's current local time as ISO string
  // so we can compare directly with API time strings without Date parsing issues.
  const utcOffsetSec = data.utc_offset_seconds || 0;
  const cityNowISO = new Date(Date.now() + utcOffsetSec * 1000).toISOString().slice(0, 16);
  const sunriseISO = daily.sunrise[0].slice(0, 16);
  const sunsetISO  = daily.sunset[0].slice(0, 16);
  const isDay = cityNowISO >= sunriseISO && cityNowISO <= sunsetISO;

  // Update shared weather state for tip rendering
  WeatherState.temp        = Math.round(cur.temperature_2m);
  WeatherState.humidity    = Math.round(cur.relative_humidity_2m);
  WeatherState.uvIndex     = Math.round(cur.uv_index ?? 0);
  WeatherState.weatherCode = cur.weather_code;
  WeatherState.isDay       = isDay;
  renderTip();

  // Sidebar
  const sT = document.getElementById('sidebarTemp');
  const sH = document.getElementById('sidebarHumidity');
  const sUV = document.getElementById('sidebarUV');
  if (sT) sT.textContent = Math.round(cur.temperature_2m) + '°C';
  if (sH) sH.textContent = Math.round(cur.relative_humidity_2m) + '%';
  if (sUV) {
    const uv = Math.round(cur.uv_index);
    sUV.textContent = uv <= 0 ? (isDay ? '0' : 'ночь')
      : uv <= 2 ? `${uv} низкий`
      : uv <= 5 ? `${uv} умерен.`
      : uv <= 7 ? `${uv} высокий`
      : `${uv} экстрем.`;
  }

  // Eyebrow
  const eyebrow = document.getElementById('weatherEyebrow');
  if (eyebrow) eyebrow.textContent = (isDay ? '☀️' : '🌙') + ' Погода сейчас · ' + getLocation().name;

  // Main
  const tEl = document.getElementById('weatherTemp');
  const dEl = document.getElementById('weatherDesc');
  const fEl = document.getElementById('weatherFeels');
  if (tEl) tEl.textContent = Math.round(cur.temperature_2m) + '°C';
  if (dEl) dEl.textContent = wmoDesc(cur.weather_code);
  if (fEl) fEl.textContent = `Ощущается как ${Math.round(cur.apparent_temperature)}°C`;

  // Stats
  const hEl = document.getElementById('weatherHumidity');
  const uEl = document.getElementById('weatherUV');
  if (hEl) hEl.textContent = Math.round(cur.relative_humidity_2m) + '%';
  if (uEl) {
    const uv = Math.round(cur.uv_index);
    const uvLabel = uv === 0
      ? (isDay ? '0 Низкий' : '0 Ночь')
      : uv <= 2 ? `${uv} Низкий`
      : uv <= 5 ? `${uv} Умеренный`
      : uv <= 7 ? `${uv} Высокий`
      : `${uv} Опасный`;
    uEl.textContent = uvLabel;
  }

  // Hourly — next 3 slots from now (string comparison works for ISO format)
  const hRow = document.getElementById('weatherHourly');
  if (hRow && hourly.time) {
    const startIdx = hourly.time.findIndex(t => t.slice(0, 16) >= cityNowISO);
    const from = startIdx < 0 ? 0 : startIdx;
    const items = [];
    for (let i = 0; i < 3; i++) {
      const idx = from + i;
      if (idx >= hourly.time.length) break;
      const slotISO = hourly.time[idx].slice(0, 16);
      const tDay = slotISO >= sunriseISO && slotISO <= sunsetISO;
      items.push(`<div class="hourly-item">
        <div class="hr-time">${i === 0 ? 'Сейчас' : slotISO.slice(11, 16)}</div>
        <div class="hr-icon">${wmoIcon(hourly.weather_code[idx], tDay)}</div>
        <div class="hr-temp">${Math.round(hourly.temperature_2m[idx])}°C</div>
      </div>`);
    }
    hRow.innerHTML = items.join('');
  }

  // Daylight panel — times are already city-local strings, just slice
  const deEl = document.getElementById('daylightEyebrow');
  const srEl = document.getElementById('daylightSunrise');
  const drEl = document.getElementById('daylightDuration');
  const ssEl = document.getElementById('daylightSunset');
  if (deEl) {
    const [y, m, d] = sunriseISO.slice(0, 10).split('-').map(Number);
    const dateStr = new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' }).replace(' г.', '');
    deEl.textContent = `🌅 Световой день · ${dateStr}`;
  }
  if (srEl) srEl.textContent = sunriseISO.slice(11, 16);
  if (ssEl) ssEl.textContent = sunsetISO.slice(11, 16);
  if (drEl) {
    const srMin = parseInt(sunriseISO.slice(11, 13)) * 60 + parseInt(sunriseISO.slice(14, 16));
    const ssMin = parseInt(sunsetISO.slice(11, 13))  * 60 + parseInt(sunsetISO.slice(14, 16));
    const total = ssMin - srMin;
    drEl.textContent = `${Math.floor(total / 60)} ч ${total % 60} мин`;
  }

  // Growth index
  const giEl = document.getElementById('growthIndex');
  if (giEl) {
    const srMin = parseInt(sunriseISO.slice(11, 13)) * 60 + parseInt(sunriseISO.slice(14, 16));
    const ssMin = parseInt(sunsetISO.slice(11, 13))  * 60 + parseInt(sunsetISO.slice(14, 16));
    const daylightHours = (ssMin - srMin) / 60;
    const uvIndex = cur.uv_index ?? 0;
    const daylightScore = Math.min(daylightHours / 14, 1);
    const uvScore = Math.min(uvIndex / 6, 1);
    const score = Math.round((daylightScore * 0.65 + uvScore * 0.35) * 100);
    const barColor = score >= 70 ? '#22C55E' : score >= 50 ? '#84CC16' : score >= 30 ? '#F59E0B' : '#94A3B8';
    const desc = score >= 80 ? 'Идеальные условия для роста'
      : score >= 60 ? 'Отличные условия'
      : score >= 40 ? 'Хорошие условия'
      : score >= 20 ? 'Умеренные условия'
      : 'Слабое освещение';
    giEl.innerHTML = `
      <div class="gi-header">
        <span class="gi-label">🌱 Индекс роста</span>
        <span class="gi-score">${score}</span>
      </div>
      <div class="gi-bar-wrap"><div class="gi-bar" style="width:${score}%;background:${barColor}"></div></div>
      <div class="gi-desc">${desc}</div>`;
  }

  // Weekly forecast strip
  const wkEl = document.getElementById('weatherWeekly');
  if (wkEl && daily.time && daily.weather_code) {
    const todayDateStr = cityNowISO.slice(0, 10);
    const items = daily.time.map((dateStr, i) => {
      const isToday = dateStr.slice(0, 10) === todayDateStr;
      const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
      const dayName = isToday ? 'Сег' : new Date(y, m - 1, d).toLocaleDateString('ru-RU', { weekday: 'short' }).replace('.', '');
      const icon = wmoIcon(daily.weather_code[i], true);
      const max = Math.round(daily.temperature_2m_max[i]);
      const min = Math.round(daily.temperature_2m_min[i]);
      return `<div class="wk-day${isToday ? ' wk-today' : ''}">
        <div class="wk-name">${dayName}</div>
        <div class="wk-icon">${icon}</div>
        <div class="wk-max">${max}°</div>
        <div class="wk-min">${min}°</div>
      </div>`;
    });
    wkEl.innerHTML = items.join('');
  }
}

async function fetchWeather(forceRefresh = false) {
  const loc = getLocation();
  try {
    const cached = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!forceRefresh && cached) {
      const { ts, data, locName } = JSON.parse(cached);
      if (Date.now() - ts < WEATHER_TTL_MS && locName === loc.name) { applyWeather(data); return; }
    }
  } catch (_) {}
  try {
    const res  = await fetch(buildWeatherURL(loc.latitude, loc.longitude));
    if (!res.ok) return;
    const data = await res.json();
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify({ ts: Date.now(), data, locName: loc.name }));
    applyWeather(data);
  } catch (_) {}
}

// ── Sky scene ─────────────────────────────────────────────────────────────────
function buildSky() {
  const sky = document.getElementById('skyScene');
  if (!sky) return;

  const clouds = [
    { top: 8,  w: 140, h: 50, dur: 90,  delay: 0  },
    { top: 5,  w:  85, h: 32, dur: 90,  delay: 22 },
    { top: 20, w: 120, h: 42, dur: 125, delay: 38 },
    { top: 15, w:  80, h: 30, dur: 125, delay: 62 },
    { top: 4,  w: 160, h: 54, dur: 110, delay: 78 },
    { top: 28, w:  95, h: 34, dur: 100, delay: 14 },
  ];
  clouds.forEach(cfg => {
    const el = document.createElement('div');
    el.className = 'cloud';
    // Each cloud gets realistic "puffs" via ::before/::after via inline structure
    el.style.cssText = `
      top:${cfg.top}%;
      width:${cfg.w}px; height:${cfg.h}px;
      animation: drift ${cfg.dur}s linear -${cfg.delay}s infinite;`;
    sky.appendChild(el);
  });

  // Hills replaced by SVG mountains in HTML — only trees injected here
  [
    { left: 4,  trunkH: 56, crownW: 60, crownH: 90 },
    { left: 14, trunkH: 38, crownW: 46, crownH: 64 },
    { left: 67, trunkH: 66, crownW: 70, crownH: 100 },
    { left: 77, trunkH: 42, crownW: 52, crownH: 72 },
    { left: 88, trunkH: 30, crownW: 36, crownH: 52 },
  ].forEach(cfg => {
    const tree = document.createElement('div');
    tree.className = 'tree';
    tree.style.left = cfg.left + '%';
    tree.innerHTML = `
      <div class="tree-crown" style="width:${cfg.crownW}px;height:${cfg.crownH}px"></div>
      <div class="tree-trunk" style="height:${cfg.trunkH}px"></div>`;
    sky.appendChild(tree);
  });
}

// ── Header date/time ──────────────────────────────────────────────────────────
function updateDateTime() {
  const el = document.getElementById('headerDateTime');
  if (!el) return;
  const now = new Date();
  const datePart = now.toLocaleDateString('ru-RU', { weekday: 'short', day: 'numeric', month: 'long' });
  const timePart = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  // Capitalise first letter
  const date = datePart.charAt(0).toUpperCase() + datePart.slice(1);
  el.textContent = `${date} • ${timePart}`;
}

// ── Sidebar tip (personalized) ────────────────────────────────────────────────
const TIPS_GENERIC = [
  'Поливайте рассаду утром — за день корни лучше усвоят влагу.',
  'Подсветка фитолампой 12–14 часов в сутки ускоряет рост в пасмурные дни.',
  'Слегка встряхивайте растения руками — это стимулирует укрепление стебля.',
  'Следите за температурой субстрата: ниже 18 °C замедляет рост корней.',
  'Слишком вытянувшаяся рассада — признак нехватки света, не перелива.',
  'Добавляйте в воду для полива немного золы — хороший калий-фосфорный подкорм.',
  'Проветривайте помещение и опрыскивайте рассаду из пульверизатора.',
];

function renderTip() {
  const el       = document.getElementById('sidebarTipText');
  const labelEl  = document.getElementById('tipPlantLabel');
  const emojiEl  = document.querySelector('.sidebar-tip-plant');
  if (!el) return;

  // No plants → generic daily tip
  if (State.plants.length === 0) {
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86_400_000);
    el.textContent = TIPS_GENERIC[dayOfYear % TIPS_GENERIC.length];
    if (labelEl) labelEl.textContent = '';
    if (emojiEl) emojiEl.textContent = '🌱';
    return;
  }

  // Pick most relevant plant: urgent → warn → first
  const sorted = [...State.plants].sort((a, b) => {
    const ord = { bad: 0, warn: 1, ok: 2 };
    return (ord[waterStatus(a)] ?? 2) - (ord[waterStatus(b)] ?? 2);
  });
  const plant = sorted[0];
  const type  = DB[plant.typeKey];
  const v     = DB.getVariety(plant.typeKey, plant.varietyKey);
  const stage = currentStage(plant);

  // First sentence of stageAdvice
  const full = (v.stageAdvice?.[stage] || '').trim();
  const dot  = full.indexOf('.');
  const stageTip = dot > 0 && dot < 150 ? full.slice(0, dot + 1) : full.slice(0, 120) + (full.length > 120 ? '…' : '');

  // Weather context (appended if conditions warrant)
  let weatherLine = '';
  if (WeatherState.temp !== null) {
    if (WeatherState.temp >= 27 && WeatherState.isDay)   weatherLine = ' ☀️ Жарко — поливайте чаще.';
    else if (WeatherState.temp <= 10)                     weatherLine = ' 🥶 Холодно — уберите от холодного стекла.';
    else if (WeatherState.humidity > 82)                  weatherLine = ' 💦 Высокая влажность — следите за грибком.';
    else if (WeatherState.humidity < 35)                  weatherLine = ' 💧 Сухой воздух — опрыскайте листья.';
  }

  el.textContent = stageTip + weatherLine;
  if (labelEl) labelEl.textContent = `${type.name} ${v.name}`;
  if (emojiEl) emojiEl.textContent = type.emoji;
}

// ── Reminders ─────────────────────────────────────────────────────────────────
function generateRemindersFromPlants() {
  // Auto-reminders from plant state (not persisted, refreshed each render)
  const auto = [];
  State.plants.forEach(plant => {
    const type = DB[plant.typeKey];
    const v    = DB.getVariety(plant.typeKey, plant.varietyKey);
    const ws   = waterStatus(plant);
    if (ws === 'bad') {
      auto.push({
        id: `auto-water-${plant.id}`,
        icon: '💧',
        text: `Полить ${type.name} (${v.name})`,
        time: 'Сегодня',
        urgency: 'urgent',
        plantId: plant.id,
        auto: true,
      });
    } else if (ws === 'warn') {
      const h = hoursUntilWater(plant);
      auto.push({
        id: `auto-soon-${plant.id}`,
        icon: '🌊',
        text: `Полить ${type.name} через ${h} ч`,
        time: `через ${h} ч`,
        urgency: 'soon',
        plantId: plant.id,
        auto: true,
      });
    }
    const stage = currentStage(plant);
    const d = daysSince(plant.plantedAt);
    if (stage < v.stages.length - 1 && plant.stage === undefined && d >= v.stageDays[stage + 1]) {
      auto.push({
        id: `auto-stage-${plant.id}`,
        icon: '🌿',
        text: `${type.name}: готов к этапу "${v.stages[stage + 1]}"`,
        time: 'Сейчас',
        urgency: 'info',
        plantId: plant.id,
        auto: true,
      });
    }
  });
  return auto;
}

function allReminders() {
  return [...generateRemindersFromPlants(), ...State.reminders];
}

function renderRemindersList() {
  const el = document.getElementById('remindersList');
  if (!el) return;

  // ── Watering summary block ──
  const urgent = State.plants.filter(p => waterStatus(p) === 'bad');
  const warn   = State.plants
    .filter(p => waterStatus(p) === 'warn')
    .sort((a, b) => hoursUntilWater(a) - hoursUntilWater(b));
  const okArr  = State.plants
    .filter(p => waterStatus(p) === 'ok')
    .sort((a, b) => hoursUntilWater(a) - hoursUntilWater(b));

  let summaryHtml = '';
  if (State.plants.length === 0) {
    summaryHtml = `<div class="water-summary ok"><div class="ws-header"><span class="ws-icon">🌱</span><span class="ws-label">Нет растений</span></div></div>`;
  } else if (urgent.length > 0) {
    const shown = urgent.slice(0, 2);
    const more  = urgent.length - shown.length;
    const plantsHtml = shown.map(p => {
      const t = DB[p.typeKey]; const v = DB.getVariety(p.typeKey, p.varietyKey);
      return `<div class="ws-plant"><span class="ws-plant-name">${t.name} ${v.name}</span><span class="ws-plant-time urgent">Сейчас!</span></div>`;
    }).join('') + (more > 0 ? `<div class="ws-more">+${more} ещё</div>` : '');
    const btnLabel = urgent.length === 1 ? 'Полить' : `Полить всех (${urgent.length})`;
    const btnAttr  = urgent.length === 1 ? `data-plant-id="${urgent[0].id}"` : `data-water-all="urgent"`;
    summaryHtml = `<div class="water-summary urgent">
      <div class="ws-header"><span class="ws-icon">💧</span><span class="ws-label">Требует полива</span></div>
      <div class="ws-plants">${plantsHtml}</div>
      <button class="ws-action" ${btnAttr}>${btnLabel}</button>
    </div>`;
  } else if (warn.length > 0) {
    const shown = warn.slice(0, 2);
    const more  = warn.length - shown.length;
    const plantsHtml = shown.map(p => {
      const t = DB[p.typeKey]; const v = DB.getVariety(p.typeKey, p.varietyKey);
      return `<div class="ws-plant"><span class="ws-plant-name">${t.name} ${v.name}</span><span class="ws-plant-time warn">через ${hoursUntilWater(p)} ч</span></div>`;
    }).join('') + (more > 0 ? `<div class="ws-more">+${more} ещё</div>` : '');
    summaryHtml = `<div class="water-summary warn">
      <div class="ws-header"><span class="ws-icon">🌊</span><span class="ws-label">Скоро поливать</span></div>
      <div class="ws-plants">${plantsHtml}</div>
    </div>`;
  } else {
    const next = okArr[0];
    const t = DB[next.typeKey]; const v = DB.getVariety(next.typeKey, next.varietyKey);
    const h = hoursUntilWater(next);
    const label = h < 24 ? `через ${h} ч` : `через ${Math.floor(h / 24)} дн`;
    summaryHtml = `<div class="water-summary ok">
      <div class="ws-header"><span class="ws-icon">✅</span><span class="ws-label">Всё под контролем</span></div>
      <div class="ws-plants">
        <div class="ws-plant"><span class="ws-plant-name">${t.name} ${v.name}</span><span class="ws-plant-time ok">${label}</span></div>
      </div>
    </div>`;
  }

  // ── Stage transitions + user reminders ──
  const extras = [
    ...generateRemindersFromPlants().filter(r => r.id.startsWith('auto-stage-')),
    ...State.reminders,
  ];
  const extrasHtml = extras.slice(0, 3).map(r => `
    <div class="reminder-item ${r.urgency || 'ok'}">
      <span class="reminder-icon">${r.icon}</span>
      <div class="reminder-body">
        <div class="reminder-title">${r.text}</div>
        <div class="reminder-time">${r.time}</div>
      </div>
      ${!r.auto ? `<button class="reminder-delete-btn" data-reminder-id="${r.id}" title="Удалить">✕</button>` : ''}
    </div>`).join('');

  el.innerHTML = summaryHtml + extrasHtml;
}

function renderNotifPanel() {
  const el = document.getElementById('notifPanelBody');
  if (!el) return;
  const list = allReminders();

  // Update badge
  const urgent = list.filter(r => r.urgency === 'urgent' || r.urgency === 'soon').length;
  const badge = document.getElementById('notifBadge');
  if (badge) {
    badge.textContent = urgent;
    badge.classList.toggle('hidden', urgent === 0);
  }

  if (!list.length) {
    el.innerHTML = `<div class="notif-empty"><span>🔔</span><p>Уведомлений нет — всё в порядке!</p></div>`;
    return;
  }

  el.innerHTML = list.map(r => {
    const actionBtn = r.auto && r.plantId
      ? `<button class="notif-action-btn" data-plant-id="${r.plantId}">${r.urgency === 'info' ? 'Открыть' : 'Полить'}</button>`
      : !r.auto
        ? `<button class="reminder-delete-btn" data-reminder-id="${r.id}" title="Удалить">✕</button>`
        : '';
    return `
      <div class="notif-card ${r.urgency || 'info'}">
        <span class="notif-card-icon">${r.icon}</span>
        <div class="notif-card-body">
          <div class="notif-card-title">${r.text}</div>
          <div class="notif-card-time">${r.time}</div>
        </div>
        ${actionBtn}
      </div>`;
  }).join('');
}

// ── Plants section (soil view) ────────────────────────────────────────────────
function renderPlantsSection() {
  const row = document.getElementById('soilPlantsRow');
  if (!row) return;
  row.innerHTML = '';

  State.plants.forEach(plant => {
    const type = DB[plant.typeKey];
    const v    = DB.getVariety(plant.typeKey, plant.varietyKey);
    const ws   = waterStatus(plant);
    const pct  = waterPercent(plant);

    const slot = document.createElement('div');
    slot.className = 'plant-slot';
    slot.dataset.id = plant.id;

    const nextWater = nextWaterLabel(plant);
    const stage = currentStage(plant);
    const daysLeft = daysToFinalStage(plant);
    const harvestLine = daysLeft === 0
      ? `<div class="pic-harvest ready">✅ ${v.stages[v.stages.length - 1]}</div>`
      : `<div class="pic-harvest">🌱 Готово через ${daysLeft} дн</div>`;

    slot.innerHTML = `
      <div class="plant-card">
        <div class="pic-header">
          <div class="pic-name">${type.name}</div>
          <div class="pic-dot ${ws}"></div>
        </div>
        <div class="pic-variety">${v.name} · Этап ${stage + 1}</div>
        <div class="pic-water-bar">
          <div class="pic-water-track">
            <div class="pic-water-fill ${ws}" style="width:${pct}%"></div>
          </div>
          <span class="pic-wlabel">${pct}%</span>
        </div>
        <div class="pic-next">💧 ${nextWater}</div>
        ${harvestLine}
        <div class="pc-pot-zone">
          ${buildPotSVG(plant, 104)}
        </div>
      </div>`;

    slot.addEventListener('click', () => openDetail(plant.id));
    row.appendChild(slot);
  });

  document.getElementById('emptyHint').classList.toggle('hidden', State.plants.length > 0);
}

// ── Stats bar ─────────────────────────────────────────────────────────────────
function renderStats() {
  const count = State.plants.length;
  document.getElementById('statPlantCount').textContent = `${count} из ${DB.getAllTypes().length}`;

  // Overall progress = avg stage progress across all plants
  if (count === 0) {
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressPct').textContent = '0%';
    document.getElementById('statNextWater').textContent = '—';
    const he = document.getElementById('statNearestHarvest');
    if (he) he.textContent = '—';
    return;
  }

  let totalProgress = 0;
  let minHoursUntil = Infinity;
  let minDaysToFinal = Infinity;

  State.plants.forEach(plant => {
    const v     = DB.getVariety(plant.typeKey, plant.varietyKey);
    const stage = currentStage(plant);
    const progress = (stage / (v.stages.length - 1)) * 100;
    totalProgress += progress;

    const ws = waterStatus(plant);
    if (ws === 'bad') { minHoursUntil = 0; }
    else {
      const h = hoursUntilWater(plant);
      if (h < minHoursUntil) minHoursUntil = h;
    }

    const d = daysToFinalStage(plant);
    if (d < minDaysToFinal) minDaysToFinal = d;
  });

  const avg = Math.round(totalProgress / count);
  document.getElementById('progressFill').style.width = `${avg}%`;
  document.getElementById('progressPct').textContent = `${avg}%`;

  if (minHoursUntil === 0) {
    document.getElementById('statNextWater').textContent = 'Сейчас!';
  } else if (minHoursUntil === Infinity) {
    document.getElementById('statNextWater').textContent = '—';
  } else if (minHoursUntil < 24) {
    document.getElementById('statNextWater').textContent = `Сегодня, через ${minHoursUntil} ч`;
  } else {
    document.getElementById('statNextWater').textContent = `Через ${Math.floor(minHoursUntil / 24)} дн`;
  }

  const harvestEl = document.getElementById('statNearestHarvest');
  if (harvestEl) {
    if (minDaysToFinal === 0) harvestEl.textContent = 'Готово!';
    else if (minDaysToFinal === Infinity) harvestEl.textContent = '—';
    else harvestEl.textContent = `Через ${minDaysToFinal} дн`;
  }
}

// ── Journal page ──────────────────────────────────────────────────────────────
function buildJournalEvents() {
  const events = [];
  State.plants.forEach(plant => {
    const type = DB[plant.typeKey];
    const v    = DB.getVariety(plant.typeKey, plant.varietyKey);
    const label = `${type.name} ${v.name}`;
    const emoji = type.emoji;

    events.push({ iso: plant.plantedAt, kind: 'seeded', label, emoji, plantId: plant.id });

    (plant.waterHistory || []).forEach(iso => {
      events.push({ iso, kind: 'watered', label, emoji, plantId: plant.id });
    });
  });

  events.sort((a, b) => b.iso.localeCompare(a.iso));
  return events;
}

function journalDateLabel(dateKey) {
  const today     = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  if (dateKey === today)     return 'Сегодня';
  if (dateKey === yesterday) return 'Вчера';
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function renderJournal() {
  const el = document.getElementById('journalContent');
  if (!el) return;

  if (!State.plants.length) {
    el.innerHTML = `<div class="journal-empty"><span>📋</span><p>Добавьте растения — здесь появится история ухода</p></div>`;
    return;
  }

  const events = buildJournalEvents();
  if (!events.length) {
    el.innerHTML = `<div class="journal-empty"><span>📋</span><p>Пока нет записей</p></div>`;
    return;
  }

  // Group by date
  const groups = {};
  events.forEach(e => {
    const key = e.iso.slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  const kindMeta = {
    watered: { icon: '💧', text: 'Полив' },
    seeded:  { icon: '🌱', text: 'Посев' },
  };

  el.innerHTML = Object.entries(groups).map(([dateKey, dayEvents]) => {
    const rows = dayEvents.map(e => {
      const meta = kindMeta[e.kind];
      const time = e.iso.length >= 16 ? e.iso.slice(11, 16) : '';
      return `
        <div class="journal-event" data-plant-id="${e.plantId}">
          <div class="je-icon-wrap je-${e.kind}">${meta.icon}</div>
          <div class="je-body">
            <span class="je-action">${meta.text}</span>
            <span class="je-plant">${e.label}</span>
          </div>
          ${time ? `<div class="je-time">${time}</div>` : ''}
        </div>`;
    }).join('');

    return `
      <div class="journal-day">
        <div class="journal-day-header">
          <span class="jdh-label">${journalDateLabel(dateKey)}</span>
          <span class="jdh-count">${dayEvents.length} ${dayEvents.length === 1 ? 'запись' : dayEvents.length < 5 ? 'записи' : 'записей'}</span>
        </div>
        <div class="journal-day-events">${rows}</div>
      </div>`;
  }).join('');
}

// ── Glossary page ─────────────────────────────────────────────────────────────
function renderGlossary() {
  const content = document.getElementById('glossaryContent');
  const filterRow = document.getElementById('plantFilterRow');
  if (!content || !filterRow) return;

  const types = DB.getAllTypes();

  // Filter chips
  filterRow.innerHTML = `<button class="filter-chip ${State.glossaryFilter === 'all' ? 'active' : ''}" data-filter="all">Все</button>` +
    types.map(t => `
      <button class="filter-chip ${State.glossaryFilter === t.key ? 'active' : ''}" data-filter="${t.key}">
        <span class="glossary-type-emoji">${PLANT_ICONS[t.key] || t.emoji}</span>${t.name}
      </button>`).join('');

  // My plant varietyKeys (for badge)
  const myVarieties = new Set(State.plants.map(p => `${p.typeKey}__${p.varietyKey}`));

  const filtered = State.glossaryFilter === 'all' ? types : types.filter(t => t.key === State.glossaryFilter);

  content.innerHTML = filtered.map(type => {
    const varieties = DB.getVarietyList(type.key);
    const typeData  = DB[type.key];

    return `
      <div class="glossary-type-section">
        <div class="glossary-type-header" style="border-color:${typeData.accentColor}">
          <span class="glossary-type-emoji">${PLANT_ICONS[type.key] || type.emoji}</span>
          <span class="glossary-type-name">${type.name}</span>
          <span class="glossary-type-count">${varieties.length} ${varieties.length === 1 ? 'сорт' : varieties.length < 5 ? 'сорта' : 'сортов'}</span>
        </div>

        <div class="variety-cards-grid">
          ${varieties.map(v => {
            const vData = typeData.varieties[v.key];
            const isMyPlant = myVarieties.has(`${type.key}__${v.key}`);
            const stagesHtml = vData.stages.map((s, i) =>
              `<div class="vcard-stage" style="${i === 0 ? 'background:#E8F4E8;color:'+typeData.accentColor : ''}">${s}</div>`
            ).join('');

            return `
              <div class="variety-card">
                <div class="variety-card-header">
                  <span class="variety-card-emoji">${PLANT_ICONS[type.key] || v.emoji}</span>
                  <div class="variety-card-names">
                    <div class="variety-card-name">${v.name}</div>
                    <div class="variety-card-full">${v.fullName}</div>
                  </div>
                  ${isMyPlant ? '<span class="my-plant-badge">● У вас растёт</span>' : ''}
                  <span class="variety-card-tag" style="background:${typeData.accentColor}">${type.name}</span>
                </div>
                <div class="variety-card-body">
                  <div class="variety-card-quickstats">
                    <div class="qstat"><span class="qstat-icon">💧</span>Полив каждые ${vData.waterIntervalDays} дн</div>
                    <div class="qstat"><span class="qstat-icon">${vData.lightIcon}</span>${vData.light.split('—')[0].trim()}</div>
                    <div class="qstat"><span class="qstat-icon">🕐</span>Укрытие ${vData.coverDays} дн</div>
                  </div>
                  <div class="variety-card-stages">${stagesHtml}</div>
                  <div class="variety-card-advice">${vData.varietyAdvice}</div>
                  <div class="variety-card-growth-note">${vData.growthNote}</div>
                </div>
              </div>`;
          }).join('')}
        </div>
      </div>`;
  }).join('');
}

// ── Page navigation ───────────────────────────────────────────────────────────
const PAGE_MAP = {
  overview: 'pageOverview',
  plants:   'pagePlants',
  care:     'pageCare',
  library:  'pageLibrary',
  settings: 'pageSettings',
};

const PAGE_TITLES = {
  overview: 'Обзор',
  plants:   'Растения',
  care:     'Журнал',
  library:  'Библиотека',
  settings: 'Настройки',
};

function navigateTo(page) {
  if (State.view === 'detail') return; // stay in detail if open

  // Update nav items (sidebar + mobile bottom nav)
  document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Show/hide pages
  Object.entries(PAGE_MAP).forEach(([key, id]) => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('hidden', key !== page);
  });

  // Update header page title
  const titleEl = document.getElementById('headerPageTitle');
  if (titleEl) titleEl.textContent = PAGE_TITLES[page] ?? page;

  State.currentPage = page;

  // Lazy render
  if (page === 'plants') renderGlossary();
  if (page === 'care')   renderJournal();
}

// ── Detail view ───────────────────────────────────────────────────────────────
function openDetail(id) {
  const plant = State.plants.find(p => p.id === id);
  if (!plant) return;

  State.selectedId = id;
  State.view = 'detail';

  renderDetail(plant);

  const overlay = document.getElementById('detailOverlay');
  overlay.classList.remove('hidden');
  overlay.querySelector('.detail-sheet').classList.remove('leaving');
}

function closeDetail() {
  State.view = 'main';
  State.selectedId = null;

  const sheet = document.querySelector('.detail-sheet');
  sheet.classList.add('leaving');
  setTimeout(() => {
    document.getElementById('detailOverlay').classList.add('hidden');
    sheet.classList.remove('leaving');
  }, 300);
}

function renderDetail(plant) {
  const v     = DB.getVariety(plant.typeKey, plant.varietyKey);
  const type  = DB[plant.typeKey];
  const stage = currentStage(plant);
  const days  = daysSince(plant.plantedAt);
  const ws    = waterStatus(plant);

  document.getElementById('heroPot').innerHTML = buildPotSVG(plant, 110);
  document.getElementById('heroTitle').textContent = v.fullName;
  document.getElementById('heroVarietyTag').textContent = v.name;
  document.getElementById('heroMeta').textContent = 'Посеяно ' + fmtDate(plant.plantedAt);
  document.getElementById('heroDays').innerHTML =
    `<span>${days}</span> <span class="hero-days-label">день</span>`;

  // Stages
  document.getElementById('stagesBar').innerHTML = v.stages.map((s, i) => `
    <div class="stage-item ${i < stage ? 'done' : ''} ${i === stage ? 'active' : ''}">
      ${i < stage ? '✓ ' : ''}${s}
    </div>`).join('');

  // Tip
  document.getElementById('tipCard').innerHTML = `
    <div class="tip-label">💡 Что делать сейчас — Этап ${stage + 1}</div>
    <div class="tip-text">${v.stageAdvice[stage]}</div>`;

  // Water widget
  let waterHead, waterSub;
  if (ws === 'bad') {
    waterHead = plant.lastWatered ? 'Пора полить!' : 'Ещё не поливали';
    waterSub  = 'Последний полив: ' + timeAgo(plant.lastWatered);
  } else if (ws === 'warn') {
    const h = hoursUntilWater(plant);
    waterHead = `Через ${h} ч`;
    waterSub  = 'до следующего полива · полит ' + timeAgo(plant.lastWatered);
  } else {
    const h = hoursUntilWater(plant);
    waterHead = `${h} ч`;
    waterSub  = 'до следующего полива · полит ' + timeAgo(plant.lastWatered);
  }
  document.getElementById('waterWidget').className = `water-widget ${ws}`;
  document.getElementById('waterWidget').innerHTML = `
    <div class="water-icon">💧</div>
    <div class="water-text">
      <div class="water-headline">${waterHead}</div>
      <div class="water-sub">${waterSub}</div>
    </div>
    <button class="btn-water">Полил 💧</button>`;

  // Light
  document.getElementById('lightCard').innerHTML = `
    <div class="card-head"><span class="card-icon">${v.lightIcon}</span>Освещение</div>
    <p>${v.light}<br><br>Следите, чтобы рассада не вытягивалась — это первый признак нехватки света.</p>`;

  // Cover
  const coverEl = document.getElementById('coverSection');
  if (days < v.coverDays && v.coverDays > 0) {
    const rem = v.coverDays - days;
    coverEl.innerHTML = `
      <div class="section-label">Укрытие</div>
      <div class="card">
        <div class="card-head"><span class="card-icon">🎭</span>Осталось дней под плёнкой: ${rem}</div>
        <p>${v.coverAdvice}</p>
      </div>`;
  } else {
    coverEl.innerHTML = '';
  }

  // Water advice
  document.getElementById('waterAdviceCard').innerHTML = `
    <div class="card-head"><span class="card-icon">🚿</span>Рекомендации по поливу</div>
    <p>${v.waterAdvice}</p>`;

  // Variety card
  document.getElementById('varietyCard').innerHTML = `
    <div class="card-head"><span class="card-icon">📋</span>Особенности сорта</div>
    <p>${v.varietyAdvice}</p>
    <div class="growth-note" style="margin-top:10px">${v.growthNote}</div>`;

  // Water history
  const histEl = document.getElementById('waterHistoryCard');
  if (histEl) {
    const hist = plant.waterHistory || [];
    if (hist.length) {
      histEl.className = 'card water-history-card';
      histEl.innerHTML = `
        <div class="card-head"><span class="card-icon">📅</span>История полива</div>
        <div class="water-history-list">
          ${hist.slice(0, 5).map((d, i) => `
            <div class="water-history-item">
              <span class="water-hist-num">${i + 1}</span>
              <span class="water-hist-date">${fmtDate(d)}</span>
              <span class="water-hist-ago">${timeAgo(d)}</span>
            </div>`).join('')}
        </div>`;
    } else {
      histEl.className = 'water-history-card';
      histEl.innerHTML = '';
    }
  }

  // Action
  const actionEl = document.getElementById('actionArea');
  if (stage < v.stages.length - 1) {
    actionEl.innerHTML = `
      <button class="btn-advance">
        Следующий этап: «${v.stages[stage + 1]}» →
      </button>`;
  } else {
    actionEl.innerHTML = `
      <div class="done-banner">
        <div class="done-banner-title">✅ Рассада готова к высадке!</div>
        <div class="done-banner-sub">
          Закалите растение: выносите на улицу на 2–3 ч в день, постепенно увеличивая время.
          Через 7–10 дней можно высаживать на постоянное место.
        </div>
      </div>`;
  }
}

// ── Plant actions ─────────────────────────────────────────────────────────────
function waterPlant(id) {
  const plant = State.plants.find(p => p.id === id);
  if (!plant) return;
  const now = new Date().toISOString();
  if (!plant.waterHistory) plant.waterHistory = [];
  plant.waterHistory.unshift(now);
  if (plant.waterHistory.length > 20) plant.waterHistory.pop();
  plant.lastWatered = now;
  saveState();
  renderPlantsSection();
  renderStats();
  renderRemindersList();
  renderNotifPanel();
  if (State.view === 'detail') renderDetail(plant);
  if (State.currentPage === 'care') renderJournal();
}

function advanceStage(id) {
  const plant = State.plants.find(p => p.id === id);
  if (!plant) return;
  const v     = DB.getVariety(plant.typeKey, plant.varietyKey);
  const stage = currentStage(plant);
  if (stage >= v.stages.length - 1) return;
  plant.stage = stage + 1;
  saveState();
  renderPlantsSection();
  renderStats();
  renderDetail(plant);
}

function deletePlant() {
  if (!State.selectedId) return;
  if (!confirm('Удалить этот горшочек?')) return;
  State.plants = State.plants.filter(p => p.id !== State.selectedId);
  saveState();
  renderPlantsSection();
  renderStats();
  renderRemindersList();
  renderNotifPanel();
  closeDetail();
}

function deleteReminder(id) {
  State.reminders = State.reminders.filter(r => r.id !== id);
  saveReminders();
  renderRemindersList();
  renderNotifPanel();
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal() {
  State.modal = { open: true, step: 1, typeKey: null, varietyKey: null };
  renderModal();
  document.getElementById('addModalOverlay').classList.add('open');
}

function closeModal() {
  State.modal.open = false;
  document.getElementById('addModalOverlay').classList.remove('open');
}

function renderModal() {
  const step1 = document.getElementById('modalStep1');
  const step2 = document.getElementById('modalStep2');
  if (State.modal.step === 1) {
    step1.classList.remove('hidden');
    step2.classList.add('hidden');
    renderPlantTypeGrid();
  } else {
    step1.classList.add('hidden');
    step2.classList.remove('hidden');
    renderVarietyList();
  }
}

function renderPlantTypeGrid() {
  document.getElementById('plantTypeGrid').innerHTML = DB.getAllTypes().map(t => `
    <button class="plant-type-btn ${State.modal.typeKey === t.key ? 'selected' : ''}" data-type-key="${t.key}">
      <span class="plant-type-emoji">${PLANT_ICONS[t.key] || t.emoji}</span>
      <span class="plant-type-name">${t.name}</span>
    </button>`).join('');
}

function selectType(key) {
  State.modal.typeKey   = key;
  State.modal.varietyKey = null;
  State.modal.step = 2;
  renderModal();
}

function renderVarietyList() {
  const t = DB[State.modal.typeKey];
  document.getElementById('step2TypeName').textContent = t.name + ' — выберите сорт';
  document.getElementById('varietyList').innerHTML = DB.getVarietyList(State.modal.typeKey).map(v => `
    <button class="variety-btn ${State.modal.varietyKey === v.key ? 'selected' : ''}" data-variety-key="${v.key}">
      <span class="variety-emoji">${PLANT_ICONS[State.modal.typeKey] || v.emoji}</span>
      <div class="variety-info">
        <div class="variety-name">${v.name}</div>
        <div class="variety-desc">${v.fullName}</div>
      </div>
      <div class="variety-check">${State.modal.varietyKey === v.key ? '✓' : ''}</div>
    </button>`).join('');
  document.getElementById('confirmBtn').disabled = !State.modal.varietyKey;
  const dateInput = document.getElementById('fDate');
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
}

function selectVariety(key) {
  State.modal.varietyKey = key;
  renderVarietyList();
}

function confirmAdd() {
  if (!State.modal.typeKey || !State.modal.varietyKey) return;
  const [y, m, d] = document.getElementById('fDate').value.split('-').map(Number);
  const plant = {
    id:          crypto.randomUUID(),
    typeKey:     State.modal.typeKey,
    varietyKey:  State.modal.varietyKey,
    plantedAt:   new Date(y, m - 1, d).toISOString(),
    lastWatered: null,
  };
  State.plants.push(plant);
  saveState();
  renderPlantsSection();
  renderStats();
  renderRemindersList();
  renderNotifPanel();
  closeModal();
  setTimeout(() => openDetail(plant.id), 300);
}

// ── Notification panel ────────────────────────────────────────────────────────
function openNotifPanel() {
  renderNotifPanel();
  document.getElementById('notifPanel').classList.remove('hidden');
  document.getElementById('notifBackdrop').classList.remove('hidden');
  State.notifOpen = true;
}

function closeNotifPanel() {
  document.getElementById('notifPanel').classList.add('hidden');
  document.getElementById('notifBackdrop').classList.add('hidden');
  State.notifOpen = false;
}

// ── City search (geocoding) ───────────────────────────────────────────────────
async function searchCity(query) {
  const btn = document.getElementById('citySearchBtn');
  const resultsEl = document.getElementById('cityResults');
  if (!query.trim()) return;

  btn.textContent = '…';
  btn.disabled = true;

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=ru&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const json = await res.json();
    const results = json.results || [];

    if (!results.length) {
      resultsEl.innerHTML = '<div class="city-result-empty">Город не найден</div>';
      resultsEl.classList.remove('hidden');
      return;
    }

    resultsEl.innerHTML = results.map(r => {
      const sub = [r.admin1, r.country].filter(Boolean).join(', ');
      return `<button class="city-result-item" data-lat="${r.latitude}" data-lon="${r.longitude}" data-name="${r.name}">
        <span class="city-result-name">${r.name}</span>
        <span class="city-result-sub">${sub}</span>
      </button>`;
    }).join('');
    resultsEl.classList.remove('hidden');
  } catch (_) {
    resultsEl.innerHTML = '<div class="city-result-empty">Ошибка поиска — проверьте соединение</div>';
    resultsEl.classList.remove('hidden');
  } finally {
    btn.textContent = 'Найти';
    btn.disabled = false;
  }
}

function selectCity(name, lat, lon) {
  saveLocation({ name, latitude: parseFloat(lat), longitude: parseFloat(lon) });
  document.getElementById('currentCityLabel').textContent = name;
  document.getElementById('cityInput').value = '';
  document.getElementById('cityResults').classList.add('hidden');
  fetchWeather(true);
}

function renderSettingsCity() {
  const label = document.getElementById('currentCityLabel');
  if (label) label.textContent = getLocation().name;
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  loadState();
  buildSky();
  updateDateTime();
  renderTip();
  fetchWeather();
  renderPlantsSection();
  renderStats();
  renderRemindersList();
  renderNotifPanel();

  // Refresh weather every 30 min
  setInterval(fetchWeather, WEATHER_TTL_MS);

  // Auto-refresh every 60 s
  setInterval(() => {
    updateDateTime();
    renderPlantsSection();
    renderStats();
    renderRemindersList();
    renderNotifPanel();
    if (State.view === 'detail' && State.selectedId) {
      const p = State.plants.find(pl => pl.id === State.selectedId);
      if (p) renderDetail(p);
    }
    if (State.currentPage === 'care') renderJournal();
  }, 60_000);

  // Refresh tip every 60s (re-evaluates plant state)
  setInterval(renderTip, 60_000);

  // ── Sidebar navigation ──
  const sidebar = document.getElementById('sidebar');
  const sidebarOverlay = document.getElementById('sidebarOverlay');

  function closeMobileSidebar() {
    sidebar.classList.remove('mobile-open');
    sidebarOverlay.classList.remove('visible');
  }

  document.getElementById('sidebarNav').addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) { navigateTo(btn.dataset.page); closeMobileSidebar(); }
  });

  // ── Add plant button ──
  document.getElementById('addPlantBtnHeader').addEventListener('click', openModal);

  // ── Hamburger (mobile) ──
  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    const isOpen = sidebar.classList.toggle('mobile-open');
    sidebarOverlay.classList.toggle('visible', isOpen);
  });

  sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // ── Mobile bottom nav ──
  document.getElementById('mobileBottomNav').addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if (btn) navigateTo(btn.dataset.page);
  });

  // ── Glossary filter ──
  document.getElementById('plantFilterRow').addEventListener('click', e => {
    const chip = e.target.closest('[data-filter]');
    if (!chip) return;
    State.glossaryFilter = chip.dataset.filter;
    renderGlossary();
  });

  // ── Notification bell ──
  document.getElementById('notifBtn').addEventListener('click', () => {
    State.notifOpen ? closeNotifPanel() : openNotifPanel();
  });
  document.getElementById('notifCloseBtn').addEventListener('click', closeNotifPanel);
  document.getElementById('notifBackdrop').addEventListener('click', closeNotifPanel);

  // ── Reminders panel (water / delete) ──
  document.getElementById('remindersList').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-reminder-id]');
    if (delBtn) { deleteReminder(delBtn.dataset.reminderId); return; }
    const btn = e.target.closest('[data-plant-id]');
    if (btn) { waterPlant(btn.dataset.plantId); return; }
    const allBtn = e.target.closest('[data-water-all]');
    if (allBtn) State.plants.filter(p => waterStatus(p) === 'bad').forEach(p => waterPlant(p.id));
  });

  // ── Notif panel delete ──
  document.getElementById('notifPanelBody').addEventListener('click', e => {
    const delBtn = e.target.closest('[data-reminder-id]');
    if (delBtn) { deleteReminder(delBtn.dataset.reminderId); return; }
    const btn = e.target.closest('.notif-action-btn');
    if (!btn || !btn.dataset.plantId) return;
    const id = btn.dataset.plantId;
    if (btn.textContent.includes('Открыть')) {
      closeNotifPanel();
      openDetail(id);
    } else {
      waterPlant(id);
    }
  });

  // ── Add reminder inline form ──
  const reminderForm   = document.getElementById('reminderForm');
  const reminderBtn    = document.getElementById('addReminderBtn');
  const reminderText   = document.getElementById('reminderText');
  const reminderTime   = document.getElementById('reminderTime');

  function openReminderForm() {
    reminderForm.classList.remove('hidden');
    reminderBtn.classList.add('hidden');
    reminderText.focus();
  }

  function closeReminderForm() {
    reminderForm.classList.add('hidden');
    reminderBtn.classList.remove('hidden');
    reminderText.value = '';
    reminderTime.value = '';
  }

  function saveReminder() {
    const text = reminderText.value.trim();
    if (!text) { reminderText.focus(); return; }
    const time = reminderTime.value.trim() || 'Скоро';
    State.reminders.push({
      id: crypto.randomUUID(),
      icon: '📝',
      text,
      time,
      urgency: 'ok',
      auto: false,
    });
    saveReminders();
    renderRemindersList();
    renderNotifPanel();
    closeReminderForm();
  }

  reminderBtn.addEventListener('click', openReminderForm);
  document.getElementById('reminderCancelBtn').addEventListener('click', closeReminderForm);
  document.getElementById('reminderSaveBtn').addEventListener('click', saveReminder);
  reminderText.addEventListener('keydown', e => { if (e.key === 'Enter') reminderTime.focus(); });
  reminderTime.addEventListener('keydown', e => { if (e.key === 'Enter') saveReminder(); });

  // ── Detail overlay close on backdrop click ──
  document.getElementById('detailOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeDetail();
  });

  // ── Detail buttons ──
  document.getElementById('backBtn').addEventListener('click', closeDetail);
  document.getElementById('deleteBtnTop').addEventListener('click', deletePlant);

  document.getElementById('detailBody').addEventListener('click', e => {
    if (e.target.closest('.btn-water'))   waterPlant(State.selectedId);
    if (e.target.closest('.btn-advance')) advanceStage(State.selectedId);
  });

  // ── Modal buttons ──
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalBackBtn').addEventListener('click', () => {
    State.modal.step = 1; renderModal();
  });
  document.getElementById('confirmBtn').addEventListener('click', confirmAdd);

  document.getElementById('plantTypeGrid').addEventListener('click', e => {
    const btn = e.target.closest('[data-type-key]');
    if (btn) selectType(btn.dataset.typeKey);
  });
  document.getElementById('varietyList').addEventListener('click', e => {
    const btn = e.target.closest('[data-variety-key]');
    if (btn) selectVariety(btn.dataset.varietyKey);
  });

  document.getElementById('addModalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // ── Journal: click event → open plant detail ──
  document.getElementById('journalContent').addEventListener('click', e => {
    const row = e.target.closest('[data-plant-id]');
    if (row) openDetail(row.dataset.plantId);
  });

  // ── Settings: city search ──
  renderSettingsCity();

  document.getElementById('citySearchBtn').addEventListener('click', () => {
    searchCity(document.getElementById('cityInput').value);
  });

  document.getElementById('cityInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') searchCity(e.target.value);
  });

  document.getElementById('cityResults').addEventListener('click', e => {
    const item = e.target.closest('[data-lat]');
    if (item) selectCity(item.dataset.name, item.dataset.lat, item.dataset.lon);
  });

  // ── Settings ──
  document.getElementById('exportBtn').addEventListener('click', () => {
    const data = {
      plants: State.plants,
      reminders: State.reminders,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `podokosnik-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('importFile').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target.result);
        const plants    = Array.isArray(parsed.plants)    ? parsed.plants    : [];
        const reminders = Array.isArray(parsed.reminders) ? parsed.reminders : [];
        if (!plants.length && !reminders.length) throw new Error('empty');

        const merge = confirm(
          `Найдено: ${plants.length} растений, ${reminders.length} напоминаний.\n` +
          `Добавить к текущим данным? (Отмена — заменить всё)`
        );
        if (merge) {
          // Merge: skip duplicates by id
          const existingPlantIds    = new Set(State.plants.map(p => p.id));
          const existingReminderIds = new Set(State.reminders.map(r => r.id));
          plants.forEach(p    => { if (!existingPlantIds.has(p.id))       State.plants.push(p); });
          reminders.forEach(r => { if (!existingReminderIds.has(r.id)) State.reminders.push(r); });
        } else {
          State.plants    = plants;
          State.reminders = reminders;
        }
        saveState();
        saveReminders();
        renderPlantsSection();
        renderStats();
        renderRemindersList();
        renderNotifPanel();
        document.getElementById('importSub').textContent = `Импортировано: ${plants.length} растений, ${reminders.length} напоминаний`;
      } catch (_) {
        document.getElementById('importSub').textContent = 'Ошибка: неверный формат файла';
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  document.getElementById('resetBtn').addEventListener('click', () => {
    if (!confirm('Удалить все растения и напоминания? Это нельзя отменить.')) return;
    State.plants = [];
    State.reminders = [];
    saveState();
    saveReminders();
    renderPlantsSection();
    renderStats();
    renderRemindersList();
    renderNotifPanel();
    navigateTo('overview');
  });
}

document.addEventListener('DOMContentLoaded', init);
