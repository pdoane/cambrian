// renderer.js -- Draws the simulation world onto an HTML Canvas.
// Visual design: bushes with berry rings, water pools with gradients,
// gendered creatures colored by hue gene (species), heading line colored by state,
// mating links, pregnancy glow, baby sparkles.

import { ENERGY } from "./config.js";

// State → heading line color map
const STATE_COLORS = {
  seekingFood:  "#44cc44",
  seekingWater: "#4488ff",
  seekingMate:  "#ff66aa",
  mating:       "#ff66aa",
  pregnant:     "#ffbb44",
  drinking:     "#4488ff",
  growing:      "#88ddaa",
  idle:         "#666688",
};

export class Renderer {
  constructor(canvas, world) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.world = world;
    this._legendDrawn = false;
  }

  draw() {
    const ctx = this.ctx;
    const world = this.world;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Dark background (full canvas)
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Center the world within the canvas
    const ox = Math.floor((w - world.width) / 2);
    const oy = Math.floor((h - world.height) / 2);
    ctx.save();
    ctx.translate(ox, oy);

    // World boundary walls
    ctx.strokeStyle = "rgba(126, 207, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, world.width - 2, world.height - 2);

    this._drawWaterPools(ctx, world);
    this._drawBushes(ctx, world);
    this._drawMatingLinks(ctx, world);
    this._drawCreatures(ctx, world);
    this._drawHUD(ctx, world);

    ctx.restore();

    if (!this._legendDrawn) {
      this._drawLegend();
      this._legendDrawn = true;
    }
  }

  _drawWaterPools(ctx, world) {
    const time = world.tickCount * 0.02;

    for (const pool of world.waterPools) {
      // Subtle pulse animation
      const pulse = 0.85 + 0.15 * Math.sin(time + pool.x * 0.01);

      // Radial gradient
      const grad = ctx.createRadialGradient(
        pool.x, pool.y, 0,
        pool.x, pool.y, pool.radius
      );
      grad.addColorStop(0, `hsla(200, 80%, 45%, ${pulse})`);
      grad.addColorStop(1, `hsla(210, 60%, 25%, ${pulse * 0.7})`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawBushes(ctx, world) {
    for (const bush of world.bushes) {
      // Dark green canopy
      ctx.fillStyle = "hsl(140, 40%, 20%)";
      ctx.beginPath();
      ctx.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
      ctx.fill();

      // Berries
      for (const berry of bush.berries) {
        if (berry.available) {
          ctx.fillStyle = "hsl(260, 70%, 55%)";
        } else {
          ctx.fillStyle = "rgba(100, 60, 160, 0.15)";
        }
        ctx.beginPath();
        ctx.arc(berry.slotX, berry.slotY, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  _drawMatingLinks(ctx, world) {
    const drawn = new Set();
    for (const c of world.creatures) {
      if (c.state !== "mating" || !c.matePartner) continue;
      const pairKey = Math.min(c.id, c.matePartner.id) + ":" + Math.max(c.id, c.matePartner.id);
      if (drawn.has(pairKey)) continue;
      drawn.add(pairKey);

      const p = c.matePartner;

      // Pink dashed line
      ctx.strokeStyle = "rgba(255, 100, 180, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Progress arc on female
      const female = c.gender === "female" ? c : p;
      if (female.matingTimer > 0) {
        const progress = 1 - female.matingTimer / ENERGY.matingDuration;
        ctx.strokeStyle = "rgba(255, 100, 180, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(female.x, female.y, female.renderSize + 4,
          -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  _drawCreatures(ctx, world) {
    for (const c of world.creatures) {
      if (!c.alive) continue;

      const rs = c.renderSize;

      // Body color from hue gene (species color)
      const lightness = 35 + 25 * Math.min(1, c.energy / ENERGY.maxEnergy);
      const saturation = c.state === "pregnant" ? 50 : 70;
      // Growing creatures are slightly brighter
      const lightnessBonus = c.growthProgress < 1.0 ? 10 : 0;
      ctx.fillStyle = `hsl(${c.hue}, ${saturation}%, ${lightness + lightnessBonus}%)`;

      if (c.growthProgress < 1.0) {
        // Baby: triangle
        this._drawTriangle(ctx, c.x, c.y, rs);
        ctx.fill();
      } else if (c.gender === "male") {
        // Male: square
        this._drawSquare(ctx, c.x, c.y, rs);
        ctx.fill();
      } else {
        // Female: circle
        ctx.beginPath();
        ctx.arc(c.x, c.y, rs, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pregnancy glow ring
      if (c.state === "pregnant" && c.pregnancyDuration > 0) {
        const progress = 1 - c.pregnancyTimer / c.pregnancyDuration;
        const glowRadius = rs * (1.2 + 0.4 * progress);
        ctx.strokeStyle = `rgba(255, 180, 100, ${0.2 + 0.2 * progress})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, glowRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Heading line colored by state
      const stateColor = STATE_COLORS[c.state] || STATE_COLORS.idle;
      ctx.strokeStyle = stateColor;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(
        c.x + Math.cos(c.heading) * rs * 2,
        c.y + Math.sin(c.heading) * rs * 2
      );
      ctx.stroke();
    }
  }

  _drawSquare(ctx, x, y, r) {
    const s = r * 0.85;
    const rad = s * 0.2;
    ctx.beginPath();
    ctx.roundRect(x - s, y - s, s * 2, s * 2, rad);
  }

  _drawTriangle(ctx, x, y, r) {
    const s = r * 0.95;
    ctx.beginPath();
    ctx.moveTo(x, y - s);
    ctx.lineTo(x + s, y + s * 0.7);
    ctx.lineTo(x - s, y + s * 0.7);
    ctx.closePath();
  }

  _drawHUD(ctx, world) {
    const males = world.creatures.filter(c => c.gender === "male").length;
    const females = world.creatures.length - males;
    let totalBerries = 0;
    let totalAvailable = 0;
    for (const bush of world.bushes) {
      totalBerries += bush.maxBerries;
      totalAvailable += bush.availableCount;
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.font = "14px monospace";
    ctx.fillText(
      `Tick: ${world.tickCount}   Pop: ${world.creatures.length} (${males}M/${females}F)   Berries: ${totalAvailable}/${totalBerries}`,
      10, 20
    );
  }

  _drawLegend() {
    const canvas = document.getElementById("legend-canvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;

    // Background matching play area
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    const labelColor = "rgba(255, 255, 255, 0.6)";
    const dimColor = "rgba(255, 255, 255, 0.35)";
    ctx.textBaseline = "middle";

    const left = 10;
    const iconX = left + 6;
    const textX = left + 18;
    let y = 16;

    // -- Shapes --
    ctx.font = "9px monospace";
    ctx.fillStyle = dimColor;
    ctx.fillText("SHAPES", left, y);
    y += 16;

    // Male: square
    ctx.fillStyle = "hsl(200, 70%, 50%)";
    this._drawSquare(ctx, iconX, y, 5);
    ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.font = "10px monospace";
    ctx.fillText("Male", textX, y);
    y += 16;

    // Female: circle
    ctx.fillStyle = "hsl(200, 70%, 50%)";
    ctx.beginPath();
    ctx.arc(iconX, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText("Female", textX, y);
    y += 16;

    // Baby: triangle
    ctx.fillStyle = "hsl(200, 70%, 50%)";
    this._drawTriangle(ctx, iconX, y, 5);
    ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText("Baby", textX, y);
    y += 22;

    // -- State heading lines --
    ctx.font = "9px monospace";
    ctx.fillStyle = dimColor;
    ctx.fillText("STATE", left, y);
    y += 4;
    ctx.font = "8px monospace";
    ctx.fillStyle = dimColor;
    ctx.fillText("(heading line)", left, y + 9);
    y += 22;

    const states = [
      { label: "Food",     color: "#44cc44" },
      { label: "Water",    color: "#4488ff" },
      { label: "Drink",    color: "#4488ff" },
      { label: "Mate",     color: "#ff66aa" },
      { label: "Mating",   color: "#ff66aa" },
      { label: "Pregnant", color: "#ffbb44" },
      { label: "Growing",  color: "#88ddaa" },
      { label: "Idle",     color: "#666688" },
    ];

    ctx.font = "10px monospace";
    for (const s of states) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + 12, y);
      ctx.stroke();

      ctx.fillStyle = labelColor;
      ctx.fillText(s.label, textX, y);
      y += 15;
    }
    y += 6;

    // -- Body color note --
    ctx.font = "9px monospace";
    ctx.fillStyle = dimColor;
    ctx.fillText("BODY", left, y);
    y += 11;
    ctx.fillText("= species", left, y);
    y += 11;
    ctx.fillText("hue", left, y);
    y += 20;

    // -- World objects --
    ctx.fillStyle = dimColor;
    ctx.fillText("WORLD", left, y);
    y += 16;
    ctx.font = "10px monospace";

    // Bush
    ctx.fillStyle = "hsl(140, 40%, 20%)";
    ctx.beginPath();
    ctx.arc(iconX, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText("Bush", textX, y);
    y += 16;

    // Berry
    ctx.fillStyle = "hsl(260, 70%, 55%)";
    ctx.beginPath();
    ctx.arc(iconX, y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText("Berry", textX, y);
    y += 16;

    // Water
    const grad = ctx.createRadialGradient(iconX, y, 0, iconX, y, 6);
    grad.addColorStop(0, "hsl(200, 80%, 45%)");
    grad.addColorStop(1, "hsl(210, 60%, 25%)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(iconX, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = labelColor;
    ctx.fillText("Water", textX, y);
  }
}
