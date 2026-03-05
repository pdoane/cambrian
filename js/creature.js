// creature.js -- A living creature in the simulation.
// Each creature has a Genome (its DNA), a position, energy, and simple behaviors:
//   - Sense nearby food
//   - Steer toward it (or wander randomly)
//   - Eat food to gain energy
//   - Spend energy to move (faster + bigger = more expensive!)
//   - Reproduce when energy is high enough
//   - Die when energy runs out

import { Genome } from "./genome.js";
import { ENERGY } from "./config.js";

let nextId = 0;

export class Creature {
  constructor(x, y, genome = null) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.genome = genome || new Genome();
    this.energy = ENERGY.initial;
    this.age = 0;
    this.alive = true;

    // Direction of movement (radians, 0 = right, PI/2 = down)
    this.heading = Math.random() * Math.PI * 2;

    // Cache gene values for fast access in the hot loop
    this.speed      = this.genome.get("speed");
    this.size       = this.genome.get("size");
    this.senseRange = this.genome.get("senseRange");
    this.efficiency = this.genome.get("efficiency");
    this.hue        = this.genome.get("hue");
  }

  /**
   * Decide which direction to move.
   * If food is nearby, turn toward it. Otherwise, wander randomly.
   */
  steer(nearestFood) {
    if (nearestFood) {
      this.heading = Math.atan2(
        nearestFood.y - this.y,
        nearestFood.x - this.x
      );
    } else {
      // Small random turn
      this.heading += (Math.random() - 0.5) * 0.5;
    }
  }

  /** Move forward in the current heading direction. Bounces off walls. */
  move(worldWidth, worldHeight) {
    this.x += Math.cos(this.heading) * this.speed;
    this.y += Math.sin(this.heading) * this.speed;

    // Bounce off walls: clamp position and reflect heading
    if (this.x < this.size) {
      this.x = this.size;
      this.heading = Math.PI - this.heading;
    } else if (this.x > worldWidth - this.size) {
      this.x = worldWidth - this.size;
      this.heading = Math.PI - this.heading;
    }

    if (this.y < this.size) {
      this.y = this.size;
      this.heading = -this.heading;
    } else if (this.y > worldHeight - this.size) {
      this.y = worldHeight - this.size;
      this.heading = -this.heading;
    }
  }

  /** Spend energy each tick. Bigger and faster creatures burn more energy. */
  metabolize() {
    const moveCost = ENERGY.moveCostBase * this.speed * this.speed * (this.size / 10);
    this.energy -= (ENERGY.idleCost + moveCost);
    this.age++;

    if (this.energy <= 0) {
      this.alive = false;
    }
  }

  /** Gain energy from eating food (scaled by efficiency gene). */
  eat(foodEnergy) {
    this.energy += foodEnergy * this.efficiency;
  }

  /** Can this creature reproduce? Only if it has enough energy. */
  canReproduce() {
    return this.energy >= ENERGY.reproductionThreshold;
  }

  /** Create an offspring near this creature with a mutated genome. */
  reproduce() {
    this.energy -= ENERGY.reproductionCost;

    const childGenome = this.genome.reproduce();

    // Place child near the parent
    const offset = this.size * 2;
    const angle = Math.random() * Math.PI * 2;
    return new Creature(
      this.x + Math.cos(angle) * offset,
      this.y + Math.sin(angle) * offset,
      childGenome
    );
  }
}
