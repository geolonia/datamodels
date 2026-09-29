// Generated model pages (scripts/lib/site.mjs): what the attribute rows, notes
// and page descriptions say.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSubjects } from '../scripts/lib/models.mjs';
import { valueText, indexPage, plainText, issueLinks } from '../scripts/lib/site.mjs';

const subjects = await loadSubjects();
const task = subjects.find((s) => s.name === 'task');
const Task = task.models.find((m) => m.type === 'Task');

test('an attribute row shows the schema\'s minimum and maximum', () => {
  assert.equal(valueText('en', task, Task.schema.properties.priority, '/en'), 'Property, integer, ≥ 0, ≤ 9');
  assert.equal(valueText('ja', task, Task.schema.properties.percentComplete, ''), 'Property, integer, ≥ 0, ≤ 100');
  assert.equal(valueText('en', task, { type: 'number', exclusiveMinimum: 0, exclusiveMaximum: 1 }, '/en'), 'Property, number, > 0, < 1');
});

test('"#85" in a note links the issue; anchors and other hashes stay as they are', () => {
  assert.equal(issueLinks('Added (#85): see issue #22.'), 'Added ([#85](https://github.com/geolonia/datamodels/issues/85)): see issue [#22](https://github.com/geolonia/datamodels/issues/22).');
  assert.equal(issueLinks('#7 first'), '[#7](https://github.com/geolonia/datamodels/issues/7) first');
  for (const s of ['core#location', 'see /models/task/#name', 'C#9', '`#abc`']) assert.equal(issueLinks(s), s);
});

test('page descriptions (meta and share previews) carry no Markdown', () => {
  assert.equal(plainText('One `@context` per subject, at `/ns/<subject>/<term>`. See [URLs](/guide/urls) and **this**.'), 'One @context per subject, at /ns/<subject>/<term>. See URLs and this.');
  for (const lang of ['ja', 'en']) {
    const description = JSON.parse(/^description: (.*)$/m.exec(indexPage(lang, lang === 'en' ? '/en' : '', subjects))[1]);
    assert.doesNotMatch(description, /[`*[\]]/, lang);
    assert.match(description, /\/ns\/<subject>\/<term>/, lang);
  }
});
