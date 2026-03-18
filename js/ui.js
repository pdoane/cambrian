// ui.js -- Wires up HTML controls to the simulation.
// Sidebar has: play/pause/speed, ecosystem picker, species selector + spawn list, launch.
// Ecosystem and species CRUD happen in modal dialogs.

import { GENE_DEFS, WORLD } from "./config.js";

// Slider position → ticks per frame. <1 means tick every N frames.
const SPEED_MAP = [
  0,     // unused (1-indexed)
  0.25,  // 1
  0.5,   // 2
  0.75,  // 3
  1,     // 4
  2,     // 5
  4,     // 6
  6,     // 7
  10,    // 8
  15,    // 9
  20,    // 10
];
import { showTooltip, hideTooltip, setupChartTooltips } from "./tooltip.js";
import { drawBody } from "./shapes.js";
import { openModal, closeModal } from "./modal.js";
import {
  loadSpecies, upsertSpecies, deleteSpecies, createDefaultSpecies,
  loadEcosystems, upsertEcosystem, deleteEcosystem, createDefaultEcosystem,
  randomSpeciesName, randomEcosystemName,
  DIETS, SHAPES,
} from "./species.js";

let uiBuilt = false;

const SESSION_KEY = "cambrian_session";

/** Currently selected ecosystem (null = default) */
let selectedEcosystem = null;

/** Species releases queued for next launch */
let pendingReleases = [];

function saveSession() {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      ecosystemId: selectedEcosystem?.id || null,
      releases: pendingReleases,
    }));
  } catch (e) { /* ignore */ }
}

function restoreSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.ecosystemId) {
      selectedEcosystem = loadEcosystems().find(e => e.id === data.ecosystemId) || null;
      if (selectedEcosystem) applyEcosystemToWorld(selectedEcosystem);
    }
    if (data.releases && data.releases.length > 0) {
      pendingReleases = data.releases;
    }
  } catch (e) { /* ignore */ }
}

/** Get launch config for main.js */
export function getLaunchConfig() {
  return {
    ecosystem: selectedEcosystem,
    releases: pendingReleases,
  };
}

export class UI {
  constructor(simulation, onRestart) {
    this.simulation = simulation;
    this.onRestart = onRestart;
    this.setupControls();
    if (!uiBuilt) {
      restoreSession();
      buildSidebar(onRestart);
      setupChartTooltips();
      uiBuilt = true;
    }
  }

  setupControls() {
    replaceWithClone("btn-play-pause");

    const btnPlayPause = document.getElementById("btn-play-pause");
    btnPlayPause.addEventListener("click", () => {
      this.simulation.running = !this.simulation.running;
      btnPlayPause.textContent = this.simulation.running ? "Pause" : "Play";
    });

    // Speed slider — only set up once, preserve across restarts
    const speedSlider = document.getElementById("slider-speed");
    const speedLabel = document.getElementById("speed-label");
    const currentLevel = parseInt(speedSlider.value);
    this.simulation.speed = SPEED_MAP[currentLevel];

    if (!speedSlider.dataset.bound) {
      speedSlider.dataset.bound = "1";
      speedSlider.addEventListener("input", () => {
        const level = parseInt(speedSlider.value);
        this.simulation.speed = SPEED_MAP[level];
        speedLabel.textContent = `Speed: ${SPEED_MAP[level]}x`;
      });
    }
  }
}

function replaceWithClone(id) {
  const el = document.getElementById(id);
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
}

// ─── Sidebar Builder ───────────────────────────────────────────────────────

