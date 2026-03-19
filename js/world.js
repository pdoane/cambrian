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

    // Track placed objects to avoid overlaps
    const placed = []; // { x, y, radius }

    const tryPlace = (radius, maxAttempts = 50) => {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = margin + Math.random() * (this.width - margin * 2);
        const y = margin + Math.random() * (this.height - margin * 2);
        let overlaps = false;
        for (const p of placed) {
          const dx = x - p.x;
          const dy = y - p.y;
          const minDist = radius + p.radius + 10;
          if (dx * dx + dy * dy < minDist * minDist) {
            overlaps = true;
            break;
          }
        }
        if (!overlaps) {
          placed.push({ x, y, radius });
          return { x, y };
        }
      }
      // Fallback: place randomly if no non-overlapping spot found
      const x = margin + Math.random() * (this.width - margin * 2);
      const y = margin + Math.random() * (this.height - margin * 2);
      placed.push({ x, y, radius });
      return { x, y };
    };

    // Spawn bushes
    for (let i = 0; i < WORLD.bushCount; i++) {
      const pos = tryPlace(22); // bush radius 18 + berry ring
      this.bushes.push(new Bush(pos.x, pos.y));
    }

    // Spawn water pools
    for (let i = 0; i < WORLD.waterPoolCount; i++) {
      const pos = tryPlace(WORLD.waterPoolRadius);
      this.waterPools.push(new WaterPool(pos.x, pos.y, WORLD.waterPoolRadius));
    }

    if (speciesReleases) {
      // Cap total spawned creatures to maxCreatures
      let remaining = WORLD.maxCreatures;
      for (const release of speciesReleases) {
        const count = Math.min(release.count, remaining);
        if (count > 0) {
          this._spawnSpecies({ ...release, count }, margin);
          remaining -= count;
        }
      }
    }
  }

  /** Check if position overlaps any water pool */
  _overlapsWater(x, y, size) {
    for (const pool of this.waterPools) {
      const dx = x - pool.x;
      const dy = y - pool.y;
      const minDist = pool.radius + size;
      if (dx * dx + dy * dy < minDist * minDist) return true;
    }
    return false;
  }

  /** Spawn creatures from a species design */
  _spawnSpecies(release, margin) {
    const count = release.count || 10;
    const cfg = release.cfg;
    for (let i = 0; i < count; i++) {
      let x, y, attempts = 0;
      do {
        x = margin + Math.random() * (this.width - margin * 2);
        y = margin + Math.random() * (this.height - margin * 2);
        attempts++;
      } while (this._overlapsWater(x, y, 10) && attempts < 30);
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

      // Charismatic prey is easier to spot (higher visibility = detectable from farther)
      const effectiveRange = range * other.visibility;
      const d2 = distSq(predator.x, predator.y, other.x, other.y);
      if (d2 < effectiveRange * effectiveRange && d2 < bestDist) {
        bestDist = d2;
        best = other;
      }
    }

    return best;
  }

  /**
   * Find the nearest predator threatening this creature within range.
   * Also detects stronger predators that would hunt this creature.
   */
  findNearestThreat(creature, range) {
    let best = null;
    let bestDist = range * range;

    for (const other of this.creatures) {
      if (other === creature) continue;
      if (!other.alive) continue;
      if (!other.wouldHunt(creature)) continue;
      // Only flee from hunters that are actively hunting or could hunt us
      // A predator only considers threats with notably higher attack
      if (creature.isPredator && other.attack < creature.attack * 1.3) continue;

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
