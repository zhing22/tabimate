// Drafts traits for every animal in scripts/input/animals.txt from Wikidata:
// class, native continents, extinct status, body size (mass or length) and the
// English Wikipedia article. Writes data-drafts/traits.json only; public/data
// is never touched until you review the draft and merge.
//
//   npm run seed-traits              fetch (1 request/s, cached) and write the draft
//   npm run seed-traits -- --merge   fill empty fields of animals.json from the draft
//
// Set TABIMATE_CONTACT to put your contact details in the User-Agent.
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { parseAnimalList } from './lib/animalList.ts';
import { createFetcher } from './lib/fetcher.ts';
import { readJson, writeJson } from './lib/jsonFile.ts';
import { inheritGroupClass, mergeTraits, type AnimalJson, type TraitDraft } from './lib/merge.ts';
import { factsToTraits, fetchFacts, resolveTitles } from './lib/wikidata.ts';

const LIST = 'scripts/input/animals.txt';
const DRAFT = 'data-drafts/traits.json';
const ANIMALS = 'public/data/animals.json';

const { values } = parseArgs({ options: { merge: { type: 'boolean', default: false } } });

async function draft() {
  const list = parseAnimalList(readFileSync(LIST, 'utf8'));
  const fetcher = createFetcher({ cacheDir: 'data-drafts/cache' });
  console.log(`${list.length} animals in ${LIST}; resolving titles...`);
  const titles = await resolveTitles(
    fetcher,
    list.map((a) => a.wikiTitle),
  );
  const qids = [...titles.values()].flatMap((t) => (t.qid && !t.disambiguation ? [t.qid] : []));
  console.log(`${qids.length} Wikidata items; querying facts (slow the first time)...`);
  const facts = await fetchFacts(fetcher, qids);

  const drafts: TraitDraft[] = list.map((listed) => {
    const title = titles.get(listed.wikiTitle);
    const problems: string[] = [];
    if (!title || title.missing) problems.push(`no Wikipedia article "${listed.wikiTitle}"`);
    else if (title.disambiguation) problems.push(`"${title.title}" is a disambiguation page`);
    else if (!title.qid) problems.push(`"${title.title}" has no Wikidata item`);
    const usable = title && !title.missing && !title.disambiguation ? title : null;
    const fact = usable?.qid ? facts.get(usable.qid) : undefined;
    if (usable?.qid && !fact) problems.push(`no facts returned for ${usable.qid}`);
    return {
      listed,
      wiki: usable
        ? `https://en.wikipedia.org/wiki/${encodeURIComponent(usable.title.replace(/ /g, '_'))}`
        : null,
      qid: usable?.qid ?? null,
      traits: fact ? factsToTraits(fact) : {},
      problems,
    };
  });
  await writeJson(DRAFT, { generated: new Date().toISOString(), animals: drafts });

  const withProblems = drafts.filter((d) => d.problems.length > 0);
  console.log(`Wrote ${DRAFT}: ${drafts.length} drafts, ${fetcher.requests()} network requests.`);
  if (withProblems.length > 0) {
    console.log(`\n${withProblems.length} need attention (fix wiki= in ${LIST} and rerun):`);
    for (const d of withProblems)
      console.log(`  line ${d.listed.line} ${d.listed.id}: ${d.problems.join('; ')}`);
  }
  console.log(`\nReview ${DRAFT}, then run with --merge.`);
}

async function merge() {
  const { animals: drafts } = readJson<{ animals: TraitDraft[] }>(DRAFT);
  const report = mergeTraits(readJson<AnimalJson[]>(ANIMALS), drafts);
  // Then groups that Wikidata knows nothing about take the class their species share.
  const groups = inheritGroupClass(report.animals);
  await writeJson(ANIMALS, groups.animals);
  const filled = Object.entries(report.filled);
  console.log(`Merged ${DRAFT} into ${ANIMALS}:`);
  console.log(`  added ${report.added.length}: ${report.added.join(', ') || '-'}`);
  console.log(`  filled empty fields on ${filled.length} existing animal(s)`);
  console.log(`  group class from its species: ${groups.filled.join(', ') || '-'}`);
  for (const [id, fields] of filled) console.log(`    ${id}: ${fields.join(', ')}`);
  console.log('Run npm run validate-data next.');
}

await (values.merge ? merge() : draft());
