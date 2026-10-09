// Known extensions (models/<subject>/<Type>/extensions/<name>.yaml, scripts/lib/extensions.mjs):
// what the validator accepts, and how catalog.json and the model page list them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cp, mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects, attributesOf, ROOT, BASE_URL } from '../scripts/lib/models.mjs';
import { extensionProblems, extensionEntry } from '../scripts/lib/extensions.mjs';
import { catalogEntry } from '../scripts/lib/publish.mjs';
import { renderModelPage } from '../scripts/lib/site.mjs';

const subjects = await loadSubjects();
const transportation = subjects.find((s) => s.name === 'transportation');
const RoadRestriction = transportation.models.find((m) => m.type === 'RoadRestriction');
const major = transportation.version.split('.')[0];

const detour = {
  name: 'wakayama-detour',
  organization: { ja: '和歌山県', en: 'Wakayama Prefecture' },
  url: 'https://www.pref.wakayama.lg.jp/',
  version: transportation.version,
  context: [`${BASE_URL}/context/transportation/v${major}.jsonld`, { pref: 'https://www.pref.wakayama.lg.jp/ns/road/', detour: 'pref:detour' }],
  terms: { detour: { iri: 'https://www.pref.wakayama.lg.jp/ns/road/detour', description: { ja: '迂回路', en: 'Detour route' } } },
};
const problems = (change) => extensionProblems({ ...detour, ...change }, RoadRestriction, transportation);

test('a complete extension with an inline context passes', () => {
  assert.deepEqual(problems({}), []);
  assert.deepEqual(problems({ context: 'https://www.pref.wakayama.lg.jp/context/road-v1.jsonld', since: '2026-10' }), []);
});

test('an extension names its terms under its own domain, and never reuses a model attribute', () => {
  assert.match(problems({ terms: { detour: { ...detour.terms.detour, iri: `${BASE_URL}/ns/transportation/detour` } } }).join('\n'), /under datamodels\.jp/);
  const [[attr]] = attributesOf(RoadRestriction);
  assert.match(problems({ terms: { [attr]: detour.terms.detour } }).join('\n'), /already has this attribute/);
  assert.match(problems({ terms: { location: detour.terms.detour } }).join('\n'), /core context/);
  assert.match(problems({ terms: { '迂回路': detour.terms.detour } }).join('\n'), /letters, digits and _/);
  assert.match(problems({ terms: {} }).join('\n'), /terms must list/);
});

test('an inline context imports the subject and defines each term as listed', () => {
  assert.match(problems({ context: [{ detour: 'https://www.pref.wakayama.lg.jp/ns/road/detour' }] }).join('\n'), /must import the transportation context/);
  const other = [`${BASE_URL}/context/transportation/v${major}.jsonld`, { detour: 'https://example.org/detour' }];
  assert.match(problems({ context: other }).join('\n'), /does not define it as https:\/\/www\.pref\.wakayama\.lg\.jp\/ns\/road\/detour/);
  assert.match(problems({ context: `${BASE_URL}/context/transportation/v${major}.jsonld` }).join('\n'), /own @context/);
  assert.match(problems({ context: undefined }).join('\n'), /context is required/);
});

test('organisation, version, links and keys are checked', () => {
  assert.match(problems({ organization: { ja: '和歌山県' } }).join('\n'), /organization needs ja and en/);
  assert.match(problems({ version: '99.0.0' }).join('\n'), /newer than the subject/);
  assert.match(problems({ version: 'v1' }).join('\n'), /X\.Y\.Z/);
  assert.match(problems({ data: 'ftp://example.org/x' }).join('\n'), /data must be a plain http\(s\) URL/);
  assert.match(problems({ token: 'x' }).join('\n'), /unknown key token/);
  assert.match(problems({ name: 'Wakayama Detour' }).join('\n'), /file name/);
});

test('names, descriptions and links are plain: no markup, script or template expression reaches the page', () => {
  assert.match(problems({ organization: { ja: '和歌山県<script>', en: 'Wakayama' } }).join('\n'), /plain text/);
  assert.match(problems({ terms: { detour: { ...detour.terms.detour, description: { ja: '{{ 1 + 1 }}', en: 'Detour' } } } }).join('\n'), /plain text/);
  assert.match(problems({ url: 'https://example.org/a)(b' }).join('\n'), /url must be a plain http\(s\) URL/);
  assert.match(problems({ context: 'https://example.org/c"onerror=x.jsonld' }).join('\n'), /context must be an http\(s\) URL/);
});

