// sitemap.xml names the English page as x-default, as the pages do (site/.vitepress/sitemap.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addXDefault } from '../site/.vitepress/sitemap.mjs';

test('a page in both languages gets x-default, the English page', () => {
  const links = [{ lang: 'ja', url: 'models/task/Task/' }, { lang: 'en', url: 'en/models/task/Task/' }];
  const items = [{ url: 'models/task/Task/', links }, { url: 'en/models/task/Task/', links }];
  for (const item of addXDefault(items)) {
    assert.deepEqual(item.links.map((l) => [l.lang, l.url]), [
      ['ja', 'models/task/Task/'],
      ['en', 'en/models/task/Task/'],
      ['x-default', 'en/models/task/Task/'],
    ], item.url);
  }
  assert.equal(links.length, 2, 'the links VitePress shares between the items stay as they are');
});

test('a page in one language only stays as it is', () => {
  const item = { url: 'only-ja' };
  assert.deepEqual(addXDefault([item]), [item]);
});
