// /llms.txt lists every published model with URLs the build publishes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, subjectUrls, modelUrls, BASE_URL, ROOT } from '../scripts/lib/models.mjs';
import { llmsTxt } from '../scripts/lib/llms.mjs';
import { GENERATED_PAGES } from '../scripts/lib/site.mjs';

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

// A generated page (standards, sites) exists only after generateSitePages, which another test
// file may be running at the same moment: check those by name, the others as files.
test('only guides and toolkit pages whose English page exists are linked', async () => {
  for (const [, page] of txt.matchAll(/\]\(https:\/\/datamodels\.jp\/en\/((?:guide|toolkit)\/[a-z-]*)\)/g)) {
    if (GENERATED_PAGES.includes(page)) continue;
    await access(join(ROOT, 'site', 'en', page.endsWith('/') ? `${page}index.md` : `${page}.md`));
  }
  for (const page of GENERATED_PAGES) assert.ok(txt.includes(`(${BASE_URL}/en/${page})`), `${page} is listed`);
});

test('every English guide and toolkit page is listed', async () => {
  for (const dir of ['guide', 'toolkit']) {
    for (const f of await readdir(join(ROOT, 'site', 'en', dir))) {
      if (!f.endsWith('.md')) continue;
      const url = `${BASE_URL}/en/${dir}/${f === 'index.md' ? '' : f.slice(0, -3)}`;
      // The guides' landing page is linked from the site, not from llms.txt; the toolkit's explains the toolkit.
      if (dir === 'guide' && f === 'index.md') continue;
      assert.ok(txt.includes(`(${url})`), `${dir}/${f}`);
    }
  }
});
