// On GitHub Actions, failures also go to the job summary as a table.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { reportFailures } from '../scripts/lib/ci-summary.mjs';

test('reportFailures writes a table to GITHUB_STEP_SUMMARY', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-summary-'));
  const before = process.env.GITHUB_STEP_SUMMARY;
  try {
    process.env.GITHUB_STEP_SUMMARY = join(dir, 'summary.md');
    await reportFailures('Model validation failed', ['models/a/B/schema.json: fill in the TODO markers', 'no location here | with a pipe'], 'Hint.');
    const md = await readFile(process.env.GITHUB_STEP_SUMMARY, 'utf8');
    assert.match(md, /^### Model validation failed \(2\)/);
    assert.match(md, /\| `models\/a\/B\/schema\.json` \| fill in the TODO markers \|/);
    assert.match(md, /\| \| no location here \\\| with a pipe \|/);
    assert.match(md, /Hint\./);
  } finally {
    if (before === undefined) delete process.env.GITHUB_STEP_SUMMARY; else process.env.GITHUB_STEP_SUMMARY = before;
    await rm(dir, { recursive: true, force: true });
  }
});

test('reportFailures does nothing outside GitHub Actions', async () => {
  const before = process.env.GITHUB_STEP_SUMMARY;
  delete process.env.GITHUB_STEP_SUMMARY;
  try { await reportFailures('x', ['a: b'], 'c'); } finally { if (before !== undefined) process.env.GITHUB_STEP_SUMMARY = before; }
});
