// Write GeonicDB Custom Data Model bodies for one subject, optionally with a
// tenant-specific type prefix (for example `Saitai`), so an existing apply
// pipeline can keep its type names while using the catalog vocabulary.
//
//   node scripts/export-geonicdb.mjs disaster --out ./out
//   node scripts/export-geonicdb.mjs disaster --type-prefix Saitai --alias-context --out ./out
//
// --alias-context uses the vN.jsonld alias instead of the exact version.
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadSubjects, subjectUrls } from './lib/models.mjs';
import { toCustomDataModel } from './lib/geonicdb.mjs';

const args = process.argv.slice(2);
const subjectName = args.find((a) => !a.startsWith('--'));
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const typePrefix = opt('--type-prefix') ?? '';
const out = opt('--out') ?? 'out';
const aliasContext = args.includes('--alias-context');
if (!subjectName) { console.error('usage: export-geonicdb.mjs <subject> [--type-prefix P] [--alias-context] [--out DIR]'); process.exit(2); }

const subject = (await loadSubjects()).find((s) => s.name === subjectName);
if (!subject) { console.error(`unknown subject "${subjectName}"`); process.exit(2); }
const urls = subjectUrls(subject);
await mkdir(out, { recursive: true });
for (const model of subject.models) {
  const body = toCustomDataModel(subject, model, { typePrefix, contextUrl: aliasContext ? urls.contextAlias : urls.contextExact });
  const file = join(out, `${body.type}.json`);
  await writeFile(file, JSON.stringify(body, null, 2) + '\n');
  console.log(file);
}