function buildSidebar(onRestart) {
  const panel = document.getElementById("sidebar-panel");

  // ── Ecosystem Section ──
  appendSectionHeader(panel, "Ecosystem");

  const ecoRow = document.createElement("div");
  ecoRow.className = "sidebar-select-row";

  const ecoSelect = document.createElement("select");
  ecoSelect.id = "eco-select";
  ecoSelect.className = "sidebar-select";
  ecoRow.appendChild(ecoSelect);

  const newEcoBtn = makeIconBtn("+", "New ecosystem", () => openEcosystemModal(createDefaultEcosystem(), false));
  const editEcoBtn = makeIconBtn("\u270E", "Edit ecosystem", () => {
    if (selectedEcosystem) {
      const eco = loadEcosystems().find(e => e.id === selectedEcosystem.id) || selectedEcosystem;
      openEcosystemModal({ ...eco }, true);
    }
  });
  editEcoBtn.id = "btn-edit-eco";
  editEcoBtn.classList.add("disabled");

  ecoRow.appendChild(newEcoBtn);
  ecoRow.appendChild(editEcoBtn);
  panel.appendChild(ecoRow);

  // ── Species Section ──
  appendDivider(panel);
  appendSectionHeader(panel, "Species");

  const spRow = document.createElement("div");
  spRow.className = "sidebar-select-row";

  const spSelect = document.createElement("select");
  spSelect.id = "species-select";
  spSelect.className = "sidebar-select";
  spRow.appendChild(spSelect);

  const newSpBtn = makeIconBtn("+", "New species", () => openSpeciesEditorModal(createDefaultSpecies()));
  const manageSpBtn = makeIconBtn("\u2699", "Manage species", () => openManageSpeciesModal());

  spRow.appendChild(newSpBtn);
  spRow.appendChild(manageSpBtn);
  panel.appendChild(spRow);

  const releaseList = document.createElement("div");
  releaseList.id = "release-list";
  panel.appendChild(releaseList);

  // ── Launch ──
  appendDivider(panel);

  const launchBtn = document.createElement("button");
  launchBtn.className = "sidebar-launch-btn";
  launchBtn.textContent = "Launch Ecosystem";
  launchBtn.addEventListener("click", () => onRestart());
  panel.appendChild(launchBtn);

  // Initial renders
  populateEcosystemSelect();
  populateSpeciesSelect();
  renderReleaseList();
}

function appendSectionHeader(parent, text) {
  const h = document.createElement("div");
  h.className = "sidebar-section-header";
  h.textContent = text;
  parent.appendChild(h);
}

function appendDivider(parent) {
  const hr = document.createElement("hr");
  hr.className = "sidebar-divider";
  parent.appendChild(hr);
}

function makeIconBtn(text, title, onClick) {
  const btn = document.createElement("button");
  btn.className = "sidebar-icon-btn";
  btn.textContent = text;
  btn.title = title;
  btn.addEventListener("click", onClick);
  return btn;
}

// ─── Ecosystem Select ──────────────────────────────────────────────────────

function populateEcosystemSelect() {
  const select = document.getElementById("eco-select");
  select.innerHTML = "";

  const defaultOpt = document.createElement("option");
  defaultOpt.value = "";
  defaultOpt.textContent = "(Default)";
  select.appendChild(defaultOpt);

  const ecosystems = loadEcosystems();
  for (const eco of ecosystems) {
    const opt = document.createElement("option");
    opt.value = eco.id;
    opt.textContent = eco.name;
    select.appendChild(opt);
  }

  // Restore selection
  if (selectedEcosystem && ecosystems.find(e => e.id === selectedEcosystem.id)) {
    select.value = selectedEcosystem.id;
  } else {
    selectedEcosystem = null;
    select.value = "";
  }

  select.onchange = () => {
    const id = select.value;
    selectedEcosystem = id ? loadEcosystems().find(e => e.id === id) || null : null;
    if (selectedEcosystem) applyEcosystemToWorld(selectedEcosystem);
    document.getElementById("btn-edit-eco")?.classList.toggle("disabled", !selectedEcosystem);
    saveSession();
  };

  document.getElementById("btn-edit-eco")?.classList.toggle("disabled", !selectedEcosystem);
  saveSession();
}

function applyEcosystemToWorld(eco) {
  WORLD.waterPoolCount = eco.waterPoolCount;
  WORLD.waterPoolRadius = eco.waterPoolRadius;
  WORLD.bushCount = eco.bushCount;
  WORLD.berriesPerBush = eco.berriesPerBush;
  WORLD.berryRegrowTime = eco.berryRegrowTime;
  WORLD.berryEnergy = eco.berryEnergy;
}

// ─── Species Select ────────────────────────────────────────────────────────

