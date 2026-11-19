// What the animal data still needs: traits missing per field, and descriptions
// missing or not yet reviewed. Read-only.
//
//   npm run content-report [-- --list]   (--list prints every id, not just counts)
import { parseArgs } from 'node:util';
import { TRAIT_KEYS } from '../src/data/readAnimal.ts';
import { readJson } from './lib/jsonFile.ts';
import type { AnimalJson } from './lib/merge.ts';

const { values } = parseArgs({ options: { list: { type: 'boolean', default: false } } });
const animals = readJson<AnimalJson[]>('public/data/animals.json');
const species = animals.filter((a) => a.kind === 'species');
const groups = animals.filter((a) => a.kind === 'group');

const show = (label: string, ids: string[], of: number) => {
  const sample = values.list ? ids : ids.slice(0, 8);
  const more = ids.length > sample.length ? `, +${ids.length - sample.length} more` : '';
  console.log(
    `  ${label.padEnd(22)} ${String(ids.length).padStart(4)} / ${of}${ids.length ? `  (${sample.join(', ')}${more})` : ''}`,
  );
};

const traitsOf = (a: AnimalJson) => (a.traits ?? {}) as Record<string, unknown>;
console.log(`${animals.length} animals: ${species.length} species, ${groups.length} groups.`);
console.log(
  `  with any traits: ${animals.filter((a) => Object.keys(traitsOf(a)).length > 0).length}`,
);

console.log('\nMissing traits (species):');
for (const key of TRAIT_KEYS) {
  show(
    key,
    species.filter((a) => traitsOf(a)[key] === undefined).map((a) => a.id),
    species.length,
  );
}

console.log('\nDescriptions:');
show(
  'missing',
  animals.filter((a) => !a.description).map((a) => a.id),
  animals.length,
);
show(
  'not reviewed',
  animals.filter((a) => a.description && a.descriptionReviewed !== true).map((a) => a.id),
  animals.length,
);
show(
  'no wiki link',
  animals.filter((a) => !a.wiki).map((a) => a.id),
  animals.length,
);
