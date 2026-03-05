// renderer.js -- Draws the simulation world onto an HTML Canvas.
// Creatures are colored by their hue gene and sized by their size gene.
// Brightness indicates energy level (brighter = more energy).

import { ENERGY } from "./config.js";

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.world = world;
  }

  draw() {
    const ctx = this.ctx;
    const world = this.world;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Draw food as small green dots
    ctx.fillStyle = "#44cc44";
    for (const f of world.food) {
      ctx.beginPath();
      ctx.arc(f.x, f.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw creatures
    for (const c of world.creatures) {
      if (!c.alive) continue;

      // Color: hue from DNA, lightness shows energy level
      const lightness = 30 + Math.min(40, (c.energy / ENERGY.reproductionThreshold) * 40);
      ctx.fillStyle = `hsl(${c.hue}, 70%, ${lightness}%)`;

      // Body circle (size from DNA)
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
      ctx.fill();

      // Direction indicator (small line showing where it's heading)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(
        c.x + Math.cos(c.heading) * c.size * 1.5,
        c.y + Math.sin(c.heading) * c.size * 1.5
      );
      ctx.stroke();
    }

    // HUD overlay
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "14px monospace";
    ctx.fillText(
      `Tick: ${world.tickCount}   Population: ${world.creatures.length}   Food: ${world.food.length}`,
      10, 20
    );
  }
}