function populateSpeciesSelect() {
  const select = document.getElementById("species-select");
  select.innerHTML = "";

  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = "-- Select to add --";
  placeholder.disabled = true;
  placeholder.selected = true;
  select.appendChild(placeholder);

  const allSpecies = loadSpecies();
  const addedIds = new Set(pendingReleases.map(r => r.speciesId));
  for (const sp of allSpecies) {
    if (addedIds.has(sp.id)) continue;
    const opt = document.createElement("option");
    opt.value = sp.id;
    const shapeName = SHAPES.find(s => s.sides === sp.sides)?.name || "circle";
    opt.textContent = `${sp.name} (${shapeName}, ${sp.diet})`;
    select.appendChild(opt);
  }

  // Use onchange to avoid stacking listeners
  select.onchange = () => {
    const id = select.value;
    if (!id) return;
    const sp = loadSpecies().find(s => s.id === id);
    if (sp) {
      pendingReleases.push({
        speciesId: sp.id,
        name: sp.name,
        genes: { ...sp.genes },
        diet: sp.diet,
        sides: sp.sides,
        count: sp.count,
        cfg: sp.cfg ? { ...sp.cfg } : undefined,
      });
      renderReleaseList();
      populateSpeciesSelect();
    }
  };
}

// ─── Release List ──────────────────────────────────────────────────────────

function renderReleaseList() {
  const list = document.getElementById("release-list");
  list.innerHTML = "";

  if (pendingReleases.length === 0) {
    const empty = document.createElement("div");
    empty.className = "sidebar-empty";
    empty.textContent = "No species. No creatures will spawn.";
    list.appendChild(empty);
    saveSession();
    return;
  }

  for (let i = 0; i < pendingReleases.length; i++) {
    const rel = pendingReleases[i];
    const row = document.createElement("div");
    row.className = "release-row";

    // Shape icon (mini canvas)
    const shapeIcon = document.createElement("canvas");
    shapeIcon.className = "release-shape-icon";
    shapeIcon.width = 16;
    shapeIcon.height = 16;
    drawShapeIcon(shapeIcon, rel.sides, rel.genes?.hue ?? 120);

    const info = document.createElement("span");
    info.className = "release-info";
    info.textContent = `${rel.name} x${rel.count}`;

    const btns = document.createElement("div");
    btns.className = "release-btns";

    const editBtn = document.createElement("button");
    editBtn.className = "sidebar-icon-btn small";
    editBtn.textContent = "\u270E";
    editBtn.title = "Edit species";
    editBtn.addEventListener("click", () => {
      const sp = loadSpecies().find(s => s.id === rel.speciesId);
      if (sp) openSpeciesEditorModal({ ...sp, genes: { ...sp.genes } });
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "sidebar-icon-btn small danger";
    removeBtn.textContent = "\u00D7";
    removeBtn.title = "Remove from spawn list";
    removeBtn.addEventListener("click", () => {
      pendingReleases.splice(i, 1);
      renderReleaseList();
      populateSpeciesSelect();
    });

    btns.appendChild(editBtn);
    btns.appendChild(removeBtn);
    row.appendChild(shapeIcon);
    row.appendChild(info);
    row.appendChild(btns);
    list.appendChild(row);
  }

  saveSession();
}

function drawShapeIcon(canvas, sides, hue) {
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, 16, 16);
  ctx.fillStyle = `hsl(${hue}, 70%, 50%)`;
  drawBody(ctx, 8, 8, 6, sides);
  ctx.fill();
}

// ─── Manage Species Modal ──────────────────────────────────────────────────

function openManageSpeciesModal() {
  openModal("Manage Species", (content) => {
    const renderList = () => {
      content.innerHTML = "";

      const allSpecies = loadSpecies();

      const newBtn = document.createElement("button");
      newBtn.className = "sidebar-btn";
      newBtn.textContent = "+ New Species";
      newBtn.style.marginBottom = "10px";
      newBtn.addEventListener("click", () => {
        closeModal();
        openSpeciesEditorModal(createDefaultSpecies());
      });
      content.appendChild(newBtn);

      if (allSpecies.length === 0) {
        const empty = document.createElement("div");
        empty.className = "sidebar-empty";
        empty.textContent = "No saved species yet.";
        content.appendChild(empty);
        return;
      }

      for (const sp of allSpecies) {
        const row = document.createElement("div");
        row.className = "modal-list-row";

        const shapeName = SHAPES.find(s => s.sides === sp.sides)?.name || "circle";
        const info = document.createElement("span");
        info.className = "modal-list-info";
        info.textContent = `${sp.name} (${sp.diet}, ${shapeName})`;

        const btns = document.createElement("div");
        btns.className = "modal-list-btns";

        const editBtn = document.createElement("button");
        editBtn.className = "sidebar-btn small";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", () => {
          closeModal();
          openSpeciesEditorModal({ ...sp, genes: { ...sp.genes } });
        });

        const delBtn = document.createElement("button");
        delBtn.className = "sidebar-btn small danger";
        delBtn.textContent = "Delete";
        delBtn.addEventListener("click", () => {
          deleteSpecies(sp.id);
          renderList();
          populateSpeciesSelect();
        });

        btns.appendChild(editBtn);
        btns.appendChild(delBtn);
        row.appendChild(info);
        row.appendChild(btns);
        content.appendChild(row);
      }
    };
    renderList();
  });
}

