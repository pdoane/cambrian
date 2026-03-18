// genome.js -- The DNA system.
// Each creature has a Genome containing values for every gene defined in config.js.
// When creatures mate, crossover averages both parents then applies mutation.
// mutRate and mutStep are themselves genes — they control how all genes (including themselves) mutate.

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
   * For each gene: take average of both parents, then apply mutation.
   * mutRate and mutStep are averaged from parents first, then used
   * to mutate all genes (including themselves).
   */
  static crossover(genomeA, genomeB) {
    // Average the parents' mutation parameters first
    const mutRate = (genomeA.genes.mutRate + genomeB.genes.mutRate) / 2;
    const mutStep = (genomeA.genes.mutStep + genomeB.genes.mutStep) / 2;

    const childGenes = {};
    for (const def of GENE_DEFS) {
      // Average of both parents
      const valA = genomeA.genes[def.name];
      const valB = genomeB.genes[def.name];
      let value = (valA + valB) / 2;

      // Mutate using the unified mutRate/mutStep
      if (Math.random() < mutRate) {
        const range = def.max - def.min;
        const delta = (Math.random() * 2 - 1) * mutStep * range;
        value = clamp(value + delta, def.min, def.max);
      }

      childGenes[def.name] = value;
    }
    return new Genome(childGenes);
  }
}
