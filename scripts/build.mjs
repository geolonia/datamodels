// Build the published tree in dist/.
//
// Today this only copies public/ verbatim. The catalog generator (catalog.json,
// generated specs, versioned context and schema files) will be added here.
// Whatever is added: a versioned file that already exists in dist/ history
// must never be rewritten with different content. That check lives in CI.
import { cp, rm, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const src = join(root, 'public');
const out = join(root, 'dist');

await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(src, out, { recursive: true });

// The hosting contract depends on these two files being served. Fail loudly
// rather than deploy a tree without them.
for (const required of ['_headers', 'index.html', '404.html']) {
  await access(join(out, required));
}
console.log(`built ${out}`);
