// /llms.txt lists every published model with URLs the build publishes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, subjectUrls, modelUrls, BASE_URL, ROOT } from '../scripts/lib/models.mjs';
import { llmsTxt } from '../scripts/lib/llms.mjs';

const subjects = await loadSubjects();
const txt = await llmsTxt(subjects);

test('llms.txt starts with the title and a summary line (llmstxt.org)', () => {
  assert.match(txt, /^# datamodels\.jp\n\n> \S/);
});

test('every subject and model is listed with its context, English page and schema', () => {
  for (const subject of subjects) {
    assert.ok(txt.includes(subjectUrls(subject).contextExact), `${subject.name} context`);
    for (const model of subject.models) {
      const mu = modelUrls(subject, model);
      assert.ok(txt.includes(`[${model.type}](${BASE_URL}/en/models/${subject.name}/${model.type}/)`), `${model.type} page`);
      assert.ok(txt.includes(mu.schemaExact), `${model.type} schema`);
    }
  }
});

test('only guides whose English page exists are linked', async () => {
  for (const [, slug] of txt.matchAll(/\]\(https:\/\/datamodels\.jp\/en\/guide\/([a-z-]+)\)/g)) {
    await access(join(ROOT, 'site', 'en', 'guide', `${slug}.md`));
  }
});
