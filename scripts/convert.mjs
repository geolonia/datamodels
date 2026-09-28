// Convert a published list (CSV) into entities of a catalog model, using the
// model's mapping file, and validate every entity against the model's schema.
//
//   npm run convert -- disaster/EvacuationSite jichitai-opendata-site 092011_evacuation_space.csv
//   npm run convert -- disaster/EvacuationSite gsi-emergency-site 13101_2.csv --set localGovernmentCode=13101
//
// Options: --set attribute=value (for what the list does not carry, such as
// GSI's municipality from the file name), --normalized (NGSI-LD normalized
// form instead of key-values), --out file.json (default: standard output).
// A summary (encoding, repairs, invalid rows) goes to standard error; the exit
// code is 1 when a row is invalid.
import { readFile, writeFile } from 'node:fs/promises';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { loadSubjects, subjectUrls, CORE_CONTEXT_URL } from './lib/models.mjs';
import { decodeCsv, parseCsv, convertRows } from './lib/convert.mjs';
import { toNormalized } from './lib/ngsi.mjs';

const args = process.argv.slice(2);
const usage = (msg) => { console.error(`${msg}\nusage: npm run convert -- <subject>/<Type> <mapping> <file.csv> [--set attr=value] [--normalized] [--out file.json]`); process.exit(2); };
// An option's operand: present and not another option.
const operand = (name, i) => { const v = args[i + 1]; if (v === undefined || v.startsWith('-')) usage(`${name} needs a value`); args.splice(i, 2); return v; };
const flag = (name) => { const i = args.indexOf(name); return i === -1 ? undefined : operand(name, i); };
const sets = []; for (let i = args.indexOf('--set'); i !== -1; i = args.indexOf('--set')) sets.push(operand('--set', i));
const out = flag('--out');
const normalized = args.includes('--normalized') && args.splice(args.indexOf('--normalized'), 1);
const [target, mappingName, file] = args;
if (sets.some((kv) => kv.indexOf('=') < 1)) usage('--set needs attribute=value');
if (!target || !mappingName || !file) usage('missing arguments');

const subjects = await loadSubjects();
const [subjectName, type] = target.split('/');
const subject = subjects.find((s) => s.name === subjectName);
const model = subject?.models.find((m) => m.type === type);
if (!model) { console.error(`no model ${target}`); process.exit(2); }
const mapping = model.mappings.find((m) => m.name === mappingName);
if (!mapping) { console.error(`${target} has no mapping ${mappingName} (has: ${model.mappings.map((m) => m.name).join(', ')})`); process.exit(2); }
const mappings = Object.fromEntries(subjects.flatMap((s) => s.models.flatMap((m) => m.mappings.map((map) => [`${s.name}/${m.type}/${map.name}`, map]))));
const set = Object.fromEntries(sets.map((kv) => { const i = kv.indexOf('='); return [kv.slice(0, i), kv.slice(i + 1)]; }));
// A name the mapping converts nothing into would be ignored without a word.
const settable = Object.keys(mapping.fields ?? {}).filter((k) => mapping.fields[k]?.via === undefined && mapping.fields[k]?.value === undefined);
const unknown = Object.keys(set).filter((k) => !settable.includes(k));
if (unknown.length) usage(`--set ${unknown.join(', ')}: not a field that ${mappingName} fills (${settable.join(', ')})`);

let text, encoding, rows;
try { ({ text, encoding } = decodeCsv(await readFile(file))); rows = parseCsv(text); } catch (e) { console.error(`${file}: ${e.message}`); process.exit(1); }
const results = convertRows(rows, mapping, { type, mappings, set });

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats(ajv);
for (const s of subjects) for (const m of s.models) if (m.kind === 'value') ajv.addSchema(m.schema, m.schema.$id);
const validate = ajv.compile(model.schema);
const invalid = [];
const invalidIndex = new Set();
const repairs = new Map();
for (const [i, r] of results.entries()) {
  for (const f of r.fixes) { const k = `${f.field}: ${f.repair}`; const e = repairs.get(k) ?? { n: 0, example: f.detail }; e.n++; repairs.set(k, e); }
  if (r.problems.length || !validate(r.entity)) { invalidIndex.add(i); invalid.push({ row: i + 2, problems: [...r.problems, ...(r.problems.length ? [] : [ajv.errorsText(validate.errors)])] }); }
}
const context = [subjectUrls(subject).contextAlias, CORE_CONTEXT_URL];
const entities = results.filter((_, i) => !invalidIndex.has(i)).map((r) => (normalized ? toNormalized(r.entity, model.schema, context) : r.entity));
const json = `${JSON.stringify(entities, null, 2)}\n`;
if (out) await writeFile(out, json); else process.stdout.write(json);

console.error(`${file}: ${encoding}, ${rows.length} row(s), ${entities.length} valid ${type}, ${invalid.length} invalid`);
for (const [k, e] of repairs) console.error(`  repaired ${e.n}×: ${k} (e.g. ${e.example})`);
for (const x of invalid.slice(0, 20)) console.error(`  row ${x.row}: ${x.problems.join('; ')}`);
if (invalid.length > 20) console.error(`  … ${invalid.length - 20} more`);
process.exit(invalid.length ? 1 : 0);
