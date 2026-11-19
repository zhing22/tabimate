// Wikipedia titles -> Wikidata items -> AnimalTraits. The network calls take a
// Fetcher (throttled, cached); everything that interprets the answers is pure.
import type { AnimalTraits, BodySize, Continent } from '../../src/core/types.ts';
import type { Fetcher } from './fetcher.ts';

export interface ResolvedTitle {
  /** The article the title ends up at, after normalising and redirects. */
  readonly title: string;
  readonly qid: string | null;
  readonly disambiguation: boolean;
  readonly missing: boolean;
}

const API = 'https://en.wikipedia.org/w/api.php';
const SPARQL = 'https://query.wikidata.org/sparql';
const TITLES_PER_REQUEST = 50;
// Small batches: the taxon-tree walk is slow, and the endpoint stops queries at 60 s.
const ITEMS_PER_QUERY = 10;

const chunks = <T>(list: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) =>
    list.slice(i * size, i * size + size),
  );

interface QueryResponse {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages?: Record<string, { title: string; missing?: string; pageprops?: Record<string, string> }>;
  };
}

/** Reads one MediaWiki query response: each requested title to where it leads. */
export function readTitleResponse(
  requested: readonly string[],
  response: QueryResponse,
): Map<string, ResolvedTitle> {
  const step = new Map<string, string>();
  for (const m of [...(response.query?.normalized ?? []), ...(response.query?.redirects ?? [])]) {
    step.set(m.from, m.to);
  }
  const pages = new Map(Object.values(response.query?.pages ?? {}).map((p) => [p.title, p]));
  const out = new Map<string, ResolvedTitle>();
  for (const title of requested) {
    let final = title;
    for (let hops = 0; step.has(final) && hops < 5; hops++) final = step.get(final)!;
    const page = pages.get(final);
    out.set(title, {
      title: final,
      qid: page?.pageprops?.wikibase_item ?? null,
      disambiguation: page?.pageprops?.disambiguation !== undefined,
      missing: page === undefined || page.missing !== undefined,
    });
  }
  return out;
}

/** Resolves Wikipedia titles (following redirects) to Wikidata ids, 50 per request. */
export async function resolveTitles(
  fetcher: Fetcher,
  titles: readonly string[],
): Promise<Map<string, ResolvedTitle>> {
  const out = new Map<string, ResolvedTitle>();
  for (const batch of chunks([...new Set(titles)], TITLES_PER_REQUEST)) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      redirects: '1',
      prop: 'pageprops',
      ppprop: 'wikibase_item|disambiguation',
      titles: batch.join('|'),
    });
    const response = (await fetcher.json(`${API}?${params.toString()}`)) as QueryResponse;
    for (const [k, v] of readTitleResponse(batch, response)) out.set(k, v);
  }
  return out;
}

/** What Wikidata says about one item, before mapping onto traits. */
export interface TaxonFacts {
  readonly qid: string;
  /** Scientific names of every class-rank taxon above it (Mammalia, Aves...). */
  readonly classes: readonly string[];
  /** Continent items its range or endemic area lies on. */
  readonly continents: readonly string[];
  /** IUCN status items (P141). */
  readonly statuses: readonly string[];
  /** Instance-of items (P31), e.g. fossil taxon. */
  readonly instanceOf: readonly string[];
  readonly massKg: number | null;
  readonly lengthM: number | null;
  readonly article: string | null;
}

const values = (qids: readonly string[]) =>
  `VALUES ?item { ${qids.map((q) => `wd:${q}`).join(' ')} }`;

/**
 * Three small queries per batch rather than one big one: joining every
 * optional property at once multiplies rows (range places x continents x mass
 * statements...) and the endpoint times out. Each returns ?item plus some of
 * the columns readFacts knows.
 */
