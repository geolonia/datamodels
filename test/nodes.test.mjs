// Known nodes: what the snapshot keeps of a node's catalog.json (cleaned), which
// of their models build on a catalog model, and how the pages show them. No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeEntry, builtOn, readNodeList, cleanText, cleanUrl, isIndex } from '../scripts/lib/nodes.mjs';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { renderModelPage, nodesPage } from '../scripts/lib/site.mjs';

const TASK = 'https://datamodels.jp/ns/task/Task';
const NODE = { url: 'https://models.example.org/', index: 'https://models.example.org/catalog.json' };
const CATALOG = {
  publisher: { name: { en: 'Example <b>Org</b>' }, url: 'javascript:alert(1)' },
  license: 'CC0-1.0',
  models: [
    { type: 'Issue', typeIri: TASK, aliasOf: TASK, pageUrl: 'https://models.example.org/models/x/Issue/', title: { en: 'Issue {{ x }}' }, status: 'experimental', extends: [{ typeIri: TASK, version: '1.0.0', index: 'https://datamodels.jp/catalog.json' }], attributes: [{ name: 'secret' }] },
    { type: 'Patrol', typeIri: 'https://models.example.org/ns/x#Patrol', subClassOf: TASK, pageUrl: 'https://models.example.org/models/x/Patrol/', title: { en: 'Patrol' } },
    { type: 'Ride', typeIri: 'https://models.example.org/ns/x#Ride', pageUrl: 'https://models.example.org/models/x/Ride/' },
    { type: 'Broken', typeIri: 'not a url' },
  ],
};

test('the snapshot keeps only the shown fields, as plain text and plain http(s) URLs', () => {
  const e = nodeEntry(NODE, CATALOG, '2026-10-11');
  assert.equal(e.publisher.name.en, 'Example bOrg/b');
  assert.equal(e.publisher.url, null, 'no javascript: link');
  assert.deepEqual(e.models.map((m) => m.type), ['Issue', 'Patrol', 'Ride'], 'a model without a type IRI is left out');
  assert.equal(e.models[0].title.en, 'Issue x', 'no braces for Vue');
  assert.equal(e.models[0].attributes, undefined, 'only the fields the pages show');
  assert.deepEqual(e.models[0].extends, [{ typeIri: TASK, version: '1.0.0' }]);
  assert.equal(cleanText('a | b\n[c](d)'), 'a b c(d)');
  assert.equal(cleanUrl('https://user:pw@example.org/'), null);
});

test('only an object with a models list counts as an index; anything else keeps the previous entry', () => {
  assert.equal(isIndex(CATALOG), true);
  for (const bad of [{}, { models: null }, [], null, 'x']) assert.equal(isIndex(bad), false, JSON.stringify(bad));
});

test('builtOn finds aliases, subtypes and extensions of a type IRI', () => {
  const snapshot = { nodes: [nodeEntry(NODE, CATALOG, '2026-10-11')] };
  assert.deepEqual(builtOn(snapshot, TASK).map((o) => [o.model.type, o.how, o.version]), [['Issue', 'alias', '1.0.0'], ['Patrol', 'subclass', '']]);
  assert.deepEqual(builtOn(snapshot, 'https://example.org/other'), []);
  assert.deepEqual(builtOn({ nodes: [] }, TASK), []);
});

test('nodes.yaml needs a url and an index for every node', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-nodes-'));
  const file = join(dir, 'nodes.yaml');
  await writeFile(file, '- url: https://a.example/\n  index: https://a.example/catalog.json\n');
  assert.deepEqual(await readNodeList(file), [{ url: 'https://a.example/', index: 'https://a.example/catalog.json' }]);
  await writeFile(file, '- url: https://a.example/\n');
  await assert.rejects(readNodeList(file), /node 1 needs url and index/);
});

test('a value type page also lists the models built on it', async () => {
  const subjects = await loadSubjects();
  const found = subjects.flatMap((s) => s.models.filter((m) => m.kind === 'value').map((m) => ({ s, m })))[0];
  const iri = found.m.schema['x-alias-of'] ?? `https://datamodels.jp/ns/${found.s.name}/${found.m.type}`;
  const snapshot = { nodes: [nodeEntry(NODE, { models: [{ type: 'Addr', typeIri: 'https://models.example.org/ns/x#Addr', subClassOf: iri }] }, '2026-10-11')] };
  assert.match(renderModelPage('en', '/en', subjects, found.s, found.m, [], snapshot), /## Built on by other sites \{#built-on\}/);
});

test('the Task page lists the models of other sites built on it; the sites page lists every node', async () => {
  const subjects = await loadSubjects();
  const task = subjects.find((s) => s.name === 'task');
  const snapshot = { nodes: [nodeEntry(NODE, CATALOG, '2026-10-11')] };
  const en = renderModelPage('en', '/en', subjects, task, task.models.find((m) => m.type === 'Task'), [], snapshot);
  assert.match(en, /## Built on by other sites \{#built-on\}/);
  assert.match(en, /\| \[Example bOrg\/b\]\(https:\/\/models\.example\.org\/\) \| \[`Issue`\]\(https:\/\/models\.example\.org\/models\/x\/Issue\/\) \| same type, another name \(v1\.0\.0\) \|/);
  assert.match(en, /\| subtype \|/);
  const ja = renderModelPage('ja', '', subjects, task, task.models.find((m) => m.type === 'Task'), [], snapshot);
  assert.match(ja, /別の名前の同じ型（v1\.0\.0）/);
  // A model nobody builds on has no such section.
  assert.doesNotMatch(renderModelPage('en', '/en', subjects, task, task.models.find((m) => m.type === 'Project'), [], snapshot), /built-on/);
  const page = nodesPage('en', '/en', snapshot);
  assert.match(page, /## Example bOrg\/b/);
  assert.match(page, /\| \[`Issue`\]\(https:\/\/models\.example\.org\/models\/x\/Issue\/\) \| Issue x \| experimental \| same type as \[Task\]\(\/en\/models\/task\/Task\/\) \|/);
  assert.match(page, /\| \[`Ride`\]\(https:\/\/models\.example\.org\/models\/x\/Ride\/\) \| {2}\| {2}\| {2}\|/);
  assert.match(nodesPage('ja', '', { nodes: [] }), /まだありません。/);
  // Every extended type is shown, not only the first; one already named as alias is not repeated.
  const two = { nodes: [nodeEntry(NODE, { models: [{ type: 'Both', typeIri: 'https://models.example.org/ns/x#Both', extends: [{ typeIri: TASK, version: '1.0.0' }, { typeIri: 'https://datamodels.jp/ns/task/Project', version: '1.0.0' }] }, { type: 'Alias', typeIri: TASK, aliasOf: TASK, extends: [{ typeIri: TASK, version: '1.0.0' }] }] }, '2026-10-11')] };
  const both = nodesPage('en', '/en', two);
  assert.match(both, /extends \[Task\]\(\/en\/models\/task\/Task\/\)<br>extends \[Project\]\(\/en\/models\/task\/Project\/\)/);
  assert.match(both, /\| `Alias` \| {2}\| {2}\| same type as \[Task\]\(\/en\/models\/task\/Task\/\) \|/);
});
