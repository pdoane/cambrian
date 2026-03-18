// creature.js -- A living creature in the simulation.
// Each creature carries its own cfg (energy/injury config) from its species design.
// States: idle, seekingFood, seekingWater, seekingMate, mating, pregnant, drinking, eating, growing, fleeing, hunting, killing

import { Genome } from "./genome.js";
import { WORLD } from "./config.js";

let nextId = 0;

// Hue distance with 0/360 wraparound
export function hueDistance(a, b) {
  const d = Math.abs(a - b);
  return Math.min(d, 360 - d);
}

export class Creature {
  constructor(x, y, genome = null, gender = null, cfg = null) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.genome = genome || new Genome();
    this.cfg = cfg;

    this._cacheGenes();

    this.energy = this.cfg.initial;
    this.hydration = this.cfg.maxHydration;
    this.health = this.maxHealth;
    this.age = 0;
    this.alive = true;
    this.gender = gender || (Math.random() < 0.5 ? "male" : "female");

    this.heading = Math.random() * Math.PI * 2;

    this.state = "idle";
    this.target = null;

    this.matePartner = null;
    this.matingTimer = 0;
    this.hasEatenSinceMate = true;
    this.hasDrunkSinceMate = true;

    this.pregnancyTimer = 0;
    this.pregnancyDuration = 0;
    this.mateGenome = null;

    this.growthProgress = 1.0;
    this.growthDuration = 0;
    this.sparkleOffsets = null;
    this.sparkleTick = 0;
    this.maturityTimer = 0;

    this.drinkTimer = 0;

    this.eatTimer = 0;
    this.eatingBerry = null;
    this.eatEnergyPending = 0;

    this.huntTarget = null;
    this.attacker = null;
    this.needsFoodToHeal = false;
    this.needsWaterToHeal = false;

