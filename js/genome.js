// genome.js -- The DNA system.
// Each creature has a Genome containing values for every gene defined in config.js.
// When creatures mate, crossover averages both parents then applies mutation.

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
   * Create a child genome via sexual crossover of two parents.
   * For each gene: take average of both parents, then apply mutation
   * using average of both parents' mutation magnitude.
   */
  static crossover(genomeA, genomeB) {
    const childGenes = {};
    for (const def of GENE_DEFS) {
      // Average of both parents
      const valA = genomeA.genes[def.name];
      const valB = genomeB.genes[def.name];
      let value = (valA + valB) / 2;

      // Mutate
      if (Math.random() < def.mutRate) {
        const delta = (Math.random() * 2 - 1) * def.mutStep;
        value = clamp(value + delta, def.min, def.max);
      }

      childGenes[def.name] = value;
    }
    return new Genome(childGenes);
  }
}
