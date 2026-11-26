import { describe, expect, it } from 'vitest';
import { budgetProblems, classifyChunks, type ViteManifest } from './bundleBudget';

describe('classifyChunks', () => {
  const manifest: ViteManifest = {
    'index.html': {
      file: 'assets/build/index.js',
      isEntry: true,
      imports: ['_levels.js'],
      dynamicImports: ['src/wiring/sceneParts.ts', 'src/ui/screens/journal.ts'],
    },
    '_levels.js': { file: 'assets/build/levels.js' },
    'src/wiring/sceneParts.ts': { file: 'assets/build/sceneParts.js', imports: ['_art.js'] },
    '_art.js': { file: 'assets/build/art.js' },
    'src/ui/screens/journal.ts': { file: 'assets/build/journal.js', imports: ['_levels.js'] },
    'style.css': { file: 'assets/build/index.css' },
  };

  it('splits entry, initial (its imports, the eager chunks and theirs) and lazy, JavaScript only', () => {
    const kinds = classifyChunks(manifest, ['src/wiring/sceneParts.ts']);
    expect(Object.fromEntries(kinds)).toEqual({
      'assets/build/index.js': 'entry',
      'assets/build/levels.js': 'initial',
      'assets/build/sceneParts.js': 'initial',
      'assets/build/art.js': 'initial',
      'assets/build/journal.js': 'lazy',
    });
  });
});

describe('budgetProblems', () => {
  const budget = { entryKb: 60, initialKb: 140 };

  it('names each limit broken, and nothing within budget', () => {
    expect(budgetProblems(59, 139, budget)).toEqual([]);
    expect(budgetProblems(61, 139, budget)).toEqual([
      'Entry chunk is 61.0 KB, over its 60 KB budget.',
    ]);
    expect(budgetProblems(59, 141, budget)).toHaveLength(1);
    expect(budgetProblems(61, 141, budget)).toHaveLength(2);
  });
});
