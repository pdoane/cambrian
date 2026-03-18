// corpse.js -- Dead creatures that remain as food sources.
// Corpses act like berry bushes but don't regenerate.

let nextCorpseId = 0;

export class Corpse {
  constructor(x, y, size, corpseEnergy) {
    this.id = nextCorpseId++;
    this.x = x;
    this.y = y;
    this.size = size;
    this.maxEnergy = corpseEnergy;
    this.energy = this.maxEnergy;
  }

  get fractionRemaining() {
    return this.energy / this.maxEnergy;
  }

  get available() {
    return this.energy > 0;
  }

  consume(amount) {
    const taken = Math.min(amount, this.energy);
    this.energy -= taken;
    return taken;
  }
}
