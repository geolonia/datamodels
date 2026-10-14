// The duplicate check on model proposals (#224): words, the index and the
// matching, with a small catalog as fixture. No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { words, modelIndex, similarModels, proposalText, comment, MARKER } from '../scripts/lib/similar.mjs';

const CATALOG = { models: [
  { type: 'EvacuationSite', kind: 'entity', pageUrlEn: 'https://datamodels.jp/en/models/disaster/EvacuationSite/', title: { ja: '指定緊急避難場所', en: 'Designated emergency evacuation site' }, description: { en: 'A place people flee to in a disaster.' }, attributes: [{ name: 'capacity' }, { name: 'hazardTypes' }] },
  { type: 'RoadRestriction', kind: 'entity', pageUrlEn: 'https://datamodels.jp/en/models/transportation/RoadRestriction/', title: { ja: '道路規制', en: 'Road restriction' }, description: { en: 'A closure or restriction of a road.' }, attributes: [{ name: 'roadName' }, { name: 'restrictionStatus' }] },
  { type: 'Task', kind: 'entity', pageUrlEn: 'https://datamodels.jp/en/models/task/Task/', title: { ja: 'タスク', en: 'Task' }, description: { en: 'A tracked unit of work.' }, attributes: [{ name: 'progress' }, { name: 'assignee' }] },
  { type: 'Geometry', kind: 'value', pageUrlEn: 'x', title: { en: 'Geometry' } },
] };
const NODES = { nodes: [{ url: 'https://models.example.org/', publisher: { name: { en: 'Example' } }, models: [{ type: 'Ride', pageUrl: 'https://models.example.org/models/a/Ride/', title: { en: 'Ride' } }] }] };
const BODY = (what, sample = '_No response_') => `### 何をモデルにするか / What to model\n\n${what}\n\n### 実際にあるデータ / Real data that exists today\n\nThe city has a road ledger.\n\n### データの例 / Sample record\n\n\`\`\`text\n${sample}\n\`\`\`\n`;

test('words: camelCase split, plural folded, stop words out, Japanese pairs with kanji or katakana', () => {
  assert.deepEqual([...words('roadName of the Roads')].sort(), ['road'], '"name" and "of the" are too common to count');
  assert.deepEqual([...words('restrictionStatus')].sort(), ['restriction', 'status']);
  assert.ok(words('避難場所を確認する').has('避難'));
  assert.ok(!words('避難場所を確認する').has('する'), 'hiragana-only pairs are left out');
});

test('a proposal finds the models it may duplicate, best first, and only those', () => {
  const index = modelIndex(CATALOG, NODES);
  assert.ok(!index.some((e) => e.type === 'Geometry'), 'value types are not listed');
  assert.ok(modelIndex(CATALOG, NODES, { values: true }).some((e) => e.type === 'Geometry'), 'unless asked for (the MCP server, #223)');
  assert.equal(modelIndex({ models: [{ ...CATALOG.models[2], subject: 'task' }] }, NODES).map((e) => e.key).join(' '), 'task/Task https://models.example.org/#0', 'each entry names its model');
  let r = similarModels(proposalText(BODY('Temporary road closures during heavy rain', '{"roadName": "Yasukuni-dori", "status": "closed"}')), index);
  assert.equal(r[0].entry.type, 'RoadRestriction');
  assert.ok(r[0].matched.includes('road'));
  r = similarModels(proposalText(BODY('避難場所の一覧（指定緊急避難場所）')), index);
  assert.equal(r[0].entry.type, 'EvacuationSite');
  // Words from other parts of the form (here "road ledger" under real data) do not count.
  assert.deepEqual(similarModels(proposalText(BODY('Beehives in the city park')), index), []);
  // A model of a known node is found too.
  assert.equal(similarModels('Bicycle ride along the river', index)[0].entry.where, 'Example');
});

test('the comment lists the models with links, or says none were found, and carries its marker', () => {
  const index = modelIndex(CATALOG, NODES);
  const md = comment(similarModels('road closure', index));
  assert.ok(md.startsWith(MARKER));
  assert.match(md, /- \[RoadRestriction\]\(https:\/\/datamodels\.jp\/en\/models\/transportation\/RoadRestriction\/\) 道路規制 \/ Road restriction \(datamodels\.jp\): `road`/);
  assert.match(comment([]), /No similar model found/);
  assert.equal(proposalText('Just a plain issue without the form'), '\n', 'not a form proposal: nothing to match');
});

test('a plural in -ies matches the singular type; series and species stay as they are', () => {
  assert.ok(words('Facilities').has('facility'));
  assert.ok(words('Facility').has('facility'));
  assert.ok(words('time series').has('series'));
  assert.ok(words('species list').has('species'));
});

test('the marked comment is found on a later page; a failed read stops instead of posting again', async () => {
  const { findMarkedComment, MARKER } = await import('../scripts/lib/similar.mjs');
  const other = (i) => ({ id: i, user: { type: 'User' }, body: 'hi' });
  const pages = { 1: Array.from({ length: 100 }, (_, i) => other(i)), 2: [other(100), { id: 101, user: { type: 'Bot' }, body: `${MARKER}\nold` }] };
  assert.equal((await findMarkedComment(async (n) => pages[n] ?? [])).id, 101);
  assert.equal(await findMarkedComment(async () => [other(1)]), null);
  await assert.rejects(findMarkedComment(async () => { throw new Error('GitHub answered 502'); }), /502/);
  await assert.rejects(findMarkedComment(async () => ({ message: 'Bad credentials' })), /not a list/);
});
