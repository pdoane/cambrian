// stats.js -- Tracks population size and average trait values over time.
// Records a snapshot every N ticks so we can draw graphs.

import { GENE_DEFS } from "./config.js";

export class Stats {
  constructor() {
    this.history = {
      tick: [],
      population: [],
      traits: {},  // { speed: [avg1, avg2, ...], size: [...], ... }
    };

    for (const def of GENE_DEFS) {
      this.history.traits[def.name] = [];
    }

    this.sampleInterval = 10; // record every 10 ticks
  }

  /** Call each tick. Only records a snapshot every sampleInterval ticks. */
  update(world) {
    if (world.tickCount % this.sampleInterval !== 0) return;
    if (world.creatures.length === 0) return;

    this.history.tick.push(world.tickCount);
    this.history.population.push(world.creatures.length);

    // Compute average of each gene across the population
    for (const def of GENE_DEFS) {
      const sum = world.creatures.reduce(
        (acc, c) => acc + c.genome.get(def.name), 0
      );
      this.history.traits[def.name].push(sum / world.creatures.length);
    }

    // Keep history bounded so we don't eat up memory
    const MAX_SAMPLES = 500;
    if (this.history.tick.length > MAX_SAMPLES) {
      this.history.tick.shift();
      this.history.population.shift();
      for (const def of GENE_DEFS) {
        this.history.traits[def.name].shift();
      }
    }
  }
}
