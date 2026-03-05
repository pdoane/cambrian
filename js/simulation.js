// simulation.js -- The core simulation loop.
// Each tick: creatures sense food, move, eat, spend energy, reproduce, and die.
// This file has NO knowledge of Canvas, DOM, or rendering -- it's pure logic.

import { WORLD } from "./config.js";
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

    // 1. Each creature: sense, steer, move, metabolize
    for (const c of world.creatures) {
      if (!c.alive) continue;

      const nearestFood = world.findNearestFood(c.x, c.y, c.senseRange);
      c.steer(nearestFood);
      c.move(world.width, world.height);
      c.metabolize();

      // 2. Check if creature overlaps any food (eat it!)
      for (const f of world.food) {
        if (f.consumed) continue;
        if (distSq(c.x, c.y, f.x, f.y) < c.size * c.size) {
          c.eat(f.energy);
          f.consumed = true;
        }
      }

      // 3. Reproduce if energy is high enough
      if (c.canReproduce()) {
        newCreatures.push(c.reproduce());
      }
    }

    // 4. Remove dead creatures
    world.creatures = world.creatures.filter(c => c.alive);

    // 5. Add newborns
    world.creatures.push(...newCreatures);

    // 6. Remove eaten food and regenerate
    world.food = world.food.filter(f => !f.consumed);

    // Spawn food based on regen rate (can spawn multiple per tick)
    // Also ensure a minimum food level so the population doesn't starve completely
    const foodDeficit = WORLD.foodCount - world.food.length;
    if (foodDeficit > 0) {
      // Higher deficit = more spawning pressure
      const spawnChance = WORLD.foodRegenRate * (foodDeficit / WORLD.foodCount);
      const spawns = Math.floor(spawnChance) + (Math.random() < (spawnChance % 1) ? 1 : 0);
      for (let i = 0; i < spawns; i++) {
        world.spawnFood();
      }
    }

    world.tickCount++;
  }
}
