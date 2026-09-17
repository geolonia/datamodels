// Build the published tree in dist/.
//
//   0. validate models/ (scripts/validate-models.mjs); abort on any failure
//   1. generate the VitePress pages for every subject and model into site/
//   2. vitepress build site  ->  dist/   (pages, search index, assets, 404)
//   3. copy public/ on top    (_headers, _redirects header)
//   4. publish the machine files from models/ (contexts, schemas, examples,
//      GeonicDB bodies, catalog.json) and append the generated redirects and
//      immutable-cache header rules
//
// A versioned file that has been published must never be rewritten with
// different content. That check runs after this script (check-immutability).
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { build as vitepressBuild } from 'vitepress';
import { loadSubjects } from './lib/models.mjs';
import { generateSitePages } from './lib/site.mjs';
import { publishModels } from './lib/publish.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const site = join(root, 'site');
const src = join(root, 'public');
const out = join(root, 'dist');

// Validate before anything is published: a model with a missing example or an
// attribute that does not expand must never reach dist/, whichever script
// called the build. The loader itself stays permissive so the validator can
// report the problem instead of a stack trace.
const validation = spawnSync(process.execPath, [join(root, 'scripts', 'validate-models.mjs')], { stdio: 'inherit' });
if (validation.status !== 0) process.exit(validation.status ?? 1);

const subjects = await loadSubjects();
await generateSitePages(subjects);

await rm(out, { recursive: true, force: true });
await vitepressBuild(site, { outDir: out });

await cp(src, out, { recursive: true });
const published = await publishModels(subjects);

// The hosting contract depends on these files being served. Fail loudly
// rather than deploy a tree without them.
for (const required of ['_headers', '_redirects', 'index.html', '404.html', 'en/index.html', 'models/index.html', 'catalog.json']) {
  await access(join(out, required));
}
console.log(`built ${out}: ${published.subjects} subject(s), ${published.models} model(s)`);
