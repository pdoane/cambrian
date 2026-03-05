// tooltip.js -- Shared tooltip positioning logic.
// Uses a single fixed-position element (#tooltip) to escape all overflow containers.

const CHART_TIPS = {
  "chart-population": "Total number of living creatures over time. Watch for booms, crashes, and stable equilibria.",
  "chart-speed": "Average movement speed. Faster creatures find food quicker but burn more energy (cost scales with speed\u00B2).",
  "chart-size": "Average body size. Bigger creatures can reach food easier but have higher movement costs.",
  "chart-senseRange": "Average sensing range. Creatures with longer range detect food from farther away.",
  "chart-efficiency": "Average metabolic efficiency. Higher efficiency means more energy extracted from each food item.",
  "chart-hue": "Average color hue. This is a neutral trait \u2014 it doesn't affect survival, so it drifts randomly (genetic drift!).",
};

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
