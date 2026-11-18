// Allowed values for animal traits (animals.json "traits"). Like config/animals.ts,
// the lists are the source of truth: the types come from them and the validator
// checks data against them. Prompt templates will query these, so add a value
// here before using it in data.

export const ANIMAL_KINDS = ['group', 'species'] as const;
export type AnimalKind = (typeof ANIMAL_KINDS)[number];

export const ANIMAL_CLASSES = [
  'mammal',
  'bird',
  'reptile',
  'amphibian',
  'fish',
  'insect',
  'arachnid',
  'crustacean',
  'mollusc',
] as const;
export type AnimalClass = (typeof ANIMAL_CLASSES)[number];

export const DIETS = [
  'carnivore',
  'herbivore',
  'omnivore',
  'insectivore',
  'piscivore',
  'frugivore',
  'nectarivore',
  'filter-feeder',
  'scavenger',
] as const;
export type Diet = (typeof DIETS)[number];

export const HABITATS = [
  'forest',
  'rainforest',
  'grassland',
  'desert',
  'mountain',
  'polar',
  'tundra',
  'wetland',
  'freshwater',
  'ocean',
  'coast',
  'reef',
  'deep-sea',
  'cave',
  'urban',
  'farmland',
] as const;
export type Habitat = (typeof HABITATS)[number];

export const CONTINENTS = [
  'africa',
  'asia',
  'europe',
  'north-america',
  'south-america',
  'oceania',
  'antarctica',
] as const;
export type Continent = (typeof CONTINENTS)[number];

export const SOCIAL = ['solitary', 'pair', 'group'] as const;
export type Social = (typeof SOCIAL)[number];

export const ACTIVE_TIMES = ['day', 'night', 'dusk', 'any'] as const;
export type ActiveTime = (typeof ACTIVE_TIMES)[number];

/** Real-world size, for prompts ("smaller than a cat"); not the sprite size class. */
export const BODY_SIZES = ['tiny', 'small', 'medium', 'large', 'huge'] as const;
export type BodySize = (typeof BODY_SIZES)[number];
