// species.js -- Species and ecosystem designer with localStorage persistence.
// Species designs define creature templates: DNA, diet, shape.
// Ecosystem designs define the world setup: pools, bushes, and which species to release.

import { GENE_DEFS, WORLD, ENERGY, INJURY } from "./config.js";

const SPECIES_KEY = "cambrian_species";
const ECOSYSTEM_KEY = "cambrian_ecosystems";

// ─── Random Name Generator ─────────────────────────────────────────────────

const NAME_ADJ = [
  "Crimson", "Azure", "Golden", "Shadow", "Crystal", "Iron", "Storm",
  "Ember", "Frost", "Jade", "Obsidian", "Silver", "Coral", "Amber",
  "Cobalt", "Scarlet", "Onyx", "Violet", "Rusty", "Pale", "Dark",
  "Swift", "Silent", "Fierce", "Ancient", "Wild", "Hollow", "Bright",
  "Thorny", "Velvet", "Molten", "Ashen", "Lunar", "Solar", "Toxic",
  "Gilded", "Dusky", "Bristled", "Plated", "Spotted", "Striped", "Barbed",
  "Hooded", "Crested", "Fanged", "Horned", "Winged", "Scaled", "Spiked",
  "Slender", "Bulky", "Nimble", "Sluggish", "Ragged", "Sleek", "Rugged",
  "Ghostly", "Blazing", "Glacial", "Venomous", "Speckled", "Banded", "Dappled",
  "Murky", "Gleaming", "Tawny", "Ivory", "Copper", "Indigo", "Emerald",
  "Sapphire", "Ruby", "Platinum", "Brass", "Pewter", "Ochre", "Slate",
  "Mossy", "Dusty", "Gnarled", "Wiry", "Stout", "Gaunt", "Plump",
];

const NAME_NOUN = [
  "Crawler", "Drifter", "Lurker", "Grazer", "Stalker", "Swimmer",
  "Sprinter", "Forager", "Wanderer", "Hunter", "Glider", "Burrower",
  "Nibbler", "Prowler", "Dasher", "Creeper", "Slinker", "Chomper",
  "Scuttler", "Floater", "Snapper", "Trekker", "Weaver", "Seeker",
  "Muncher", "Skimmer", "Scavenger", "Trotter", "Pacer", "Bolter",
  "Wriggler", "Basker", "Digger", "Climber", "Leaper", "Swooper",
  "Gobbler", "Sipper", "Gnawer", "Scratcher", "Roamer", "Plodder",
  "Strider", "Hopper", "Slitherer", "Rustler", "Nester", "Rooter",
  "Pouncer", "Ambusher", "Charger", "Dodger", "Feeder", "Breeder",
  "Herder", "Flanker", "Circler", "Tunneler", "Wader", "Diver",
  "Skiterer", "Lumberer", "Galloper", "Rammer", "Grappler", "Thrasher",
  "Coiler", "Spitter", "Stinger", "Pincer", "Cruncher", "Shredder",
];

const ECO_ADJ = [
  "Misty", "Sunlit", "Frozen", "Verdant", "Barren", "Lush", "Arid",
  "Twilight", "Deep", "Ancient", "Crystal", "Mossy", "Sandy", "Rocky",
  "Scorched", "Flooded", "Windswept", "Shadowed", "Overgrown", "Desolate",
  "Tranquil", "Volcanic", "Glacial", "Humid", "Parched", "Foggy",
  "Moonlit", "Starlit", "Blooming", "Withered", "Fertile", "Stony",
  "Muddy", "Dusty", "Icy", "Steaming", "Dripping", "Silent",
  "Echoing", "Howling", "Whispering", "Rumbling", "Crackling", "Serene",
];

const ECO_NOUN = [
  "Basin", "Hollow", "Glade", "Marsh", "Plateau", "Valley", "Oasis",
  "Tundra", "Reef", "Steppe", "Meadow", "Ravine", "Lagoon", "Expanse",
  "Wetland", "Savanna", "Thicket", "Canyon", "Delta", "Estuary",
  "Caldera", "Fen", "Moor", "Prairie", "Taiga", "Scrubland",
  "Badlands", "Floodplain", "Highlands", "Lowlands", "Shoals", "Dunes",
  "Gorge", "Ridge", "Watershed", "Clearing", "Swamp", "Grotto",
  "Fjord", "Atoll", "Archipelago", "Crater", "Cavern", "Springs",
];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function randomSpeciesName() {
  return `${pick(NAME_ADJ)} ${pick(NAME_NOUN)}`;
}

