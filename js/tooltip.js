// tooltip.js -- Shared tooltip positioning logic.
// Uses a single fixed-position element (#tooltip) to escape all overflow containers.

const CHART_TIPS = {
  "chart-population": "Total living creatures over time. A stable line means births match deaths. Booms happen when food is plentiful; crashes when overpopulation exhausts food. A healthy ecosystem oscillates gently.",
  "chart-speed": "Average movement speed over time. Speed helps find food but costs energy (speed\u00B2 \u00D7 size). If food is scarce, slower creatures may survive longer. If food is abundant, fast ones dominate.",
  "chart-size": "Average body size over time. Bigger creatures eat from farther away but burn more energy moving. Watch whether evolution favors large or small \u2014 it depends on food density.",
  "chart-senseRange": "Average sensing range over time. Longer range = better food detection. Since it has no energy cost, this tends to increase unless mutation pushes it back down.",
  "chart-efficiency": "Average efficiency over time. Since higher efficiency is always better (more energy per meal, no downside), expect this to climb steadily toward the maximum.",
  "chart-hue": "Average hue over time. Color has no survival effect, so this line wanders randomly \u2014 a textbook example of genetic drift. The smaller the population, the more it wobbles.",
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
