// Known nodes: what the snapshot keeps of a node's catalog.json (cleaned), which
// of their models build on a catalog model, and how the pages show them. No network.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { nodeEntry, builtOn, readNodeList, cleanText, cleanUrl, isIndex, catalogAttributeIris, shownByNode, unlistedNodes } from '../scripts/lib/nodes.mjs';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { renderModelPage, nodesPage } from '../scripts/lib/site.mjs';

const TASK = 'https://datamodels.jp/ns/task/Task';
const NODE = { url: 'https://models.example.org/', index: 'https://models.example.org/catalog.json' };
const subjects = await loadSubjects();
const IRIS = catalogAttributeIris(subjects);
const NAME_IRI = 'https://uri.etsi.org/ngsi-ld/name';
const CATALOG = {
  publisher: { name: { en: 'Example <b>Org</b>' }, url: 'javascript:alert(1)' },
  license: 'CC0-1.0',
  models: [
    { type: 'Issue', typeIri: TASK, aliasOf: TASK, pageUrl: 'https://models.example.org/models/x/Issue/', title: { en: 'Issue {{ x }}' }, status: 'experimental', extends: [{ typeIri: TASK, version: '1.0.0', index: 'https://datamodels.jp/catalog.json' }],
      contextAliasUrl: 'https://models.example.org/context/x/v0.jsonld', contextUrl: 'https://models.example.org/context/x/v0.2.0.jsonld',
      attributes: [
        { name: 'name', iri: NAME_IRI, description: { en: 'Name' } },
        { name: 'title', iri: NAME_IRI, description: { en: 'The catalog name under another term: not added' } },
        { name: 'category', iri: 'https://models.example.org/ns/x#category', description: { en: 'The <b>category</b>', ja: 'カテゴリー' }, type: 'string' },
        { name: 'bad name', iri: 'https://models.example.org/ns/x#bad' },
        { name: 'noIri', iri: 'javascript:alert(1)' },
      ] },
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
  assert.equal(e.models[0].added, undefined, 'without the catalog, nothing counts as added');
  assert.deepEqual(e.models[0].extends, [{ typeIri: TASK, version: '1.0.0' }]);
  assert.equal(cleanText('a | b\n[c](d)'), 'a b c(d)');
  assert.equal(cleanUrl('https://user:pw@example.org/'), null);
});

test('for a model built on a catalog model, the snapshot keeps its @context and the attributes it adds', () => {
  const e = nodeEntry(NODE, CATALOG, '2026-10-11', IRIS);
  assert.equal(e.models[0].contextUrl, 'https://models.example.org/context/x/v0.jsonld', 'the alias, which follows new versions');
  // Compared by IRI: name and title carry an IRI of Task; bad names and URLs are left out; only name, IRI and description are kept.
  assert.deepEqual(e.models[0].added, [{ name: 'category', iri: 'https://models.example.org/ns/x#category', description: { en: 'The bcategory/b', ja: 'カテゴリー' } }]);
  assert.deepEqual(e.models[1].added, undefined, 'a node that publishes no attributes: not known, not "none"');
  assert.equal(e.models[1].contextUrl, undefined);
  assert.equal(e.models[2].added, undefined, 'a model built on no catalog model records nothing');
});

