'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   APP.JS — Seedling Tracker
   State → Render → Events
════════════════════════════════════════════════════════════════════════════ */

// ── State ────────────────────────────────────────────────────────────────────
const State = {
  plants: [],         // { id, typeKey, varietyKey, plantedAt, lastWatered }
  view: 'main',       // 'main' | 'detail'
  selectedId: null,
  modal: {
    open: false,
    step: 1,          // 1 = pick type, 2 = pick variety
    typeKey: null,
    varietyKey: null,
  },
};

function loadState() {
  try {
    const saved = localStorage.getItem('rassada_v3');
    if (saved) State.plants = JSON.parse(saved);
  } catch (_) { State.plants = []; }
}

function saveState() {
  localStorage.setItem('rassada_v3', JSON.stringify(State.plants));
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

// ── SVG Pot Generator ─────────────────────────────────────────────────────────
const POT_COLORS = [
  { body: '#C47040', hi: '#E0905A', lo: '#904A18', rim: '#D48050' },
  { body: '#B86030', hi: '#D88050', lo: '#884020', rim: '#C87040' },
  { body: '#CC8042', hi: '#ECAA62', lo: '#A05820', rim: '#DC9052' },
  { body: '#A86030', hi: '#C88050', lo: '#804020', rim: '#B87040' },
];

const SOIL_COLOR = '#3A1C08';

function plantSVG(stage, typeKey) {
  const FRUITS = { tomato:'🍅', cucumber:'🥒', pepper:'🌶️', basil:'🌿', eggplant:'🍆', cabbage:'🥬', zucchini:'🥒' };

  if (stage === 0) return '';

  if (stage === 1) return `
    <line x1="0" y1="0" x2="0" y2="-26" stroke="#388E3C" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M0,-20 C-3,-26 -17,-27 -15,-18 C-13,-10 -3,-17 0,-20Z" fill="#66BB6A"/>
    <path d="M0,-20 C3,-26  17,-27  15,-18 C 13,-10  3,-17  0,-20Z" fill="#57A857"/>
    <circle cx="0" cy="-28" r="3" fill="#81C784"/>`;

  if (stage === 2) return `
    <line x1="0" y1="0" x2="0" y2="-50" stroke="#2E7D32" stroke-width="2.8" stroke-linecap="round"/>
    <line x1="0" y1="-17" x2="-20" y2="-28" stroke="#388E3C" stroke-width="2" stroke-linecap="round"/>
    <path d="M-20,-28 C-26,-36 -42,-31 -38,-21 C-34,-13 -22,-23 -20,-28Z" fill="#4CAF50"/>
    <line x1="0" y1="-17" x2="20" y2="-28" stroke="#388E3C" stroke-width="2" stroke-linecap="round"/>
    <path d="M20,-28 C26,-36 42,-31 38,-21 C34,-13 22,-23 20,-28Z" fill="#43A047"/>
    <line x1="0" y1="-36" x2="-16" y2="-46" stroke="#388E3C" stroke-width="2" stroke-linecap="round"/>
    <path d="M-16,-46 C-21,-54 -34,-50 -31,-42 C-28,-34 -18,-44 -16,-46Z" fill="#66BB6A"/>
    <line x1="0" y1="-36" x2="16" y2="-46" stroke="#388E3C" stroke-width="2" stroke-linecap="round"/>
    <path d="M16,-46 C21,-54 34,-50 31,-42 C28,-34 18,-44 16,-46Z" fill="#66BB6A"/>`;

  // Stage 3 — full plant with fruit emoji
  const fr = FRUITS[typeKey] || '🌱';
  return `
    <line x1="0" y1="0" x2="0" y2="-62" stroke="#1B5E20" stroke-width="3.2" stroke-linecap="round"/>
    <line x1="0" y1="-20" x2="-24" y2="-33" stroke="#2E7D32" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M-24,-33 C-32,-42 -50,-36 -45,-25 C-40,-15 -26,-29 -24,-33Z" fill="#388E3C"/>
    <line x1="0" y1="-20" x2="24" y2="-33" stroke="#2E7D32" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M24,-33 C32,-42 50,-36 45,-25 C40,-15 26,-29 24,-33Z" fill="#388E3C"/>
    <line x1="0" y1="-43" x2="-18" y2="-54" stroke="#2E7D32" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-18,-54 C-24,-63 -38,-59 -34,-49 C-30,-41 -20,-52 -18,-54Z" fill="#43A047"/>
    <line x1="0" y1="-43" x2="18" y2="-54" stroke="#2E7D32" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M18,-54 C24,-63 38,-59 34,-49 C30,-41 20,-52 18,-54Z" fill="#43A047"/>
    <text x="0" y="-70" text-anchor="middle" font-size="22" dominant-baseline="auto">${fr}</text>`;
}

function buildPotSVG(plant, size = 92) {
  const v    = DB.getVariety(plant.typeKey, plant.varietyKey);
  const c    = POT_COLORS[v.potColor % POT_COLORS.length];
  const stage = currentStage(plant);
  const uid  = `pt${plant.id}`;
  const h    = Math.round(size * 1.6);

  return `<svg viewBox="0 0 100 150" width="${size}" height="${h}"
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
  </defs>

  <!-- Plant above pot (origin = soil surface) -->
  <g transform="translate(50,43)">${plantSVG(stage, plant.typeKey)}</g>

  <!-- Pot drop shadow -->
  <ellipse cx="50" cy="147" rx="42" ry="6" fill="rgba(0,0,0,0.22)"/>

  <!-- Pot body -->
  <path d="M18,52 L12,138 Q12,147 50,147 Q88,147 88,138 L82,52Z"
        fill="url(#pb-${uid})"/>

  <!-- Left shadow strip -->
  <path d="M18,52 L12,138 Q14,145 27,146 L26,54Z"
        fill="rgba(0,0,0,0.14)"/>
  <!-- Right highlight strip -->
  <path d="M82,52 L88,138 Q86,145 73,146 L74,54Z"
        fill="rgba(255,255,255,0.09)"/>

  <!-- Groove line -->
  <path d="M20,94 Q50,100 80,94"
        stroke="rgba(0,0,0,0.09)" stroke-width="1.5" fill="none" stroke-linecap="round"/>

  <!-- Rim front ellipse -->
  <ellipse cx="50" cy="50" rx="38" ry="10" fill="${c.rim}"/>
  <!-- Rim top face -->
  <ellipse cx="50" cy="46" rx="36" ry="9"  fill="${c.hi}"/>
  <!-- Rim inner edge -->
  <ellipse cx="50" cy="46" rx="32" ry="7.5" fill="#2A1206"/>

  <!-- Soil surface -->
  <ellipse cx="50" cy="44" rx="31" ry="7" fill="url(#sg-${uid})"/>
  <!-- Soil texture -->
  <ellipse cx="42" cy="42" rx="7" ry="2" fill="rgba(255,255,255,0.04)"/>
  <ellipse cx="58" cy="44" rx="5" ry="2" fill="rgba(255,255,255,0.03)"/>
</svg>`;
}

// ── Main view render ──────────────────────────────────────────────────────────
function renderWindowsill() {
  const sill = document.getElementById('sill');
  sill.innerHTML = '';

  State.plants.forEach(plant => {
    const v   = DB.getVariety(plant.typeKey, plant.varietyKey);
    const type = DB[plant.typeKey];
    const ws   = waterStatus(plant);

    const wrap = document.createElement('div');
    wrap.className = 'pot-wrap';
    wrap.dataset.id = plant.id;

    wrap.innerHTML = `
      ${buildPotSVG(plant, 88)}
      <div class="water-dot ${ws}"></div>
      <div class="pot-label">
        ${type.name}
        <span class="pot-label-variety">${v.name}</span>
      </div>`;

    wrap.addEventListener('click', () => openDetail(plant.id));
    sill.appendChild(wrap);
  });

  // Add button
  const addBtn = document.createElement('div');
  addBtn.className = 'add-pot-btn';
  addBtn.innerHTML = `
    <svg fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    <span>Новый<br>горшок</span>`;
  addBtn.addEventListener('click', openModal);
  sill.appendChild(addBtn);

  document.getElementById('emptyHint').classList.toggle('hidden', State.plants.length > 0);
}

// ── Detail view ───────────────────────────────────────────────────────────────
function openDetail(id) {
  const plant = State.plants.find(p => p.id === id);
  if (!plant) return;

  State.selectedId = id;
  State.view = 'detail';

  // Zoom-out animation on main view
  const mainView = document.getElementById('mainView');
  mainView.classList.add('zooming-out');

  // Dim other pots on windowsill
  document.querySelectorAll('.pot-wrap').forEach(el => {
    if (el.dataset.id !== String(id)) el.classList.add('dimmed');
  });

  setTimeout(() => {
    mainView.classList.remove('active', 'zooming-out');
    renderDetail(plant);
    const dv = document.getElementById('detailView');
    dv.classList.add('active', 'entering');
    setTimeout(() => dv.classList.remove('entering'), 500);
  }, 440);
}

function renderDetail(plant) {
  const v     = DB.getVariety(plant.typeKey, plant.varietyKey);
  const type  = DB[plant.typeKey];
  const stage = currentStage(plant);
  const days  = daysSince(plant.plantedAt);
  const ws    = waterStatus(plant);

  // Hero
  document.getElementById('heroPot').innerHTML = buildPotSVG(plant, 110);
  document.getElementById('heroTitle').textContent = v.fullName;
  document.getElementById('heroVarietyTag').textContent = v.name;
  document.getElementById('heroMeta').textContent =
    'Посеяно ' + fmtDate(plant.plantedAt);
  document.getElementById('heroDays').innerHTML =
    `<span>${days}</span> <span class="hero-days-label">день</span>`;

  // Stages bar
  const stagesEl = document.getElementById('stagesBar');
  stagesEl.innerHTML = v.stages.map((s, i) => `
    <div class="stage-item ${i < stage ? 'done' : ''} ${i === stage ? 'active' : ''}">
      ${i < stage ? '✓ ' : ''}${s}
    </div>`).join('');

  // Current tip
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

  // Light card
  document.getElementById('lightCard').innerHTML = `
    <div class="card-head"><span class="card-icon">${v.lightIcon}</span>Освещение</div>
    <p>${v.light}<br><br>${'Следите, чтобы рассада не вытягивалась — это первый признак нехватки света.'}</p>`;

  // Cover section
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

  // Watering advice
  document.getElementById('waterAdviceCard').innerHTML = `
    <div class="card-head"><span class="card-icon">🚿</span>Рекомендации по поливу</div>
    <p>${v.waterAdvice}</p>`;

  // Variety card
  document.getElementById('varietyCard').innerHTML = `
    <div class="card-head"><span class="card-icon">📋</span>Особенности сорта</div>
    <p>${v.varietyAdvice}</p>
    <div class="growth-note" style="margin-top:10px">${v.growthNote}</div>`;

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

function closeDetail() {
  State.view = 'main';
  State.selectedId = null;

  const dv = document.getElementById('detailView');
  dv.classList.remove('active');

  const mv = document.getElementById('mainView');
  mv.classList.add('active', 'zooming-back');
  setTimeout(() => mv.classList.remove('zooming-back'), 420);

  // Un-dim pots
  document.querySelectorAll('.pot-wrap').forEach(el => el.classList.remove('dimmed'));
}

// ── Plant actions ─────────────────────────────────────────────────────────────
function waterPlant(id) {
  const plant = State.plants.find(p => p.id === id);
  if (!plant) return;
  plant.lastWatered = new Date().toISOString();
  saveState();
  renderWindowsill();
  renderDetail(plant);
}

function advanceStage(id) {
  const plant = State.plants.find(p => p.id === id);
  if (!plant) return;
  const v     = DB.getVariety(plant.typeKey, plant.varietyKey);
  const stage = currentStage(plant);
  if (stage >= v.stages.length - 1) return;
  plant.stage = stage + 1;
  saveState();
  renderWindowsill();
  renderDetail(plant);
}

function deletePlant() {
  if (!State.selectedId) return;
  if (!confirm('Удалить этот горшочек?')) return;
  State.plants = State.plants.filter(p => p.id !== State.selectedId);
  saveState();
  renderWindowsill();
  closeDetail();
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
  const grid = document.getElementById('plantTypeGrid');
  grid.innerHTML = DB.getAllTypes().map(t => `
    <button class="plant-type-btn ${State.modal.typeKey === t.key ? 'selected' : ''}"
            data-type-key="${t.key}">
      <span class="plant-type-emoji">${t.emoji}</span>
      <span class="plant-type-name">${t.name}</span>
    </button>`).join('');
}

function selectType(key) {
  State.modal.typeKey = key;
  State.modal.varietyKey = null;
  State.modal.step = 2;
  renderModal();
}

function renderVarietyList() {
  const t = DB[State.modal.typeKey];
  document.getElementById('step2TypeName').textContent = t.name + ' — выберите сорт';

  const list = document.getElementById('varietyList');
  list.innerHTML = DB.getVarietyList(State.modal.typeKey).map(v => `
    <button class="variety-btn ${State.modal.varietyKey === v.key ? 'selected' : ''}"
            data-variety-key="${v.key}">
      <span class="variety-emoji">${v.emoji}</span>
      <div class="variety-info">
        <div class="variety-name">${v.name}</div>
        <div class="variety-desc">${v.fullName}</div>
      </div>
      <div class="variety-check">${State.modal.varietyKey === v.key ? '✓' : ''}</div>
    </button>`).join('');

  document.getElementById('confirmBtn').disabled = !State.modal.varietyKey;

  // Set today as default date
  const dateInput = document.getElementById('fDate');
  if (!dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
}

function selectVariety(key) {
  State.modal.varietyKey = key;
  renderVarietyList();
}

function goBackToStep1() {
  State.modal.step = 1;
  renderModal();
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
  renderWindowsill();
  closeModal();

  // Auto-open detail after animation settles
  setTimeout(() => openDetail(plant.id), 300);
}

// ── Sky decoration ────────────────────────────────────────────────────────────
function buildSky() {
  const sky = document.getElementById('skyScene');

  // Clouds
  const clouds = [
    { top: 10, w: 130, h: 44, dur: 95,  delay: 0  },
    { top:  7, w:  80, h: 30, dur: 95,  delay: 20 },
    { top: 22, w: 110, h: 38, dur: 130, delay: 35 },
    { top: 18, w:  75, h: 28, dur: 130, delay: 60 },
    { top:  5, w: 150, h: 48, dur: 115, delay: 75 },
    { top: 28, w:  90, h: 32, dur: 105, delay: 10 },
  ];
  clouds.forEach(cfg => {
    const el = document.createElement('div');
    el.className = 'cloud';
    el.style.cssText = `
      top:${cfg.top}%;
      width:${cfg.w}px; height:${cfg.h}px;
      animation: drift ${cfg.dur}s linear -${cfg.delay}s infinite;`;
    sky.appendChild(el);
  });

  // Garden hills
  [
    { left: -5, width: 40, height: 90 },
    { left: 30, width: 45, height: 70 },
    { left: 65, width: 50, height: 100 },
  ].forEach(cfg => {
    const hill = document.createElement('div');
    hill.className = 'garden-hill';
    hill.style.cssText = `left:${cfg.left}%;width:${cfg.width}%;height:${cfg.height}px`;
    sky.appendChild(hill);
  });

  // Trees
  [
    { left: 8, trunkH: 50, crownW: 50, crownH: 70 },
    { left: 18, trunkH: 35, crownW: 38, crownH: 55 },
    { left: 72, trunkH: 60, crownW: 60, crownH: 85 },
    { left: 82, trunkH: 40, crownW: 44, crownH: 62 },
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

// ── Date display ──────────────────────────────────────────────────────────────
function updateDateDisplay() {
  const el = document.getElementById('headerDate');
  if (el) el.textContent = new Date().toLocaleDateString('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
  loadState();
  buildSky();
  updateDateDisplay();
  renderWindowsill();

  // Auto-refresh every minute for timers
  setInterval(() => {
    renderWindowsill();
    if (State.view === 'detail' && State.selectedId) {
      const p = State.plants.find(pl => pl.id === State.selectedId);
      if (p) renderDetail(p);
    }
    updateDateDisplay();
  }, 60_000);

  // Static buttons
  document.getElementById('backBtn').addEventListener('click', closeDetail);
  document.getElementById('deleteBtnTop').addEventListener('click', deletePlant);
  document.getElementById('deleteBtnBottom').addEventListener('click', deletePlant);
  document.getElementById('modalCloseBtn').addEventListener('click', closeModal);
  document.getElementById('modalBackBtn').addEventListener('click', goBackToStep1);
  document.getElementById('confirmBtn').addEventListener('click', confirmAdd);

  // Event delegation: plant type grid
  document.getElementById('plantTypeGrid').addEventListener('click', e => {
    const btn = e.target.closest('[data-type-key]');
    if (btn) selectType(btn.dataset.typeKey);
  });

  // Event delegation: variety list
  document.getElementById('varietyList').addEventListener('click', e => {
    const btn = e.target.closest('[data-variety-key]');
    if (btn) selectVariety(btn.dataset.varietyKey);
  });

  // Event delegation: detail body (water + advance)
  document.getElementById('detailBody').addEventListener('click', e => {
    if (e.target.closest('.btn-water'))   waterPlant(State.selectedId);
    if (e.target.closest('.btn-advance')) advanceStage(State.selectedId);
  });

  // Close modal on overlay click
  document.getElementById('addModalOverlay').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
}

document.addEventListener('DOMContentLoaded', init);
