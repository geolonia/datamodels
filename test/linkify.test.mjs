// Bare URLs in the site's Markdown end before full-width text (site/.vitepress/linkify.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createMarkdownRenderer } from 'vitepress';
import { endUrlsAtNonAscii } from '../site/.vitepress/linkify.mjs';
import { mdText } from '../scripts/lib/models.mjs';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const md = await createMarkdownRenderer(join(root, 'site'), { config: endUrlsAtNonAscii });
// [href, text] of each link, as a note renders on a model page.
const links = (note) => [...md.render(`- ${mdText(note)}`).matchAll(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((m) => [m[1], m[2]]);
const only = (url) => [[url, url]];

test('a URL in Japanese text ends before the full-width punctuation after it', () => {
  assert.deepEqual(links('定義（https://example.com/a）を参照します。'), only('https://example.com/a'));
  assert.deepEqual(links('出典はhttps://example.com/a.html、2026-09-24 時点。'), only('https://example.com/a.html'));
  assert.deepEqual(links('詳しくは https://example.com/a。次に'), only('https://example.com/a'));
  assert.deepEqual(links('「https://example.com/a?b=1#c」と書きます'), only('https://example.com/a?b=1#c'));
  assert.deepEqual(links('ここ（http://www.opengis.net/ont/sf#Geometry）には'), only('http://www.opengis.net/ont/sf#Geometry'));
});

test('a URL in Japanese text with no punctuation after it ends at the text', () => {
  assert.deepEqual(links('https://example.com/aを参照'), only('https://example.com/a'));
  assert.deepEqual(links('https://example.com）を参照'), only('https://example.com'));
});

test('the URL is read again where it is cut, so a trailing period is not part of it', () => {
  assert.deepEqual(links('https://example.com/a.を参照'), only('https://example.com/a'));
});

test('two URLs in one Japanese sentence are two links', () => {
  assert.deepEqual(links('https://example.com/aとhttps://example.org/bを比べます'), [...only('https://example.com/a'), ...only('https://example.org/b')]);
});

test('ASCII URLs link as before', () => {
  assert.deepEqual(links('See https://en.wikipedia.org/wiki/Geometry_(disambiguation) for more.'), only('https://en.wikipedia.org/wiki/Geometry_(disambiguation)'));
  assert.deepEqual(links('It is at https://example.com/a.'), only('https://example.com/a'));
  assert.deepEqual(links('(see https://example.com/a), then'), only('https://example.com/a'));
});

test('a non-ASCII host still links', () => {
  assert.deepEqual(links('See https://日本語.jp/a for more.'), [['https://xn--wgv71a119e.jp/a', 'https://日本語.jp/a']]);
});
