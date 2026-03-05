// charts.js -- Draws simple line charts on small canvas elements.
// No charting library needed! Drawing a line graph from an array of
// numbers is surprisingly simple with Canvas.

import { GENE_DEFS } from "./config.js";

export class Charts {
  constructor(stats) {
    this.stats = stats;
  }

  /** Draw a line chart on a canvas element. */
  drawLineChart(canvas, data, label, color) {
    if (!canvas) return;

    const ctx = canvas.getContext("2d");

    // Match canvas resolution to its displayed size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background
    ctx.fillStyle = "#111122";
    ctx.fillRect(0, 0, w, h);

    if (data.length < 2) {
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "11px monospace";
      ctx.fillText("Waiting...", 4, h / 2);
      return;
    }

    // Find the range of values
    const max = Math.max(...data) * 1.1 || 1;
    const min = Math.min(...data) * 0.9;
    const range = max - min || 1;

    // Draw the line
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = (i / (data.length - 1)) * w;
      const y = h - 14 - ((data[i] - min) / range) * (h - 22);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Label and current value
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "10px monospace";
    ctx.fillText(`${label}: ${data[data.length - 1].toFixed(1)}`, 4, 11);
  }

  /** Redraw all chart canvases. */
  drawAll() {
    const hist = this.stats.history;

    // Population chart
    this.drawLineChart(
      document.getElementById("chart-population"),
      hist.population,
      "Population",
      "#4fc3f7"
    );

    // One chart per gene
    const colors = ["#ffb74d", "#81c784", "#ce93d8", "#4dd0e1", "#f48fb1"];
    for (let i = 0; i < GENE_DEFS.length; i++) {
      const def = GENE_DEFS[i];
      this.drawLineChart(
        document.getElementById(`chart-${def.name}`),
        hist.traits[def.name],
        def.name,
        colors[i % colors.length]
      );
    }
  }
}
