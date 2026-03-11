// ui.js -- Wires up HTML controls to the simulation.
// Includes play/pause, speed, restart, and tabbed settings.
// Each slider has a per-setting reset button that appears when modified.
// The settings panel is built once and survives restarts.

import { SETTINGS_META, DNA_GENES, SIM } from "./config.js";
import { showTooltip, hideTooltip, setupChartTooltips } from "./tooltip.js";

let settingsBuilt = false;

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
    replaceWithClone("slider-speed");

    const btnPlayPause = document.getElementById("btn-play-pause");
    btnPlayPause.addEventListener("click", () => {
      this.simulation.running = !this.simulation.running;
      btnPlayPause.textContent = this.simulation.running ? "Pause" : "Play";
    });

    document.getElementById("btn-restart").addEventListener("click", () => {
      this.onRestart();
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
    card.appendChild(buildSliderRow(entry.startingValue, true));

    const mutRow = document.createElement("div");
    mutRow.className = "dna-mut-row";
    mutRow.appendChild(buildMiniSlider(entry.mutRate));
    mutRow.appendChild(buildMiniSlider(entry.mutStep));
    card.appendChild(mutRow);

    container.appendChild(card);
  }
}

/**
 * Create a small reset button for a slider.
 * It's hidden when the value matches the default, shown when it differs.
 */
function createResetBtn(param, defaultVal, slider, valueSpan) {
  const btn = document.createElement("button");
  btn.className = "setting-reset";
  btn.textContent = "\u21A9"; // ↩ arrow
  btn.title = `Reset to ${formatValue(defaultVal, param.step)}`;

  function updateVisibility() {
    const current = parseFloat(slider.value);
    // Use a small epsilon for floating point comparison
    btn.classList.toggle("visible", Math.abs(current - defaultVal) > param.step * 0.01);
  }

  btn.addEventListener("click", () => {
    param.obj[param.key] = defaultVal;
    slider.value = defaultVal;
    valueSpan.textContent = formatValue(defaultVal, param.step);
    updateVisibility();
  });

  slider.addEventListener("input", updateVisibility);
  updateVisibility();

  return btn;
}

/** Build a standard full-width slider row. */
function buildSliderRow(param, compact = false) {
  const row = document.createElement("div");
  row.className = compact ? "setting-row compact" : "setting-row";

  const defaultVal = param.obj[param.key];

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

  const resetBtn = createResetBtn(param, defaultVal, slider, valueSpan);

  const labelRow = document.createElement("div");
  labelRow.className = "setting-label-row";
  labelRow.appendChild(label);
  labelRow.appendChild(resetBtn);
  labelRow.appendChild(valueSpan);

  row.appendChild(labelRow);
  row.appendChild(slider);
  return row;
}

/** Build a compact mini slider (half-width, for mutation rate/step). */
function buildMiniSlider(param) {
  const wrapper = document.createElement("div");
  wrapper.className = "dna-mini-slider";

  const defaultVal = param.obj[param.key];

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

  const resetBtn = createResetBtn(param, defaultVal, slider, valueSpan);

  labelRow.appendChild(label);
  labelRow.appendChild(resetBtn);
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
