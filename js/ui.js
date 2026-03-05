// ui.js -- Wires up HTML controls to the simulation.
// Includes play/pause, speed, reset, and a settings panel
// that lets you tweak simulation parameters with sliders.
// The settings panel is built once and survives resets.

import { SETTINGS_META, SIM } from "./config.js";
import { showTooltip, hideTooltip, setupChartTooltips } from "./tooltip.js";

let settingsBuilt = false;

export class UI {
  constructor(simulation, onReset) {
    this.simulation = simulation;
    this.onReset = onReset;
    this.setupControls();
    if (!settingsBuilt) {
      buildSettingsPanel();
      setupChartTooltips();
      settingsBuilt = true;
    }
  }

  setupControls() {
    // Clone and replace buttons to remove old event listeners from previous start()
    replaceWithClone("btn-play-pause");
    replaceWithClone("btn-reset");
    replaceWithClone("slider-speed");

    const btnPlayPause = document.getElementById("btn-play-pause");
    btnPlayPause.addEventListener("click", () => {
      this.simulation.running = !this.simulation.running;
      btnPlayPause.textContent = this.simulation.running ? "Pause" : "Play";
    });

    document.getElementById("btn-reset").addEventListener("click", () => {
      this.onReset();
    });

    const speedSlider = document.getElementById("slider-speed");
    const speedLabel = document.getElementById("speed-label");
    speedSlider.max = SIM.maxTicksPerFrame;
    speedSlider.value = this.simulation.ticksPerFrame;
    speedSlider.addEventListener("input", (e) => {
      this.simulation.ticksPerFrame = parseInt(e.target.value);
      speedLabel.textContent = `Speed: ${e.target.value}x`;
    });
  }
}

/** Replace an element with a clone to strip all event listeners. */
function replaceWithClone(id) {
  const el = document.getElementById(id);
  const clone = el.cloneNode(true);
  el.parentNode.replaceChild(clone, el);
}

/** Build the settings panel from SETTINGS_META (called once). */
function buildSettingsPanel() {
  const container = document.getElementById("settings-panel");

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
      const row = document.createElement("div");
      row.className = "setting-row";

      const label = document.createElement("label");
      label.className = "setting-label";
      label.textContent = param.label;

      // Tooltip icon
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

      const labelRow = document.createElement("div");
      labelRow.className = "setting-label-row";
      labelRow.appendChild(label);
      labelRow.appendChild(valueSpan);

      row.appendChild(labelRow);
      row.appendChild(slider);
      body.appendChild(row);
    }

    section.appendChild(body);
    container.appendChild(section);
  }
}

/** Format a number for display: show decimals only if step is fractional. */
function formatValue(val, step) {
  if (step < 0.01) return val.toFixed(3);
  if (step < 1) return val.toFixed(2);
  return String(Math.round(val));
}