export function randomEcosystemName() {
  return `${pick(ECO_ADJ)} ${pick(ECO_NOUN)}`;
}

/** Diet options */
export const DIETS = ["herbivore", "carnivore", "omnivore"];

/** Shape options — distinguished by polygon side count */
/** Shape options — distinguished by polygon side count. 0 = circle. */
export const SHAPES = [
  { name: "circle",    sides: 0 },
  { name: "triangle",  sides: 3 },
  { name: "square",    sides: 4 },
  { name: "pentagon",  sides: 5 },
  { name: "hexagon",   sides: 6 },
  { name: "heptagon",  sides: 7 },
  { name: "octagon",   sides: 8 },
];

// ─── Species Designs ───────────────────────────────────────────────────────

/** Create a default species design */
export function createDefaultSpecies() {
  const genes = {};
  for (const def of GENE_DEFS) {
    genes[def.name] = def.default;
  }
  return {
    id: crypto.randomUUID(),
    name: randomSpeciesName(),
    genes,
    diet: "herbivore",
    sides: 0,
    count: 15,
    cfg: { ...ENERGY, ...INJURY },
  };
}

export function loadSpecies() {
  try {
    const raw = localStorage.getItem(SPECIES_KEY);
    if (raw) {
      const list = JSON.parse(raw);
      // Migrate: backfill new genes from defaults, remove obsolete per-gene mutRates/mutSteps,
      // and pull values that moved from cfg to genes.
      for (const sp of list) {
        for (const def of GENE_DEFS) {
          if (sp.genes[def.name] === undefined) {
            // Check if this gene was previously in cfg
            if (sp.cfg && sp.cfg[def.name] !== undefined) {
              sp.genes[def.name] = sp.cfg[def.name];
              delete sp.cfg[def.name];
            } else {
              sp.genes[def.name] = def.default;
            }
          }
        }
        delete sp.mutRates;
        delete sp.mutSteps;
      }
      return list;
    }
  } catch (e) {
    console.warn("Failed to load species:", e);
  }
  return [];
}

export function saveAllSpecies(list) {
  try {
    localStorage.setItem(SPECIES_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to save species:", e);
  }
}

export function upsertSpecies(design) {
  const list = loadSpecies();
  const idx = list.findIndex(d => d.id === design.id);
  if (idx >= 0) list[idx] = design;
  else list.push(design);
  saveAllSpecies(list);
  return list;
}

export function deleteSpecies(id) {
  const list = loadSpecies().filter(d => d.id !== id);
  saveAllSpecies(list);
  return list;
}

// ─── Ecosystem Designs ─────────────────────────────────────────────────────

/** Create a default ecosystem design */
export function createDefaultEcosystem() {
  return {
    id: crypto.randomUUID(),
    name: randomEcosystemName(),
    waterPoolCount: WORLD.waterPoolCount,
    waterPoolRadius: WORLD.waterPoolRadius,
    bushCount: WORLD.bushCount,
    berriesPerBush: WORLD.berriesPerBush,
    berryRegrowTime: WORLD.berryRegrowTime,
    berryEnergy: WORLD.berryEnergy,
    // Species releases: array of { speciesId, count }
    releases: [],
  };
}

export function loadEcosystems() {
  try {
    const raw = localStorage.getItem(ECOSYSTEM_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn("Failed to load ecosystems:", e);
  }
  return [];
}

export function saveAllEcosystems(list) {
  try {
    localStorage.setItem(ECOSYSTEM_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("Failed to save ecosystems:", e);
  }
}

export function upsertEcosystem(design) {
  const list = loadEcosystems();
  const idx = list.findIndex(d => d.id === design.id);
  if (idx >= 0) list[idx] = design;
  else list.push(design);
  saveAllEcosystems(list);
  return list;
}

export function deleteEcosystem(id) {
  const list = loadEcosystems().filter(d => d.id !== id);
  saveAllEcosystems(list);
  return list;
}