    this.diet = "herbivore";
    this.sides = 0;
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
    this.attack     = this.genome.get("attack");
    this.defense    = this.genome.get("defense");
    // Metabolism genes (formerly in cfg)
    this.maxEnergy       = this.genome.get("maxEnergy");
    this.maxHealth       = this.genome.get("maxHealth");
    this.moveCostBase    = this.genome.get("moveCostBase");
    this.idleCost        = this.genome.get("idleCost");
    this.hungerThreshold = this.genome.get("hungerThreshold");
    this.thirstThreshold = this.genome.get("thirstThreshold");
    this.matingDuration  = this.genome.get("matingDuration");
    this.eatingDuration  = this.genome.get("eatingDuration");
    this.maturityAge     = this.genome.get("maturityAge");
  }

  get isPredator() {
    return this.attack > 0.3 && this.diet !== "herbivore";
  }

  get canEatPlants() {
    return this.diet !== "carnivore";
  }

  get injuryLevel() {
    const frac = this.health / this.maxHealth;
    if (frac <= this.cfg.extremeThreshold) return "extreme";
    if (frac <= this.cfg.severeThreshold) return "severe";
    if (frac <= this.cfg.mildThreshold) return "mild";
    return "none";
  }

  get injuryMult() {
    switch (this.injuryLevel) {
      case "extreme": return this.cfg.extremeMult;
      case "severe":  return this.cfg.severeMult;
      case "mild":    return this.cfg.mildMult;
      default:        return 1.0;
    }
  }

  get effectiveSpeed() {
    let s = this.speed;
    if (this.state === "pregnant") s *= this.cfg.pregnancySpeedMult;
    if (this.growthProgress < 1.0) s *= (0.8 + 0.2 * this.growthProgress);
    s *= this.injuryMult;
    return s;
  }

  get effectiveEyesight() {
    let e = this.eyesight;
    if (this.state === "pregnant") e *= this.cfg.pregnancyEyesightMult;
    if (this.growthProgress < 1.0) e *= (0.8 + 0.2 * this.growthProgress);
    e *= this.injuryMult;
    return e;
  }

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

  get canMate() {
    if (this.state === "mating" || this.state === "pregnant" || this.state === "drinking"
        || this.state === "growing" || this.state === "eating" || this.state === "killing"
        || this.state === "fleeing") return false;
    if (!this.hasEatenSinceMate || !this.hasDrunkSinceMate) return false;
    if (this.energy < this.maxEnergy * 0.3) return false;
    if (this.maturityTimer < this.maturityAge) return false;
    return true;
  }

  get canFlee() {
    if (this.state === "eating" || this.state === "drinking" || this.state === "mating" || this.state === "killing") return false;
    return true;
  }

  isSameSpecies(other) {
    return hueDistance(this.hue, other.hue) <= WORLD.speciesHueThreshold;
  }

  wouldHunt(other) {
    if (!this.isPredator) return false;
    if (other.isPredator && other.attack >= this.attack) return false;
    return true;
  }

  steerToward(tx, ty) {
    this.heading = Math.atan2(ty - this.y, tx - this.x);
  }

  steerAwayFrom(tx, ty) {
    this.heading = Math.atan2(this.y - ty, this.x - tx);
  }

  wander() {
    this.heading += (Math.random() - 0.5) * 0.5;
  }

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

  metabolize(isMoving) {
    let energyCost = this.idleCost;
    if (isMoving) {
      energyCost += this.moveCostBase * this.effectiveSpeed * this.effectiveSpeed * (this.size / 10);
    }
    if (this.state === "pregnant") {
      energyCost *= this.cfg.pregnancyEnergyCostMult;
    }
    this.energy -= energyCost;

    let hydrationLoss = this.cfg.hydrationLossRate;
    if (isMoving) {
      hydrationLoss *= (1 + this.effectiveSpeed * 0.2);
    }
    this.hydration -= hydrationLoss;

    if (this.energy <= 0) {
      this.energy = 0;
      this.health -= this.cfg.healthDrainNoFood;
    }
    if (this.hydration <= 0) {
      this.hydration = 0;
      this.health -= this.cfg.healthDrainNoWater;
    }

    this.age++;

    if (this.growthProgress >= 1.0 && this.state !== "growing") {
      this.maturityTimer++;
    }

    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }

  startEating(berry, berryEnergy) {
    this.state = "eating";
    this.eatingBerry = berry;
    this.eatTimer = Math.round(this.eatingDuration);
    this.eatEnergyPending = berryEnergy;
    berry.eat();
  }

  tickEating() {
    this.eatTimer--;
    if (this.eatTimer <= 0) {
      this.energy = Math.min(this.energy + this.eatEnergyPending * this.efficiency, this.maxEnergy);
      this.hasEatenSinceMate = true;
      this.eatingBerry = null;
      this.eatEnergyPending = 0;
      if (this.needsFoodToHeal && this.needsWaterToHeal === false) {
        this.needsFoodToHeal = false;
      }
      this.state = "idle";
      return true;
    }
    return false;
  }

  startDrinking() {
    this.state = "drinking";
    this.drinkTimer = this.cfg.drinkDuration;
  }

  tickDrinking() {
    this.drinkTimer--;
    if (this.drinkTimer <= 0) {
      this.hydration = Math.min(this.hydration + this.cfg.waterDrinkAmount, this.cfg.maxHydration);
      this.hasDrunkSinceMate = true;
      if (this.needsWaterToHeal && this.needsFoodToHeal === false) {
        this.needsWaterToHeal = false;
      }
      this.state = "idle";
    }
  }

  startMating(partner) {
    this.state = "mating";
    this.matePartner = partner;
    this.matingTimer = Math.round(this.matingDuration);
    partner.state = "mating";
    partner.matePartner = this;
    partner.matingTimer = Math.round(partner.matingDuration);
  }

  tickMating() {
    this.matingTimer--;
    return this.matingTimer <= 0;
  }

  becomePregnant(partnerGenome) {
    this.state = "pregnant";
    this.mateGenome = partnerGenome;
    this.pregnancyDuration = Math.round(this.pregnancyTime);
    this.pregnancyTimer = this.pregnancyDuration;
    this.hasEatenSinceMate = false;
    this.hasDrunkSinceMate = false;
    this.matePartner = null;
  }

  tickPregnancy() {
    this.pregnancyTimer--;
    return this.pregnancyTimer <= 0;
  }

  giveBirth() {
    const avgRepro = (this.reproductiveCapability +
      (this.mateGenome ? new Genome(this.mateGenome.genes).get("reproductiveCapability") : this.reproductiveCapability)) / 2;
    const babyCount = Math.max(1, Math.round(avgRepro));
    const babies = [];

    const gestationSeconds = (this.pregnancyDuration) / 60;
    const gestationBonus = 1.0 + this.cfg.gestationSpeedBonus * gestationSeconds;

    for (let i = 0; i < babyCount; i++) {
      const childGenome = Genome.crossover(this.genome, this.mateGenome);
      const angle = Math.random() * Math.PI * 2;
      const offset = this.size * 2;
      const baby = new Creature(
        this.x + Math.cos(angle) * offset,
        this.y + Math.sin(angle) * offset,
        childGenome,
        Math.random() < 0.5 ? "male" : "female",
        this.cfg
      );
      baby.state = "growing";
      baby.growthProgress = 0;
      baby.growthDuration = Math.min(
        this.cfg.growthDuration * gestationBonus,
        this.cfg.growthDurationMax
      );
      baby.energy = this.cfg.initial * 0.7;
      baby.hydration = this.cfg.maxHydration * 0.7;
      baby.health = baby.maxHealth;
      baby.hasEatenSinceMate = false;
      baby.hasDrunkSinceMate = false;
      baby.maturityTimer = 0;
      baby.diet = this.diet;
      baby.sides = this.sides;
      baby._resetSparkles();
      babies.push(baby);
    }

    this.state = "idle";
    this.mateGenome = null;
    this.hasEatenSinceMate = false;
    this.hasDrunkSinceMate = false;
    return babies;
  }

  tickGrowth() {
    if (this.growthDuration <= 0) {
      this.growthProgress = 1.0;
      return true;
    }
    this.growthProgress += 1 / this.growthDuration;
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

  takeDamage(attackPower) {
    const damage = Math.max(0.05, attackPower - this.defense) * this.cfg.predatorKillDamage;
    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
    }
  }

  tryEscape() {
    if (Math.random() < this.cfg.escapeChance) {
      this.needsFoodToHeal = true;
      this.needsWaterToHeal = true;
      this.attacker = null;
      this.state = "idle";
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
