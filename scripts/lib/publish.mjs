// Write the machine-readable tree for every subject into dist/ (pages come
// from VitePress, see build.mjs).
import { mkdir, writeFile, readFile, appendFile } from 'node:fs/promises';
import { join } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { loadSubjects, attributesOf, subjectUrls, modelUrls, DIST, ROOT, BASE_URL } from './models.mjs';
import { toCustomDataModel } from './geonicdb.mjs';
import { listReleases } from './releases.mjs';
import { sharedTerms } from './shared-terms.mjs';

const rel = (url) => url.slice(BASE_URL.length).replace(/^\//, '');
async function write(url, content) {
  const file = join(DIST, rel(url).endsWith('/') ? rel(url) + 'index.html' : rel(url));
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, content);
}
const json = (o) => JSON.stringify(o, null, 2) + '\n';

export async function publishModels(subjects) {
  const catalog = { formatVersion: 1, generatedAt: new Date().toISOString(), models: [] };
  const redirects = ['', '# Generated: type and attribute IRIs resolve to their documentation.'];
  const headers = ['', '# Generated: exact versions are immutable. `! Cache-Control` detaches the short cache inherited from the glob rule above.'];
  const immutableDone = new Set();
  const immutable = (url) => { if (immutableDone.has(url)) return; immutableDone.add(url); headers.push(rel(url).replace(/^/, '/'), '  ! Cache-Control', '  Cache-Control: public, max-age=31536000, immutable'); };

  for (const subject of subjects) {
    const u = subjectUrls(subject);
    // Every published version first, then the current one on top (identical
    // bytes when it has been snapshotted; the immutability check confirms).
    for (const release of await listReleases(subject)) {
      for (const f of release.files) { await write(f.url, await readFile(f.path)); immutable(f.url); }
    }
    await write(u.contextExact, json(subject.context)); immutable(u.contextExact);
    await write(u.contextAlias, json(subject.context));
    const shared = sharedTerms(subject);
    for (const [name] of shared) redirects.push(`/ns/${subject.name}/${name}  /models/${subject.name}/#${name}  302`);

    for (const model of subject.models) {
      const mu = modelUrls(subject, model);
      await write(mu.schemaExact, json(model.schema)); immutable(mu.schemaExact);
      await write(mu.schemaAlias, json(model.schema));
      for (const [f, content] of Object.entries(model.examples)) await write(`${mu.examples}${f}`, json(content));
      if (model.kind === 'entity') await write(mu.geonicdb, json(toCustomDataModel(subject, model)));
      redirects.push(`/ns/${subject.name}/${model.type}  /models/${subject.name}/${model.type}/  302`);
      for (const [name] of attributesOf(model)) if (!shared.has(name) && !(name in {})) {
        const iri = model.schema.properties[name]['x-iri'] ?? '';
        if (iri.startsWith(u.namespace)) redirects.push(`/ns/${subject.name}/${name}  /models/${subject.name}/${model.type}/#${name}  302`);
      }
      catalog.models.push({
        type: model.type, kind: model.kind, typeIri: mu.typeIri, subject: subject.name, domain: subject.name, source: subject.source,
        contextUrl: u.contextExact, contextAliasUrl: u.contextAlias, schemaUrl: mu.schemaExact, version: subject.version,
        status: model.catalog.status ?? 'draft', title: model.catalog.title, description: model.catalog.description,
        sampleProperties: attributesOf(model).map(([n]) => n), pageUrl: mu.page,
        ...(model.kind === 'entity' ? { geonicdbModelUrl: mu.geonicdb } : {}),
      });
    }
  }

  const ajv = new Ajv({ allErrors: true, strict: false }); addFormats(ajv);
  const schema = JSON.parse(await readFile(join(ROOT, 'catalog.schema.json'), 'utf8'));
  const validate = ajv.compile(schema);
  if (!validate(catalog)) throw new Error(`catalog.json does not validate: ${ajv.errorsText(validate.errors)}`);
  await write(`${BASE_URL}/catalog.json`, json(catalog));
  await write(`${BASE_URL}/catalog.schema.json`, json(schema));
  await write(`${BASE_URL}/LICENSE-CONTENT`, await readFile(join(ROOT, 'LICENSE-CONTENT.md')));
  await appendFile(join(DIST, '_redirects'), redirects.join('\n') + '\n');
  await appendFile(join(DIST, '_headers'), headers.join('\n') + '\n');
  return { subjects: subjects.length, models: catalog.models.length };
}
