// The vocabulary document states the catalog's class relations in RDFS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { buildVocabulary } from '../scripts/lib/vocab.mjs';

const subjects = await loadSubjects();
const byName = (n) => subjects.find((s) => s.name === n);
const node = (vocab, id) => vocab['@graph'].find((n) => n['@id'] === id);

test('subclasses carry rdfs:subClassOf to the task types', () => {
  const v = buildVocabulary(byName('disaster'));
  assert.equal(node(v, 'https://datamodels.jp/ns/disaster/IncidentReport').subClassOf, 'https://datamodels.jp/ns/task/Task');
  assert.equal(node(v, 'https://datamodels.jp/ns/disaster/IncidentHandoverNote').subClassOf, 'https://datamodels.jp/ns/task/Comment');
  assert.equal(node(v, 'https://datamodels.jp/ns/disaster/IncidentPhoto').subClassOf, 'https://datamodels.jp/ns/task/Attachment');
});

test('an alias owns no class; the aliased type is defined by its own subject', () => {
  const v = buildVocabulary(byName('disaster'));
  assert.equal(v['@graph'].some((n) => n['@id'] === 'https://datamodels.jp/ns/task/Project'), false);
  assert.ok(node(buildVocabulary(byName('task')), 'https://datamodels.jp/ns/task/Project'));
});

test('only properties minted in the namespace are listed, with ja and en comments', () => {
  const v = buildVocabulary(byName('disaster'));
  const props = v['@graph'].filter((n) => n['@type'] === 'rdf:Property');
  assert.ok(props.length > 0);
  for (const p of props) assert.ok(p['@id'].startsWith('https://datamodels.jp/ns/disaster/'), p['@id']);
  const reporter = node(v, 'https://datamodels.jp/ns/disaster/reporterName');
  assert.ok(reporter.comment.ja && reporter.comment.en);
});
