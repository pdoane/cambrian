// ui.js -- Wires up HTML controls to the simulation.
// Includes play/pause, speed, restart, reset defaults, and tabbed settings.
// The settings panel is built once and survives restarts.

import { SETTINGS_META, DNA_GENES, DEFAULTS, SIM, WORLD, ENERGY, GENE_DEFS } from "./config.js";
import { showTooltip, hideTooltip, setupChartTooltips } from "./tooltip.js";

let settingsBuilt = false;
// Track slider/value elements so Reset can update them
const settingElements = [];

export class UI {
  constructor(simulation, onRestart) {
    this.simulation = simulation;
    this.onRestart = onRestart;
    this.setupControls();
    if (!settingsBuilt) {
      setupTabs();
      buildSettingsTab();
      buildDnaTab();
      setupChartTooltips();
      settingsBuilt = true;
    }
  }

  setupControls() {
    replaceWithClone("btn-play-pause");
    replaceWithClone("btn-restart");
    replaceWithClone("btn-reset");
    replaceWithClone("slider-speed");

    const btnPlayPause = document.getElementById("btn-play-pause");
    btnPlayPause.addEventListener("click", () => {
      this.simulation.running = !this.simulation.running;
      btnPlayPause.textContent = this.simulation.running ? "Pause" : "Play";
    });

    document.getElementById("btn-restart").addEventListener("click", () => {
      this.onRestart();
    });

    document.getElementById("btn-reset").addEventListener("click", () => {
      restoreDefaults();
    });

    const speedSlider = document.getElementById("slider-speed");
    const speedLabel = document.getElementById("speed-label");
    speedSlider.max = SIM.maxTicksPerFrame;
    speedSlider.value = 1;
    this.simulation.ticksPerFrame = 1;
    speedLabel.textContent = "Speed: 1x";
    speedSlider.addEventListener("input", (e) => {
      this.simulation.ticksPerFrame = parseInt(e.target.value);
      speedLabel.textContent = `Speed: ${e.target.value}x`;
    });
  }
}

function replaceWithClone(id) {
  const el = document.getElementById(id);
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
}

function setupTabs() {
  const tabs = document.querySelectorAll(".tab-bar .tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach(p => p.classList.remove("active"));
      tab.classList.add("active");
      document.getElementById(tab.dataset.tab).classList.add("active");
    });
  });
}

function restoreDefaults() {
  Object.assign(WORLD, DEFAULTS.WORLD);
  Object.assign(ENERGY, DEFAULTS.ENERGY);
  for (let i = 0; i < GENE_DEFS.length; i++) {
    Object.assign(GENE_DEFS[i], DEFAULTS.GENE_DEFS[i]);
  }
  for (const { param, slider, valueSpan } of settingElements) {
    const val = param.obj[param.key];
    slider.value = val;
    valueSpan.textContent = formatValue(val, param.step);
  }
}

/** Build the Settings tab (World + Energy groups). */
function buildSettingsTab() {
  const container = document.getElementById("tab-settings");

  for (const [groupKey, group] of Object.entries(SETTINGS_META)) {
    const section = document.createElement("div");
    section.className = "settings-group";

    const header = document.createElement("div");
    header.className = "settings-group-header";
    header.textContent = group.label;
    header.addEventListener("click", () => {
      body.classList.toggle("collapsed");
      header.classList.toggle("collapsed");
    });
    section.appendChild(header);

    const body = document.createElement("div");
    body.className = "settings-group-body";

    for (const param of group.params) {
      body.appendChild(buildSliderRow(param));
    }

    section.appendChild(body);
    container.appendChild(section);
  }
}

/** Build the DNA tab with compact gene cards. */
function buildDnaTab() {
  const container = document.getElementById("tab-dna");

  for (const entry of DNA_GENES) {
    const card = document.createElement("div");
    card.className = "dna-card";

    // Gene name header with tooltip
    const header = document.createElement("div");
    header.className = "dna-card-header";
    const nameSpan = document.createElement("span");
    nameSpan.className = "dna-card-name";
    nameSpan.textContent = entry.label;
    header.appendChild(nameSpan);

    if (entry.tip) {
      const tip = document.createElement("span");
      tip.className = "setting-tip";
      tip.textContent = "?";
      tip.addEventListener("mouseenter", (e) => showTooltip(e.target, entry.tip, "left"));
      tip.addEventListener("mouseleave", hideTooltip);
      header.appendChild(tip);
    }

    card.appendChild(header);

    // Starting value: full-width slider
    card.appendChild(buildSliderRow(entry.startingValue, true));

    // Mutation rate + step: side by side
    const mutRow = document.createElement("div");
    mutRow.className = "dna-mut-row";
    mutRow.appendChild(buildMiniSlider(entry.mutRate));
    mutRow.appendChild(buildMiniSlider(entry.mutStep));
    card.appendChild(mutRow);

    container.appendChild(card);
  }
}

/** Build a standard full-width slider row. */
function buildSliderRow(param, compact = false) {
  const row = document.createElement("div");
  row.className = compact ? "setting-row compact" : "setting-row";

  const label = document.createElement("label");
  label.className = "setting-label";
  label.textContent = param.label;

  if (param.tip && !compact) {
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

  settingElements.push({ param, slider, valueSpan });

  const labelRow = document.createElement("div");
  labelRow.className = "setting-label-row";
  labelRow.appendChild(label);
  labelRow.appendChild(valueSpan);

  row.appendChild(labelRow);
  row.appendChild(slider);
  return row;
}

/** Build a compact mini slider (half-width, for mutation rate/step). */
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

  settingElements.push({ param, slider, valueSpan });

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
