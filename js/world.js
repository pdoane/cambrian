// world.js -- The world that contains all creatures, bushes, and water pools.
// Handles spawning and spatial queries.

import { Creature, hueDistance } from "./creature.js";
import { Bush } from "./food.js";
import { WaterPool } from "./water.js";
import { WORLD } from "./config.js";
import { distSq } from "./utils.js";

export class World {
  constructor() {
    this.width = WORLD.width;
    this.height = WORLD.height;
    this.creatures = [];
    this.bushes = [];
    this.waterPools = [];
    this.tickCount = 0;
  }

  /** Set up the initial population, bushes, and water pools. */
  initialize() {
    const margin = 30;

    // Spawn bushes
    for (let i = 0; i < WORLD.bushCount; i++) {
      const x = margin + Math.random() * (this.width - margin * 2);
      const y = margin + Math.random() * (this.height - margin * 2);
      this.bushes.push(new Bush(x, y));
    }

    // Spawn water pools
    for (let i = 0; i < WORLD.waterPoolCount; i++) {
      const x = margin + Math.random() * (this.width - margin * 2);
      const y = margin + Math.random() * (this.height - margin * 2);
      this.waterPools.push(new WaterPool(x, y, WORLD.waterPoolRadius));
    }

    // Spawn creatures (half male, half female)
    for (let i = 0; i < WORLD.startingCreatures; i++) {
      const x = margin + Math.random() * (this.width - margin * 2);
      const y = margin + Math.random() * (this.height - margin * 2);
      const gender = i < WORLD.startingCreatures / 2 ? "male" : "female";
      const c = new Creature(x, y, null, gender);
      c.genome.genes.hue = Math.random() * 360;
      c.hue = c.genome.genes.hue;
      this.creatures.push(c);
    }
  }

  /** Tick all bush berry regrow timers */
  tickBerries() {
    for (const bush of this.bushes) {
      bush.tick();
    }
  }

  /**
   * Find the nearest available berry within range of (x, y).
   * Returns { bush, berry } or null.
   */
  findNearestBerry(x, y, range) {
    let bestBerry = null;
    let bestBush = null;
    let bestDist = range * range;

    for (const bush of this.bushes) {
      // Quick check: is the bush itself within range?
      const bushDist = distSq(x, y, bush.x, bush.y);
      if (bushDist > (range + bush.radius + 10) * (range + bush.radius + 10)) continue;

      const berry = bush.nearestAvailableBerry(x, y, bestDist);
      if (berry) {
        const dx = x - berry.slotX;
        const dy = y - berry.slotY;
        const d2 = dx * dx + dy * dy;
        if (d2 < bestDist) {
          bestDist = d2;
          bestBerry = berry;
          bestBush = bush;
        }
      }
    }

    return bestBerry ? { bush: bestBush, berry: bestBerry } : null;
  }

  /**
   * Find the nearest water pool within range.
   */
  findNearestWaterPool(x, y, range) {
    let best = null;
    let bestDist = range * range;

    for (const pool of this.waterPools) {
      const d2 = distSq(x, y, pool.x, pool.y);
      if (d2 < bestDist) {
        bestDist = d2;
        best = pool;
      }
    }

    return best;
  }

  /**
   * Find the nearest compatible mate within range.
   * Must be opposite gender, same species, alive, and canMate.
   */
  findNearestMate(creature, range) {
    let best = null;
    let bestDist = range * range;

    for (const other of this.creatures) {
      if (other === creature) continue;
      if (!other.alive) continue;
      if (other.gender === creature.gender) continue;
      if (!other.canMate) continue;
      if (!creature.isSameSpecies(other)) continue;

      const d2 = distSq(creature.x, creature.y, other.x, other.y);
      if (d2 < bestDist) {
        bestDist = d2;
        best = other;
      }
    }

    return best;
  }
}