test('catalog.json lists the extension, and the entry follows catalog.schema.json', async () => {
  const entry = catalogEntry(transportation, { ...RoadRestriction, extensions: [detour] });
  assert.deepEqual(entry.extensions, [extensionEntry(detour)]);
  assert.deepEqual(entry.extensions[0].terms, [{ name: 'detour', iri: 'https://www.pref.wakayama.lg.jp/ns/road/detour', description: { ja: '迂回路', en: 'Detour route' } }]);
  assert.ok(entry.extensions[0].context && !entry.extensions[0].contextUrl, 'an inline context stays inline');
  assert.equal(catalogEntry(transportation, RoadRestriction).extensions, undefined, 'no key when none is known');
  const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv);
  const schema = JSON.parse(await readFile(join(ROOT, 'catalog.schema.json'), 'utf8'));
  const validate = ajv.compile(schema);
  const catalog = { formatVersion: 1, generatedAt: new Date().toISOString(), license: 'CC0-1.0', licenseUrl: `${BASE_URL}/LICENSE-CONTENT`, models: [entry] };
  assert.ok(validate(catalog), ajv.errorsText(validate.errors));
  // Exactly one of contextUrl and context.
  const { context, ...noContext } = entry.extensions[0];
  assert.equal(validate({ ...catalog, models: [{ ...entry, extensions: [noContext] }] }), false, 'an extension without a context fails');
  assert.equal(validate({ ...catalog, models: [{ ...entry, extensions: [{ ...entry.extensions[0], contextUrl: 'https://example.org/c.jsonld' }] }] }), false, 'both forms at once fail');
});

