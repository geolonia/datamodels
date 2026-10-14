// The catalog's own rules, on top of the toolkit's `datamodels check` (decided
// on #226, 2026-10-13): how a model gets into datamodels.jp and stays there.
// The toolkit checks what every node needs (schemas, examples, JSON-LD,
// @contexts, mapping files, aliases and subclasses); this checks what only
// this catalog asks for.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { attributesOf, resolveContextTerms, CORE_TERMS, isCatalogIri, externalParentProblem } from './models.mjs';
import { resolveContextDocument, listReleases } from './releases.mjs';
import { extensionProblems } from './extensions.mjs';

const isLink = (u) => { if (typeof u !== 'string') return false; try { const x = new URL(u); return (x.protocol === 'https:' || x.protocol === 'http:') && x.hostname !== ''; } catch { return false; } };
const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
/** The problems of the catalog's own rules, as "models/<subject>/...: <problem>" lines. */
export async function catalogRuleProblems(subjects) {
  const out = [];
  const fail = (where, msg) => out.push(`${where}: ${msg}`);
  for (const subject of subjects) {
    const where = `models/${subject.name}`;
    // A context imports catalog contexts by version, also an older major one; what that URL really serves must exist.
    let ctxTerms = {};
    try { ctxTerms = await resolveContextTerms(subject.context, subjects, resolveContextDocument); } catch (e) { fail(`${where}/context.jsonld`, e.message); }
    // The core terms are left to the broker: the catalog redefines none of them, not even with the same IRI.
    for (const term of Object.keys(subject.inlineTerms)) if (CORE_TERMS.has(term)) fail(`${where}/context.jsonld`, `redefines core context term "${term}" (protected)`);
    const published = [subject.version, ...(await listReleases(subject)).map((r) => r.version)];

    for (const model of subject.models) {
      const mwhere = `${where}/${model.type}`;
      const { schema } = model;
      // Every schema says its version, so a copied file shows where it came from (a wrong one the toolkit reports).
      if (schema['x-version'] === undefined) fail(`${mwhere}/schema.json`, `x-version must be ${subject.version} (subject version)`);
      // A value type is a term of the context too, as every entity type is.
      if (model.kind === 'value' && !ctxTerms[model.type]) fail(`${where}/context.jsonld`, `does not define type "${model.type}"`);
      // Another vocabulary's class only from the known namespaces: a typo in its IRI cannot be checked by fetching it.
      const parent = schema['x-subclass-of'];
      if (typeof parent === 'string' && !isCatalogIri(parent)) { const p = externalParentProblem(parent); if (p) fail(`${mwhere}/schema.json`, `x-subclass-of ${parent} ${p}`); }
      for (const [name, prop] of attributesOf(model)) {
        // The catalog states the NGSI-LD type of every attribute; a node may leave Property out.
        if (model.kind === 'entity' && !prop?.['x-ngsi']?.type) fail(`${mwhere}/schema.json`, `${name}: missing x-ngsi.type`);
        // Schemas are product-neutral: broker-specific hints belong in adapters/.
        for (const k of Object.keys(prop ?? {})) if (/^x-(geonicdb|orion|scorpio|stellio)/i.test(k)) fail(`${mwhere}/schema.json`, `${name}: product-specific key ${k}; move it into an adapter`);
      }

      // Both examples are part of every model the catalog publishes.
      if (!model.examples['example.json']) fail(mwhere, 'examples/example.json is required');
      if (model.kind === 'entity' && !model.examples['example-normalized.jsonld']) fail(mwhere, 'examples/example-normalized.jsonld is required');

      // `npm run new-model` leaves TODO markers; a model is not done while any remain.
      // A missing README is fine; an unreadable one must not skip the check.
      const readme = await readFile(join(model.dir, 'README.md'), 'utf8').catch((e) => { if (e.code !== 'ENOENT') fail(`${mwhere}/README.md`, `cannot be read (${e.code ?? e.message})`); return null; });
      for (const [file, value] of [['schema.json', schema], ['catalog.yaml', model.catalog], ['notes.yaml', model.notes], ['README.md', readme], ['examples/example.json', model.examples['example.json']], ['examples/example-normalized.jsonld', model.examples['example-normalized.jsonld']]]) {
        if (value != null && /\bTODO\b/.test(typeof value === 'string' ? value : JSON.stringify(value))) fail(`${mwhere}/${file}`, 'fill in the TODO markers');
      }

      // Listed extensions render on the model page and in catalog.json; the owner's IRIs, never datamodels.jp's.
      for (const ext of model.extensions ?? []) for (const msg of extensionProblems(ext, model, subject, published)) fail(`${mwhere}/extensions/${ext.name}.yaml`, msg);

      // Status and adopters (decided in #38): stable needs two independent
      // implementations, self-reported with a link and checked by a reviewer in
      // the pull request that sets it; CI checks the mechanics only.
      const status = model.catalog?.status === undefined ? 'draft' : model.catalog.status;
      const list = model.adopters?.adopters;
      // Required in every model folder (and in a proposal bundle, CONTRIBUTING); an empty list is fine for a draft.
      if (model.adopters == null) fail(`${mwhere}/ADOPTERS.yaml`, 'file is required (an empty "adopters: []" is fine for a draft)');
      else if (!isObject(model.adopters) || !Array.isArray(list)) fail(`${mwhere}/ADOPTERS.yaml`, 'root value must be a mapping with an adopters list');
      else {
        list.forEach((a, i) => {
          if (!a || typeof a !== 'object' || typeof a.name !== 'string' || !a.name.trim() || typeof a.organization !== 'string' || !a.organization.trim()) fail(`${mwhere}/ADOPTERS.yaml`, `entry ${i + 1}: needs name and organization`);
          else if (a.url !== undefined && !isLink(a.url)) fail(`${mwhere}/ADOPTERS.yaml`, `entry ${i + 1}: url must be an http(s) URL with a host, got ${JSON.stringify(a.url)}`);
        });
        if (status === 'stable') {
          const orgs = new Set(list.filter((a) => a && typeof a.organization === 'string' && isLink(a.url)).map((a) => a.organization.trim().toLowerCase().replace(/\s+/g, ' ')));
          if (orgs.size < 2) fail(`${mwhere}/ADOPTERS.yaml`, `status stable needs two implementations from different organisations, each with a url; found ${orgs.size}`);
        }
      }
    }
  }
  return out;
}
