"use strict";

const $ = (id) => document.getElementById(id);
const KEY = "staemmeCoachStateV5";
const SETTINGS_KEY = "staemmeCoachPlannerV07";

let state = null;
let settings = loadSettings();

const BUILDING_DATA = {
  "Hauptgebäude": { max: 30, base: [90, 80, 70], factor: [1.26, 1.275, 1.26], role: "speed" },
  "Kaserne": { max: 25, base: [200, 170, 90], factor: [1.26, 1.28, 1.26], role: "military" },
  "Stall": { max: 20, base: [270, 240, 260], factor: [1.26, 1.275, 1.26], role: "military" },
  "Werkstatt": { max: 15, base: [300, 240, 260], factor: [1.26, 1.275, 1.26], role: "military" },
  "Schmiede": { max: 20, base: [220, 180, 240], factor: [1.26, 1.275, 1.26], role: "unlock" },
  "Versammlungsplatz": { max: 1, base: [10, 40, 30], factor: [1, 1, 1], role: "utility" },
  "Marktplatz": { max: 25, base: [100, 100, 100], factor: [1.26, 1.275, 1.26], role: "unlock" },
  "Holzfäller": { max: 30, base: [50, 60, 40], factor: [1.25, 1.275, 1.245], role: "eco" },
  "Lehmgrube": { max: 30, base: [65, 50, 40], factor: [1.27, 1.265, 1.24], role: "eco" },
  "Eisenmine": { max: 30, base: [75, 65, 70], factor: [1.252, 1.275, 1.24], role: "eco" },
  "Bauernhof": { max: 30, base: [45, 40, 30], factor: [1.3, 1.32, 1.29], role: "capacity" },
  "Speicher": { max: 30, base: [60, 50, 40], factor: [1.265, 1.27, 1.245], role: "capacity" },
  "Versteck": { max: 10, base: [50, 60, 50], factor: [1.25, 1.25, 1.25], role: "defense" },
  "Wall": { max: 20, base: [50, 100, 20], factor: [1.26, 1.275, 1.26], role: "defense" },
  "Adelshof": { max: 1, base: [15000, 25000, 10000], factor: [1, 1, 1], role: "unlock" }
};

const fmt = (v) => Number.isFinite(v) ? v.toLocaleString("de-DE") : "–";
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function looksLikeCoachState(value) {
  return value &&
    typeof value === "object" &&
    value.buildings &&
    value.resources &&
    (value.village || value.page);
}

