// genome.js -- The DNA system.
// Each creature has a Genome containing values for every gene defined in config.js.
// When creatures mate, crossover picks each gene from one parent, then mutates.

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
   * For each gene: pick randomly from parent A or B, then apply mutation.
   */
  static crossover(genomeA, genomeB) {
    const childGenes = {};
    for (const def of GENE_DEFS) {
      // Pick from one parent randomly
      let value = Math.random() < 0.5
        ? genomeA.genes[def.name]
        : genomeB.genes[def.name];

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