// ─── Species Editor Modal ──────────────────────────────────────────────────

function openSpeciesEditorModal(design) {
  openModal("Species", (content) => {
    // Name with randomize button
    const nameInput = appendNameField(content, design.name, randomSpeciesName, (val) => { design.name = val; });

    // Diet
    appendField(content, "Diet", () => {
      const sel = document.createElement("select");
      sel.className = "modal-select";
      for (const d of DIETS) {
        const opt = document.createElement("option");
        opt.value = d;
        opt.textContent = d;
        if (d === design.diet) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener("change", () => { design.diet = sel.value; });
      return sel;
    });

    // Shape
    appendField(content, "Shape", () => {
      const sel = document.createElement("select");
      sel.className = "modal-select";
      for (const s of SHAPES) {
        const opt = document.createElement("option");
        opt.value = s.sides;
        opt.textContent = `${s.name} (${s.sides || "round"})`;
        if (s.sides === design.sides) opt.selected = true;
        sel.appendChild(opt);
      }
      sel.addEventListener("change", () => { design.sides = parseInt(sel.value); });
      return sel;
    });

    // Default count
    appendField(content, "Default Count", () => {
      const input = document.createElement("input");
      input.type = "number";
      input.className = "modal-text-input";
      input.min = 1;
      input.max = 200;
      input.value = design.count;
      input.addEventListener("input", () => { design.count = parseInt(input.value) || 1; });
      return input;
    });

    // DNA section — starting value, mutation rate, mutation step per gene
    const dnaHeader = document.createElement("div");
    dnaHeader.className = "modal-sub-header";
    dnaHeader.textContent = "DNA";
    content.appendChild(dnaHeader);

    for (const def of GENE_DEFS) {
      const fracStep = def.max <= 1 ? 0.01 : (def.max <= 10 ? 0.1 : 1);

      // Gene card
      const card = document.createElement("div");
      card.className = "dna-card";

      // Gene name + tip
      const cardHeader = document.createElement("div");
      cardHeader.className = "dna-card-header";
      const nameSpan = document.createElement("span");
      nameSpan.className = "dna-card-name";
      nameSpan.textContent = def.name;
      cardHeader.appendChild(nameSpan);
      if (GENE_TIPS[def.name]) {
        const tip = document.createElement("span");
        tip.className = "setting-tip";
        tip.textContent = "?";
        tip.addEventListener("mouseenter", (e) => showTooltip(e.target, GENE_TIPS[def.name], "left"));
        tip.addEventListener("mouseleave", hideTooltip);
        cardHeader.appendChild(tip);
      }
      card.appendChild(cardHeader);

      // Starting value slider
      card.appendChild(buildSliderRow({
        key: def.name, label: "Start",
        min: def.min, max: def.max, step: fracStep,
        obj: design.genes,
      }, true));

      // Mutation rate + step in a row
      const mutRow = document.createElement("div");
      mutRow.className = "dna-mut-row";

      mutRow.appendChild(buildMiniSlider({
        key: def.name, label: "Mut Rate",
        min: 0, max: 1.0, step: 0.05,
        obj: design.mutRates,
        tip: "Chance this gene mutates per reproduction (0=never, 1=always).",
      }));

      mutRow.appendChild(buildMiniSlider({
        key: def.name, label: "Mut Step",
        min: 0, max: def.max - def.min, step: fracStep,
        obj: design.mutSteps,
        tip: "Max change per mutation. Larger = more dramatic mutations.",
      }));

      card.appendChild(mutRow);
      content.appendChild(card);
    }

    // Energy & Metabolism section
    const energyHeader = document.createElement("div");
    energyHeader.className = "modal-sub-header";
    energyHeader.textContent = "Energy & Metabolism";
    content.appendChild(energyHeader);

    const energyParams = [
      { key: "initial",                label: "Initial Energy",     min: 20,    max: 500,  step: 10,  obj: design.cfg,
        tip: "Energy each creature starts with." },
      { key: "maxEnergy",              label: "Max Energy",         min: 100,   max: 1000, step: 50,  obj: design.cfg,
        tip: "Maximum energy a creature can store." },
      { key: "maxHealth",              label: "Max Health",         min: 50,    max: 500,  step: 10,  obj: design.cfg,
        tip: "Maximum health. Drains when out of food or water." },
      { key: "moveCostBase",           label: "Move Cost",          min: 0.01,  max: 0.5,  step: 0.01, obj: design.cfg,
        tip: "Energy cost per tick for movement (x speed\u00B2 x size)." },
      { key: "idleCost",               label: "Idle Cost",          min: 0.005, max: 0.2,  step: 0.005, obj: design.cfg,
        tip: "Base energy cost per tick just for being alive." },
      { key: "matingDuration",         label: "Mating Duration",    min: 60,    max: 600,  step: 30,  obj: design.cfg,
        tip: "Ticks the pair spends mating." },
      { key: "hungerThreshold",        label: "Hunger Seek %",      min: 0.1,   max: 1.0,  step: 0.05, obj: design.cfg,
        tip: "Seek food when energy drops below this fraction of max." },
      { key: "thirstThreshold",        label: "Thirst Seek %",      min: 0.1,   max: 1.0,  step: 0.05, obj: design.cfg,
        tip: "Seek water when hydration drops below this fraction." },
      { key: "eatingDuration",         label: "Eating Duration",    min: 10,    max: 120,  step: 5,   obj: design.cfg,
        tip: "Ticks it takes to eat a berry." },
      { key: "maturityAge",            label: "Maturity Age",       min: 100,   max: 2000, step: 50,  obj: design.cfg,
        tip: "Ticks after growth completes before creature can mate." },
    ];

    for (const param of energyParams) {
      content.appendChild(buildSliderRow(param));
    }

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.className = "modal-btn-row";

    const saveBtn = document.createElement("button");
    saveBtn.className = "sidebar-btn primary";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      upsertSpecies(design);
      // Update any matching entries in the spawn list
      for (const rel of pendingReleases) {
        if (rel.speciesId === design.id) {
          rel.name = design.name;
          rel.genes = { ...design.genes };
          rel.diet = design.diet;
          rel.sides = design.sides;
          rel.count = design.count;
          rel.cfg = { ...design.cfg };
        }
      }
      closeModal();
      populateSpeciesSelect();
      renderReleaseList();
    });

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sidebar-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", closeModal);

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    content.appendChild(btnRow);

    // Autofocus name
    requestAnimationFrame(() => { nameInput.focus(); nameInput.select(); });
  });
}

