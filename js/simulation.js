// simulation.js -- The core simulation loop.
// Each tick: bushes regrow, creatures decide behavior, move, eat, drink, mate, reproduce.
// This file has NO knowledge of Canvas, DOM, or rendering -- it's pure logic.

import { WORLD, ENERGY } from "./config.js";
import { distSq } from "./utils.js";

export class Simulation {
  constructor(world) {
    this.world = world;
    this.running = false;
    this.ticksPerFrame = 1;
  }

  /** Run one simulation step. */
  tick() {
    const world = this.world;
    const newCreatures = [];

    // 1. Tick berry regrow timers
    world.tickBerries();

    // 2. Process each creature
    for (const c of world.creatures) {
      if (!c.alive) continue;

      // Handle ongoing states first
      if (c.state === "drinking") {
        c.tickDrinking();
        c.metabolize(false);
        continue;
      }

      if (c.state === "mating") {
        if (c.tickMating()) {
          // Mating complete
          if (c.gender === "female") {
            c.becomePregnant(c.matePartner ? c.matePartner.genome : c.genome);
          } else {
            c.state = "idle";
            c.hasEatenSinceMate = false;
            c.hasDrunkSinceMate = false;
          }
          if (c.matePartner) {
            // Clear partner reference after processing
            const partner = c.matePartner;
            c.matePartner = null;
            if (partner.matePartner === c) {
              // Don't clear partner's reference yet — they'll handle it on their tick
            }
          }
        }
        // Face partner while mating
        if (c.matePartner) {
          c.heading = Math.atan2(c.matePartner.y - c.y, c.matePartner.x - c.x);
        }
        c.metabolize(false);
        continue;
      }

      if (c.state === "pregnant") {
        if (c.tickPregnancy()) {
          const babies = c.giveBirth();
          newCreatures.push(...babies);
        }
        // Pregnant creatures still seek food/water but move slower
        this._decideBehaviorAndMove(c, world);
        c.metabolize(c.state !== "idle");
        continue;
      }

      if (c.state === "growing") {
        if (c.tickGrowth()) {
          c.state = "idle";
        }
        // Growing babies still seek food/water
        this._decideBehaviorAndMove(c, world);
        c.metabolize(c.state !== "idle" && c.state !== "growing");
        continue;
      }

      // Normal behavior: decide what to do
      this._decideBehaviorAndMove(c, world);
      c.metabolize(c.state !== "idle");
    }

    // 3. Remove dead creatures, clean up mating references
    for (const c of world.creatures) {
      if (!c.alive && c.matePartner) {
        const partner = c.matePartner;
        if (partner.matePartner === c) {
          partner.state = "idle";
          partner.matePartner = null;
        }
        c.matePartner = null;
      }
    }
    world.creatures = world.creatures.filter(c => c.alive);

    // 4. Add newborns
    world.creatures.push(...newCreatures);

    world.tickCount++;
  }

  /** Decide behavior and move based on priorities: food > water > mate > idle */
  _decideBehaviorAndMove(c, world) {
    const range = c.effectiveEyesight;

    // Priority 1: Seek food when hungry
    const hungryThreshold = ENERGY.maxEnergy * ENERGY.hungerThreshold;
    if (c.energy < hungryThreshold) {
      const result = world.findNearestBerry(c.x, c.y, range);
      if (result) {
        c.state = "seekingFood";
        c.steerToward(result.berry.slotX, result.berry.slotY);
        c.move(world.width, world.height);

        // Check if close enough to eat
        if (distSq(c.x, c.y, result.berry.slotX, result.berry.slotY) < c.size * c.size) {
          result.berry.eat();
          c.eatBerry(WORLD.berryEnergy);
        }
        return;
      }
    }

    // Priority 2: Seek water when thirsty
    const thirstyThreshold = ENERGY.maxHydration * ENERGY.thirstThreshold;
    if (c.hydration < thirstyThreshold) {
      const pool = world.findNearestWaterPool(c.x, c.y, range);
      if (pool) {
        c.state = "seekingWater";
        c.steerToward(pool.x, pool.y);
        c.move(world.width, world.height);

        // Check if close enough to drink
        if (distSq(c.x, c.y, pool.x, pool.y) < pool.radius * pool.radius) {
          c.startDrinking();
        }
        return;
      }
    }

    // Priority 3: Seek mate when able
    if (c.canMate && c.state !== "pregnant" && c.state !== "growing") {
      const mate = world.findNearestMate(c, range);
      if (mate) {
        c.state = "seekingMate";
        c.steerToward(mate.x, mate.y);
        c.move(world.width, world.height);

        // Check if close enough to mate
        const matingDist = (c.size + mate.size) * 1.5;
        if (distSq(c.x, c.y, mate.x, mate.y) < matingDist * matingDist) {
          // Charisma check
          if (Math.random() < c.charisma * mate.charisma) {
            // Determine who is female
            if (c.gender === "female") {
              c.startMating(mate);
            } else {
              mate.startMating(c);
            }
          }
        }
        return;
      }
    }

    // Idle: stop moving (unless pregnant or growing, which already handled above)
    if (c.state !== "pregnant" && c.state !== "growing") {
      c.state = "idle";
    }
    // Wander slightly even when idle to avoid getting permanently stuck
    c.wander();
    c.move(world.width, world.height);
  }
}