function loadState() {
  // Current storage key.
  try {
    const current = JSON.parse(localStorage.getItem(KEY));
    if (looksLikeCoachState(current)) return current;
  } catch {}

  // Migration: older coach versions used different storage keys.
  const legacyKeys = [
    "staemmeCoachState",
    "staemmeCoachStateV3",
    "staemmeCoachStateV4",
    "staemmeCoachData",
    "staemme-coach-state",
    "coachData"
  ];

  for (const key of legacyKeys) {
    try {
      const candidate = JSON.parse(localStorage.getItem(key));
      if (looksLikeCoachState(candidate)) {
        localStorage.setItem(KEY, JSON.stringify(candidate));
        return candidate;
      }
    } catch {}
  }

  // Last-resort migration: scan only localStorage values that resemble coach data.
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !/staemme|coach/i.test(key)) continue;
    try {
      const candidate = JSON.parse(localStorage.getItem(key));
      if (looksLikeCoachState(candidate)) {
        localStorage.setItem(KEY, JSON.stringify(candidate));
        return candidate;
      }
    } catch {}
  }

  return null;
}
function loadSettings() {
  try {
    return {
      mode: "off",
      horizon: 24,
      strategyDepth: 8,
      offlineHours: 8,
      offlineBuffer: 30,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY))
    };
  } catch {
    // Migrate settings from v0.6.x when available.
    try {
      const old = JSON.parse(localStorage.getItem("staemmeCoachPlannerV06"));
      return {
        mode: "off",
        horizon: 24,
        strategyDepth: 8,
        offlineHours: 8,
        offlineBuffer: 30,
        ...(old || {})
      };
    } catch {
      return {
        mode: "off",
        horizon: 24,
        strategyDepth: 8,
        offlineHours: 8,
        offlineBuffer: 30
      };
    }
  }
}
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function saveState(v) {
  state = v;
  localStorage.setItem(KEY, JSON.stringify(v));
  render();
}
function queueSeconds() {
  return (state.buildQueue || []).reduce((sum, x) => sum + (+x.remainingSeconds || 0), 0);
}
function durationText(seconds) {
  seconds = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} Std. ${m} Min.`;
}
function effectiveLevels() {
  const levels = {...(state.buildings || {})};
  for (const item of state.buildQueue || []) {
    if (Number.isFinite(item.targetLevel)) {
      levels[item.building] = Math.max(levels[item.building] || 0, item.targetLevel);
    }
  }
  return levels;
}
function nextCost(name, currentLevel) {
  const d = BUILDING_DATA[name];
  if (!d) return null;
  const targetLevel = currentLevel + 1;
  return {
    wood: Math.round(d.base[0] * Math.pow(d.factor[0], targetLevel - 1)),
    clay: Math.round(d.base[1] * Math.pow(d.factor[1], targetLevel - 1)),
    iron: Math.round(d.base[2] * Math.pow(d.factor[2], targetLevel - 1))
  };
}
function resourceAt(hours) {
  const r = state.resources || {};
  const p = state.production || {};
  const storage = Number.isFinite(r.storage) ? r.storage : Infinity;
  return {
    wood: Math.min(storage, (r.wood || 0) + (p.woodPerHour || 0) * hours),
    clay: Math.min(storage, (r.clay || 0) + (p.clayPerHour || 0) * hours),
    iron: Math.min(storage, (r.iron || 0) + (p.ironPerHour || 0) * hours)
  };
}
function affordability(cost, hours = 0) {
  if (!cost) return { affordable: false, waitHours: null };
  const future = resourceAt(hours);
  const affordable = future.wood >= cost.wood && future.clay >= cost.clay && future.iron >= cost.iron;
  if (affordable) return { affordable: true, waitHours: 0 };

  const r = state.resources || {};
  const p = state.production || {};
  const waits = [
    [(cost.wood - (r.wood || 0)), p.woodPerHour || 0],
    [(cost.clay - (r.clay || 0)), p.clayPerHour || 0],
    [(cost.iron - (r.iron || 0)), p.ironPerHour || 0]
  ].map(([missing, perHour]) => missing <= 0 ? 0 : (perHour > 0 ? missing / perHour : Infinity));
  return { affordable: false, waitHours: Math.max(...waits) };
}
function prerequisitesMet(name, levels) {
  const req = {
    "Stall": [["Hauptgebäude", 10], ["Kaserne", 5], ["Schmiede", 5]],
    "Werkstatt": [["Hauptgebäude", 10], ["Schmiede", 10]],
    "Adelshof": [["Hauptgebäude", 20], ["Schmiede", 20], ["Marktplatz", 10]]
  }[name] || [];
  return req.every(([b, l]) => (levels[b] || 0) >= l);
}
function productionImbalance() {
  const p = state.production || {};
  const values = {
    "Holzfäller": p.woodPerHour || 0,
    "Lehmgrube": p.clayPerHour || 0,
    "Eisenmine": p.ironPerHour || 0
  };
  const avg = Object.values(values).reduce((a,b)=>a+b,0) / 3 || 1;
  return Object.fromEntries(Object.entries(values).map(([k,v]) => [k, (avg-v)/avg]));
}
function scoreCandidate(name, level, levels) {
  const data = BUILDING_DATA[name];
  const target = level + 1;
  const cost = nextCost(name, level);
  const pay = affordability(cost, settings.horizon);
  const freePop = Number.isFinite(state.population?.max) && Number.isFinite(state.population?.current)
    ? state.population.max - state.population.current : null;
  const storage = state.resources?.storage || 0;
  const future = resourceAt(settings.horizon);
  const maxFuture = Math.max(future.wood, future.clay, future.iron);
  const imbalance = productionImbalance();

  let score = 0;
  const reasons = [];

  if (!prerequisitesMet(name, levels)) return null;
  if (target > data.max) return null;

  if (pay.affordable) {
    score += 14;
    reasons.push(`innerhalb von ${settings.horizon} Std. bezahlbar`);
  } else if (Number.isFinite(pay.waitHours)) {
    score += clamp(10 - pay.waitHours * 2, -10, 10);
    reasons.push(`voraussichtlich in ${pay.waitHours.toFixed(1).replace(".", ",")} Std. bezahlbar`);
  }

  if (data.role === "eco") {
    const gap = imbalance[name] || 0;
    score += 22 + gap * 35;
    if (gap > 0.08) reasons.push("gleicht die schwächere Produktion aus");
    else reasons.push("erhöht die dauerhafte Produktion");
  }

  if (data.role === "capacity") {
    if (name === "Speicher") {
      const fillRatio = storage > 0 ? maxFuture / storage : 0;
      score += fillRatio > 0.9 ? 32 : fillRatio > 0.75 ? 20 : 5;
      reasons.push(fillRatio > 0.9 ? "verhindert baldigen Rohstoffüberlauf" : "schafft Reserve für größere Ausbauten");
    }
    if (name === "Bauernhof") {
      const freeRatio = freePop !== null && state.population.max ? freePop / state.population.max : 1;
      score += freeRatio < 0.15 ? 36 : freeRatio < 0.3 ? 20 : 4;
      reasons.push(freeRatio < 0.3 ? "freie Bevölkerung wird knapp" : "bereitet weiteres Truppenwachstum vor");
    }
  }

  if (data.role === "speed") {
    score += level < 20 ? 18 : level < 25 ? 8 : -6;
    reasons.push(level < 20 ? "beschleunigt den weiteren Ausbau" : "weitere Stufen bringen aktuell weniger Nutzen");
  }

  if (data.role === "military") {
    const weights = settings.mode === "off"
      ? {"Kaserne": 18, "Stall": 28, "Werkstatt": 8}
      : {"Kaserne": 22, "Stall": 12, "Werkstatt": 4};
    score += weights[name] || 0;
    if (name === "Stall" && settings.mode === "off") reasons.push("beschleunigt die LK-Produktion im OFF-Dorf");
    if (name === "Kaserne") reasons.push("beschleunigt die Infanterieproduktion");
  }

  if (data.role === "unlock") {
    if (name === "Schmiede") {
      const snobGoal = (levels["Adelshof"] || 0) === 0;
      score += snobGoal ? 30 : 8;
      reasons.push(snobGoal ? "bringt dich näher an den Adelshof" : "schaltet weitere Forschungen frei");
    }
    if (name === "Marktplatz") {
      const snobGoal = (levels["Adelshof"] || 0) === 0;
      score += snobGoal && level < 10 ? 26 : 3;
      reasons.push(snobGoal && level < 10 ? "Adelshof-Voraussetzung" : "verbessert Ressourcentransport");
    }
    if (name === "Adelshof") {
      score += 100;
      reasons.push("ermöglicht Adelsgeschlechter");
    }
  }

  if (data.role === "defense") {
    score += settings.mode === "def" ? 20 : -8;
    reasons.push(settings.mode === "def" ? "passt zum DEF-Ziel" : "für ein OFF-Dorf derzeit nachrangig");
  }

  // Prevent overbuilding HQ while several HQ levels are already queued.
  const queuedSame = (state.buildQueue || []).filter(x => x.building === name).length;
  score -= queuedSame * 12;
  if (queuedSame) reasons.push(`${queuedSame} Stufe(n) bereits in der Queue`);

  // Early-game target bands for an OFF village.
  const offTargets = {
    "Hauptgebäude": 20, "Kaserne": 10, "Stall": 10, "Schmiede": 10,
    "Marktplatz": 10, "Holzfäller": 25, "Lehmgrube": 25, "Eisenmine": 25,
    "Bauernhof": 18, "Speicher": 20
  };
  if (settings.mode === "off" && offTargets[name]) {
    if (level < offTargets[name]) score += 10;
    else score -= 12;
  }

  const totalCost = cost.wood + cost.clay + cost.iron;
  score -= Math.log10(Math.max(totalCost, 1)) * 2;

  return {name, level, target, cost, score, reasons, pay};
}
function rankBuildings() {
  const levels = effectiveLevels();
  const candidates = [];
  for (const name of Object.keys(BUILDING_DATA)) {
    const level = levels[name] || 0;
    const c = scoreCandidate(name, level, levels);
    if (c) candidates.push(c);
  }
  return candidates.sort((a,b) => b.score-a.score);
}

function detectGamePhase(levels) {
  const snob = levels["Adelshof"] || 0;
  const hq = levels["Hauptgebäude"] || 0;
  const smith = levels["Schmiede"] || 0;
  const market = levels["Marktplatz"] || 0;
  const ecoAvg = (
    (levels["Holzfäller"] || 0) +
    (levels["Lehmgrube"] || 0) +
    (levels["Eisenmine"] || 0)
  ) / 3;

  if (snob > 0) return {
    id: "noble",
    label: "Adelsphase",
    note: "Adelshof vorhanden: Wirtschaft, Truppen und Adelsgeschlechter ausbalancieren."
  };
  if (hq >= 20 && smith >= 15 && market >= 10) return {
    id: "noble-prep",
    label: "Adelshof-Vorbereitung",
    note: "Die Kernvoraussetzungen sind weit fortgeschritten. Der Weg zum Adelshof wird priorisiert."
  };
  if (ecoAvg >= 22 || hq >= 15) return {
    id: "build-up",
    label: "Aufbauphase",
    note: "Wirtschaft und militärische Produktionsgebäude werden gemeinsam ausgebaut."
  };
  return {
    id: "early",
    label: "Startphase",
    note: "Schnelle Wirtschaftsentwicklung und grundlegende Militärproduktion stehen im Vordergrund."
  };
}

function cloneSimulationState() {
  return {
    levels: effectiveLevels(),
    resources: {
      wood: state.resources?.wood || 0,
      clay: state.resources?.clay || 0,
      iron: state.resources?.iron || 0
    },
    production: {
      wood: state.production?.woodPerHour || 0,
      clay: state.production?.clayPerHour || 0,
      iron: state.production?.ironPerHour || 0
    },
    storage: state.resources?.storage || Infinity,
    elapsedHours: queueSeconds() / 3600,
    queueHours: queueSeconds() / 3600,
    population: {
      current: state.population?.current ?? null,
      max: state.population?.max ?? null
    }
  };
}

function exactBuildOption(name, targetLevel) {
  const option = state.buildOptions?.[name];
  if (!option) return null;
  if (option.targetLevel !== targetLevel) return null;
  if (!Number.isFinite(option.durationSeconds) || option.durationSeconds <= 0) return null;
  return option;
}

function simulatedBuildHours(name, targetLevel, levels) {
  const exact = exactBuildOption(name, targetLevel);
  if (exact) return {
    hours: exact.durationSeconds / 3600,
    exact: true,
    source: exact.source || "game-main-page"
  };

  // Für spätere Stufen, die auf der aktuellen Spielseite noch nicht auswählbar
  // sind, bleibt eine gekennzeichnete Hochrechnung notwendig.
  const base = {
    "Hauptgebäude": 0.45, "Kaserne": 0.55, "Stall": 0.75, "Werkstatt": 0.9,
    "Schmiede": 0.7, "Marktplatz": 0.55, "Holzfäller": 0.6, "Lehmgrube": 0.6,
    "Eisenmine": 0.62, "Bauernhof": 0.65, "Speicher": 0.6,
    "Versteck": 0.35, "Wall": 0.55, "Adelshof": 2.5
  }[name] || 0.7;

  const hq = levels["Hauptgebäude"] || 1;
  const hqFactor = clamp(1.35 - hq * 0.017, 0.58, 1.3);
  const levelFactor = 1 + Math.max(0, targetLevel - 10) * 0.075;
  return {
    hours: base * levelFactor * hqFactor,
    exact: false,
    source: "strategy-estimate"
  };
}

function advanceSimulation(sim, hours) {
  if (!(hours > 0)) return;
  sim.resources.wood = Math.min(sim.storage, sim.resources.wood + sim.production.wood * hours);
  sim.resources.clay = Math.min(sim.storage, sim.resources.clay + sim.production.clay * hours);
  sim.resources.iron = Math.min(sim.storage, sim.resources.iron + sim.production.iron * hours);
  sim.elapsedHours += hours;
}

function simulatedWaitHours(sim, cost) {
  const parts = [
    [cost.wood - sim.resources.wood, sim.production.wood],
    [cost.clay - sim.resources.clay, sim.production.clay],
    [cost.iron - sim.resources.iron, sim.production.iron]
  ];
  return Math.max(...parts.map(([missing, rate]) => {
    if (missing <= 0) return 0;
    return rate > 0 ? missing / rate : Infinity;
  }));
}

function applyProductionUpgrade(sim, name, oldLevel) {
  const map = {
    "Holzfäller": "wood",
    "Lehmgrube": "clay",
    "Eisenmine": "iron"
  };
  const resource = map[name];
  if (!resource) return;

  // Relative Näherung aus der aktuellen echten Produktion.
  const multiplier = oldLevel > 0 ? Math.pow(1.163, 1) : 1;
  sim.production[resource] *= multiplier;
}

function applyCapacityUpgrade(sim, name) {
  if (name === "Speicher" && Number.isFinite(sim.storage)) {
    sim.storage = Math.round(sim.storage * 1.229);
  }
  if (name === "Bauernhof" && Number.isFinite(sim.population.max)) {
    sim.population.max = Math.round(sim.population.max * 1.17);
  }
}

function candidateForSimulation(name, sim, stepIndex) {
  const level = sim.levels[name] || 0;
  const originalState = state;

  // Temporarily expose simulated levels/resources to reuse the proven score model.
  const pseudoState = {
    ...state,
    buildings: sim.levels,
    buildQueue: [],
    resources: {
      wood: sim.resources.wood,
      clay: sim.resources.clay,
      iron: sim.resources.iron,
      storage: sim.storage
    },
    production: {
      woodPerHour: sim.production.wood,
      clayPerHour: sim.production.clay,
      ironPerHour: sim.production.iron
    },
    population: sim.population
  };

  state = pseudoState;
  const candidate = scoreCandidate(name, level, sim.levels);
  state = originalState;

  if (!candidate) return null;

  // Strategy bonuses prevent repeating one building too aggressively.
  const phase = detectGamePhase(sim.levels);
  if (phase.id === "build-up" && settings.mode === "off") {
    if (name === "Stall" && level < 5) candidate.score += 22;
    if (name === "Kaserne" && level < 7) candidate.score += 14;
    if (name === "Eisenmine" && level < 22) candidate.score += 12;
  }
  if (phase.id === "noble-prep") {
    if (name === "Schmiede" && level < 20) candidate.score += 24;
    if (name === "Marktplatz" && level < 10) candidate.score += 24;
    if (name === "Hauptgebäude" && level < 20) candidate.score += 20;
  }

  if (stepIndex > 0 && name === "Hauptgebäude") candidate.score -= 4;
  return candidate;
}

function buildStrategyPlan() {
  if (!looksLikeCoachState(state)) return null;

  const sim = cloneSimulationState();
  const horizon = settings.horizon;
  const maxSteps = settings.strategyDepth || 8;
  const steps = [];

  // Existing queue occupies the initial timeline, but resources continue growing.
  advanceSimulation(sim, sim.queueHours);

  for (let i = 0; i < maxSteps; i++) {
    const candidates = Object.keys(BUILDING_DATA)
      .map(name => candidateForSimulation(name, sim, i))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const choice = candidates[0];
    if (!choice) break;

    const wait = simulatedWaitHours(sim, choice.cost);
    if (!Number.isFinite(wait)) break;

    const duration = simulatedBuildHours(choice.name, choice.target, sim.levels);
    const buildHours = duration.hours;
    const startHour = sim.elapsedHours + wait;
    const finishHour = startHour + buildHours;

    if (startHour > horizon && steps.length > 0) break;

    advanceSimulation(sim, wait);
    sim.resources.wood -= choice.cost.wood;
    sim.resources.clay -= choice.cost.clay;
    sim.resources.iron -= choice.cost.iron;

    const oldLevel = sim.levels[choice.name] || 0;
    sim.levels[choice.name] = choice.target;
    advanceSimulation(sim, buildHours);
    applyProductionUpgrade(sim, choice.name, oldLevel);
    applyCapacityUpgrade(sim, choice.name);

    steps.push({
      ...choice,
      startHour,
      finishHour,
      waitHours: wait,
      buildHours,
      durationExact: duration.exact,
      durationSource: duration.source,
      phase: detectGamePhase(sim.levels).label
    });

    if (sim.elapsedHours >= horizon) break;
  }

  return {
    phase: detectGamePhase(effectiveLevels()),
    steps,
    horizon,
    coveredHours: sim.elapsedHours,
    remaining: sim.resources
  };
}

function clockText(hoursFromNow) {
  const date = new Date(Date.now() + Math.max(0, hoursFromNow) * 3600000);
  return date.toLocaleTimeString("de-DE", {hour: "2-digit", minute: "2-digit"});
}

function renderStrategyPlan() {
  const plan = buildStrategyPlan();
  const phaseLabel = $("phaseLabel");
  const phaseNote = $("phaseNote");
  const target = $("strategyTarget");
  const timeline = $("strategyTimeline");
  const coverage = $("strategyCoverage");

  if (!plan || !plan.steps.length) {
    phaseLabel.textContent = "–";
    phaseNote.textContent = "Nach der Synchronisierung wird die Spielphase erkannt.";
    target.textContent = "–";
    timeline.innerHTML = "";
    coverage.textContent = "–";
    return;
  }

  phaseLabel.textContent = plan.phase.label;
  phaseNote.textContent = plan.phase.note;
  target.textContent = `${plan.steps[0].name} ${plan.steps[0].target}`;
  coverage.textContent = plan.coveredHours >= plan.horizon
    ? `Plan deckt ungefähr ${plan.horizon} Stunden ab.`
    : `Plan deckt ungefähr ${plan.coveredHours.toFixed(1).replace(".", ",")} Stunden ab.`;

  timeline.innerHTML = "";
  plan.steps.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = "strategy-step";
    row.innerHTML = `
      <div class="strategy-number">${index + 1}</div>
      <div class="strategy-main">
        <strong>${step.name} ${step.target}</strong>
        <small>${reasonText(step)}</small>
        <small>${costText(candidateCost(step))}</small>
      </div>
      <div class="strategy-time">
        <strong>${clockText(step.startHour)}</strong>
        <small>${step.durationExact ? "exakt bis" : "geschätzt bis"} ${clockText(step.finishHour)}</small>
      </div>`;
    timeline.appendChild(row);
  });

  const exactCount = plan.steps.filter(step => step.durationExact).length;
  $("exactTimeStatus").textContent = exactCount
    ? `${exactCount} Bauzeit${exactCount === 1 ? "" : "en"} direkt aus dem Spiel übernommen.`
    : "Noch keine exakte Bauzeit importiert – Tampermonkey-Script v0.5.3 installieren.";

  $("strategyDebug").textContent = JSON.stringify({
    phase: plan.phase,
    horizonHours: plan.horizon,
    coveredHours: Math.round(plan.coveredHours * 100) / 100,
    note: "Zeitangaben sind strategische Näherungen; echte Bauzeiten können abweichen.",
    steps: plan.steps.map(step => ({
      building: step.name,
      targetLevel: step.target,
      score: Math.round(step.score * 10) / 10,
      startInHours: Math.round(step.startHour * 100) / 100,
      finishInHours: Math.round(step.finishHour * 100) / 100,
      resourceWaitHours: Math.round(step.waitHours * 100) / 100,
      buildHours: Math.round(step.buildHours * 100) / 100,
      durationExact: step.durationExact,
      durationSource: step.durationSource,
      reasons: step.reasons
    }))
  }, null, 2);
}


function offlineTargetHours() {
  return Math.max(1, +settings.offlineHours || 8) + Math.max(0, +settings.offlineBuffer || 0) / 60;
}

function buildOfflinePlan() {
  if (!looksLikeCoachState(state)) return null;

  const targetHours = offlineTargetHours();
  const sim = cloneSimulationState();
  const queueHours = queueSeconds() / 3600;
  const planned = [];
  const maxSteps = 20;

  // Die laufende Queue zählt vollständig zur Offline-Abdeckung.
  advanceSimulation(sim, queueHours);

  for (let i = 0; i < maxSteps && sim.elapsedHours < targetHours; i++) {
    const candidates = Object.keys(BUILDING_DATA)
      .map(name => candidateForSimulation(name, sim, i))
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);

    const choice = candidates[0];
    if (!choice) break;

    const wait = simulatedWaitHours(sim, choice.cost);
    if (!Number.isFinite(wait)) break;

    advanceSimulation(sim, wait);

    const duration = simulatedBuildHours(choice.name, choice.target, sim.levels);
    if (!duration || !Number.isFinite(duration.hours) || duration.hours <= 0) break;

    const startHour = sim.elapsedHours;

    sim.resources.wood -= choice.cost.wood;
    sim.resources.clay -= choice.cost.clay;
    sim.resources.iron -= choice.cost.iron;

    const oldLevel = sim.levels[choice.name] || 0;
    sim.levels[choice.name] = choice.target;

    advanceSimulation(sim, duration.hours);
    applyProductionUpgrade(sim, choice.name, oldLevel);
    applyCapacityUpgrade(sim, choice.name);

    planned.push({
      ...choice,
      startHour,
      finishHour: sim.elapsedHours,
      waitHours: wait,
      buildHours: duration.hours,
      durationExact: duration.exact,
      durationSource: duration.source
    });
  }

  const covered = sim.elapsedHours;
  const shortage = Math.max(0, targetHours - covered);
  const surplus = Math.max(0, covered - targetHours);

  return {
    targetHours,
    queueHours,
    planned,
    covered,
    shortage,
    surplus,
    enough: covered >= targetHours
  };
}
function endClockText(hoursFromNow) {
  return new Date(Date.now() + hoursFromNow * 3600000).toLocaleString("de-DE", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}


function queueEndText() {
  const seconds = queueSeconds();
  if (!(seconds > 0)) return "Keine laufende Queue";
  return new Date(Date.now() + seconds * 1000).toLocaleTimeString("de-DE", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function renderLiveDashboard() {
  const plan = buildOfflinePlan();
  const strategy = buildStrategyPlan();
  const next = strategy?.steps?.[0] || rankBuildings()?.[0] || null;

  $("dashNextBuild").textContent = next
    ? `${next.name} ${next.target}`
    : "–";

  $("dashQueueEnd").textContent = queueEndText();
  $("dashQueueRemaining").textContent = durationText(queueSeconds());

  if (!plan) {
    $("dashOffline").textContent = "Noch keine Daten";
    $("dashOffline").className = "dash-value";
    return;
  }

  if (plan.enough) {
    $("dashOffline").textContent =
      `Reicht ${durationText(plan.surplus * 3600)} länger`;
    $("dashOffline").className = "dash-value good-text";
  } else {
    $("dashOffline").textContent =
      `${durationText(plan.shortage * 3600)} fehlen`;
    $("dashOffline").className = "dash-value bad-text";
  }
}

function renderOfflinePlanner() {
  const result = $("offlineResult");
  const timeline = $("offlineTimeline");
  const warning = $("offlineWarning");

  if (!result || !timeline || !warning) return;

  let plan;
  try {
    plan = buildOfflinePlan();
  } catch (error) {
    console.error("Offline-Planer:", error);
    result.className = "status bad";
    result.innerHTML = `<strong>Offline-Planer konnte nicht berechnet werden.</strong><br>${error.message}`;
    timeline.innerHTML = "";
    warning.textContent = "Bitte einmal im Spiel auf „Coach aktualisieren“ tippen.";
    return;
  }

  if (!plan) {
    result.className = "status bad";
    result.innerHTML = "<strong>Noch keine Spieldaten.</strong><br>Öffne das Spiel und tippe dort auf „Coach aktualisieren“.";
    timeline.innerHTML = "";
    warning.textContent = "";
    $("offlineUntil").textContent = "–";
    $("offlineCoverage").textContent = "–";
    return;
  }

  $("offlineUntil").textContent = endClockText(plan.targetHours);
  $("offlineCoverage").textContent = durationText(plan.covered * 3600);

  if (plan.enough) {
    result.className = "status good";
    result.innerHTML =
      `<strong>✓ Offline-Zeit abgesichert</strong><br>` +
      `Die geplante Baufolge reicht etwa ${durationText(plan.surplus * 3600)} über deine Rückkehr hinaus.`;
  } else {
    result.className = "status bad";
    result.innerHTML =
      `<strong>⚠ Noch nicht vollständig abgesichert</strong><br>` +
      `Es fehlen ungefähr ${durationText(plan.shortage * 3600)} Bauzeit.`;
  }

  timeline.innerHTML = "";

  const existingQueue = state.buildQueue || [];
  existingQueue.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "offline-step existing";
    row.innerHTML = `
      <div class="offline-icon">Q</div>
      <div>
        <strong>${item.building}${item.targetLevel ? ` ${item.targetLevel}` : ""}</strong>
        <small>bereits in der Bauschleife</small>
      </div>
      <div class="offline-time">${item.remainingText || durationText(item.remainingSeconds)}</div>`;
    timeline.appendChild(row);
  });

  plan.planned.forEach((step, index) => {
    const row = document.createElement("div");
    row.className = "offline-step";
    row.innerHTML = `
      <div class="offline-icon">${index + 1}</div>
      <div>
        <strong>${step.name} ${step.target}</strong>
        <small>${step.durationExact ? "exakte" : "geschätzte"} Bauzeit · ${reasonText(step)}</small>
      </div>
      <div class="offline-time">
        ${clockText(step.startHour)}<br>
        <small>bis ${clockText(step.finishHour)}</small>
      </div>`;
    timeline.appendChild(row);
  });

  if (!plan.planned.length && plan.queueHours >= plan.targetHours) {
    timeline.innerHTML += `
      <div class="offline-step existing">
        <div class="offline-icon">✓</div>
        <div><strong>Keine weiteren Gebäude nötig</strong><small>Die vorhandene Queue reicht bereits aus.</small></div>
        <div class="offline-time">${durationText(plan.queueHours * 3600)}</div>
      </div>`;
  }

  const exact = plan.planned.filter(step => step.durationExact).length;
  const estimated = plan.planned.length - exact;
  warning.textContent = estimated
    ? `${exact} geplante Bauzeit(en) exakt, ${estimated} geschätzt. Nach jeder Synchronisierung werden weitere Stufen exakt.`
    : "Alle geplanten zusätzlichen Bauzeiten wurden direkt aus dem Spiel übernommen.";

  $("offlineDebug").textContent = JSON.stringify({
    offlineHours: settings.offlineHours,
    bufferMinutes: settings.offlineBuffer,
    targetHours: Math.round(plan.targetHours * 100) / 100,
    existingQueueHours: Math.round(plan.queueHours * 100) / 100,
    coveredHours: Math.round(plan.covered * 100) / 100,
    enough: plan.enough,
    shortageHours: Math.round(plan.shortage * 100) / 100,
    surplusHours: Math.round(plan.surplus * 100) / 100,
    plannedSteps: plan.planned.map(step => ({
      building: step.name,
      targetLevel: step.target,
      startAt: clockText(step.startHour),
      finishAt: clockText(step.finishHour),
      durationExact: step.durationExact
    }))
  }, null, 2);
}

function reasonText(candidate) {
  return candidate.reasons.slice(0, 2).join("; ");
}
function candidateCost(candidate) {
  const exact = state.buildOptions?.[candidate.name];
  if (exact?.targetLevel === candidate.target && exact.costs) {
    return {
      wood: Number.isFinite(exact.costs.wood) ? exact.costs.wood : candidate.cost.wood,
      clay: Number.isFinite(exact.costs.clay) ? exact.costs.clay : candidate.cost.clay,
      iron: Number.isFinite(exact.costs.iron) ? exact.costs.iron : candidate.cost.iron
    };
  }
  return candidate.cost;
}
function costText(c) {
  return `${fmt(c.wood)} Holz · ${fmt(c.clay)} Lehm · ${fmt(c.iron)} Eisen`;
}
function renderPlanner() {
  if (!looksLikeCoachState(state)) {
    $("nextBuild").textContent = "–";
    $("buildWhy").textContent = "Nach der ersten Synchronisierung erscheint hier die Empfehlung.";
    $("buildCost").textContent = "–";
    $("buildAvailability").textContent = "–";
    $("alternatives").innerHTML = "";
    $("plannerDebug").textContent = "Noch keine Spieldaten.";
    return;
  }
  const ranked = rankBuildings();
  const top = ranked[0];
  if (!top) return;

  $("nextBuild").textContent = `${top.name} ${top.target}`;
  $("buildWhy").textContent = reasonText(top);
  $("buildCost").textContent = costText(candidateCost(top));
  $("buildAvailability").textContent = top.pay.affordable
    ? `innerhalb des Planungsfensters bezahlbar`
    : (Number.isFinite(top.pay.waitHours)
        ? `in etwa ${top.pay.waitHours.toFixed(1).replace(".", ",")} Std. bezahlbar`
        : "derzeit nicht berechenbar");

  const list = $("alternatives");
  list.innerHTML = "";
  ranked.slice(1,4).forEach((c, idx) => {
    const row = document.createElement("div");
    row.className = "recommendation";
    row.innerHTML = `
      <div><strong>${idx + 2}. ${c.name} ${c.target}</strong><small>${reasonText(c)}</small></div>
      <span>${Math.round(c.score)} P</span>`;
    list.appendChild(row);
  });

  $("plannerDebug").textContent = JSON.stringify(
    ranked.slice(0,8).map(c => ({
      building: c.name,
      targetLevel: c.target,
      score: Math.round(c.score * 10) / 10,
      cost: c.cost,
      reasons: c.reasons
    })), null, 2
  );
}
function statusItems() {
  const c = state.completeness || {};
  return [
    ["Dorf", c.village], ["Rohstoffe", c.resources], ["Bevölkerung", c.population],
    ["Produktion", c.production], ["Gebäude", c.buildings], ["Bauschleife", c.buildQueue],
    ["Truppen", c.units], ["Effekte", c.effects]
  ];
}
function renderStatus() {
  const missing = statusItems().filter(([,ok]) => !ok);
  const box = $("dataStatus");
  box.className = missing.length ? "status bad" : "status good";
  box.innerHTML = missing.length
    ? `<strong>⚠ Spieldaten unvollständig:</strong> ${missing.map(([n])=>n).join(", ")}`
    : "<strong>✓ Alle wichtigen Bereiche vollständig</strong>";
}
function renderQueue() {
  const q = $("queue");
  q.innerHTML = "";
  for (const item of state.buildQueue || []) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.building}${item.targetLevel ? ` ${item.targetLevel}` : ""}</strong><span>${item.remainingText || durationText(item.remainingSeconds)}</span>`;
    q.appendChild(li);
  }
  if (!q.children.length) q.innerHTML = "<li><strong>Keine Bauschleife</strong><span>–</span></li>";
}
function renderBuildings() {
  const b = $("buildings");
  b.innerHTML = "";
  Object.entries(state.buildings || {}).sort((a,z)=>a[0].localeCompare(z[0],"de")).forEach(([name,level]) => {
    const row = document.createElement("div");
    row.innerHTML = `<span>${name}</span><strong>${level}</strong>`;
    b.appendChild(row);
  });
}
function gameUrl() {
  const world = state?.page?.world || "de256";
  const villageId = state?.village?.id || state?.page?.villageId;
  const url = new URL(`https://${world}.die-staemme.de/game.php`);
  url.searchParams.set("screen", "overview");
  if (villageId) url.searchParams.set("village", villageId);
  return url.href;
}

