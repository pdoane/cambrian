// world.js -- The world that contains all creatures and food.
// Handles spawning and spatial queries (finding nearest food).

import { Creature } from "./creature.js";
import { Food } from "./food.js";
import { WORLD } from "./config.js";
import { distSq } from "./utils.js";

export class World {
  constructor() {
    this.width = WORLD.width;
    this.height = WORLD.height;
    this.creatures = [];
    this.food = [];
    this.tickCount = 0;
  }

  /** Set up the initial population and food. */
  initialize() {
    for (let i = 0; i < WORLD.startingCreatures; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      this.creatures.push(new Creature(x, y));
    }

    for (let i = 0; i < WORLD.foodCount; i++) {
      this.spawnFood();
    }
  }

  /** Add one food item at a random position. */
  spawnFood() {
    const x = Math.random() * this.width;
    const y = Math.random() * this.height;
    this.food.push(new Food(x, y, WORLD.foodEnergy));
  }

  /**
   * Find the nearest non-consumed food within sensing range.
   * Uses squared distances to avoid expensive Math.sqrt calls.
   */
  findNearestFood(x, y, range) {
    let best = null;
    let bestDist = range * range;

    for (const f of this.food) {
      if (f.consumed) continue;
      const d2 = distSq(x, y, f.x, f.y);
      if (d2 < bestDist) {
        bestDist = d2;
        best = f;
      }
    }

    return best;
  }
}
