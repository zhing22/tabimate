// Test-only data shared by the data/ tests. Not imported by the app.
import { puzzleNumber } from '@/core/date';

export const FIXTURE_KEY = '2026-11-07';

export const fixtureAnimals = () => [
  {
    id: 'red-fox',
    display: 'Red fox',
    aliases: ['fox'],
    archetype: 'canine',
    movement: 'land',
    size: 'M',
    tint: '#d86a28',
    emoji: '🦊',
  },
  {
    id: 'killer-whale',
    display: 'Killer whale',
    aliases: ['orca'],
    archetype: 'whale',
    movement: 'water',
    size: 'L',
    tint: '#1a1a1a',
    emoji: '🐋',
  },
  {
    id: 'platypus',
    display: 'Platypus',
    aliases: [],
    archetype: 'monotreme',
    movement: 'water',
    size: 'M',
    tint: '#7a5030',
    emoji: '🦫',
  },
];

export const fixturePuzzle = () => ({
  date: FIXTURE_KEY,
  number: puzzleNumber(FIXTURE_KEY),
  prompts: [
    {
      id: 'lays-eggs',
      text: 'Name an animal that lays eggs',
      answers: [{ animalId: 'platypus', tier: 2 }],
    },
    {
      id: 'ocean',
      text: 'Name an animal that lives in the ocean',
      answers: [{ animalId: 'killer-whale', tier: 1 }],
    },
    {
      id: 'eats-meat',
      text: 'Name an animal that eats meat',
      answers: [
        { animalId: 'red-fox', tier: 1 },
        { animalId: 'killer-whale', tier: 1 },
      ],
    },
  ],
});
