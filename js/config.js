// config.js -- All tunable constants in one place.
// These are mutable objects so the UI can adjust them at runtime.
// Want to add a new gene? Just add an object to GENE_DEFS!

export const GENE_DEFS = [
  // ── Body & Senses ──
  { name: "speed",                min: 0.5, max: 5.0, default: 2.0, unit: "px/tick", category: "body" },
  { name: "size",                 min: 3,   max: 20,  default: 8,   unit: "px",      category: "body" },
  { name: "eyesight",             min: 10,  max: 200, default: 60,  unit: "px",      category: "body" },
  { name: "attack",               min: 0,   max: 5.0, default: 1.0, unit: "dmg/tick",category: "body" },
  { name: "defense",              min: 0,   max: 3.0, default: 0.5, unit: "",        category: "body" },

  // ── Metabolism ──
  { name: "efficiency",           min: 0.1, max: 1.0, default: 0.5, unit: "",        category: "metabolism" },
  { name: "maxEnergy",            min: 100, max: 1000,default: 200, unit: "",        category: "metabolism" },
  { name: "hungerThreshold",      min: 0.1, max: 1.0, default: 0.6, unit: "",        category: "metabolism" },
  { name: "thirstThreshold",      min: 0.1, max: 1.0, default: 0.6, unit: "",        category: "metabolism" },
  { name: "eatingDuration",       min: 10,  max: 120, default: 40,  unit: "ticks",   category: "metabolism" },

  // ── Reproduction ──
  { name: "hue",                  min: 0,   max: 360, default: 120, unit: "deg",     category: "reproduction" },
  { name: "charisma",             min: 0.01,max: 1.0, default: 0.5, unit: "%",       category: "reproduction" },
  { name: "reproductiveCapability",min: 1,  max: 8,   default: 2,   unit: "babies",  category: "reproduction" },
  { name: "pregnancyTime",        min: 50,  max: 500, default: 200, unit: "ticks",   category: "reproduction" },
  { name: "matingDuration",       min: 60,  max: 600, default: 300, unit: "ticks",   category: "reproduction" },
  { name: "maturityAge",          min: 100, max: 2000,default: 800, unit: "ticks",   category: "reproduction" },

  // ── Mutation (self-referential: these mutate using their own values) ──
  { name: "mutRate",    min: 0,     max: 1.0,   default: 0.3,   unit: "",         category: "mutation",
    tip: "Chance each gene mutates per reproduction (0=never, 1=always). Itself heritable and mutable." },
  { name: "mutStep",    min: 0,     max: 1.0,   default: 0.3,   unit: "",         category: "mutation",
    tip: "Fraction of a gene's range used as max mutation delta. Itself heritable and mutable." },
];

export const WORLD = {
  width: 1200,
  height: 700,
  bushCount: 10,
  berriesPerBush: 15,
  berryRegrowTime: 300,   // ticks (~5 seconds at 60fps)
  berryEnergy: 40,
  waterPoolCount: 5,
  waterPoolRadius: 25,
  startingCreatures: 30,
  speciesHueThreshold: 30, // max hue distance for same-species mating
  maxCreatures: 3000,      // hard population cap
};

// Fixed species-level constants (not heritable genes).
export const ENERGY = {
  initial: 100,
  healthDrainNoFood: 0.15,   // health lost per tick when energy <= 0
  healthDrainNoWater: 0.15,  // health lost per tick when hydration <= 0
  pregnancyEnergyCostMult: 2.0,  // multiplier on idle cost while pregnant
  pregnancyEyesightMult: 0.5,    // eyesight reduced while pregnant
  pregnancySpeedMult: 0.6,       // speed reduced while pregnant
  growthDuration: 600,       // 10 seconds base growth (in ticks at 60fps)
  growthDurationMax: 1200,   // 20 seconds max growth
  gestationSpeedBonus: 0.05, // 5% per second in womb
  maxHydration: 100,
  hydrationLossRate: 0.03,   // base thirst per tick
  waterDrinkAmount: 50,      // hydration restored per drink
  drinkDuration: 30,         // ticks to drink water
  predatorKillDamage: 0.5,   // health damage per tick while predator attacks
  escapeChance: 0.0017,      // ~10% per second at 60fps (1 - (1-x)^60 ≈ 0.1)
  corpseEnergy: 80,          // total energy in a corpse
  // Derived metabolism constants (no longer genes)
  idleCostBase: 0.005,       // base idle energy drain per tick
  moveCostBase: 0.05,        // base movement energy cost multiplier
  healthPerSize: 12,         // maxHealth = size * healthPerSize
};

export const INJURY = {
  // Health thresholds (fraction of maxHealth)
  mildThreshold: 0.7,       // below 70% health
  severeThreshold: 0.4,     // below 40% health
  extremeThreshold: 0.15,   // below 15% health
  // Stat multipliers per injury level
  mildMult: 0.85,
  severeMult: 0.6,
  extremeMult: 0.35,
};

export const SIM = {
  defaultTicksPerFrame: 1,
  maxTicksPerFrame: 20,
};

// Snapshot of default values so "Reset" can restore them.
export const DEFAULTS = {
  WORLD: { ...WORLD },
  ENERGY: { ...ENERGY },
  INJURY: { ...INJURY },
  GENE_DEFS: GENE_DEFS.map(g => ({ ...g })),
};

// Settings metadata: defines UI slider ranges and tooltips for each tunable parameter.
export const SETTINGS_META = {
  world: {
    label: "World",
    params: [
      { key: "bushCount",         label: "Bush Count",       min: 0,    max: 30,   step: 1,   obj: WORLD,
        tip: "Number of blueberry bushes spawned randomly across the map." },
      { key: "berriesPerBush",    label: "Berries/Bush",     min: 1,    max: 30,   step: 1,   obj: WORLD,
        tip: "Maximum berries each bush can hold. Eaten berries regrow after a delay." },
      { key: "berryRegrowTime",   label: "Berry Regrow",     min: 60,   max: 600,  step: 30,  obj: WORLD,
        tip: "Ticks for an eaten berry to regrow on its bush." },
      { key: "berryEnergy",       label: "Berry Energy",     min: 5,    max: 100,  step: 5,   obj: WORLD,
        tip: "Energy a creature gains from eating one berry (before efficiency multiplier)." },
      { key: "waterPoolCount",    label: "Water Pools",      min: 0,    max: 20,   step: 1,   obj: WORLD,
        tip: "Number of water pools on the map." },
      { key: "waterPoolRadius",   label: "Pool Size",        min: 10,   max: 80,   step: 5,   obj: WORLD,
        tip: "Radius of each pool. Bigger pools let more creatures drink at once." },
      { key: "speciesHueThreshold", label: "Species Hue Δ",  min: 5,    max: 180,  step: 5,   obj: WORLD,
        tip: "Max hue distance for creatures to be considered the same species and able to mate." },
      { key: "startingCreatures", label: "Starting Pop.",    min: 5,    max: 200,  step: 5,   obj: WORLD,
        tip: "Number of creatures spawned on reset (when no species are selected)." },
      { key: "maxCreatures",      label: "Max Population",   min: 100,  max: 5000, step: 100, obj: WORLD,
        tip: "Hard cap on total creatures. No births allowed above this limit." },
    ],
  },
  energy: {
    label: "Energy",
    params: [
      { key: "initial",                label: "Initial Energy",     min: 20,    max: 500,  step: 10,  obj: ENERGY,
        tip: "Energy each creature starts with." },
    ],
  },
};

