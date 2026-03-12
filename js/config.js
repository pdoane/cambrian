// config.js -- All tunable constants in one place.
// These are mutable objects so the UI can adjust them at runtime.
// Want to add a new gene? Just add an object to GENE_DEFS!

export const GENE_DEFS = [
  // name          min   max   default  mutRate  mutStep  unit
  { name: "speed",                min: 0.5, max: 5.0, default: 2.0, mutRate: 0.3, mutStep: 0.3, unit: "px/tick" },
  { name: "size",                 min: 3,   max: 20,  default: 8,   mutRate: 0.2, mutStep: 1.0, unit: "px" },
  { name: "eyesight",             min: 10,  max: 200, default: 60,  mutRate: 0.3, mutStep: 10,  unit: "px" },
  { name: "efficiency",           min: 0.1, max: 1.0, default: 0.5, mutRate: 0.2, mutStep: 0.05, unit: "" },
  { name: "hue",                  min: 0,   max: 360, default: 120, mutRate: 0.5, mutStep: 25,  unit: "deg" },
  { name: "charisma",             min: 0.01,max: 1.0, default: 0.5, mutRate: 0.2, mutStep: 0.05, unit: "%" },
  { name: "reproductiveCapability",min: 1,  max: 8,   default: 2,   mutRate: 0.2, mutStep: 0.5, unit: "babies" },
  { name: "pregnancyTime",        min: 50,  max: 500, default: 200, mutRate: 0.2, mutStep: 20,  unit: "ticks" },
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
};

export const ENERGY = {
  initial: 100,
  maxEnergy: 200,
  moveCostBase: 0.05,        // multiplied by speed^2 * size
  idleCost: 0.02,            // base metabolic cost per tick
  matingDuration: 300,       // ticks (~5 seconds at 60fps)
  pregnancyEnergyCostMult: 2.0,  // multiplier on idle cost while pregnant
  pregnancyEyesightMult: 0.5,    // eyesight reduced while pregnant
  pregnancySpeedMult: 0.6,       // speed reduced while pregnant
  growthDuration: 600,       // 10 seconds base growth (in ticks at 60fps)
  growthDurationMax: 1200,   // 20 seconds max growth
  gestationSpeedBonus: 0.05, // 5% per second in womb
  hungerThreshold: 0.6,      // seek food below this % of max energy
  thirstThreshold: 0.6,      // seek water below this % of max thirst
  maxHydration: 100,
  hydrationLossRate: 0.03,   // base thirst per tick
  waterDrinkAmount: 50,      // hydration restored per drink
  drinkDuration: 30,         // ticks to drink water
};

export const SIM = {
  defaultTicksPerFrame: 1,
  maxTicksPerFrame: 20,
};

// Snapshot of default values so "Reset" can restore them.
export const DEFAULTS = {
  WORLD: { ...WORLD },
  ENERGY: { ...ENERGY },
  GENE_DEFS: GENE_DEFS.map(g => ({ ...g })),
};

// Per-gene tips for the DNA settings panel.
const GENE_TIPS = {
  speed:      "How fast a creature moves. Faster creatures find food quicker, but movement cost scales with speed² × size — so doubling speed quadruples the energy burn. Speed also increases hunger and thirst rates.",
  size:       "Body radius. Bigger creatures can eat food from farther away (eating range = size), but they burn more energy moving because movement cost scales with size.",
  eyesight:   "How far a creature can detect food, water, and mates — the radius of its vision cone. Larger eyesight slightly reduces lifespan through higher energy cost.",
  efficiency: "How much energy a creature extracts from food (0–1). Higher efficiency means fewer meals needed. This is a pure advantage with no downside, so watch it climb!",
  hue:        "Body color (hue on the color wheel). Determines species: creatures only mate with others within the species hue threshold. Watch clusters drift apart into separate species!",
  charisma:   "Chance of attracting a mate. When two creatures try to mate, both charisma values are multiplied to determine the probability of successful mating.",
  reproductiveCapability: "Average number of babies produced per mating. The actual count is the average of both parents' values, rounded to a whole number.",
  pregnancyTime: "How long the female is pregnant (in ticks). While pregnant, she moves slower, sees less, and burns energy faster. But each tick in the womb gives babies 5% extra starting speed and vision.",
};

