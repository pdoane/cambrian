// genome.js -- The DNA system.
// Each creature has a Genome containing values for every gene defined in config.js.
// When a creature reproduces, each gene has a chance to mutate slightly.

import { GENE_DEFS } from "./config.js";
import { clamp } from "./utils.js";

export class Genome {
  /**
   * @param {Object|null} genes - Optional object like { speed: 2.1, size: 8, ... }
   *                              If null, uses default values from GENE_DEFS.
   */
  constructor(genes = null) {
    if (genes) {
      this.genes = { ...genes };
    } else {
      this.genes = {};
      for (const def of GENE_DEFS) {
        this.genes[def.name] = def.default;
      }
    }
  }

  /** Get the value of a gene by name */
  get(name) {
    return this.genes[name];
  }

  /**
   * Create a child genome with possible mutations.
   * Each gene independently rolls for mutation.
   * Mutations nudge the value by a small random amount.
   */
  reproduce() {
    const childGenes = {};
    for (const def of GENE_DEFS) {
      let value = this.genes[def.name];

      if (Math.random() < def.mutRate) {
        // Nudge up or down by a random amount within mutStep
        const delta = (Math.random() * 2 - 1) * def.mutStep;
        value = clamp(value + delta, def.min, def.max);
      }

      childGenes[def.name] = value;
    }
    return new Genome(childGenes);
  }
}
