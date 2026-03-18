// simulation.js -- The core simulation loop.
// Each tick: bushes regrow, creatures decide behavior, move, eat, drink, mate, hunt, reproduce.
// This file has NO knowledge of Canvas, DOM, or rendering -- it's pure logic.

import { WORLD } from "./config.js";
import { distSq } from "./utils.js";

export class Simulation {
  constructor(world) {
    this.world = world;
    this.running = false;
    this.speed = 1; // ticks per frame (default 4x on slider)
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

      // Handle eating state
      if (c.state === "eating") {
        c.tickEating();
        c.metabolize(false);
        continue;
      }

      // Handle drinking state
      if (c.state === "drinking") {
        c.tickDrinking();
        c.metabolize(false);
        continue;
      }

      // Handle being killed by a predator
      if (c.state === "killing") {
        // This creature IS the predator — handled below in _decideBehaviorAndMove
      }

      if (c.state === "mating") {
        if (c.tickMating()) {
          if (c.gender === "female") {
            c.becomePregnant(c.matePartner ? c.matePartner.genome : c.genome);
          } else {
            c.state = "idle";
            c.hasEatenSinceMate = false;
            c.hasDrunkSinceMate = false;
          }
          if (c.matePartner) {
            const partner = c.matePartner;
            c.matePartner = null;
            if (partner.matePartner === c) {
              // Partner handles on their tick
            }
          }
        }
        if (c.matePartner) {
          c.heading = Math.atan2(c.matePartner.y - c.y, c.matePartner.x - c.x);
        }
        c.metabolize(false);
        continue;
      }

      if (c.state === "pregnant") {
        if (c.tickPregnancy()) {
          // Check population cap before birthing
          if (world.creatures.length < WORLD.maxCreatures) {
            const babies = c.giveBirth();
            newCreatures.push(...babies);
          } else {
            // Population cap reached — still end pregnancy but no babies
            c.state = "idle";
            c.mateGenome = null;
            c.hasEatenSinceMate = false;
            c.hasDrunkSinceMate = false;
          }
        }
        this._decideBehaviorAndMove(c, world);
        c.metabolize(c.state !== "idle");
        continue;
      }

      if (c.state === "growing") {
        if (c.tickGrowth()) {
          c.state = "idle";
        }
        this._decideBehaviorAndMove(c, world);
        c.metabolize(c.state !== "idle" && c.state !== "growing");
        continue;
      }

      // Normal behavior
      this._decideBehaviorAndMove(c, world);
      c.metabolize(c.state !== "idle");
    }

    // 3. Handle predator attacks (separate pass to avoid order-of-processing issues)
    for (const c of world.creatures) {
      if (!c.alive) continue;
      if (c.state === "killing" && c.huntTarget) {
        const prey = c.huntTarget;
        if (!prey.alive) {
          c.state = "idle";
          c.huntTarget = null;
          continue;
        }
        // Deal damage
        prey.takeDamage(c.attack);
        // Prey tries to escape
        if (prey.alive && prey.tryEscape()) {
          c.state = "idle";
          c.huntTarget = null;
        }
        // If prey died, create corpse and predator gets energy
        if (!prey.alive) {
          world.addCorpse(prey);
          c.energy = Math.min(c.energy + c.cfg.corpseEnergy * 0.5, c.maxEnergy);
          c.hasEatenSinceMate = true;
          c.state = "idle";
          c.huntTarget = null;
        }
      }
    }

    // 4. Remove dead creatures, clean up mating references
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

    // 5. Add newborns (respecting population cap)
    const room = WORLD.maxCreatures - world.creatures.length;
    if (room > 0) {
      world.creatures.push(...newCreatures.slice(0, room));
    }

    // 6. Clean up depleted corpses
    world.cleanCorpses();

    world.tickCount++;
  }

  /** Decide behavior and move based on priorities */
  _decideBehaviorAndMove(c, world) {
    const range = c.effectiveEyesight;

    // Priority 0: Flee from predators (if able)
    if (!c.isPredator && c.canFlee) {
      const threat = world.findNearestThreat(c, range);
      if (threat) {
        c.state = "fleeing";
        c.steerAwayFrom(threat.x, threat.y);
        c.move(world.width, world.height);
        return;
      }
    }

    // Priority 1: Seek food when hungry
    const hungryThreshold = c.maxEnergy * c.hungerThreshold;
    if (c.energy < hungryThreshold) {
      // Carnivores/omnivores can eat corpses
      if (c.diet !== "herbivore") {
        const corpse = world.findNearestCorpse(c.x, c.y, range);
        if (corpse) {
          c.state = "seekingFood";
          c.steerToward(corpse.x, corpse.y);
          c.move(world.width, world.height);
          if (distSq(c.x, c.y, corpse.x, corpse.y) < c.size * c.size) {
            const eaten = corpse.consume(WORLD.berryEnergy * c.efficiency);
            c.energy = Math.min(c.energy + eaten, c.maxEnergy);
            c.hasEatenSinceMate = true;
          }
          return;
        }
      }

      // Herbivores/omnivores can eat berries
      if (c.canEatPlants) {
        const result = world.findNearestBerry(c.x, c.y, range);
        if (result) {
          c.state = "seekingFood";
          c.steerToward(result.berry.slotX, result.berry.slotY);
          c.move(world.width, world.height);

          // Check if close enough to start eating
          if (distSq(c.x, c.y, result.berry.slotX, result.berry.slotY) < c.size * c.size) {
            c.startEating(result.berry, WORLD.berryEnergy);
          }
          return;
        }
      }
    }

    // Priority 2: Seek water when thirsty
    const thirstyThreshold = c.cfg.maxHydration * c.thirstThreshold;
    if (c.hydration < thirstyThreshold) {
      const pool = world.findNearestWaterPool(c.x, c.y, range);
      if (pool) {
        c.state = "seekingWater";
        c.steerToward(pool.x, pool.y);
        c.move(world.width, world.height);

        if (distSq(c.x, c.y, pool.x, pool.y) < pool.radius * pool.radius) {
          c.startDrinking();
        }
        return;
      }
    }

    // Priority 3: Hunt prey (predators)
    if (c.isPredator && c.energy < hungryThreshold) {
      const prey = world.findNearestPrey(c, range);
      if (prey) {
        c.state = "hunting";
        c.steerToward(prey.x, prey.y);
        c.move(world.width, world.height);

        // Check if close enough to attack
        const attackDist = (c.size + prey.size) * 1.2;
        if (distSq(c.x, c.y, prey.x, prey.y) < attackDist * attackDist) {
          c.state = "killing";
          c.huntTarget = prey;
          prey.attacker = c;
        }
        return;
      }
    }

    // Priority 4: Seek mate when able
    if (c.canMate && c.state !== "pregnant" && c.state !== "growing") {
      const mate = world.findNearestMate(c, range);
      if (mate) {
        c.state = "seekingMate";
        c.steerToward(mate.x, mate.y);
        c.move(world.width, world.height);

        const matingDist = (c.size + mate.size) * 1.5;
        if (distSq(c.x, c.y, mate.x, mate.y) < matingDist * matingDist) {
          if (Math.random() < c.charisma * mate.charisma) {
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

    // Idle
    if (c.state !== "pregnant" && c.state !== "growing" && c.state !== "killing") {
      c.state = "idle";
    }
    c.wander();
    c.move(world.width, world.height);
  }
}
