// Code in the hand-written pages keeps short lines, so a reader sees it whole
// without scrolling or wrapping (custom.css wraps the rest as a fallback).
// Long URLs go into a variable; output samples (```text) are exempt.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ROOT } from '../scripts/lib/models.mjs';

const MAX = 90;
// Japanese and other wide characters take two columns.
const width = (s) => [...s].reduce((n, c) => n + (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿︰-﹏＀-｠￠-￦]/u.test(c) ? 2 : 1), 0);

async function pages() {
  const out = [];
  for (const dir of ['site/guide', 'site/en/guide']) {
    for (const f of await readdir(join(ROOT, dir))) if (f.endsWith('.md')) out.push(join(dir, f));
  }
  return out;
}

test(`code lines in the guides are at most ${MAX} columns`, async () => {
  const long = [];
  for (const file of await pages()) {
    // A fence closes only on the same marker (``` or ~~~), at least as long, with nothing after it.
    let fence = null;
    (await readFile(join(ROOT, file), 'utf8')).split('\n').forEach((line, i) => {
      if (fence === null) {
        const open = /^\s*(`{3,}|~{3,})\s*(\w*)/.exec(line);
        if (open) fence = { marker: open[1], lang: open[2] };
        return;
      }
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1][0] === fence.marker[0] && close[1].length >= fence.marker.length) { fence = null; return; }
      if (fence.lang !== 'text' && width(line) > MAX) long.push(`${file}:${i + 1} (${width(line)})`);
    });
  }
  assert.deepEqual(long, []);
});
