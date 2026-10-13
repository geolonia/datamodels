// Validate every subject and model in models/. Runs in the build and in CI.
//
//   1. the toolkit's check of the node (`datamodels check --offline`, #226):
//      schemas and examples, the normalized form and its JSON-LD round trip,
//      the @contexts and the x-iri of every attribute, the vocabularies,
//      mapping files, aliases and subclasses, catalog.yaml and notes.yaml
//   2. the catalog's own rules (scripts/lib/catalog-rules.mjs): ADOPTERS.yaml,
//      TODO markers, both example files, x-version and x-ngsi.type stated,
//      no product-specific keys, known namespaces for x-subclass-of, extensions
//
// Offline: the build does not depend on other sites. The published files are
// compared online by the immutability check.
import { mkdtemp, copyFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkNode } from '@geolonia/datamodels/build';
import { loadSubjects, ROOT, MODELS_DIR } from './lib/models.mjs';
import { catalogRuleProblems } from './lib/catalog-rules.mjs';
import { reportFailures } from './lib/ci-summary.mjs';

// The node is the repository: node.yaml and models/. The tests point MODELS_DIR at a changed copy of models/.
let nodeDir = ROOT;
let temp;
if (MODELS_DIR !== join(ROOT, 'models')) {
  temp = await mkdtemp(join(tmpdir(), 'datamodels-node-'));
  await copyFile(join(ROOT, 'node.yaml'), join(temp, 'node.yaml'));
  await symlink(MODELS_DIR, join(temp, 'models'), 'dir');
  nodeDir = temp;
}

const failures = [];
try {
  const { problems } = await checkNode(nodeDir, { offline: true });
  failures.push(...problems);
  // The catalog's rules need the models; a node the toolkit cannot load is already one problem above.
  let subjects;
  try { subjects = await loadSubjects(); } catch (e) { if (!problems.length) failures.push(e.message); }
  if (subjects) failures.push(...(await catalogRuleProblems(subjects)));
} finally {
  if (temp) await rm(temp, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`Model validation failed (${failures.length}):`);
  for (const f of failures) console.error(`  ${f}`);
  await reportFailures('Model validation failed', failures, 'Run `npm run validate:models` locally to see the same list. The rules are in the guide: https://datamodels.jp/en/guide/rules');
  process.exit(1);
}
const subjects = await loadSubjects();
const n = subjects.reduce((a, s) => a + s.models.length, 0);
console.log(`models ok: ${subjects.length} subject(s), ${n} model(s) validated`);