test('a listed extension that a node shows is the same when its page or @context is on the node\'s site', () => {
  const others = builtOn({ nodes: [nodeEntry(NODE, CATALOG, '2026-10-11', IRIS)] }, TASK);
  assert.equal(shownByNode({ context: 'https://MODELS.example.org/context/x/v0.jsonld' }, others), true);
  assert.equal(shownByNode({ url: 'https://models.example.org/models/x/Issue/', context: [{}] }, others), true);
  assert.equal(shownByNode({ url: 'https://example.org/', context: 'https://other.example/c.jsonld' }, others), false);
  assert.equal(shownByNode({ context: [{ x: 'https://models.example.org/ns/x#x' }] }, others), false, 'an inline context is not a site');
  // Two nodes on one host stay apart: the url is a prefix, not just the host.
  const user = builtOn({ nodes: [nodeEntry({ url: 'https://user.github.io/models/', index: 'https://user.github.io/models/catalog.json' }, CATALOG, '2026-10-11')] }, TASK);
  assert.equal(shownByNode({ context: 'https://user.github.io/other/c.jsonld' }, user), false);
  assert.equal(shownByNode({ context: 'https://user.github.io/models/context/x/v0.jsonld' }, user), true);
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

test('npm run nodes reports the nodes the known nodes link to that nodes.yaml does not list (#222)', () => {
  const A = { url: 'https://a.example.org/', index: 'https://a.example.org/catalog.json' };
  const B = { url: 'https://b.example.org/', index: 'https://b.example.org/catalog.json' };
  const read = [
    { node: A, catalog: { nodes: [{ url: 'https://datamodels.jp/', index: 'https://datamodels.jp/catalog.json' }, B, { url: 'https://new.example.org/', index: 'https://NEW.example.org/catalog.json' }, { index: 'not a url' }], models: [] } },
    { node: B, catalog: { models: [{ type: 'X', extends: [{ typeIri: 'https://new.example.org/ns#Y', version: '1.0.0', index: 'https://new.example.org/catalog.json' }, { index: 'https://other.example.org/catalog.json' }] }] } },
  ];
  assert.deepEqual(unlistedNodes([A, B], read), [
    { index: 'https://new.example.org/catalog.json', from: [A.index, B.index] },
    { index: 'https://other.example.org/catalog.json', from: [B.index] },
  ]);
  assert.deepEqual(unlistedNodes([A, B], [{ node: A, catalog: {} }]), []);
  // A #fragment is never sent: catalog.json#models is the listed index, and a new one is reported once, without it.
  const withFragments = [{ node: A, catalog: { nodes: [{ index: 'https://b.example.org/catalog.json#models' }, { index: 'https://new.example.org/catalog.json#x' }, { index: 'https://new.example.org/catalog.json' }], models: [] } }];
  assert.deepEqual(unlistedNodes([A, B], withFragments), [{ index: 'https://new.example.org/catalog.json', from: [A.index] }]);
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
  const found = subjects.flatMap((s) => s.models.filter((m) => m.kind === 'value').map((m) => ({ s, m })))[0];
  const iri = found.m.schema['x-alias-of'] ?? `https://datamodels.jp/ns/${found.s.name}/${found.m.type}`;
  const snapshot = { nodes: [nodeEntry(NODE, { models: [{ type: 'Addr', typeIri: 'https://models.example.org/ns/x#Addr', subClassOf: iri }] }, '2026-10-11')] };
  assert.match(renderModelPage('en', '/en', subjects, found.s, found.m, [], snapshot), /## Built on by others \{#built-on\}/);
});

test('the Task page lists the models of other sites built on it, with what they add; the sites page has one row per node', () => {
  const task = subjects.find((s) => s.name === 'task');
  const Task = task.models.find((m) => m.type === 'Task');
  const snapshot = { nodes: [nodeEntry(NODE, CATALOG, '2026-10-11', IRIS)] };
  const en = renderModelPage('en', '/en', subjects, task, Task, [], snapshot);
  assert.match(en, /^## Built on by others \{#built-on\}$/m);
  assert.match(en, /^<div id="extensions" class="old-anchor"><\/div>$/m);
  assert.match(en, /\| \[Example bOrg\/b\]\(https:\/\/models\.example\.org\/\) \| \[`Issue`\]\(https:\/\/models\.example\.org\/models\/x\/Issue\/\)<br><small>@context: \[`https:\/\/models\.example\.org\/context\/x\/v0\.jsonld`\]\(https:\/\/models\.example\.org\/context\/x\/v0\.jsonld\)<\/small> \| same type, another name \(v1\.0\.0\) \| `category`: The bcategory\/b<br><span class="iri">`https:\/\/models\.example\.org\/ns\/x#category`<\/span> \|/);
  assert.match(en, /\| subtype \| {2}\|/);
  const ja = renderModelPage('ja', '', subjects, task, Task, [], snapshot);
  assert.match(ja, /^## このモデルをもとにしたもの \{#built-on\}$/m);
  assert.match(ja, /別の名前の同じ型（v1\.0\.0）/);
  assert.match(ja, /`category`: カテゴリー<br>/, 'the description in the page\'s language when the node has it');
  // A model nobody builds on has no such section.
  assert.doesNotMatch(renderModelPage('en', '/en', subjects, task, task.models.find((m) => m.type === 'Project'), [], snapshot), /built-on/);

  // A listed extension on the node's site shows once, as the node's model; another one still shows.
  const same = { name: 'example', organization: { ja: '例', en: 'Example' }, url: 'https://models.example.org/models/x/Issue/', version: '1.0.0', context: 'https://models.example.org/context/x/v0.jsonld', terms: { category: { iri: 'https://models.example.org/ns/x#category', description: { ja: 'カテゴリー', en: 'Category' } } } };
  const other = { ...same, name: 'other', organization: { ja: '他', en: 'Other' }, url: 'https://other.example/', context: 'https://other.example/c.jsonld' };
  const both = renderModelPage('en', '/en', subjects, task, { ...Task, extensions: [same, other] }, [], snapshot);
  assert.equal(both.match(/models\/x\/Issue\//g).length, 1, 'GTT-like: shown once');
  assert.doesNotMatch(both, /extension-example"/);
  assert.match(both, /<a id="extension-other"><\/a>\[Other\]/);
  // Without the node, the listed extension shows on its own.
  assert.match(renderModelPage('en', '/en', subjects, task, { ...Task, extensions: [same] }, [], { nodes: [] }), /<a id="extension-example"><\/a>/);

  const page = nodesPage('en', '/en', snapshot);
  assert.match(page, /^\| Site \| Licence \| Models \| Builds on \(catalog models\) \| Read on \|$/m);
  assert.match(page, /^\| \[Example bOrg\/b\]\(https:\/\/models\.example\.org\/\) \| CC0-1\.0 \| 3 \| \[Task\]\(\/en\/models\/task\/Task\/\) \| 2026-10-11 \|$/m, 'Issue and Patrol both build on Task: named once');
  assert.doesNotMatch(page, /^## /m, 'no section per site');
  assert.doesNotMatch(page, /Ride/, 'no table of every model');
  // The diagram of sites and the catalog is on /guide/own-models only; the page links it.
  assert.doesNotMatch(page, /<svg/, 'no diagram of its own');
  assert.ok(page.includes('(/en/guide/own-models#own-site)'), 'links the diagram');
  assert.match(nodesPage('ja', '', { nodes: [] }), /まだありません。/);
  // Both languages send a site to its section of Contributing, which links the listing form.
  assert.ok(page.includes('(/en/guide/contribute#site-listing)'), 'the site-listing section, in English');
  assert.ok(nodesPage('ja', '', snapshot).includes('(/guide/contribute#site-listing)'), 'the site-listing section, in Japanese');
  const own = { nodes: [nodeEntry(NODE, { models: [{ type: 'Ride', typeIri: 'https://models.example.org/ns/x#Ride' }] }, '2026-10-11')] };
  assert.match(nodesPage('en', '/en', own), /\| 1 \| — \| 2026-10-11 \|/, 'a site that builds on no catalog model');
  // Every catalog model a site builds on, in the order met.
  const two = { nodes: [nodeEntry(NODE, { models: [{ type: 'Both', typeIri: 'https://models.example.org/ns/x#Both', extends: [{ typeIri: TASK, version: '1.0.0' }, { typeIri: 'https://datamodels.jp/ns/task/Project', version: '1.0.0' }] }, { type: 'Alias', typeIri: TASK, aliasOf: TASK, extends: [{ typeIri: TASK, version: '1.0.0' }] }] }, '2026-10-11')] };
  assert.match(nodesPage('ja', '', two), /\| 2 \| \[Task\]\(\/models\/task\/Task\/\), \[Project\]\(\/models\/task\/Project\/\) \|/);
});
