// The relationship graph on the subject pages and /models/ (scripts/lib/graph.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { catalogEdges, graphSvg } from '../scripts/lib/graph.mjs';

const subjects = await loadSubjects();
const subject = (name) => subjects.find((s) => s.name === name);
const edges = catalogEdges(subjects);
const edge = (from, to, kind) => edges.find((e) => e.from === from && e.to === to && e.kind === kind);

test('Relationships, value types and pseudo targets become edges, merged per pair', () => {
  assert.deepEqual(edge('task/Milestone', 'task/Project', 'rel')?.labels, ['project']);
  assert.deepEqual(edge('task/Task', 'task/Milestone', 'rel')?.labels, ['milestone']);
  assert.deepEqual(edge('task/Task', 'task/Task', 'rel')?.labels, ['parent', 'relatedTo']);
  assert.deepEqual(edge('task/Task', '@agent', 'rel')?.labels, ['assignee', 'author']);
  assert.ok(edge('task/Task', '@any', 'rel'), 'refersTo points at any entity');
  assert.deepEqual(edge('transportation/RoadRestriction', 'common/JapaneseAddress', 'value')?.labels, ['address']);
  assert.deepEqual(edge('transportation/RoadRestriction', 'common/Geometry', 'value')?.labels, ['location']);
});

test('every edge points at a node that exists', () => {
  const ids = new Set(subjects.flatMap((s) => s.models.map((m) => `${s.name}/${m.type}`)).concat(['@agent', '@any']));
  for (const e of edges) { assert.ok(ids.has(e.from), e.from); assert.ok(ids.has(e.to), `${e.from} -> ${e.to}`); }
});

test('a subject with no links gets no graph; the others get one', () => {
  const lone = { name: 'lone', version: '1.0.0', title: { ja: 'L', en: 'L' }, models: [
    { type: 'Alone', kind: 'entity', catalog: { title: { ja: 'A', en: 'A' } }, examples: {}, schema: { properties: { note: { type: 'string', 'x-ngsi': { type: 'Property' } } } } },
  ] };
  assert.equal(graphSvg('ja', '', [lone], lone), '');
  for (const s of subjects) assert.match(graphSvg('en', '/en', subjects, s), /<svg /, s.name);
  assert.match(graphSvg('ja', '', subjects), /<svg /);
});

test('an evacuation shelter links to the site at the same place', () => {
  assert.deepEqual(edge('disaster/EvacuationShelter', 'disaster/EvacuationSite', 'rel')?.labels, ['site']);
  assert.deepEqual(edge('disaster/EvacuationSite', 'common/JapaneseAddress', 'value')?.labels, ['address']);
});

test('the common graph shows who uses its value types, marked as other subjects', () => {
  const svg = graphSvg('en', '/en', subjects, subject('common'));
  assert.match(svg, /href="\/en\/models\/transportation\/RoadRestriction\/"/);
  assert.match(svg, /class="node entity other"/);
});

test('links are HTML anchors over the SVG, not SVG anchors; self-links sit inside the node', () => {
  const svg = graphSvg('ja', '', subjects, subject('task'));
  const inner = svg.slice(svg.indexOf('<svg'), svg.indexOf('</svg>'));
  assert.doesNotMatch(inner, /<a[\s>]/, 'no <a> inside the SVG');
  assert.match(svg, /<\/svg><a href="\/models\/[a-z]+\/[A-Za-z]+\/" aria-label=/);
  assert.match(inner, /↻ parent, relatedTo/);
  assert.match(svg, /model-graph-legend/);
});

// No model in the catalog uses an alias or subclass today; a throwaway subject
// covers those edges, including a subclass that also links to its parent.
test('alias and subclass edges render, next to a Relationship between the same pair', () => {
  const base = 'https://datamodels.jp';
  const model = (type, schema) => ({ type, kind: 'entity', schema: { properties: {}, ...schema }, catalog: { title: { ja: type, en: type } }, examples: {} });
  const probe = {
    name: 'probe', version: '1.0.0', title: { ja: 'P', en: 'P' },
    models: [
      model('Parent'),
      model('Child', { 'x-subclass-of': `${base}/ns/probe/Parent`, properties: { parent: { 'x-ngsi': { type: 'Relationship', target: `${base}/ns/probe/Parent` } } } }),
      model('OtherName', { 'x-alias-of': `${base}/ns/probe/Parent` }),
    ],
  };
  const e = catalogEdges([probe]);
  assert.ok(e.find((x) => x.from === 'probe/Child' && x.to === 'probe/Parent' && x.kind === 'subclass'));
  assert.ok(e.find((x) => x.from === 'probe/Child' && x.to === 'probe/Parent' && x.kind === 'rel'));
  assert.ok(e.find((x) => x.from === 'probe/OtherName' && x.to === 'probe/Parent' && x.kind === 'alias'));
  const svg = graphSvg('en', '/en', [probe], probe);
  assert.equal((svg.match(/class="edge subclass"/g) ?? []).length, 1);
  assert.equal((svg.match(/class="edge rel"/g) ?? []).length, 1);
  assert.equal((svg.match(/class="edge alias"/g) ?? []).length, 1);
  assert.match(svg, />subclass<\/text>/);
  assert.match(svg, />alias<\/text>/);
  // The two edges between Child and Parent keep their own routes.
  const paths = [...svg.matchAll(/class="edge (subclass|rel)" d="([^"]+)"/g)].map((m) => m[2]);
  assert.notEqual(paths[0], paths[1]);
});

