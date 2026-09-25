// Write GeonicDB Custom Data Model bodies for one subject, adapted to a tenant.
//
//   node adapters/geonicdb/export.mjs transportation --out ./out
//   node adapters/geonicdb/export.mjs transportation --type RoadRestriction --allow-additional --out ./out
//   node adapters/geonicdb/export.mjs transportation --type-prefix Acme --alias-context --out ./out
//   node adapters/geonicdb/export.mjs transportation --extend ./my-extensions.json --out ./out
//
//   --type T           only this model
//   --type-prefix P    tenant-specific type names (AcmeRoadRestriction), catalog vocabulary unchanged
//   --alias-context    declare the vN.jsonld alias instead of the exact version
//   --allow-additional additionalProperties: true (unknown attributes accepted, not validated)
//   --type-name N      replace the type name (needs --type); an alias for the same IRI
//   --rename a=b,c=d   attribute aliases (needs --type); the contextUrl must map them
//   --context-url URL  declare this context instead of the catalog's
//   --extend FILE      JSON keyed by type: { "RoadRestriction": { "contextUrl": "...",
//                      "propertyDetails": { "patrolRoute": { "ngsiType": "Property",
//                      "valueType": "string", "example": "A-3" } } } }
//                      The contextUrl should import the catalog context and define the added terms.
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, subjectUrls } from '../../scripts/lib/models.mjs';
import { toCustomDataModel } from './custom-data-model.mjs';

const args = process.argv.slice(2);
const subjectName = args.find((a) => !a.startsWith('--') && !args[args.indexOf(a) - 1]?.startsWith('--'));
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const typePrefix = opt('--type-prefix') ?? '';
const onlyType = opt('--type');
const out = opt('--out') ?? 'out';
const aliasContext = args.includes('--alias-context');
const allowAdditional = args.includes('--allow-additional');
const extendFile = opt('--extend');
const typeName = opt('--type-name');
const contextUrlOverride = opt('--context-url');
const renameArg = opt('--rename');
const rename = Object.fromEntries((renameArg ? renameArg.split(',') : []).map((pair) => {
  const [from, to] = pair.split('=');
  if (!from || !to) { console.error(`--rename: expected a=b, got "${pair}"`); process.exit(2); }
  return [from.trim(), to.trim()];
}));
if ((typeName || renameArg) && !onlyType) { console.error('--type-name and --rename apply to one model; add --type T'); process.exit(2); }
if ((typeName || renameArg) && !contextUrlOverride && !extendFile) console.error('warning: aliases need a context that maps them; pass --context-url (the body still declares the catalog context)');
if (!subjectName) { console.error('usage: node adapters/geonicdb/export.mjs <subject> [--type T] [--type-prefix P] [--alias-context] [--allow-additional] [--extend FILE] [--out DIR]'); process.exit(2); }

const subject = (await loadSubjects()).find((s) => s.name === subjectName);
if (!subject) { console.error(`unknown subject "${subjectName}"`); process.exit(2); }
const extensions = extendFile ? JSON.parse(await readFile(extendFile, 'utf8')) : {};
const urls = subjectUrls(subject);
const models = subject.models.filter((m) => m.kind === 'entity' && (!onlyType || m.type === onlyType));
if (onlyType && models.length === 0) { console.error(`no entity model "${onlyType}" in subject "${subjectName}"`); process.exit(2); }
// Every extension key must name a model this run will emit: an unknown type,
// a value type (no GeonicDB body) or a type excluded by --type would otherwise
// be dropped silently.
for (const t of Object.keys(extensions)) {
  if (!models.some((m) => m.type === t)) {
    const known = subject.models.find((m) => m.type === t);
    const why = !known ? `not a model of subject "${subjectName}"` : known.kind === 'value' ? 'a value type, which has no GeonicDB body' : `excluded by --type ${onlyType}`;
    console.error(`--extend: "${t}" is ${why}`); process.exit(2);
  }
}
await mkdir(out, { recursive: true });
for (const model of models) {
  const body = toCustomDataModel(subject, model, {
    typePrefix,
    contextUrl: contextUrlOverride ?? (aliasContext ? urls.contextAlias : urls.contextExact),
    allowAdditional,
    extend: extensions[model.type],
    typeName,
    rename,
  });
  const file = join(out, `${body.type}.json`);
  await writeFile(file, JSON.stringify(body, null, 2) + '\n');
  console.log(file);
}