export const factsQueries = (qids: readonly string[]): string[] => [
  // Class: walk up the taxon tree to the class-rank taxa.
  `SELECT ?item (GROUP_CONCAT(DISTINCT ?className; separator="|") AS ?classes) WHERE {
  ${values(qids)}
  ?item wdt:P171+ ?cls . ?cls wdt:P105 wd:Q37517 ; wdt:P225 ?className .
} GROUP BY ?item`,
  // Range: places it is native or endemic to, and the continents they lie on.
  `SELECT ?item (GROUP_CONCAT(DISTINCT STRAFTER(STR(?cont), "entity/"); separator="|") AS ?continents) WHERE {
  ${values(qids)}
  ?item wdt:P9714|wdt:P183 ?place .
  { ?place wdt:P30 ?cont } UNION { ?place wdt:P31 wd:Q5107 . BIND(?place AS ?cont) }
} GROUP BY ?item`,
  // One-row facts: status, kind of item, adult mass and length, the article.
  `SELECT ?item
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?status), "entity/"); separator="|") AS ?statuses)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?type), "entity/"); separator="|") AS ?types)
  (MAX(?mass) AS ?massKg) (MAX(?len) AS ?lengthM) (SAMPLE(?art) AS ?article)
WHERE {
  ${values(qids)}
  OPTIONAL { ?item wdt:P141 ?status }
  OPTIONAL { ?item wdt:P31 ?type }
  # Adult figures only: skip statements about a role (newborn, egg) other than
  # adult (Q80994), or about one part of the animal.
  OPTIONAL { ?item p:P2067 ?ms . ?ms psn:P2067/wikibase:quantityAmount ?mass .
             FILTER NOT EXISTS { ?ms pq:P3831 ?mr . FILTER(?mr != wd:Q80994) }
             FILTER NOT EXISTS { ?ms pq:P518 ?mp } }
  OPTIONAL { ?item p:P2043 ?ls . ?ls psn:P2043/wikibase:quantityAmount ?len .
             FILTER NOT EXISTS { ?ls pq:P3831 ?lr . FILTER(?lr != wd:Q80994) }
             FILTER NOT EXISTS { ?ls pq:P518 ?lp } }
  OPTIONAL { ?art schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> }
} GROUP BY ?item`,
];

interface SparqlResponse {
  results: { bindings: Record<string, { value: string } | undefined>[] };
}

const list = (v: { value: string } | undefined) => (v?.value ? v.value.split('|') : []);
const num = (v: { value: string } | undefined) => (v?.value ? Number(v.value) : null);

const emptyFacts = (qid: string): TaxonFacts => ({
  qid,
  classes: [],
  continents: [],
  statuses: [],
  instanceOf: [],
  massKg: null,
  lengthM: null,
  article: null,
});

/** Reads the rows of factsQueries (any of them, in any order) into facts by QID. */
export function readFacts(responses: readonly SparqlResponse[]): Map<string, TaxonFacts> {
  const out = new Map<string, TaxonFacts>();
  for (const row of responses.flatMap((r) => r.results.bindings)) {
    const qid = row.item?.value.split('/').pop();
    if (!qid) continue;
    const f = out.get(qid) ?? emptyFacts(qid);
    out.set(qid, {
      ...f,
      ...(row.classes ? { classes: list(row.classes) } : {}),
      ...(row.continents ? { continents: list(row.continents) } : {}),
      ...(row.statuses ? { statuses: list(row.statuses) } : {}),
      ...(row.types ? { instanceOf: list(row.types) } : {}),
      ...(row.massKg ? { massKg: num(row.massKg) } : {}),
      ...(row.lengthM ? { lengthM: num(row.lengthM) } : {}),
      ...(row.article ? { article: row.article.value } : {}),
    });
  }
  return out;
}

/**
 * Facts for many items, ITEMS_PER_QUERY at a time. A batch that still fails
 * (a timeout) is split in half, down to single items; an item that fails alone
 * is left out, and the caller reports it.
 */
