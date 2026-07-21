// ==UserScript==
// @name         Stämme Coach Aktualisieren
// @namespace    staemme-coach
// @version      0.5.4
// @description  Liest vollständige Dorfdaten aus Die Stämme und öffnet den Stämme Coach.
// @match        https://*.die-staemme.de/game.php*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
  "use strict";

  const COACH_URL = "https://gamingnerdssuedtirol-ctrl.github.io/staemme-coach/";
  const BUTTON_ID = "staemme-coach-update-button";

  const clean = (value) =>
    String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const toNumber = (value) => {
    if (value === null || value === undefined || value === "") return null;

    const text = clean(value);

    // Unterstützt gekürzte Anzeigen wie 10.6K oder 1,25M.
    // In der deutschen Spieloberfläche kann ein Punkt entweder
    // Tausendertrennzeichen oder Dezimaltrennzeichen vor K/M sein.
    const compact = text.match(/^(-?[\d.,]+)\s*([KMB])$/i);
    if (compact) {
      const suffix = compact[2].toUpperCase();
      const multiplier = suffix === "K" ? 1_000 : suffix === "M" ? 1_000_000 : 1_000_000_000;
      const normalized = compact[1]
        .replace(/\.(?=\d{3}(?:\D|$))/g, "")
        .replace(",", ".");
      const parsedCompact = Number.parseFloat(normalized);
      return Number.isFinite(parsedCompact) ? Math.round(parsedCompact * multiplier) : null;
    }

    const parsed = parseInt(
      text.replace(/\./g, "").replace(/[^\d-]/g, ""),
      10
    );
    return Number.isFinite(parsed) ? parsed : null;
  };

  const firstNumber = (doc, selectors) => {
    for (const selector of selectors) {
      const node = doc.querySelector(selector);
      if (!node) continue;
      for (const candidate of [
        node.textContent,
        node.getAttribute("data-value"),
        node.getAttribute("data-amount"),
        node.value
      ]) {
        const value = toNumber(candidate);
        if (value !== null) return value;
      }
    }
    return null;
  };

  const gameData = () => {
    try {
      return window.game_data || window.top?.game_data || {};
    } catch {
      return window.game_data || {};
    }
  };

  const toSeconds = (value) => {
    const match = clean(value).match(/(?:(\d+):)?(\d{1,2}):(\d{2})/);
    if (!match) return null;
    return (+match[1] || 0) * 3600 + (+match[2] || 0) * 60 + (+match[3] || 0);
  };

  const buildPageUrl = (screen) => {
    const url = new URL(location.href);
    url.searchParams.set("screen", screen);
    url.searchParams.delete("intro");
    return url.href;
  };

  const fetchDocument = async (screen) => {
    const response = await fetch(buildPageUrl(screen), {
      credentials: "include",
      cache: "no-store"
    });
    if (!response.ok) throw new Error(`${screen}: HTTP ${response.status}`);
    return new DOMParser().parseFromString(await response.text(), "text/html");
  };

  const parseVisibleResources = () => {
    const village = gameData().village || {};

    // game_data enthält normalerweise die exakten Werte.
    // Die sichtbare mobile Anzeige kann dagegen gekürzt sein (z. B. 10.6K).
    const exactWood = toNumber(village.wood);
    const exactClay = toNumber(village.stone) ?? toNumber(village.clay);
    const exactIron = toNumber(village.iron);
    const exactStorage = toNumber(village.storage_max) ?? toNumber(village.storage);

    return {
      wood:
        exactWood ??
        firstNumber(document, ["#wood", "[data-resource='wood']", "[data-res='wood']"]),
      clay:
        exactClay ??
        firstNumber(document, ["#stone", "[data-resource='stone']", "[data-res='stone']"]),
      iron:
        exactIron ??
        firstNumber(document, ["#iron", "[data-resource='iron']", "[data-res='iron']"]),
      storage:
        exactStorage ??
        firstNumber(document, ["#storage", "[data-resource='storage']", "[data-res='storage']"])
    };
  };

  const parseVisibleVillage = () => {
    const gd = gameData();
    const village = gd.village || {};
    const worldMatch = location.hostname.match(/^([a-z]+\d+)\./i);
    const currentUrl = new URL(location.href);

    let x = toNumber(village.x);
    let y = toNumber(village.y);
    let continent = null;
    let name = clean(village.name);

    const coordinateMatch = clean(document.body?.textContent)
      .match(/\((\d{3})\|(\d{3})\)\s*K(\d+)/i);

    if (x === null && coordinateMatch) x = +coordinateMatch[1];
    if (y === null && coordinateMatch) y = +coordinateMatch[2];
    if (coordinateMatch) continent = +coordinateMatch[3];

    if (!name) name = "Dorf";

    const id = String(village.id || currentUrl.searchParams.get("village") || "") || null;
    return {
      world: gd.world || worldMatch?.[1] || null,
      villageId: id,
      village: { id, name, x, y, continent }
    };
  };

  const parsePopulation = (doc = document) => {
    const village = gameData().village || {};

    let current =
      firstNumber(doc, ["#pop_current", "[data-population-current]"]) ??
      toNumber(village.pop) ??
      toNumber(village.population);

    let max =
      firstNumber(doc, ["#pop_max", "[data-population-max]"]) ??
      toNumber(village.pop_max) ??
      toNumber(village.population_max);

    if (current === null || max === null) {
      const match = clean(doc.body?.textContent)
        .match(/(\d[\d.]*)\s*\/\s*(\d[\d.]*)/);
      if (match) {
        current = current ?? toNumber(match[1]);
        max = max ?? toNumber(match[2]);
      }
    }

    return { current, max };
  };

  const parseProduction = (doc) => {
    const body = clean(doc.body?.textContent);
    const get = (regex) => {
      const match = body.match(regex);
      return match ? toNumber(match[1]) : null;
    };
    return {
      woodPerHour: get(/Holz\s+([\d.]+)\s+pro Stunde/i),
      clayPerHour: get(/Lehm\s+([\d.]+)\s+pro Stunde/i),
      ironPerHour: get(/Eisen\s+([\d.]+)\s+pro Stunde/i)
    };
  };

  const buildingMap = {
    main: "Hauptgebäude",
    barracks: "Kaserne",
    stable: "Stall",
    garage: "Werkstatt",
    smith: "Schmiede",
    place: "Versammlungsplatz",
    market: "Marktplatz",
    wood: "Holzfäller",
    stone: "Lehmgrube",
    iron: "Eisenmine",
    farm: "Bauernhof",
    storage: "Speicher",
    hide: "Versteck",
    wall: "Wall",
    snob: "Adelshof"
  };

  const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Manche Welten zeigen das Gebäude "Holzfäller" als "Holzfällerlager" an.
  // Die Aliase werden nur für die Überschrift verwendet; im JSON bleibt der Name "Holzfäller".
  const buildingAliases = {
    wood: ["Holzfäller", "Holzfällerlager"]
  };

  // v0.5.2: Gebäudestufe ausschließlich aus der Gebäudeüberschrift lesen.
  // Zusätzlich werden abweichende Gebäudenamen wie "Holzfällerlager" unterstützt.
  const parseBuildings = (doc) => {
    const result = {};

    for (const [code, name] of Object.entries(buildingMap)) {
      const row =
        doc.querySelector(`#main_buildrow_${code}`) ||
        doc.querySelector(`[data-building="${code}"]`) ||
        doc.querySelector(`#building_${code}`) ||
        doc.querySelector(`a[href*="screen=${code}"]`)?.closest("tr");

      if (!row) {
        result[name] = 0;
        continue;
      }

      const acceptedNames = buildingAliases[code] || [name];
      const patterns = acceptedNames.map((acceptedName) => ({
        exact: new RegExp(`^\\s*${escapeRegex(acceptedName)}\\s*\\((\\d+)\\)`, "i"),
        anywhere: new RegExp(`${escapeRegex(acceptedName)}\\s*\\((\\d+)\\)`, "i")
      }));

      const readLevel = (value) => {
        const candidate = clean(value);
        for (const pattern of patterns) {
          const match = candidate.match(pattern.exact) || candidate.match(pattern.anywhere);
          if (match) return +match[1];
        }
        return null;
      };

      const headingCandidates = [
        row.querySelector(".building-name"),
        row.querySelector(".build-name"),
        row.querySelector(".main_buildlink"),
        row.querySelector("h1"),
        row.querySelector("h2"),
        row.querySelector("h3"),
        row.querySelector("strong"),
        row.querySelector("b"),
        row.querySelector(`a[href*="screen=${code}"]`)
      ].filter(Boolean);

      let level = null;

      for (const heading of headingCandidates) {
        level = readLevel(heading.textContent);
        if (level !== null) break;
      }

      if (level === null) {
        const rowText = clean(row.textContent);
        const headingPart = rowText
          .split(/Ausbau auf Stufe|Benötigt:|Genug Rohstoffe|Bauzeit|Kosten/i)[0]
          .slice(0, 180);
        level = readLevel(headingPart);
      }

      result[name] = level ?? 0;
    }

    return result;
  };


  const parseDurationSeconds = (value) => {
    const text = clean(value);
    const match = text.match(/(?:(\d+)\s+Tage?\s+)?(?:(\d{1,2}):)?(\d{1,2}):(\d{2})/i);
    if (!match) return null;
    return (+match[1] || 0) * 86400 +
      (+match[2] || 0) * 3600 +
      (+match[3] || 0) * 60 +
      (+match[4] || 0);
  };

  const readResourceCost = (row, resource) => {
    const selectors = {
      wood: [
        ".cost_wood", "[data-cost-wood]", "[data-resource='wood']",
        ".wood", "span[class*='wood']"
      ],
      clay: [
        ".cost_stone", ".cost_clay", "[data-cost-stone]", "[data-cost-clay]",
        "[data-resource='stone']", "[data-resource='clay']",
        ".stone", ".clay", "span[class*='stone']", "span[class*='clay']"
      ],
      iron: [
        ".cost_iron", "[data-cost-iron]", "[data-resource='iron']",
        ".iron", "span[class*='iron']"
      ]
    }[resource] || [];

    for (const selector of selectors) {
      for (const node of row.querySelectorAll(selector)) {
        const value =
          toNumber(node.getAttribute(`data-cost-${resource}`)) ??
          toNumber(node.getAttribute("data-cost")) ??
          toNumber(node.getAttribute("data-value")) ??
          toNumber(node.textContent);
        if (value !== null) return value;
      }
    }
    return null;
  };

  // Liest die vom Spiel bereits berechnete, echte Bauzeit für die jeweils
  // nächste Gebäudestufe. Dadurch sind Weltgeschwindigkeit, Hauptgebäude,
  // Premium-/Eventeffekte und sonstige Modifikatoren bereits enthalten.
  const parseBuildOptions = (doc, buildings) => {
    const result = {};

    for (const [code, name] of Object.entries(buildingMap)) {
      const row =
        doc.querySelector(`#main_buildrow_${code}`) ||
        doc.querySelector(`[data-building="${code}"]`) ||
        doc.querySelector(`#building_${code}`) ||
        doc.querySelector(`a[href*="screen=${code}"]`)?.closest("tr");

      if (!row) continue;

      const currentLevel = buildings[name] || 0;
      const targetLevel = currentLevel + 1;
      const rowText = clean(row.textContent);

      let durationSeconds = null;
      let durationText = null;

      const durationCandidates = [
        row.querySelector(".build_duration"),
        row.querySelector(".duration"),
        row.querySelector("[data-duration]"),
        row.querySelector("[data-time]"),
        row.querySelector(".timer"),
        row.querySelector("span[class*='duration']"),
        row.querySelector("td[class*='duration']")
      ].filter(Boolean);

      for (const node of durationCandidates) {
        const rawSeconds =
          toNumber(node.getAttribute("data-duration")) ??
          toNumber(node.getAttribute("data-time"));

        if (rawSeconds !== null && rawSeconds > 0) {
          durationSeconds = rawSeconds;
          durationText = clean(node.textContent) || null;
          break;
        }

        const parsed = parseDurationSeconds(node.textContent);
        if (parsed !== null) {
          durationSeconds = parsed;
          durationText = clean(node.textContent);
          break;
        }
      }

      if (durationSeconds === null) {
        const timeMatches = [...rowText.matchAll(/(?:(?:\d+)\s+Tage?\s+)?(?:(?:\d{1,2}):)?\d{1,2}:\d{2}/gi)];
        // In a building row the last time value is normally the build duration.
        // Queue times are outside this row and therefore cannot interfere.
        if (timeMatches.length) {
          const value = timeMatches[timeMatches.length - 1][0];
          durationSeconds = parseDurationSeconds(value);
          durationText = value;
        }
      }

      const wood = readResourceCost(row, "wood");
      const clay = readResourceCost(row, "clay");
      const iron = readResourceCost(row, "iron");

      if (durationSeconds !== null || [wood, clay, iron].some(Number.isFinite)) {
        result[name] = {
          currentLevel,
          targetLevel,
          durationSeconds,
          durationText,
          costs: { wood, clay, iron },
          source: durationSeconds !== null ? "game-main-page" : "partial-main-page"
        };
      }
    }

    return result;
  };

  const parseQueue = (doc) => {
    const result = [];
    const seen = new Set();
    const roots = [
      doc.querySelector("#buildqueue"),
      doc.querySelector(".buildqueue"),
      doc.querySelector("#content_value")
    ].filter(Boolean);

    const nodes = [];
    for (const root of roots) {
      root.querySelectorAll("tr, .lit-item, .queue-item, .buildorder")
        .forEach((node) => nodes.push(node));
    }

    for (const node of nodes) {
      const text = clean(node.textContent);
      const buildingMatch = text.match(
        /(Hauptgebäude|Kaserne|Stall|Werkstatt|Schmiede|Versammlungsplatz|Marktplatz|Holzfäller(?:lager)?|Lehmgrube|Eisenmine|Bauernhof|Speicher|Versteck|Wall|Adelshof)(?:\s*\(Stufe\s*(\d+)\))?/i
      );
      const timeMatch = text.match(/(?:(\d+):)?\d{1,2}:\d{2}/);
      if (!buildingMatch || !timeMatch) continue;

      const building = buildingMatch[1].replace("Holzfällerlager", "Holzfäller");
      const key = `${building}|${timeMatch[0]}`;
      if (seen.has(key)) continue;
      seen.add(key);

      result.push({
        building,
        targetLevel: buildingMatch[2] ? +buildingMatch[2] : null,
        remainingText: timeMatch[0],
        remainingSeconds: toSeconds(timeMatch[0])
      });
    }
    return result;
  };

  const parseUnits = (doc) => {
    const body = clean(doc.body?.textContent);
    const patterns = {
      spear: /(\d[\d.]*)\s+Speerträger/i,
      sword: /(\d[\d.]*)\s+Schwertkämpfer/i,
      axe: /(\d[\d.]*)\s+Axtkämpfer/i,
      spy: /(\d[\d.]*)\s+Späher/i,
      light: /(\d[\d.]*)\s+Leichte Kavallerie/i,
      heavy: /(\d[\d.]*)\s+Schwere Kavallerie/i,
      ram: /(\d[\d.]*)\s+Rammböcke?/i,
      catapult: /(\d[\d.]*)\s+Katapulte?/i
    };

    const result = {};
    for (const [key, regex] of Object.entries(patterns)) {
      const match = body.match(regex);
      result[key] = match ? toNumber(match[1]) : null;
    }
    return result;
  };

  const mergeUnits = (...sets) => {
    const merged = {
      spear: null, sword: null, axe: null, spy: null,
      light: null, heavy: null, ram: null, catapult: null
    };
    for (const set of sets) {
      for (const [key, value] of Object.entries(set || {})) {
        if (value !== null && value !== undefined) merged[key] = value;
      }
    }
    return merged;
  };

  const parseEffects = (doc) => [
    ...new Set(
      [...clean(doc.body?.textContent).matchAll(
        /([+-]\d+\s*%\s+(?:Baugeschwindigkeit|Holzproduktion|Lehmproduktion|Eisenproduktion))/gi
      )].map((match) => match[1])
    )
  ];

  const updateCoach = async () => {
    const button = document.getElementById(BUTTON_ID);
    if (button) {
      button.disabled = true;
      button.textContent = "Coach wird aktualisiert …";
    }

    try {
      const resources = parseVisibleResources();
      const meta = parseVisibleVillage();
      const population = parsePopulation(document);

      const [overview, main, barracks, stable] = await Promise.all([
        fetchDocument("overview"),
        fetchDocument("main"),
        fetchDocument("barracks"),
        fetchDocument("stable")
      ]);

      const buildings = parseBuildings(main);
      const buildOptions = parseBuildOptions(main, buildings);
      const buildQueue = parseQueue(overview);
      const production = parseProduction(overview);
      const units = mergeUnits(
        parseUnits(document),
        parseUnits(overview),
        parseUnits(barracks),
        parseUnits(stable)
      );
      const effects = parseEffects(overview);

      const counters = {};
      for (const item of buildQueue) {
        if (item.targetLevel === null && buildings[item.building] != null) {
          counters[item.building] = (counters[item.building] || 0) + 1;
          item.targetLevel = buildings[item.building] + counters[item.building];
        }
      }

      const completeness = {
        village: Boolean(meta.world) && Number.isFinite(meta.village.x) && Number.isFinite(meta.village.y),
        resources: ["wood", "clay", "iron"].every((key) => Number.isFinite(resources[key])),
        population: Number.isFinite(population.current) && Number.isFinite(population.max),
        production: ["woodPerHour", "clayPerHour", "ironPerHour"].every((key) => Number.isFinite(production[key])),
        buildings: Object.keys(buildings).length === Object.keys(buildingMap).length,
        buildOptions: Object.values(buildOptions).some(
          (option) => Number.isFinite(option.durationSeconds)
        ),
        buildQueue: Array.isArray(buildQueue),
        units: ["spear", "sword", "axe", "spy", "light"].some((key) => Number.isFinite(units[key])),
        effects: Array.isArray(effects)
      };

      const data = {
        schemaVersion: 5,
        parserVersion: "0.5.4",
        capturedAt: new Date().toISOString(),
        page: {
          world: meta.world,
          villageId: meta.villageId,
          screen: "multi",
          url: location.href
        },
        village: meta.village,
        villageKey:
          meta.villageId ||
          [meta.world, meta.village.x, meta.village.y]
            .filter((value) => value !== null)
            .join("-"),
        resources,
        population,
        production,
        buildings,
        buildOptions,
        buildQueue,
        units,
        effects,
        completeness,
        diagnostics: {
          resourcesSource: "game_data-first/compact-number-fallback",
          buildingParser: "heading-alias-v0.5.4",
          buildingsFound: Object.values(buildings).filter((level) => level > 0).length,
          unbuiltBuildings: Object.entries(buildings)
            .filter(([, level]) => level === 0)
            .map(([name]) => name),
          exactBuildTimesFound: Object.values(buildOptions).filter(
            (option) => Number.isFinite(option.durationSeconds)
          ).length,
          buildOptionsFound: Object.keys(buildOptions).length,
          queueEntries: buildQueue.length,
          unitsFound: Object.values(units).filter(Number.isFinite).length
        }
      };

      location.href =
        COACH_URL + "#import=" + encodeURIComponent(JSON.stringify(data));
    } catch (error) {
      console.error("Stämme Coach:", error);
      alert("Coach-Aktualisierung fehlgeschlagen: " + error.message);
      if (button) {
        button.disabled = false;
        button.textContent = "Coach aktualisieren";
      }
    }
  };

  const addButton = () => {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.textContent = "Coach aktualisieren";

    Object.assign(button.style, {
      position: "fixed",
      right: "12px",
      bottom: "18px",
      zIndex: "99999",
      padding: "13px 17px",
      border: "2px solid #f5d6a5",
      borderRadius: "12px",
      background: "#7b2d0b",
      color: "#ffffff",
      fontWeight: "800",
      fontSize: "15px",
      boxShadow: "0 4px 14px rgba(0,0,0,.35)"
    });

    button.addEventListener("click", updateCoach);
    document.body.appendChild(button);
  };

  addButton();
})();
