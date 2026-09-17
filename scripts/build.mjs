// Build the published tree in dist/.
//
// public/ is copied verbatim, then models/ is published on top (see lib/publish.mjs).
// Whatever is added: a versioned file that already exists in dist/ history
// must never be rewritten with different content. That check lives in CI.
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { publishModels } from './lib/publish.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'public');
const out = join(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, { recursive: true });

// Versioned contexts, schemas, examples, GeonicDB model bodies, catalog.json,
// documentation pages and the /ns IRI redirects, from models/.
const published = await publishModels();

// The hosting contract depends on these two files being served. Fail loudly
// rather than deploy a tree without them.
for (const required of ['_headers', 'index.html', '404.html']) {
  await access(join(out, required));
}
console.log(`built ${out}: ${published.subjects} subject(s), ${published.models} model(s)`);
