// tooltip.js -- Shared tooltip positioning logic.
// Uses a single fixed-position element (#tooltip) to escape all overflow containers.

import { GENE_DEFS } from "./config.js";

const CHART_TIPS = {
  "chart-population": "Total living creatures over time. A stable line means births match deaths. Booms happen when food is plentiful; crashes when overpopulation exhausts food. A healthy ecosystem oscillates gently.",
  "chart-speed": "Average movement speed over time. Speed helps find food but costs energy (speed² × size). If food is scarce, slower creatures may survive longer. If food is abundant, fast ones dominate.",
  "chart-size": "Average body size over time. Bigger creatures eat from farther away but burn more energy moving. Watch whether evolution favors large or small — it depends on food density.",
  "chart-eyesight": "Average eyesight over time. Longer range = better detection of food, water, and mates. This tends to increase unless mutation pushes it back down.",
  "chart-efficiency": "Average efficiency over time. Since higher efficiency is always better (more energy per meal, no downside), expect this to climb steadily toward the maximum.",
  "chart-hue": "Average hue over time. Hue determines species — creatures only mate within the species hue threshold. Watch for clusters splitting into separate species via drift.",
  "chart-charisma": "Average charisma over time. Higher charisma improves mating success probability. Both partners' charisma values are multiplied for the mating check.",
  "chart-reproductiveCapability": "Average reproductive capability. More babies per mating can grow population faster but also drains the mother's resources and increases competition.",
  "chart-pregnancyTime": "Average pregnancy duration. Longer pregnancies produce stronger babies (gestation bonus) but cost the mother more energy and reduce her mobility.",
};

// Auto-generate tips for any gene not explicitly listed
for (const def of GENE_DEFS) {
  const key = `chart-${def.name}`;
  if (!CHART_TIPS[key]) {
    CHART_TIPS[key] = `Average ${def.name} gene value over time.`;
  }
}

export { CHART_TIPS };

/**
 * Show tooltip positioned near the trigger element.
 * @param {Element} triggerEl
 * @param {string} text
 * @param {"above"|"left"} prefer - preferred direction (falls back if no room)
 */
export function showTooltip(triggerEl, text, prefer = "above") {
  const tooltip = document.getElementById("tooltip");
  tooltip.textContent = text;
  tooltip.classList.add("visible");

  const rect = triggerEl.getBoundingClientRect();
  const tipRect = tooltip.getBoundingClientRect();
  let top, left;

  if (prefer === "left") {
    // Position to the left of the element, vertically centered
    top = rect.top + rect.height / 2 - tipRect.height / 2;
    left = rect.left - tipRect.width - 10;
    if (left < 4) left = rect.right + 10; // flip right if no room
  } else {
    // Position above the element, horizontally centered
    top = rect.top - tipRect.height - 8;
    left = rect.left + rect.width / 2 - tipRect.width / 2;
    if (top < 4) top = rect.bottom + 8; // flip below if no room
  }

  // Keep on screen
  if (top < 4) top = 4;
  if (top + tipRect.height > window.innerHeight - 4) top = window.innerHeight - tipRect.height - 4;
  if (left < 4) left = 4;
  if (left + tipRect.width > window.innerWidth - 4) left = window.innerWidth - tipRect.width - 4;

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

export function hideTooltip() {
  document.getElementById("tooltip").classList.remove("visible");
}

/** Attach tooltip listeners to all chart canvases. Called once. */
export function setupChartTooltips() {
  for (const [id, tip] of Object.entries(CHART_TIPS)) {
    const canvas = document.getElementById(id);
    if (!canvas) continue;
    canvas.addEventListener("mouseenter", () => showTooltip(canvas, tip));
    canvas.addEventListener("mouseleave", hideTooltip);
  }
}
