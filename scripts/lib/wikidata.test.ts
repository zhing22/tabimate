import { describe, expect, it, vi } from 'vitest';
import type { Fetcher } from './fetcher';
import {
  factsQueries,
  fetchFacts,
  factsToTraits,
  readFacts,
  readTitleResponse,
  type TaxonFacts,
} from './wikidata';

const facts = (extra: Partial<TaxonFacts>): TaxonFacts => ({
  qid: 'Q1',
  classes: [],
  continents: [],
  statuses: [],
  instanceOf: [],
  massKg: null,
  lengthM: null,
  article: null,
  ...extra,
});

describe('readTitleResponse', () => {
  it('follows normalising and redirects to the page and its Wikidata id', () => {
    const resolved = readTitleResponse(['grey wolf', 'Crane', 'Nope'], {
      query: {
        normalized: [{ from: 'grey wolf', to: 'Grey wolf' }],
        redirects: [{ from: 'Grey wolf', to: 'Wolf' }],
        pages: {
          '1': { title: 'Wolf', pageprops: { wikibase_item: 'Q18498' } },
          '2': { title: 'Crane', pageprops: { wikibase_item: 'Q2', disambiguation: '' } },
          '-1': { title: 'Nope', missing: '' },
        },
      },
    });
    expect(resolved.get('grey wolf')).toEqual({
      title: 'Wolf',
      qid: 'Q18498',
      disambiguation: false,
      missing: false,
    });
    expect(resolved.get('Crane')?.disambiguation).toBe(true);
    expect(resolved.get('Nope')).toMatchObject({ missing: true, qid: null });
  });
});

describe('factsQueries and readFacts', () => {
  const row = (qid: string, cols: Record<string, string>) => ({
    item: { value: `http://www.wikidata.org/entity/${qid}` },
    ...Object.fromEntries(Object.entries(cols).map(([k, value]) => [k, { value }])),
  });

  it('asks every query about every item', () => {
    const queries = factsQueries(['Q1', 'Q2']);
    expect(queries).toHaveLength(3);
    for (const q of queries) expect(q).toContain('VALUES ?item { wd:Q1 wd:Q2 }');
  });

  it('merges the rows of the separate queries by item', () => {
    const read = readFacts([
      { results: { bindings: [row('Q140', { classes: 'Mammalia' })] } },
      { results: { bindings: [row('Q140', { continents: 'Q15|Q48' })] } },
      {
        results: {
          bindings: [
            row('Q140', {
              statuses: 'Q278113',
              types: '',
              massKg: '190',
              article: 'https://en.wikipedia.org/wiki/Lion',
            }),
          ],
        },
      },
    ]);
    expect(read.get('Q140')).toEqual({
      qid: 'Q140',
      classes: ['Mammalia'],
      continents: ['Q15', 'Q48'],
      statuses: ['Q278113'],
      instanceOf: [],
      massKg: 190,
      lengthM: null,
      article: 'https://en.wikipedia.org/wiki/Lion',
    });
  });
});

describe('fetchFacts', () => {
  it('splits a failing batch down to the item that fails, keeping the rest', async () => {
    const asked: string[][] = [];
    const fetcher: Fetcher = {
      requests: () => 0,
      json: (_url, form) => {
        const ids = [...(form?.query ?? '').matchAll(/wd:(Q\d+)/g)].map((m) => m[1]!);
        const items = ids.filter((id) => id !== 'Q5107' && id !== 'Q37517' && id !== 'Q80994');
        asked.push(items);
        if (items.includes('Q3')) return Promise.reject(new Error('HTTP 504'));
        return Promise.resolve({ results: { bindings: [] } });
      },
    };
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const facts = await fetchFacts(fetcher, ['Q1', 'Q2', 'Q3', 'Q4']);
    expect([...facts.keys()].sort()).toEqual(['Q1', 'Q2', 'Q4']);
    expect(facts.get('Q1')).toMatchObject({ classes: [], massKg: null });
  });
});

describe('factsToTraits', () => {
  it('maps class, continents, status and mass', () => {
    expect(
      factsToTraits(
        facts({
          classes: ['Mammalia'],
          continents: ['Q48', 'Q15', 'Q48'],
          statuses: ['Q278113'],
          massKg: 190,
        }),
      ),
    ).toEqual({
      class: 'mammal',
      feathers: false,
      continent: ['africa', 'asia'],
      extinct: false,
      size: 'large',
    });
  });

  it('reads ray-finned fish under any of their class names', () => {
    for (const name of ['Actinopterygii', 'Actinopteri', 'Teleostei']) {
      expect(factsToTraits(facts({ classes: [name] })).class).toBe('fish');
    }
  });

  it('prefers bird over reptile when both class taxa are above it', () => {
    expect(factsToTraits(facts({ classes: ['Reptilia', 'Aves'] }))).toEqual({
      class: 'bird',
      feathers: true,
    });
  });

  it('reads extinct from the IUCN status or a fossil taxon', () => {
    expect(factsToTraits(facts({ statuses: ['Q237350'] })).extinct).toBe(true);
    expect(factsToTraits(facts({ instanceOf: ['Q23038290'] })).extinct).toBe(true);
    // No status at all: unknown, not "not extinct".
    expect(factsToTraits(facts({})).extinct).toBeUndefined();
  });

  it.each([
    [{ massKg: 0.02 }, 'tiny'],
    [{ massKg: 4 }, 'small'],
    [{ massKg: 59 }, 'medium'],
    [{ massKg: 1000 }, 'huge'],
    [{ lengthM: 0.3 }, 'small'],
    [{ lengthM: 12 }, 'huge'],
    [{ massKg: 4, lengthM: 12 }, 'small'], // mass wins over length
  ] as const)('size from %o is %s', (extra, size) => {
    expect(factsToTraits(facts(extra)).size).toBe(size);
  });

  it('leaves unknown classes and continents out', () => {
    expect(factsToTraits(facts({ classes: ['Scyphozoa'], continents: ['Q999'] }))).toEqual({});
  });
});
