// water.js -- Water pools that creatures drink from.
// Pools are permanent and never deplete.

export class WaterPool {
  constructor(x, y, radius) {
    this.x = x;
    this.y = y;
    this.radius = radius;
  }
}
