// The vocabulary document states the catalog's class relations in RDFS.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { buildVocabulary } from '../scripts/lib/vocab.mjs';

const subjects = await loadSubjects();
const byName = (n) => subjects.find((s) => s.name === n);
const node = (vocab, id) => vocab['@graph'].find((n) => n['@id'] === id);

// No model in the current catalog declares x-subclass-of (the disaster subject
// dropped its last subclasses, IncidentReport/IncidentHandoverNote/IncidentPhoto,
// on 2026-09-24). This builds a throwaway in-memory subject, independent of
// models/, so buildVocabulary's subclass handling stays covered.
test('subclasses carry rdfs:subClassOf to the task types', () => {
  const fakeSubject = {
    name: 'probe', version: '1.0.0', title: { ja: 'テスト', en: 'Probe' }, description: { ja: 'テスト', en: 'Probe' },
    models: [{
      type: 'ReportProbe',
      catalog: { title: { ja: 'テスト', en: 'Probe' }, description: { ja: 'テスト', en: 'Probe' }, attributes: {} },
      schema: { 'x-subclass-of': 'https://datamodels.jp/ns/task/Task', properties: { id: {}, type: {} } },
    }],
  };
  const v = buildVocabulary(fakeSubject);
  assert.equal(node(v, 'https://datamodels.jp/ns/probe/ReportProbe').subClassOf, 'https://datamodels.jp/ns/task/Task');
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
  const openingStatus = node(v, 'https://datamodels.jp/ns/disaster/openingStatus');
  assert.ok(openingStatus.comment.ja && openingStatus.comment.en);
});