// Settings metadata: defines UI slider ranges and tooltips for each tunable parameter.
export const SETTINGS_META = {
  world: {
    label: "World",
    params: [
      { key: "bushCount",         label: "Bush Count",       min: 1,    max: 30,   step: 1,   obj: WORLD,
        tip: "Number of blueberry bushes spawned randomly across the map." },
      { key: "berriesPerBush",    label: "Berries/Bush",     min: 5,    max: 30,   step: 1,   obj: WORLD,
        tip: "Maximum berries each bush can hold. Eaten berries regrow after a delay." },
      { key: "berryRegrowTime",   label: "Berry Regrow",     min: 60,   max: 600,  step: 30,  obj: WORLD,
        tip: "Ticks for an eaten berry to regrow on its bush." },
      { key: "berryEnergy",       label: "Berry Energy",     min: 5,    max: 100,  step: 5,   obj: WORLD,
        tip: "Energy a creature gains from eating one berry (before efficiency multiplier)." },
      { key: "waterPoolCount",    label: "Water Pools",      min: 1,    max: 15,   step: 1,   obj: WORLD,
        tip: "Number of permanent water pools on the map." },
      { key: "speciesHueThreshold", label: "Species Hue Δ",  min: 5,    max: 180,  step: 5,   obj: WORLD,
        tip: "Max hue distance for creatures to be considered the same species and able to mate." },
      { key: "startingCreatures", label: "Starting Pop.",    min: 5,    max: 200,  step: 5,   obj: WORLD,
        tip: "Number of creatures spawned on reset. Half male, half female." },
    ],
  },
  energy: {
    label: "Energy",
    params: [
      { key: "initial",                label: "Initial Energy",     min: 20,    max: 500,  step: 10,  obj: ENERGY,
        tip: "Energy each creature starts with." },
      { key: "maxEnergy",              label: "Max Energy",         min: 100,   max: 1000, step: 50,  obj: ENERGY,
        tip: "Maximum energy a creature can store." },
      { key: "moveCostBase",           label: "Move Cost",          min: 0.01,  max: 0.5,  step: 0.01, obj: ENERGY,
        tip: "Energy cost per tick for movement, multiplied by speed² × size." },
      { key: "idleCost",               label: "Idle Cost",          min: 0.005, max: 0.2,  step: 0.005, obj: ENERGY,
        tip: "Base energy cost per tick just for being alive." },
      { key: "matingDuration",         label: "Mating Duration",    min: 60,    max: 600,  step: 30,  obj: ENERGY,
        tip: "Ticks the pair spends mating (≈5 seconds at default)." },
      { key: "hungerThreshold",        label: "Hunger Seek %",      min: 0.1,   max: 1.0,  step: 0.05, obj: ENERGY,
        tip: "Creatures seek food when energy drops below this fraction of max." },
      { key: "thirstThreshold",        label: "Thirst Seek %",      min: 0.1,   max: 1.0,  step: 0.05, obj: ENERGY,
        tip: "Creatures seek water when hydration drops below this fraction of max." },
    ],
  },
};

// DNA gene definitions for the compact DNA tab.
export const DNA_GENES = GENE_DEFS.map(gene => {
  const baseTip = GENE_TIPS[gene.name] || "";
  const fracStep = gene.max <= 1 ? 0.01 : (gene.max <= 10 ? 0.1 : 1);
  return {
    gene,
    label: gene.name,
    tip: baseTip,
    startingValue: { key: "default", label: "Start", min: gene.min, max: gene.max, step: fracStep, obj: gene,
      tip: `${baseTip} Starting value for new creatures spawned on restart.` },
    mutRate: { key: "mutRate", label: "Rate", min: 0, max: 1.0, step: 0.05, obj: gene,
      tip: "Chance this gene mutates per reproduction. 0 = never, 1 = always." },
    mutStep: { key: "mutStep", label: "Step", min: 0, max: gene.max - gene.min, step: fracStep, obj: gene,
      tip: "Max change per mutation. Larger = more dramatic mutations." },
  };
});