test('the model page lists extensions under "Extended by", and every entity page links the form', () => {
  const model = { ...RoadRestriction, extensions: [detour] };
  const en = renderModelPage('en', '/en', subjects, transportation, model);
  assert.match(en, /^## Extended by \{#extensions\}$/m);
  assert.match(en, /<a id="extension-wakayama-detour"><\/a>\[Wakayama Prefecture\]\(https:\/\/www\.pref\.wakayama\.lg\.jp\/\)/);
  assert.match(en, /`detour`: Detour route<br><span class="iri">`https:\/\/www\.pref\.wakayama\.lg\.jp\/ns\/road\/detour`<\/span>/);
  assert.match(en, /\*inside the data\*/);
  const ja = renderModelPage('ja', '', subjects, transportation, model);
  assert.match(ja, /^## 拡張している組織 \{#extensions\}$/m);
  assert.match(ja, /\[和歌山県\]/);
  const plain = renderModelPage('en', '/en', subjects, transportation, RoadRestriction);
  assert.doesNotMatch(plain, /\{#extensions\}/);
  assert.match(plain, /template=extension-report\.yml&model=transportation%2FRoadRestriction/);
});

test('the validator reports a bad extension file with its path', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'datamodels-ext-'));
  try {
    await cp(join(ROOT, 'models'), dir, { recursive: true });
    await mkdir(join(dir, 'transportation', 'RoadRestriction', 'extensions'));
    await writeFile(join(dir, 'transportation', 'RoadRestriction', 'extensions', 'bad.yaml'), 'organization: { ja: 和歌山県, en: Wakayama }\nversion: 1.0.0\ncontext: https://www.pref.wakayama.lg.jp/c.jsonld\nterms:\n  detour: { iri: https://datamodels.jp/ns/x, description: { ja: 迂回路, en: Detour } }\n');
    const r = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-models.mjs')], { env: { ...process.env, DATAMODELS_MODELS_DIR: dir }, encoding: 'utf8' });
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /transportation\/RoadRestriction\/extensions\/bad\.yaml: detour: the iri is under datamodels\.jp/);
    // A name: in the file does not replace the file name; the validator says so under the file's own path.
    await writeFile(join(dir, 'transportation', 'RoadRestriction', 'extensions', 'bad.yaml'), 'name: other-id\norganization: { ja: 和歌山県, en: Wakayama }\nversion: 1.0.0\ncontext: https://www.pref.wakayama.lg.jp/c.jsonld\nterms:\n  detour: { iri: https://www.pref.wakayama.lg.jp/ns/road/detour, description: { ja: 迂回路, en: Detour } }\n');
    const r2 = spawnSync(process.execPath, [join(ROOT, 'scripts', 'validate-models.mjs')], { env: { ...process.env, DATAMODELS_MODELS_DIR: dir }, encoding: 'utf8' });
    assert.match(r2.stderr, /extensions\/bad\.yaml: remove the key name/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('the catalog host is recognised in any case and subdomain, and only published contexts count as imports', () => {
  for (const iri of ['https://DATAMODELS.JP/ns/x', 'https://www.datamodels.jp/ns/x']) {
    assert.match(problems({ terms: { detour: { ...detour.terms.detour, iri } } }).join('\n'), /under datamodels\.jp/, iri);
  }
  assert.match(problems({ context: 'https://Datamodels.jp/context/transportation/v1.jsonld' }).join('\n'), /own @context/);
  const notAContext = [`${BASE_URL}/context/transportation/not-a-context`, detour.context[1]];
  assert.match(problems({ context: notAContext }).join('\n'), /must import the transportation context/);
  const exact = [`${BASE_URL}/context/transportation/v${transportation.version}.jsonld`, detour.context[1]];
  assert.deepEqual(problems({ context: exact }), [], 'the exact current version is fine');
});

test('the file name is the id: a name key in the file is rejected, not used', () => {
  assert.match(problems({ fileKeys: ['name', 'organization', 'version', 'context', 'terms'] }).join('\n'), /remove the key name/);
  assert.deepEqual(problems({ fileKeys: ['organization', 'url', 'version', 'context', 'terms'] }), []);
});

test('Markdown in reported text shows as written on the page', () => {
  const marked = { ...detour, organization: { ja: '**和歌山県** [x](https://evil.example)', en: '_Wakayama_ `x`' } };
  const page = renderModelPage('ja', '', subjects, transportation, { ...RoadRestriction, extensions: [marked] });
  assert.match(page, /\\\*\\\*和歌山県\\\*\\\* \\\[x\\\]\(https:\/\/evil\.example\)/);
  assert.doesNotMatch(page, /\[x\]\(https:\/\/evil/, 'no working link');
});

test('no credentials in URLs, and only published versions count', () => {
  for (const k of ['url', 'data']) assert.match(problems({ [k]: 'https://user:secret@example.org/x' }).join('\n'), new RegExp(`${k} must be a plain http`), k);
  assert.match(problems({ context: 'https://user:secret@example.org/c.jsonld' }).join('\n'), /context must be an http/);
  assert.match(problems({ version: '0.9.0' }).join('\n'), /0\.9\.0 was never published/);
  const unpublished = [`${BASE_URL}/context/transportation/v0.9.0.jsonld`, detour.context[1]];
  assert.match(problems({ version: '0.9.0', context: unpublished }).join('\n'), /must import the transportation context/);
  const older = extensionProblems({ ...detour, version: '0.9.0', context: unpublished }, RoadRestriction, transportation, [transportation.version, '0.9.0']);
  assert.deepEqual(older, [], 'a published older version and its exact context are fine');
});

test('an inline context only adds: no keywords and no catalog or core terms redefined', () => {
  const base = `${BASE_URL}/context/transportation/v${major}.jsonld`;
  const [[attr]] = attributesOf(RoadRestriction);
  assert.match(problems({ context: [base, { '@vocab': 'https://evil.example/', ...detour.context[1] }] }).join('\n'), /must not set @vocab/);
  assert.match(problems({ context: [base, { [attr]: 'https://evil.example/x', ...detour.context[1] }] }).join('\n'), new RegExp(`must not redefine ${attr}`));
  assert.match(problems({ context: [base, { location: 'https://evil.example/x', ...detour.context[1] }] }).join('\n'), /must not redefine location/);
});

test('character references, extra URLs in an inline context, impossible dates and JSON-LD order are caught', () => {
  assert.match(problems({ organization: { ja: '&#123;&#123; 1 + 1 &#125;&#125;', en: 'Wakayama' } }).join('\n'), /plain text/);
  const base = `${BASE_URL}/context/transportation/v${major}.jsonld`;
  assert.match(problems({ context: [base, 'https://user:secret@example.org/private.jsonld', detour.context[1]] }).join('\n'), /may import only the transportation context/);
  for (const since of ['2026-99', '2026-02-31', '2026-13-01']) assert.match(problems({ since }).join('\n'), /since must be a date/, since);
  for (const since of ['2026-10', '2026-02-28', '2028-02-29']) assert.deepEqual(problems({ since }), [], since);
  // The prefix comes after the term that uses it: JSON-LD does not see it there.
  const late = [base, { detour: 'pref:detour' }, { pref: 'https://www.pref.wakayama.lg.jp/ns/road/' }];
  assert.match(problems({ context: late }).join('\n'), /does not define it as/);
});

test('an ampersand in reported text shows as written', () => {
  const amp = { ...detour, organization: { ja: '和歌山県 R&D', en: 'Wakayama R&D' } };
  assert.match(renderModelPage('en', '/en', subjects, transportation, { ...RoadRestriction, extensions: [amp] }), /Wakayama R&amp;D/);
});
