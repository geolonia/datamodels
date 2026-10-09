// Generated model pages (scripts/lib/site.mjs): what the attribute rows, notes
// and page descriptions say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects, mdText } from '../scripts/lib/models.mjs';
import { valueText, indexPage, plainText, issueLinks, renderModelPage } from '../scripts/lib/site.mjs';

const subjects = await loadSubjects();
const task = subjects.find((s) => s.name === 'task');
const Task = task.models.find((m) => m.type === 'Task');

test('an attribute row shows the schema\'s minimum and maximum', () => {
  assert.equal(valueText('en', task, Task.schema.properties.priority, '/en'), 'Property, integer, ≥ 0, ≤ 9');
  assert.equal(valueText('ja', task, Task.schema.properties.percentComplete, ''), 'Property, integer, ≥ 0, ≤ 100');
  assert.equal(valueText('en', task, { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 }, '/en'), 'Property, number, > 0, < 1');
});

test('a date or date-time attribute says so in both languages', () => {
  const Milestone = task.models.find((m) => m.type === 'Milestone');
  assert.equal(valueText('en', task, Task.schema.properties.due, '/en'), 'Property, string (date or date-time)');
  assert.equal(valueText('ja', task, Milestone.schema.properties.due, ''), 'Property, string (日付または日時)');
  assert.equal(valueText('en', task, Task.schema.properties.completedAt, '/en'), 'Property, string (date-time)');
});

test('"#85" in a note links the issue; anchors and other hashes stay as they are', () => {
  assert.equal(issueLinks('Added (#85): see issue #22.'), 'Added ([#85](https://github.com/geolonia/datamodels/issues/85)): see issue [#22](https://github.com/geolonia/datamodels/issues/22).');
  assert.equal(issueLinks('#7 first'), '[#7](https://github.com/geolonia/datamodels/issues/7) first');
  for (const s of ['core#location', 'see /models/task/#name', 'C#9', '`#abc`']) assert.equal(issueLinks(s), s);
  assert.equal(issueLinks('（2026-09-30、#118。）'), '（2026-09-30、[#118](https://github.com/geolonia/datamodels/issues/118)。）', 'after Japanese punctuation');
});

test('page descriptions (meta and share previews) carry no Markdown', () => {
  assert.equal(plainText('One `@context` per subject, at `/ns/<subject>/<term>`. See [URLs](/guide/urls) and **this**.'), 'One @context per subject, at /ns/<subject>/<term>. See URLs and this.');
  for (const lang of ['ja', 'en']) {
    const description = JSON.parse(/^description: (.*)$/m.exec(indexPage(lang, lang === 'en' ? '/en' : '', subjects))[1]);
    assert.doesNotMatch(description, /[`*[\]]/, lang);
    assert.match(description, /サブジェクト|subject/, lang);
  }
});

test('model text shows <tags> and {{ braces }} as written; Markdown and code spans still work', () => {
  assert.equal(mdText('see <owner>/<repo>'), 'see &lt;owner>/&lt;repo>');
  assert.equal(mdText('{{ 1 + 1 }}'), '&#123;&#123; 1 + 1 }}');
  assert.equal(mdText('[a link](https://example.org) and `<code>` and `{x}`'), '[a link](https://example.org) and `<code>` and `{x}`');
  assert.equal(mdText(undefined), '');
  // In a page: a note, a mapping note and a description (VitePress would read <owner> as a tag and fail).
  const Milestone = task.models.find((m) => m.type === 'Milestone');
  const probe = structuredClone(Milestone);
  probe.notes = { ...probe.notes, notes: [{ ja: '<owner>/<repo> と {{ x }}', en: '<owner>/<repo> and {{ x }}' }] };
  probe.catalog = { ...probe.catalog, description: { ...probe.catalog.description, en: 'A <b>bold</b> claim' } };
  const page = renderModelPage('en', '/en', subjects, task, probe);
  assert.match(page, /- &lt;owner>\/&lt;repo> and &#123;&#123; x }}/);
  assert.match(page, /A &lt;b>bold&lt;\/b> claim/);
  // The front matter keeps plain text (VitePress escapes meta tags itself); the body has no raw tag.
  assert.doesNotMatch(page.slice(page.indexOf('\n---\n') + 5), /<owner>|<b>bold/);
});
