// food.js -- Food that creatures eat to gain energy.
// Deliberately minimal: food is just data (position + energy).

let nextFoodId = 0;

export class Food {
  constructor(x, y, energy) {
    this.id = nextFoodId++;
    this.x = x;
    this.y = y;
    this.energy = energy;
    this.consumed = false;
  }
}