test('a value type referenced through allOf or on array items is an edge too', () => {
  const base = 'https://datamodels.jp';
  const value = { type: 'Spot', kind: 'value', schema: { $id: `${base}/schema/probe/Spot/v1.0.0.json`, properties: {} }, catalog: { title: { ja: 'S', en: 'S' } }, examples: {} };
  const owner = { type: 'Owner', kind: 'entity', catalog: { title: { ja: 'O', en: 'O' } }, examples: {}, schema: { properties: {
    here: { allOf: [{ $ref: `${base}/schema/probe/Spot/v1.0.0.json` }], 'x-ngsi': { type: 'GeoProperty' } },
    many: { type: 'array', items: { $ref: `${base}/schema/probe/Spot/v1.json` } },
  } } };
  const probe = { name: 'probe', version: '1.0.0', title: { ja: 'P', en: 'P' }, models: [value, owner] };
  assert.deepEqual(catalogEdges([probe]).find((e) => e.from === 'probe/Owner' && e.to === 'probe/Spot')?.labels, ['here', 'many']);
});

test('ids in the SVG use only safe characters, whatever the subject is called', () => {
  const probe = { name: 'a"b c', version: '1.0.0', title: { ja: 'P', en: 'P' }, models: [
    { type: 'X', kind: 'entity', catalog: { title: { ja: 'X', en: 'X' } }, examples: {}, schema: { properties: { who: { 'x-ngsi': { type: 'Relationship', target: 'agent' } } } } },
  ] };
  const svg = graphSvg('en', '/en', [probe], probe);
  for (const [, id] of svg.matchAll(/(?:id|aria-labelledby)="([^"]*)"/g)) assert.match(id, /^[A-Za-z0-9_-]+$/, id);
  assert.match(svg, /url\(#arrow-a_b_c\)/);
});

test('a model page graph shows the model and its neighbours only, each neighbour a link with its further links counted', () => {
  const svg = graphSvg('en', '/en', subjects, null, 'LR', { center: 'task/Project' });
  const types = [...svg.matchAll(/<text class="type"[^>]*>([^<]*)</g)].map((m) => m[1]).sort();
  assert.deepEqual(types, ['Geometry', 'Milestone', 'Project', 'Task']);
  assert.match(svg, /class="node entity center"/);
  assert.doesNotMatch(svg, /href="\/en\/models\/task\/Project\/"/, 'the model itself is not a link');
  assert.match(svg, /<a href="\/en\/models\/task\/Task\/"/);
  // Task's links besides Project (milestone, parent/relatedTo, refersTo, assignee/author, location).
  assert.match(svg, /class="more"[^>]*>5 more links →</);
  // Milestone's one link besides Project (Task.milestone): singular.
  assert.match(svg, /class="more"[^>]*>1 more link →</);
  assert.match(svg, /↻ parent/);
});

test('a model page graph for a value type shows who uses it, from other subjects too', () => {
  const svg = graphSvg('ja', '', subjects, null, 'LR', { center: 'common/JapaneseAddress' });
  const types = [...svg.matchAll(/<text class="type"[^>]*>([^<]*)</g)].map((m) => m[1]).sort();
  assert.ok(types.includes('JapaneseAddress') && types.includes('RoadRestriction'), types.join(','));
  assert.match(svg, /class="node entity other"/);
  assert.ok(!types.includes('Task'), 'no unrelated models');
});

test('a long grey-box label breaks after its first comma', () => {
  const svg = graphSvg('en', '/en', subjects, null, 'LR', { center: 'task/Task' });
  assert.match(svg, /<text class="sub"[^>]*>person,<\/text><text class="sub"[^>]*>organisation or team<\/text>/);
});

test('the graph and its legend sit in GraphViewer with the size and the model name, as one HTML block', () => {
  const svg = graphSvg('en', '/en', subjects, null, 'LR', { center: 'disaster/DesignatedShelter' });
  const [, w, h] = svg.match(/^<GraphViewer :width="(\d+)" :height="(\d+)" title="DesignatedShelter">\n<div class="model-graph"><div class="canvas" style="width:(?:\d+)px;height:(?:\d+)px">/) ?? [];
  assert.ok(w && h, svg.slice(0, 120));
  assert.match(svg, new RegExp(`style="width:${w}px;height:${h}px"`));
  assert.match(svg, /<\/div><\/div>\n<template #legend><p class="model-graph-legend">.*<\/p><\/template>\n<\/GraphViewer>\n\n$/);
  assert.doesNotMatch(svg, /\n\n(?!$)/, 'no blank line inside: it would end the HTML block');
  assert.match(graphSvg('en', '/en', subjects, subject('task')), /^<GraphViewer :width="\d+" :height="\d+">\n/, 'no title without a centre model');
});
