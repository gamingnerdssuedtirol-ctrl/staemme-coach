
"use strict";

const $ = (id) => document.getElementById(id);
const fmt = (v) => Number.isFinite(v) ? v.toLocaleString("de-DE") : "–";
const storeKey = "staemmeCoachStateV2";

const demo = {
  schemaVersion: 2,
  capturedAt: new Date().toISOString(),
  page: { world: "de256", screen: "overview" },
  village: { id: "demo", name: "001", x: 609, y: 435, continent: 46 },
  resources: { wood: 5165, clay: 7099, iron: 2806, storage: 11740 },
  population: { current: 888, max: 1174 },
  production: { woodPerHour: 1548, clayPerHour: 1502, ironPerHour: 954 },
  buildings: {
    "Hauptgebäude": 10, "Kaserne": 5, "Stall": 3, "Schmiede": 5,
    "Marktplatz": 5, "Holzfäller": 22, "Lehmgrube": 22, "Eisenmine": 19,
    "Bauernhof": 11, "Speicher": 15, "Versteck": 1, "Wall": 1
  },
  buildQueue: [
    { building: "Eisenmine", targetLevel: 20, remainingText: "0:45:53", remainingSeconds: 2753 },
    { building: "Bauernhof", targetLevel: 12, remainingText: "0:53:26", remainingSeconds: 3206 },
    { building: "Hauptgebäude", targetLevel: 11, remainingText: "0:32:13", remainingSeconds: 1933 },
    { building: "Hauptgebäude", targetLevel: 12, remainingText: "0:38:10", remainingSeconds: 2290 },
    { building: "Hauptgebäude", targetLevel: 13, remainingText: "0:44:49", remainingSeconds: 2689 }
  ],
  units: { spear: 9, sword: 30, axe: 0, spy: 35, light: 8 },
  effects: ["+10% Baugeschwindigkeit", "+35% Holzproduktion", "+31% Lehmproduktion", "+31% Eisenproduktion"]
};

let state = loadState() || demo;

function loadState() {
  try { return JSON.parse(localStorage.getItem(storeKey)); } catch { return null; }
}
function saveState(next) {
  state = next;
  localStorage.setItem(storeKey, JSON.stringify(next));
  render();
}

