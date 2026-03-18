// world.js -- The world that contains all creatures, bushes, water pools, and corpses.
// Handles spawning and spatial queries.

import { Creature, hueDistance } from "./creature.js";
import { Genome } from "./genome.js";
import { Corpse } from "./corpse.js";
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
    this.corpses = [];
    this.tickCount = 0;
  }

  /**
   * Set up the initial ecosystem.
   * @param {Array|null} speciesReleases - Array of species designs to release.
   *   Each: { genes: {...}, diet: string, sides: number, count: number }
   *   If null, uses default spawn behavior.
   */
  initialize(speciesReleases = null) {
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

    if (speciesReleases) {
      for (const release of speciesReleases) {
        this._spawnSpecies(release, margin);
      }
    }
  }

  /** Spawn creatures from a species design */
  _spawnSpecies(release, margin) {
    const count = release.count || 10;
    const cfg = release.cfg;
    for (let i = 0; i < count; i++) {
      const x = margin + Math.random() * (this.width - margin * 2);
      const y = margin + Math.random() * (this.height - margin * 2);
      const gender = i < count / 2 ? "male" : "female";
      const genome = new Genome({ ...release.genes });
      const c = new Creature(x, y, genome, gender, cfg);
      c.diet = release.diet || "herbivore";
      c.sides = release.sides ?? 0;
      c.maturityTimer = 9999;
      this.creatures.push(c);
    }
  }

  /** Tick all bush berry regrow timers */
  tickBerries() {
    for (const bush of this.bushes) {
      bush.tick();
    }
  }

  /** Add a corpse for a dead creature */
  addCorpse(creature) {
    this.corpses.push(new Corpse(creature.x, creature.y, creature.size, creature.cfg.corpseEnergy));
  }

  /** Remove depleted corpses */
  cleanCorpses() {
    this.corpses = this.corpses.filter(c => c.energy > 0);
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
   * Must be opposite gender, same species, alive, canMate, and not a child.
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

  /**
   * Find the nearest prey this predator can hunt within range.
   */
  findNearestPrey(predator, range) {
    let best = null;
    let bestDist = range * range;

    for (const other of this.creatures) {
      if (other === predator) continue;
      if (!other.alive) continue;
      if (!predator.wouldHunt(other)) continue;

      const d2 = distSq(predator.x, predator.y, other.x, other.y);
      if (d2 < bestDist) {
        bestDist = d2;
        best = other;
      }
    }

    return best;
  }

  /**
   * Find the nearest predator threatening this creature within range.
   */
  findNearestThreat(creature, range) {
    let best = null;
    let bestDist = range * range;

    for (const other of this.creatures) {
      if (other === creature) continue;
      if (!other.alive) continue;
      if (!other.wouldHunt(creature)) continue;

      const d2 = distSq(creature.x, creature.y, other.x, other.y);
      if (d2 < bestDist) {
        bestDist = d2;
        best = other;
      }
    }

    return best;
  }

  /**
   * Find the nearest corpse with energy remaining within range.
   */
  findNearestCorpse(x, y, range) {
    let best = null;
    let bestDist = range * range;

    for (const corpse of this.corpses) {
      if (!corpse.available) continue;
      const d2 = distSq(x, y, corpse.x, corpse.y);
      if (d2 < bestDist) {
        bestDist = d2;
        best = corpse;
      }
    }

    return best;
  }
}
