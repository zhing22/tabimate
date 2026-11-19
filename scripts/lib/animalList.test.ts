import { describe, expect, it } from 'vitest';
import { idFor, parseAnimalList } from './animalList';

describe('idFor', () => {
  it.each([
    ['Grévy’s zebra', 'grevys-zebra'],
    ["Kemp's ridley sea turtle", 'kemps-ridley-sea-turtle'],
    ['Kākāpō', 'kakapo'],
    ['Portuguese man o’ war', 'portuguese-man-o-war'],
  ])('%j -> %s', (display, id) => {
    expect(idFor(display)).toBe(id);
  });
});

describe('parseAnimalList', () => {
  it('reads groups and species with their fields, skipping comments and blanks', () => {
    const list = parseAnimalList(
      [
        '# a comment',
        '',
        'group | Frog | rep=american-bullfrog | emoji=F | move=land',
        'species | American bullfrog | parent=frog',
        'species | Hippopotamus | id=hippo',
        'group | Crane | wiki=Crane (bird)',
      ].join('\n'),
    );
    expect(list).toEqual([
      {
        id: 'frog',
        kind: 'group',
        display: 'Frog',
        wikiTitle: 'Frog',
        line: 3,
        representative: 'american-bullfrog',
        emoji: 'F',
        movement: 'land',
      },
      {
        id: 'american-bullfrog',
        kind: 'species',
        display: 'American bullfrog',
        wikiTitle: 'American bullfrog',
        line: 4,
        parent: 'frog',
      },
      { id: 'hippo', kind: 'species', display: 'Hippopotamus', wikiTitle: 'Hippopotamus', line: 5 },
      { id: 'crane', kind: 'group', display: 'Crane', wikiTitle: 'Crane (bird)', line: 6 },
    ]);
  });

  it.each([
    ['animal | Frog', /line 1: kind must be group or species/],
    ['species |', /line 1: missing a display name/],
    ['species | Frog | colour=green', /unknown field "colour=green"/],
    ['species | Frog | move=fly', /move must be one of land, sky, water/],
    ['species | Frog\nspecies | Frog', /line 2: "frog" is listed twice/],
  ])('rejects %j', (text, problem) => {
    expect(() => parseAnimalList(text)).toThrow(problem);
  });
});
