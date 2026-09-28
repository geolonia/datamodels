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
  assert.deepEqual(edge('task/Comment', 'task/Task', 'rel')?.labels, ['task']);
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
  assert.equal(graphSvg('ja', '', subjects, subject('disaster')), '');
  for (const name of ['task', 'common', 'transportation']) assert.match(graphSvg('en', '/en', subjects, subject(name)), /<svg /, name);
  assert.match(graphSvg('ja', '', subjects), /<svg /);
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
