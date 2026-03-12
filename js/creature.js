// creature.js -- A living creature in the simulation.
// Creatures have gender, hydration, a behavioral state machine, and sexual reproduction.
// States: idle, seekingFood, seekingWater, seekingMate, mating, pregnant, drinking, growing

import { Genome } from "./genome.js";
import { ENERGY, WORLD } from "./config.js";

let nextId = 0;

// Hue distance with 0/360 wraparound
export function hueDistance(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

export class Creature {
  constructor(x, y, genome = null, gender = null) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.genome = genome || new Genome();
    this.energy = ENERGY.initial;
    this.hydration = ENERGY.maxHydration;
    this.age = 0;
    this.alive = true;
    this.gender = gender || (Math.random() < 0.5 ? "male" : "female");

    // Direction of movement (radians)
    this.heading = Math.random() * Math.PI * 2;

    // State machine
    this.state = "idle";
    this.target = null; // reference to target object (berry, pool, mate)

    // Mating state
    this.matePartner = null;
    this.matingTimer = 0;
    this.hasEatenSinceMate = true;  // start true so initial mating is possible
    this.hasDrunkSinceMate = true;

    // Pregnancy state (females only)
    this.pregnancyTimer = 0;
    this.pregnancyDuration = 0;
    this.mateGenome = null; // stored partner genome for crossover

    // Growth state (babies)
    this.growthProgress = 1.0; // 0→1, starts at 1.0 for adults
    this.growthDuration = 0;
    this.sparkleOffsets = null;
    this.sparkleTick = 0;

    // Drinking state
    this.drinkTimer = 0;

    // Cache gene values
    this._cacheGenes();
  }

  _cacheGenes() {
    this.speed      = this.genome.get("speed");
    this.size       = this.genome.get("size");
    this.eyesight   = this.genome.get("eyesight");
    this.efficiency = this.genome.get("efficiency");
    this.hue        = this.genome.get("hue");
    this.charisma   = this.genome.get("charisma");
    this.reproductiveCapability = this.genome.get("reproductiveCapability");
    this.pregnancyTime = this.genome.get("pregnancyTime");
  }

  /** Effective speed accounting for pregnancy and growth */
  get effectiveSpeed() {
    let s = this.speed;
    if (this.state === "pregnant") s *= ENERGY.pregnancySpeedMult;
    if (this.growthProgress < 1.0) s *= (0.8 + 0.2 * this.growthProgress);
    return s;
  }

  /** Effective eyesight accounting for pregnancy and growth */
  get effectiveEyesight() {
    let e = this.eyesight;
    if (this.state === "pregnant") e *= ENERGY.pregnancyEyesightMult;
    if (this.growthProgress < 1.0) e *= (0.8 + 0.2 * this.growthProgress);
    return e;
  }

  /** Rendered size accounting for pregnancy swell and growth */
  get renderSize() {
    let s = this.size;
    if (this.growthProgress < 1.0) {
      s *= (0.6 + 0.4 * this.growthProgress);
    }
    if (this.state === "pregnant" && this.pregnancyDuration > 0) {
      const progress = 1 - this.pregnancyTimer / this.pregnancyDuration;
      s *= (1.0 + 0.2 * progress);
    }
    return s;
  }

  /** Whether this creature can seek a mate */
  get canMate() {
    if (this.state === "mating" || this.state === "pregnant" || this.state === "drinking" || this.state === "growing") return false;
    if (!this.hasEatenSinceMate || !this.hasDrunkSinceMate) return false;
    if (this.energy < ENERGY.maxEnergy * 0.3) return false;
    return true;
  }

  /** Check if another creature is same species (hue within threshold) */
  isSameSpecies(other) {
    return hueDistance(this.hue, other.hue) <= WORLD.speciesHueThreshold;
  }

  /** Steer toward a point */
  steerToward(tx, ty) {
    this.heading = Math.atan2(ty - this.y, tx - this.x);
  }

  /** Small random turn for wandering */
  wander() {
    this.heading += (Math.random() - 0.5) * 0.5;
  }

  /** Move forward. Bounces off walls. */
  move(worldWidth, worldHeight) {
    const spd = this.effectiveSpeed;
    this.x += Math.cos(this.heading) * spd;
    this.y += Math.sin(this.heading) * spd;

    const s = this.size;
    if (this.x < s) { this.x = s; this.heading = Math.PI - this.heading; }
    else if (this.x > worldWidth - s) { this.x = worldWidth - s; this.heading = Math.PI - this.heading; }
    if (this.y < s) { this.y = s; this.heading = -this.heading; }
    else if (this.y > worldHeight - s) { this.y = worldHeight - s; this.heading = -this.heading; }
  }

  /** Spend energy and hydration each tick. */
  metabolize(isMoving) {
    let energyCost = ENERGY.idleCost;
    if (isMoving) {
      energyCost += ENERGY.moveCostBase * this.effectiveSpeed * this.effectiveSpeed * (this.size / 10);
    }
    if (this.state === "pregnant") {
      energyCost *= ENERGY.pregnancyEnergyCostMult;
    }
    this.energy -= energyCost;

    // Hydration loss scales with speed when moving
    let hydrationLoss = ENERGY.hydrationLossRate;
    if (isMoving) {
      hydrationLoss *= (1 + this.effectiveSpeed * 0.2);
    }
    this.hydration -= hydrationLoss;

    this.age++;

    if (this.energy <= 0 || this.hydration <= 0) {
      this.alive = false;
    }
  }

  /** Eat a berry */
  eatBerry(berryEnergy) {
    this.energy = Math.min(this.energy + berryEnergy * this.efficiency, ENERGY.maxEnergy);
    this.hasEatenSinceMate = true;
  }

  /** Start drinking water */
  startDrinking() {
    this.state = "drinking";
    this.drinkTimer = ENERGY.drinkDuration;
  }

  /** Tick the drinking process */
  tickDrinking() {
    this.drinkTimer--;
    if (this.drinkTimer <= 0) {
      this.hydration = Math.min(this.hydration + ENERGY.waterDrinkAmount, ENERGY.maxHydration);
      this.hasDrunkSinceMate = true;
      this.state = "idle";
    }
  }

  /** Start mating with a partner */
  startMating(partner) {
    this.state = "mating";
    this.matePartner = partner;
    this.matingTimer = ENERGY.matingDuration;
    partner.state = "mating";
    partner.matePartner = this;
    partner.matingTimer = ENERGY.matingDuration;
  }

  /** Tick the mating process. Returns true when mating completes. */
  tickMating() {
    this.matingTimer--;
    return this.matingTimer <= 0;
  }

  /** Called on the female when mating completes */
  becomePregnant(partnerGenome) {
    this.state = "pregnant";
    this.mateGenome = partnerGenome;
    this.pregnancyDuration = Math.round(this.pregnancyTime);
    this.pregnancyTimer = this.pregnancyDuration;
    this.hasEatenSinceMate = false;
    this.hasDrunkSinceMate = false;
    this.matePartner = null;
  }

  /** Tick pregnancy. Returns true when ready to give birth. */
  tickPregnancy() {
    this.pregnancyTimer--;
    return this.pregnancyTimer <= 0;
  }

  /** Give birth: returns array of baby creatures */
  giveBirth() {
    const avgRepro = (this.reproductiveCapability +
      (this.mateGenome ? new Genome(this.mateGenome.genes).get("reproductiveCapability") : this.reproductiveCapability)) / 2;
    const babyCount = Math.max(1, Math.round(avgRepro));
    const babies = [];

    // Gestation bonus: longer pregnancy = stronger babies
    const gestationSeconds = (this.pregnancyDuration) / 60;
    const gestationBonus = 1.0 + ENERGY.gestationSpeedBonus * gestationSeconds;

    for (let i = 0; i < babyCount; i++) {
      const childGenome = Genome.crossover(this.genome, this.mateGenome);
      const angle = Math.random() * Math.PI * 2;
      const offset = this.size * 2;
      const baby = new Creature(
        this.x + Math.cos(angle) * offset,
        this.y + Math.sin(angle) * offset,
        childGenome,
        Math.random() < 0.5 ? "male" : "female"
      );
      baby.state = "growing";
      baby.growthProgress = 0;
      // Growth duration clamped between base and max
      baby.growthDuration = Math.min(
        ENERGY.growthDuration * gestationBonus,
        ENERGY.growthDurationMax
      );
      baby.energy = ENERGY.initial * 0.7;
      baby.hydration = ENERGY.maxHydration * 0.7;
      baby.hasEatenSinceMate = false;
      baby.hasDrunkSinceMate = false;
      // Initialize sparkle offsets
      baby._resetSparkles();
      babies.push(baby);
    }

    this.state = "idle";
    this.mateGenome = null;
    this.hasEatenSinceMate = false;
    this.hasDrunkSinceMate = false;
    return babies;
  }

  /** Tick growth. Returns true when fully grown. */
  tickGrowth() {
    if (this.growthDuration <= 0) {
      this.growthProgress = 1.0;
      return true;
    }
    this.growthProgress += 1 / this.growthDuration;
    // Reposition sparkles every ~10 ticks
    this.sparkleTick++;
    if (this.sparkleTick >= 10) {
      this._resetSparkles();
      this.sparkleTick = 0;
    }
    if (this.growthProgress >= 1.0) {
      this.growthProgress = 1.0;
      this.sparkleOffsets = null;
      return true;
    }
    return false;
  }

  _resetSparkles() {
    this.sparkleOffsets = [];
    for (let i = 0; i < 3; i++) {
      this.sparkleOffsets.push({
        dx: (Math.random() - 0.5) * this.size * 2,
        dy: (Math.random() - 0.5) * this.size * 2,
      });
    }
  }
}