export async function fetchFacts(
  fetcher: Fetcher,
  qids: readonly string[],
): Promise<Map<string, TaxonFacts>> {
  const out = new Map<string, TaxonFacts>();
  const run = async (batch: readonly string[]): Promise<void> => {
    try {
      const responses: SparqlResponse[] = [];
      for (const query of factsQueries(batch)) {
        responses.push((await fetcher.json(SPARQL, { query, format: 'json' })) as SparqlResponse);
      }
      // Every item in the batch was asked about, even ones no query returned a row for.
      for (const qid of batch) out.set(qid, emptyFacts(qid));
      for (const [k, v] of readFacts(responses)) out.set(k, v);
    } catch (error) {
      if (batch.length === 1) {
        console.warn(`  ${batch[0]}: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      const half = Math.ceil(batch.length / 2);
      await run(batch.slice(0, half));
      await run(batch.slice(half));
    }
  };
  for (const batch of chunks([...new Set(qids)], ITEMS_PER_QUERY)) await run(batch);
  return out;
}

// --- Mapping facts onto traits (pure) ---

/** Class-rank taxa to our classes. First match wins, so birds aren't read as reptiles. */
const CLASS_RULES: readonly [AnimalTraits['class'] & string, readonly string[]][] = [
  ['bird', ['Aves']],
  ['mammal', ['Mammalia']],
  ['amphibian', ['Amphibia']],
  [
    'fish',
    [
      'Actinopterygii',
      'Actinopteri',
      'Teleostei',
      'Chondrichthyes',
      'Sarcopterygii',
      'Agnatha',
      'Myxini',
      'Elasmobranchii',
    ],
  ],
  ['insect', ['Insecta']],
  ['arachnid', ['Arachnida']],
  ['crustacean', ['Malacostraca', 'Maxillopoda', 'Branchiopoda', 'Hexanauplia']],
  ['mollusc', ['Cephalopoda', 'Gastropoda', 'Bivalvia']],
  ['reptile', ['Reptilia', 'Sauropsida']],
];

/** Wikidata continent items to our continents. */
const CONTINENTS: Readonly<Record<string, Continent>> = {
  Q15: 'africa',
  Q48: 'asia',
  Q46: 'europe',
  Q49: 'north-america',
  Q18: 'south-america',
  Q55643: 'oceania', // Oceania
  Q538: 'oceania', // Insular Oceania
  Q3960: 'oceania', // Australia (continent)
  Q51: 'antarctica',
};

const EXTINCT = 'Q237350'; // IUCN: extinct
const FOSSIL_TAXON = 'Q23038290';

/** Body size from mass (preferred) or length. Bounds are upper limits, exclusive. */
const SIZE_BY_MASS_KG: readonly [BodySize, number][] = [
  ['tiny', 0.1],
  ['small', 5],
  ['medium', 60],
  ['large', 1000],
  ['huge', Infinity],
];
const SIZE_BY_LENGTH_M: readonly [BodySize, number][] = [
  ['tiny', 0.1],
  ['small', 0.5],
  ['medium', 1.5],
  ['large', 5],
  ['huge', Infinity],
];

const bucket = (value: number, table: readonly [BodySize, number][]): BodySize =>
  table.find(([, max]) => value < max)![0];

/**
 * The traits Wikidata can tell us: class, continents, extinct, size, and what
 * class implies (only birds have feathers). Anything it can't tell stays unset.
 */
export function factsToTraits(facts: TaxonFacts): AnimalTraits {
  const cls = CLASS_RULES.find(([, taxa]) => taxa.some((t) => facts.classes.includes(t)))?.[0];
  const continents = [
    ...new Set(facts.continents.map((q) => CONTINENTS[q]).filter((c) => c !== undefined)),
  ].sort();
  const extinct = facts.instanceOf.includes(FOSSIL_TAXON) || facts.statuses.includes(EXTINCT);
  const knowsExtinct = extinct || facts.statuses.length > 0;
  const size =
    facts.massKg !== null && facts.massKg > 0
      ? bucket(facts.massKg, SIZE_BY_MASS_KG)
      : facts.lengthM !== null && facts.lengthM > 0
        ? bucket(facts.lengthM, SIZE_BY_LENGTH_M)
        : undefined;
  return {
    ...(cls ? { class: cls, feathers: cls === 'bird' } : {}),
    ...(continents.length > 0 ? { continent: continents } : {}),
    ...(knowsExtinct ? { extinct } : {}),
    ...(size ? { size } : {}),
  };
}
