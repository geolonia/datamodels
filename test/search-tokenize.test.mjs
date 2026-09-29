// The site search's word splitting (site/.vitepress/search-tokenize.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tokenize } from '../site/.vitepress/search-tokenize.mjs';

test('Japanese is split into words, so a word inside a clause can be found', () => {
  assert.deepEqual(tokenize('避難した人が一定期間滞在する施設'), ['避難', 'した', '人', 'が', '一定', '期間', '滞在', 'する', '施設']);
  assert.deepEqual(tokenize('指定避難所、想定収容人数'), ['指定', '避難所', '想定', '収容', '人数']);
});

test('a katakana run stays one word; its pieces are added only when none is a single character', () => {
  assert.deepEqual(tokenize('オートスケーリングと従量課金'), ['オートスケーリング', 'と', '従', '量', '課金']);
  assert.deepEqual(tokenize('ポリシーベース認可'), ['ポリシーベース', 'ポリシー', 'ベース', '認可']);
});

test('other text is split as MiniSearch does: on spaces and punctuation, with mixed words kept apart', () => {
  assert.deepEqual(tokenize('JSON Schema 2020-12, nationalShelterId'), ['JSON', 'Schema', '2020', '12', 'nationalShelterId']);
  assert.deepEqual(tokenize('EvacuationSiteへの参照'), ['EvacuationSite', 'へ', 'の', '参照']);
});

test('the function works from its source text alone, as VitePress sends it to the browser', () => {
  const again = new Function(`return (${tokenize.toString()})`)();
  assert.deepEqual(again('一定期間滞在する'), tokenize('一定期間滞在する'));
});