function updateGameLinks() {
  const url = gameUrl();
  const newTab = $("openGame");
  const sameTab = $("openGameSameTab");
  if (newTab) newTab.href = url;
  if (sameTab) sameTab.href = url;
}

function syncAge() {
  const time = Date.parse(state?.capturedAt || "");
  if (!Number.isFinite(time)) return null;
  return Math.max(0, Date.now() - time);
}

function syncAgeText(ms) {
  if (ms === null) return "Noch nie synchronisiert";
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return "Gerade eben synchronisiert";
  if (minutes < 60) return `Vor ${minutes} Min. synchronisiert`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Vor ${hours} Std. synchronisiert`;
  const days = Math.floor(hours / 24);
  return `Vor ${days} Tag${days === 1 ? "" : "en"} synchronisiert`;
}

function renderSyncStatus() {
  const hasData = looksLikeCoachState(state);
  const empty = $("emptyState");
  const sync = $("syncStatus");
  const age = syncAge();

  empty.hidden = hasData;
  sync.hidden = !hasData;

  if (!hasData) return;

  sync.className = "status " + (age !== null && age > 30 * 60000 ? "bad" : "good");
  sync.innerHTML = age !== null && age > 30 * 60000
    ? `<strong>⚠ Daten veraltet:</strong> ${syncAgeText(age)}`
    : `<strong>✓ ${syncAgeText(age)}</strong>`;
}

function render() {
  const v = state.village || {};
  $("village").textContent = `${v.name || "Dorf"}${v.x != null ? ` (${v.x}|${v.y}) K${v.continent ?? "–"}` : ""}`;
  $("world").textContent = state.page?.world || "–";
  $("updated").textContent = state.capturedAt ? new Date(state.capturedAt).toLocaleString("de-DE") : "–";
  $("wood").textContent = fmt(state.resources?.wood);
  $("clay").textContent = fmt(state.resources?.clay);
  $("iron").textContent = fmt(state.resources?.iron);
  $("storage").textContent = fmt(state.resources?.storage);
  $("pop").textContent = `${fmt(state.population?.current)} / ${fmt(state.population?.max)}`;
  $("queueDuration").textContent = durationText(queueSeconds());
  updateGameLinks();
  renderSyncStatus();
  $("mode").value = settings.mode;
  $("horizon").value = settings.horizon;
  $("horizonValue").textContent = `${settings.horizon} Std.`;
  $("strategyDepth").value = settings.strategyDepth;
  $("strategyDepthValue").textContent = `${settings.strategyDepth} Schritte`;
  $("offlineHours").value = settings.offlineHours;
  $("offlineHoursValue").textContent = `${settings.offlineHours} Std.`;
  $("offlineBuffer").value = settings.offlineBuffer;
  $("offlineBufferValue").textContent = `${settings.offlineBuffer} Min.`;
  renderStatus();
  renderPlanner();
  renderStrategyPlan();
  renderLiveDashboard();
  renderQueue();
  renderBuildings();
  $("raw").value = JSON.stringify(state, null, 2);
}
function toast(t) {
  const e = $("toast"); e.textContent = t; e.classList.add("show");
  setTimeout(()=>e.classList.remove("show"), 2800);
}
function importHash() {
  if (!location.hash.startsWith("#import=")) return;
  try {
    saveState(JSON.parse(decodeURIComponent(location.hash.slice(8))));
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(()=>toast("Spieldaten aktualisiert."), 150);
  } catch (e) {
    console.error(e); toast("Import fehlgeschlagen.");
  }
}

$("mode").onchange = (e) => {
  settings.mode = e.target.value; saveSettings(); render();
};
$("horizon").oninput = (e) => {
  settings.horizon = +e.target.value; saveSettings(); render();
};
$("strategyDepth").oninput = (e) => {
  settings.strategyDepth = +e.target.value; saveSettings(); render();
};
$("offlineHours").oninput = (e) => {
  settings.offlineHours = +e.target.value; saveSettings(); render();
};
$("offlineBuffer").oninput = (e) => {
  settings.offlineBuffer = +e.target.value; saveSettings(); render();
};
// Spiel-Links are normal anchors. This is more reliable on Android/PWA than window.open().
$("openGame").addEventListener("click", () => {
  setTimeout(() => toast("Im Spiel unten rechts auf „Coach aktualisieren“ tippen."), 250);
});
$("importJson").onclick = () => {
  try { saveState(JSON.parse($("raw").value)); toast("JSON importiert."); }
  catch { toast("Ungültiges JSON."); }
};

const fallback = {
  page:{world:"de256"}, village:{name:"Noch keine Daten"}, resources:null,
  population:null, production:null, buildings:null, buildQueue:[], units:null,
  completeness:{}
};
state = loadState() || fallback;
render();
importHash();
addEventListener("hashchange", importHash);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