// ─── Ecosystem Editor Modal ────────────────────────────────────────────────

function openEcosystemModal(eco, isExisting) {
  openModal("Ecosystem", (content) => {
    // Name with randomize button
    const nameInput = appendNameField(content, eco.name, randomEcosystemName, (val) => { eco.name = val; });

    // Ecosystem params with tooltips
    const params = [
      { key: "waterPoolCount",  label: "Water Pools",     min: 0, max: 20,  step: 1,  obj: eco,
        tip: "Number of water pools in the ecosystem." },
      { key: "waterPoolRadius", label: "Pool Size",        min: 10, max: 80, step: 5,  obj: eco,
        tip: "Radius of each pool. Bigger pools let more creatures drink at once." },
      { key: "bushCount",       label: "Blueberry Bushes", min: 0, max: 30,  step: 1,  obj: eco,
        tip: "Number of blueberry bushes." },
      { key: "berriesPerBush",  label: "Berries per Bush", min: 1, max: 30,  step: 1,  obj: eco,
        tip: "Max berries on each bush. Eaten berries regrow after a delay." },
      { key: "berryRegrowTime", label: "Berry Regrow",     min: 60, max: 600, step: 30, obj: eco,
        tip: "Ticks for an eaten berry to regrow." },
      { key: "berryEnergy",     label: "Berry Energy",     min: 5, max: 100, step: 5,  obj: eco,
        tip: "Energy a creature gains from eating one berry (before efficiency)." },
    ];

    // World settings that belong in ecosystem
    const worldParams = [
      { key: "speciesHueThreshold", label: "Species Hue Δ",  min: 5,   max: 180,  step: 5,  obj: WORLD,
        tip: "Max hue distance for creatures to be considered the same species and able to mate." },
      { key: "maxCreatures",        label: "Max Population",  min: 100, max: 5000, step: 100, obj: WORLD,
        tip: "Hard cap on total creatures. No births allowed above this limit." },
    ];

    for (const param of params) {
      content.appendChild(buildSliderRow(param));
    }

    const worldHeader = document.createElement("div");
    worldHeader.className = "modal-sub-header";
    worldHeader.textContent = "Rules";
    content.appendChild(worldHeader);

    for (const param of worldParams) {
      content.appendChild(buildSliderRow(param));
    }

    // Buttons
    const btnRow = document.createElement("div");
    btnRow.className = "modal-btn-row";

    const saveBtn = document.createElement("button");
    saveBtn.className = "sidebar-btn primary";
    saveBtn.textContent = "Save";
    saveBtn.addEventListener("click", () => {
      upsertEcosystem(eco);
      selectedEcosystem = eco;
      applyEcosystemToWorld(eco);
      populateEcosystemSelect();
      closeModal();
    });

    if (isExisting) {
      const delBtn = document.createElement("button");
      delBtn.className = "sidebar-btn danger";
      delBtn.textContent = "Delete";
      delBtn.addEventListener("click", () => {
        deleteEcosystem(eco.id);
        if (selectedEcosystem && selectedEcosystem.id === eco.id) {
          selectedEcosystem = null;
        }
        populateEcosystemSelect();
        closeModal();
      });
      btnRow.appendChild(delBtn);
    }

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "sidebar-btn";
    cancelBtn.textContent = "Cancel";
    cancelBtn.addEventListener("click", closeModal);

    btnRow.appendChild(saveBtn);
    btnRow.appendChild(cancelBtn);
    content.appendChild(btnRow);

    // Autofocus name
    requestAnimationFrame(() => { nameInput.focus(); nameInput.select(); });
  });
}

