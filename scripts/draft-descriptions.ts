// Drafts a one-line description (15 words or fewer) for every animal in
// animals.json that has none, from the first sentence of its Wikipedia summary.
// Writes data-drafts/descriptions.json; --merge adds them to animals.json as
// descriptionReviewed: false, with the article as the wiki link if that's empty.
//
//   npm run draft-descriptions              fetch (1 request/s, cached) and write the draft
//   npm run draft-descriptions -- --merge   fill missing descriptions from the draft
import { parseArgs } from 'node:util';
import { shortenDescription } from './lib/describe.ts';
import { createFetcher } from './lib/fetcher.ts';
import { readJson, writeJson } from './lib/jsonFile.ts';
import { mergeDescriptions, type AnimalJson, type DescriptionDraft } from './lib/merge.ts';

const DRAFT = 'data-drafts/descriptions.json';
const ANIMALS = 'public/data/animals.json';
const SUMMARY = 'https://en.wikipedia.org/api/rest_v1/page/summary/';

const { values } = parseArgs({ options: { merge: { type: 'boolean', default: false } } });

interface Summary {
  type?: string;
  title?: string;
  extract?: string;
  content_urls?: { desktop?: { page?: string } };
}

/** The article to summarise: the animal's wiki link if it has one, else its display name. */
const titleOf = (a: AnimalJson): string =>
  typeof a.wiki === 'string'
    ? decodeURIComponent(a.wiki.split('/wiki/')[1] ?? '')
    : String(a.display);

async function draft() {
  const animals = readJson<AnimalJson[]>(ANIMALS).filter((a) => !a.description);
  const fetcher = createFetcher({ cacheDir: 'data-drafts/cache' });
  console.log(`${animals.length} animals without a description; fetching summaries...`);
  const drafts: DescriptionDraft[] = [];
  const problems: string[] = [];
  for (const a of animals) {
    const title = titleOf(a);
    const summary = (await fetcher.json(
      `${SUMMARY}${encodeURIComponent(title.replace(/ /g, '_'))}`,
    )) as Summary | null;
    const page = summary?.content_urls?.desktop?.page;
    if (!summary || !page || summary.type === 'disambiguation') {
      problems.push(`${a.id}: no usable summary for "${title}"`);
      continue;
    }
    const description = shortenDescription(summary.extract ?? '');
    if (description === '') problems.push(`${a.id}: the summary left nothing usable`);
    else drafts.push({ id: a.id, description, wiki: page });
  }
  await writeJson(DRAFT, { generated: new Date().toISOString(), animals: drafts });
  console.log(`Wrote ${DRAFT}: ${drafts.length} drafts, ${fetcher.requests()} network requests.`);
  for (const p of problems) console.log(`  ${p}`);
  console.log(`\nReview ${DRAFT}, then run with --merge.`);
}

async function merge() {
  const { animals: drafts } = readJson<{ animals: DescriptionDraft[] }>(DRAFT);
  const { animals, described } = mergeDescriptions(readJson<AnimalJson[]>(ANIMALS), drafts);
  await writeJson(ANIMALS, animals);
  console.log(`Added ${described.length} unreviewed description(s) to ${ANIMALS}.`);
}

await (values.merge ? merge() : draft());
