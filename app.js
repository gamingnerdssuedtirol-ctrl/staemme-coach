"use strict";

const $ = (id) => document.getElementById(id);
const KEY = "staemmeCoachStateV5";
const SETTINGS_KEY = "staemmeCoachPlannerV06";

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

function loadState() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
function loadSettings() {
  try {
    return {
      mode: "off",
      horizon: 8,
      ...JSON.parse(localStorage.getItem(SETTINGS_KEY))
    };
  } catch {
    return { mode: "off", horizon: 8 };
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
function reasonText(candidate) {
  return candidate.reasons.slice(0, 2).join("; ");
}
function costText(c) {
  return `${fmt(c.wood)} Holz · ${fmt(c.clay)} Lehm · ${fmt(c.iron)} Eisen`;
}
function renderPlanner() {
  const ranked = rankBuildings();
  const top = ranked[0];
  if (!top) return;

  $("nextBuild").textContent = `${top.name} ${top.target}`;
  $("buildWhy").textContent = reasonText(top);
  $("buildCost").textContent = costText(top.cost);
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
  $("mode").value = settings.mode;
  $("horizon").value = settings.horizon;
  $("horizonValue").textContent = `${settings.horizon} Std.`;
  renderStatus();
  renderPlanner();
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
$("openGame").onclick = () => {
  const world = state.page?.world || "de256";
  location.href = `https://${world}.die-staemme.de/game.php?screen=overview`;
};
$("importJson").onclick = () => {
  try { saveState(JSON.parse($("raw").value)); toast("JSON importiert."); }
  catch { toast("Ungültiges JSON."); }
};

const fallback = {
  page:{world:"de256"}, village:{name:"Noch keine Daten"}, resources:{},
  population:{}, production:{}, buildings:{}, buildQueue:[], units:{},
  completeness:{}
};
state = loadState() || fallback;
render();
importHash();
addEventListener("hashchange", importHash);
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(()=>{});