// ─── Gene tooltips ─────────────────────────────────────────────────────────

const GENE_TIPS = {
  speed:      "Movement speed. Faster = finds food quicker, but cost scales with speed\u00B2 \u00D7 size.",
  size:       "Body radius. Bigger = wider eating range, but higher movement cost.",
  eyesight:   "Detection range for food, water, and mates.",
  efficiency: "Energy extracted per meal (0\u20131). Pure advantage \u2014 expect it to climb.",
  hue:        "Body color on the color wheel. Determines species via hue threshold.",
  charisma:   "Mating success chance. Both partners' values multiply.",
  reproductiveCapability: "Average babies per mating.",
  pregnancyTime: "Pregnancy duration (ticks). Longer = stronger babies but higher cost.",
  attack:     "Damage per tick when attacking prey. > 0.3 makes this a predator.",
  defense:    "Reduces incoming attack damage.",
};

// ─── Shared helpers ────────────────────────────────────────────────────────

function appendNameField(parent, initialName, randomFn, onChange) {
  const row = document.createElement("div");
  row.className = "modal-field";
  const label = document.createElement("label");
  label.className = "modal-field-label";
  label.textContent = "Name";
  row.appendChild(label);

  const inputWrap = document.createElement("div");
  inputWrap.className = "modal-name-wrap";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "modal-text-input";
  input.value = initialName;
  input.addEventListener("input", () => onChange(input.value));

  const randBtn = document.createElement("button");
  randBtn.className = "sidebar-icon-btn small";
  randBtn.textContent = "\uD83C\uDFB2"; // 🎲
  randBtn.title = "Random name";
  randBtn.addEventListener("click", () => {
    const name = randomFn();
    input.value = name;
    onChange(name);
  });

  inputWrap.appendChild(input);
  inputWrap.appendChild(randBtn);
  row.appendChild(inputWrap);
  parent.appendChild(row);
  return input;
}

