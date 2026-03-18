// renderer.js -- Draws the simulation world onto an HTML Canvas.
// Visual design: bushes with berry arcs, water pools, corpses with red arcs,
// gendered creatures with symbols (^ male, v female, o child),
// heading line colored by state, mating links, pregnancy glow, injury tinting.

import { WORLD } from "./config.js";
import { drawBody, drawGenderSymbol } from "./shapes.js";

// State → heading line color map (new scheme)
const STATE_COLORS = {
  eating:       "#44cc44",   // green
  seekingFood:  "#ffffff",   // white (looking for food)
  seekingWater: "#ffffff",   // white (looking for water)
  drinking:     "#4488ff",   // blue
  seekingMate:  "rainbow",   // special: rainbow gradient
  mating:       "rainbow",
  pregnant:     "#ffbb44",
  growing:      "#88ddaa",
  idle:         "#9966cc",   // purple (just chillen)
  fleeing:      "#ff3333",   // red (running from predator)
  hunting:      "#ff6600",   // orange (chasing prey)
  killing:      "#ff3333",   // red
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

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, w, h);

    // Scale world to fit canvas, preserving aspect ratio
    const scaleX = w / world.width;
    const scaleY = h / world.height;
    const scale = Math.min(scaleX, scaleY);
    const ox = Math.floor((w - world.width * scale) / 2);
    const oy = Math.floor((h - world.height * scale) / 2);
    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    ctx.strokeStyle = "rgba(126, 207, 255, 0.3)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, world.width - 2, world.height - 2);

    this._drawWaterPools(ctx, world);
    this._drawBushes(ctx, world);
    this._drawCorpses(ctx, world);
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
    for (const pool of world.waterPools) {
      ctx.fillStyle = "hsl(210, 60%, 35%)";
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pool.x, pool.y, pool.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawBushes(ctx, world) {
    for (const bush of world.bushes) {
      // Dark green canopy
      ctx.fillStyle = "hsl(140, 40%, 20%)";
      ctx.beginPath();
      ctx.arc(bush.x, bush.y, bush.radius, 0, Math.PI * 2);
      ctx.fill();

      // Purple progress arc showing berry percentage
      const fraction = bush.availableCount / bush.maxBerries;
      if (fraction > 0) {
        ctx.strokeStyle = "rgba(160, 80, 220, 0.8)";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(bush.x, bush.y, bush.radius + 2,
          -Math.PI / 2, -Math.PI / 2 + fraction * Math.PI * 2);
        ctx.stroke();
      }

      // Black outline (outermost)
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(bush.x, bush.y, bush.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawCorpses(ctx, world) {
    for (const corpse of world.corpses) {
      // Red circle for corpse
      const alpha = 0.3 + 0.4 * corpse.fractionRemaining;
      ctx.fillStyle = `rgba(120, 30, 30, ${alpha})`;
      ctx.beginPath();
      ctx.arc(corpse.x, corpse.y, corpse.size, 0, Math.PI * 2);
      ctx.fill();

      // Red progress arc showing remaining energy
      if (corpse.fractionRemaining > 0) {
        ctx.strokeStyle = "rgba(220, 50, 50, 0.8)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(corpse.x, corpse.y, corpse.size + 2,
          -Math.PI / 2, -Math.PI / 2 + corpse.fractionRemaining * Math.PI * 2);
        ctx.stroke();
      }

      // X mark
      ctx.strokeStyle = "rgba(200, 60, 60, 0.6)";
      ctx.lineWidth = 1.5;
      const s = corpse.size * 0.4;
      ctx.beginPath();
      ctx.moveTo(corpse.x - s, corpse.y - s);
      ctx.lineTo(corpse.x + s, corpse.y + s);
      ctx.moveTo(corpse.x + s, corpse.y - s);
      ctx.lineTo(corpse.x - s, corpse.y + s);
      ctx.stroke();
    }
  }

  _drawMatingLinks(ctx, world) {
    const drawn = new Set();
    for (const c of world.creatures) {
      if (c.state !== "mating" || !c.matePartner) continue;
      const p = c.matePartner;
      if (!p.alive || p.state !== "mating") continue;
      const pairKey = Math.min(c.id, p.id) + ":" + Math.max(c.id, p.id);
      if (drawn.has(pairKey)) continue;
      drawn.add(pairKey);

      // Skip if partners are unreasonably far apart (stale reference)
      const dx = c.x - p.x;
      const dy = c.y - p.y;
      if (dx * dx + dy * dy > 10000) continue; // ~100px max

      ctx.strokeStyle = "rgba(255, 100, 180, 0.5)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      ctx.setLineDash([]);

      const female = c.gender === "female" ? c : p;
      if (female.matingTimer > 0) {
        const progress = 1 - female.matingTimer / Math.round(female.matingDuration);
        const arcRadius = female.renderSize + 4;
        const startAngle = -Math.PI / 2;
        const endAngle = startAngle + progress * Math.PI * 2;

        // Draw rainbow arc using small segments
        const segments = Math.max(6, Math.ceil(progress * 36));
        const angleSpan = endAngle - startAngle;
        ctx.lineWidth = 2;
        for (let s = 0; s < segments; s++) {
          const a0 = startAngle + (s / segments) * angleSpan;
          const a1 = startAngle + ((s + 1) / segments) * angleSpan;
          const hue = (s / segments) * 360;
          ctx.strokeStyle = `hsl(${hue}, 100%, 55%)`;
          ctx.beginPath();
          ctx.arc(female.x, female.y, arcRadius, a0, a1);
          ctx.stroke();
        }
      }
    }
  }

  _drawCreatures(ctx, world) {
    for (const c of world.creatures) {
      if (!c.alive) continue;

      const rs = c.renderSize;

      // Body color from hue gene (species color)
      const lightness = 35 + 25 * Math.min(1, c.energy / c.maxEnergy);
      const saturation = c.state === "pregnant" ? 50 : 70;
      const lightnessBonus = c.growthProgress < 1.0 ? 10 : 0;

      // Injury tinting: reduce saturation and add red shift for injured creatures
      let injurySat = saturation;
      let injuryLight = lightness + lightnessBonus;
      if (c.injuryLevel !== "none") {
        const healthFrac = c.health / c.maxHealth;
        injurySat = saturation * (0.3 + 0.7 * healthFrac);
        injuryLight = injuryLight * (0.6 + 0.4 * healthFrac);
      }

      ctx.fillStyle = `hsl(${c.hue}, ${injurySat}%, ${injuryLight}%)`;

      drawBody(ctx, c.x, c.y, rs, c.sides);
      ctx.fill();
      drawGenderSymbol(ctx, c.x, c.y, rs, c.gender, c.growthProgress);

      // Health bar (only show when injured)
      if (c.injuryLevel !== "none") {
        const healthFrac = c.health / c.maxHealth;
        const barWidth = rs * 2;
        const barHeight = 2;
        const barY = c.y - rs - 4;
        ctx.fillStyle = "rgba(50, 50, 50, 0.6)";
        ctx.fillRect(c.x - barWidth / 2, barY, barWidth, barHeight);
        const healthColor = healthFrac > 0.5 ? "#44cc44" : healthFrac > 0.2 ? "#ffaa00" : "#ff3333";
        ctx.fillStyle = healthColor;
        ctx.fillRect(c.x - barWidth / 2, barY, barWidth * healthFrac, barHeight);
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

      // Eating progress arc
      if (c.state === "eating" && c.eatTimer > 0) {
        const progress = 1 - c.eatTimer / Math.round(c.eatingDuration);
        ctx.strokeStyle = "rgba(100, 220, 100, 0.7)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, rs + 3,
          -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.stroke();
      }

      // Heading line colored by state — starts at edge of body, not center
      const stateColor = STATE_COLORS[c.state] || STATE_COLORS.idle;
      const headStartX = c.x + Math.cos(c.heading) * rs;
      const headStartY = c.y + Math.sin(c.heading) * rs;
      const headEndX = c.x + Math.cos(c.heading) * rs * 2.2;
      const headEndY = c.y + Math.sin(c.heading) * rs * 2.2;
      if (stateColor === "rainbow") {
        const grad = ctx.createLinearGradient(headStartX, headStartY, headEndX, headEndY);
        grad.addColorStop(0, "#ff0000");
        grad.addColorStop(0.17, "#ff8800");
        grad.addColorStop(0.33, "#ffff00");
        grad.addColorStop(0.5, "#00ff00");
        grad.addColorStop(0.67, "#0088ff");
        grad.addColorStop(0.83, "#8800ff");
        grad.addColorStop(1, "#ff00ff");
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = stateColor;
      }
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(headStartX, headStartY);
      ctx.lineTo(headEndX, headEndY);
      ctx.stroke();
    }
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
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      `Tick: ${world.tickCount}   Pop: ${world.creatures.length}/${WORLD.maxCreatures} (${males}M/${females}F)   Berries: ${totalAvailable}/${totalBerries}   Corpses: ${world.corpses.length}`,
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
    ctx.textAlign = "left";
    ctx.fillText("SHAPES", left, y);
    y += 16;

    // Male: ^ chevron
    ctx.fillStyle = "hsl(200, 70%, 50%)";
    drawBody(ctx, iconX, y, 7, 0);
    ctx.fill();
    drawGenderSymbol(ctx, iconX, y, 7, "male", 1.0);
    ctx.fillStyle = labelColor;
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Male", textX + 2, y);
    y += 20;

    // Female: circle with v chevron
    ctx.fillStyle = "hsl(200, 70%, 50%)";
    drawBody(ctx, iconX, y, 7, 0);
    ctx.fill();
    drawGenderSymbol(ctx, iconX, y, 7, "female", 1.0);
    ctx.fillStyle = labelColor;
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Female", textX + 2, y);
    y += 20;

    // Child: circle with small circle
    ctx.fillStyle = "hsl(200, 70%, 60%)";
    drawBody(ctx, iconX, y, 5, 0);
    ctx.fill();
    drawGenderSymbol(ctx, iconX, y, 5, "female", 0.5);
    ctx.fillStyle = labelColor;
    ctx.font = "11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Child", textX + 2, y);
    y += 24;

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
      { label: "Eating",    color: "#44cc44" },
      { label: "Drinking",  color: "#4488ff" },
      { label: "Seeking",   color: "#ffffff" },
      { label: "Mate",      color: "rainbow" },
      { label: "Fleeing",   color: "#ff3333" },
      { label: "Hunting",   color: "#ff6600" },
      { label: "Pregnant",  color: "#ffbb44" },
      { label: "Growing",   color: "#88ddaa" },
      { label: "Idle",      color: "#9966cc" },
    ];

    ctx.font = "10px monospace";
    for (const s of states) {
      if (s.color === "rainbow") {
        const grad = ctx.createLinearGradient(left, y, left + 12, y);
        grad.addColorStop(0, "#ff0000");
        grad.addColorStop(0.5, "#00ff00");
        grad.addColorStop(1, "#8800ff");
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = s.color;
      }
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + 12, y);
      ctx.stroke();

      ctx.fillStyle = labelColor;
      ctx.textAlign = "left";
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
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(iconX, y, 6, 0, Math.PI * 2);
    ctx.stroke();
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
    ctx.fillStyle = "hsl(210, 60%, 35%)";
    ctx.beginPath();
    ctx.arc(iconX, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(iconX, y, 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = labelColor;
    ctx.fillText("Water", textX, y);
    y += 16;

    // Corpse
    ctx.fillStyle = "rgba(120, 30, 30, 0.6)";
    ctx.beginPath();
    ctx.arc(iconX, y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(220, 50, 50, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(iconX, y, 7, -Math.PI / 2, Math.PI);
    ctx.stroke();
    ctx.fillStyle = labelColor;
    ctx.fillText("Corpse", textX, y);
  }
}