function queueSeconds(q) {
  return (q || []).reduce((sum, item) => sum + (Number(item.remainingSeconds) || 0), 0);
}
function durationText(seconds) {
  seconds = Math.max(0, Math.round(seconds || 0));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h} Std. ${m} Min.`;
}
function recommend(snapshot) {
  const b = snapshot.buildings || {};
  const q = snapshot.buildQueue || [];
  const effective = {...b};
  for (const item of q) {
    if (item.targetLevel) effective[item.building] = Math.max(effective[item.building] || 0, item.targetLevel);
  }

  let build = "Marktplatz";
  let level = (effective["Marktplatz"] || 0) + 1;
  let why = "günstiger Ausbau und Fortschritt Richtung Adelshof";

  if ((effective["Hauptgebäude"] || 0) < 15) {
    build = "Hauptgebäude";
    level = (effective["Hauptgebäude"] || 0) + 1;
    why = "verkürzt weitere Bauzeiten und ist Voraussetzung für spätere Gebäude";
  } else if ((effective["Schmiede"] || 0) < 10) {
    build = "Schmiede";
    level = (effective["Schmiede"] || 0) + 1;
    why = "Voraussetzung für die Werkstatt und den Adelshof";
  } else if ((effective["Marktplatz"] || 0) < 10) {
    build = "Marktplatz";
    level = (effective["Marktplatz"] || 0) + 1;
    why = "Voraussetzung für den Adelshof";
  }

  const queueHours = queueSeconds(q) / 3600;
  const night = queueHours >= 7
    ? "Die vorhandene Queue deckt eine typische Nacht bereits ab."
    : `Queue deckt etwa ${queueHours.toFixed(1).replace(".", ",")} Stunden ab. Vor dem Schlafen einen längeren Bau ans Ende setzen.`;

  const units = snapshot.units || {};
  const axeTarget = 100;
  const spearTarget = 100;
  let troop = "Kaserne pausieren";
  if ((units.spear || 0) < spearTarget) troop = `${Math.min(25, spearTarget - (units.spear || 0))} Speerträger vormerken`;
  else if ((units.axe || 0) < axeTarget) troop = `${Math.min(25, axeTarget - (units.axe || 0))} Axtkämpfer vormerken`;

  return { build, level, why, night, troop, queueHours };
}

function render() {
  const r = recommend(state);
  const v = state.village || {};
  $("villageTitle").textContent = `${v.name || "Dorf"}${v.x != null ? ` (${v.x}|${v.y}) K${v.continent}` : ""}`;
  $("world").textContent = state.page?.world || "–";
  $("updated").textContent = state.capturedAt ? new Date(state.capturedAt).toLocaleString("de-DE") : "–";
  $("wood").textContent = fmt(state.resources?.wood);
  $("clay").textContent = fmt(state.resources?.clay);
  $("iron").textContent = fmt(state.resources?.iron);
  $("pop").textContent = `${fmt(state.population?.current)} / ${fmt(state.population?.max)}`;
  $("nextBuild").textContent = `${r.build} ${r.level}`;
  $("nextBuildWhy").textContent = r.why;
  $("troop").textContent = r.troop;
  $("night").textContent = r.night;
  $("queueEnd").textContent = durationText(queueSeconds(state.buildQueue));

  const queue = $("queue");
  queue.innerHTML = "";
  for (const item of state.buildQueue || []) {
    const li = document.createElement("li");
    li.innerHTML = `<strong>${item.building}${item.targetLevel ? ` ${item.targetLevel}` : ""}</strong><span>${item.remainingText || durationText(item.remainingSeconds)}</span>`;
    queue.appendChild(li);
  }
  if (!(state.buildQueue || []).length) queue.innerHTML = "<li><strong>Keine Queue erkannt</strong><span>–</span></li>";

  const buildings = $("buildings");
  buildings.innerHTML = "";
  Object.entries(state.buildings || {}).sort((a,b)=>a[0].localeCompare(b[0],"de")).forEach(([name, level]) => {
    const div = document.createElement("div");
    div.innerHTML = `<span>${name}</span><strong>${level}</strong>`;
    buildings.appendChild(div);
  });

  $("raw").value = JSON.stringify(state, null, 2);
}

async function importClipboard() {
  try {
    const text = await navigator.clipboard.readText();
    const parsed = JSON.parse(text);
    saveState(parsed);
    toast("Daten aus Zwischenablage importiert.");
  } catch (err) {
    toast("Import fehlgeschlagen. Zuerst den Auslese-Lesezeichenbefehl auf der Spielseite ausführen.");
  }
}

function importFromHash() {
  if (!location.hash.startsWith("#import=")) return false;
  try {
    const parsed = JSON.parse(decodeURIComponent(location.hash.slice(8)));
    saveState(parsed);
    history.replaceState(null, "", location.pathname + location.search);
    setTimeout(() => toast("Live-Daten erfolgreich übernommen."), 150);
    return true;
  } catch (error) {
    console.error(error);
    toast("Automatischer Import fehlgeschlagen.");
    return false;
  }
}

function toast(message) {
  const el = $("toast");
  el.textContent = message;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 2800);
}

$("importJson").addEventListener("click", () => {
  try { saveState(JSON.parse($("raw").value)); toast("JSON importiert."); }
  catch { toast("Ungültiges JSON."); }
});
$("demo").addEventListener("click", () => saveState({...demo, capturedAt:new Date().toISOString()}));
$("clear").addEventListener("click", () => { localStorage.removeItem(storeKey); state = demo; render(); toast("Lokale Daten gelöscht."); });
$("copyBookmarklet").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("bookmarklet").value);
    toast("Auslese-Befehl kopiert.");
  } catch { $("bookmarklet").select(); toast("Text markieren und kopieren."); }
});
$("share").addEventListener("click", async () => {
  const text = JSON.stringify(state);
  if (navigator.share) await navigator.share({title:"Stämme Coach Daten", text});
  else { await navigator.clipboard.writeText(text); toast("Daten kopiert."); }
});

render();
importFromHash();
window.addEventListener("hashchange", importFromHash);
if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}