function appendField(parent, labelText, buildInputFn) {
  const row = document.createElement("div");
  row.className = "modal-field";
  const label = document.createElement("label");
  label.className = "modal-field-label";
  label.textContent = labelText;
  row.appendChild(label);
  row.appendChild(buildInputFn());
  parent.appendChild(row);
}

function buildSliderRow(param, compact = false) {
  const row = document.createElement("div");
  row.className = compact ? "setting-row compact" : "setting-row";

  const defaultVal = param.obj[param.key];

  const label = document.createElement("label");
  label.className = "setting-label";
  label.textContent = param.label;

  if (param.tip) {
    const tip = document.createElement("span");
    tip.className = "setting-tip";
    tip.textContent = "?";
    tip.addEventListener("mouseenter", (e) => showTooltip(e.target, param.tip, "left"));
    tip.addEventListener("mouseleave", hideTooltip);
    label.appendChild(tip);
  }

  const valueSpan = document.createElement("span");
  valueSpan.className = "setting-value";
  valueSpan.textContent = formatValue(param.obj[param.key], param.step);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "setting-slider";
  slider.min = param.min;
  slider.max = param.max;
  slider.step = param.step;
  slider.value = param.obj[param.key];

  slider.addEventListener("input", () => {
    const val = parseFloat(slider.value);
    param.obj[param.key] = val;
    valueSpan.textContent = formatValue(val, param.step);
  });

  const resetBtn = document.createElement("button");
  resetBtn.className = "setting-reset";
  resetBtn.textContent = "\u21A9";
  resetBtn.title = `Reset to ${formatValue(defaultVal, param.step)}`;

  function updateResetVis() {
    const current = parseFloat(slider.value);
    resetBtn.classList.toggle("visible", Math.abs(current - defaultVal) > param.step * 0.01);
  }

  resetBtn.addEventListener("click", () => {
    param.obj[param.key] = defaultVal;
    slider.value = defaultVal;
    valueSpan.textContent = formatValue(defaultVal, param.step);
    updateResetVis();
  });
  slider.addEventListener("input", updateResetVis);
  updateResetVis();

  const labelRow = document.createElement("div");
  labelRow.className = "setting-label-row";
  labelRow.appendChild(label);
  labelRow.appendChild(resetBtn);
  labelRow.appendChild(valueSpan);

  row.appendChild(labelRow);
  row.appendChild(slider);
  return row;
}

function buildMiniSlider(param) {
  const wrapper = document.createElement("div");
  wrapper.className = "dna-mini-slider";

  const labelRow = document.createElement("div");
  labelRow.className = "setting-label-row";

  const label = document.createElement("label");
  label.className = "setting-label";
  label.textContent = param.label;

  if (param.tip) {
    const tip = document.createElement("span");
    tip.className = "setting-tip small";
    tip.textContent = "?";
    tip.addEventListener("mouseenter", (e) => showTooltip(e.target, param.tip, "left"));
    tip.addEventListener("mouseleave", hideTooltip);
    label.appendChild(tip);
  }

  const valueSpan = document.createElement("span");
  valueSpan.className = "setting-value";
  valueSpan.textContent = formatValue(param.obj[param.key], param.step);

  const slider = document.createElement("input");
  slider.type = "range";
  slider.className = "setting-slider";
  slider.min = param.min;
  slider.max = param.max;
  slider.step = param.step;
  slider.value = param.obj[param.key];

  slider.addEventListener("input", () => {
    const val = parseFloat(slider.value);
    param.obj[param.key] = val;
    valueSpan.textContent = formatValue(val, param.step);
  });

  labelRow.appendChild(label);
  labelRow.appendChild(valueSpan);
  wrapper.appendChild(labelRow);
  wrapper.appendChild(slider);
  return wrapper;
}

function formatValue(val, step) {
  if (step < 0.01) return val.toFixed(3);
  if (step < 1) return val.toFixed(2);
  return String(Math.round(val));
}
