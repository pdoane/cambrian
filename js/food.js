// food.js -- Blueberry bush system. Bushes hold berries that creatures eat.
// Each berry has a position on a ring around the bush and regrows after being eaten.

import { WORLD } from "./config.js";

let nextBushId = 0;

export class Berry {
  constructor(slotX, slotY) {
    this.slotX = slotX;
    this.slotY = slotY;
    this.available = true;
    this.regrowTimer = 0;
  }

  eat() {
    this.available = false;
    this.regrowTimer = WORLD.berryRegrowTime;
  }

  tick() {
    if (!this.available) {
      this.regrowTimer--;
      if (this.regrowTimer <= 0) {
        this.available = true;
      }
    }
  }
}

export class Bush {
  constructor(x, y) {
    this.id = nextBushId++;
    this.x = x;
    this.y = y;
    this.radius = 18;
    this.maxBerries = WORLD.berriesPerBush;
    this.berries = [];

    // Precompute berry positions in a ring
    for (let i = 0; i < this.maxBerries; i++) {
      const angle = (i / this.maxBerries) * Math.PI * 2;
      const bx = x + Math.cos(angle) * (this.radius + 4);
      const by = y + Math.sin(angle) * (this.radius + 4);
      this.berries.push(new Berry(bx, by));
    }
  }

  get availableCount() {
    let count = 0;
    for (const b of this.berries) {
      if (b.available) count++;
    }
    return count;
  }

  tick() {
    for (const b of this.berries) {
      b.tick();
    }
  }

  /** Find the nearest available berry within range of (cx, cy). Returns null if none. */
  nearestAvailableBerry(cx, cy, rangeSq) {
    let best = null;
    let bestDist = rangeSq;
    for (const b of this.berries) {
      if (!b.available) continue;
      const dx = cx - b.slotX;
      const dy = cy - b.slotY;
      const d2 = dx * dx + dy * dy;
      if (d2 < bestDist) {
        bestDist = d2;
        best = b;
      }
    }
    return best;
  }
}
