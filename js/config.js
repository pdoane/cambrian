// config.js -- All tunable constants in one place.
// These are mutable objects so the UI can adjust them at runtime.
// Want to add a new gene? Just add an object to GENE_DEFS!

export const GENE_DEFS = [
  // name          min   max   default  mutRate  mutStep  unit
  { name: "speed",      min: 0.5, max: 5.0, default: 2.0, mutRate: 0.3, mutStep: 0.3, unit: "px/tick" },
  { name: "size",       min: 3,   max: 20,  default: 8,   mutRate: 0.2, mutStep: 1.0, unit: "px" },
  { name: "senseRange", min: 10,  max: 200, default: 60,  mutRate: 0.3, mutStep: 10,  unit: "px" },
  { name: "efficiency", min: 0.1, max: 1.0, default: 0.5, mutRate: 0.2, mutStep: 0.05, unit: "" },
  { name: "hue",        min: 0,   max: 360, default: 120, mutRate: 0.4, mutStep: 15,  unit: "deg" },
];

export const WORLD = {
  width: 1200,
  height: 700,
  foodCount: 150,
  foodEnergy: 40,
  foodRegenRate: 0.5,        // probability per tick of spawning one food
  startingCreatures: 30,
};

export const ENERGY = {
  initial: 100,
  reproductionThreshold: 150,
  reproductionCost: 60,
  moveCostBase: 0.05,        // multiplied by speed^2 * size
  idleCost: 0.02,            // base metabolic cost per tick
};

export const SIM = {
  defaultTicksPerFrame: 1,
  maxTicksPerFrame: 20,
};

// Settings metadata: defines UI slider ranges and tooltips for each tunable parameter.
// This drives the settings panel -- add an entry here and a slider appears automatically.
export const SETTINGS_META = {
  world: {
    label: "World",
    params: [
      { key: "foodCount",         label: "Initial Food",     min: 10,   max: 500,  step: 10,  obj: WORLD,
        tip: "Target number of food items in the world. Food regenerates toward this level." },
      { key: "foodEnergy",        label: "Food Energy",      min: 5,    max: 100,  step: 5,   obj: WORLD,
        tip: "Energy a creature gains from eating one food item (before efficiency multiplier)." },
      { key: "foodRegenRate",     label: "Food Regen Rate",  min: 0.05, max: 2.0,  step: 0.05, obj: WORLD,
        tip: "How fast food respawns. Higher = more food available, larger populations can survive." },
      { key: "startingCreatures", label: "Starting Pop.",    min: 5,    max: 200,  step: 5,   obj: WORLD,
        tip: "Number of creatures spawned on reset. More = faster initial evolution but more competition." },
    ],
  },
  energy: {
    label: "Energy",
    params: [
      { key: "initial",                label: "Initial Energy",     min: 20,    max: 500,  step: 10,  obj: ENERGY,
        tip: "Energy each creature starts with. Higher = more time to find food before starving." },
      { key: "reproductionThreshold",  label: "Repro. Threshold",   min: 50,    max: 500,  step: 10,  obj: ENERGY,
        tip: "Energy needed to reproduce. Lower = easier reproduction, faster population growth." },
      { key: "reproductionCost",       label: "Repro. Cost",        min: 10,    max: 300,  step: 10,  obj: ENERGY,
        tip: "Energy spent when reproducing. Higher = bigger penalty for having offspring." },
      { key: "moveCostBase",           label: "Move Cost",          min: 0.01,  max: 0.5,  step: 0.01, obj: ENERGY,
        tip: "Energy cost per tick for movement, multiplied by speed\u00B2 \u00D7 size. Drives the speed vs. efficiency trade-off." },
      { key: "idleCost",               label: "Idle Cost",          min: 0.005, max: 0.2,  step: 0.005, obj: ENERGY,
        tip: "Base energy cost per tick just for being alive. Like a creature's metabolic rate." },
    ],
  },
};
