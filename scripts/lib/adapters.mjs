// Adapters live outside the core (adapters/README.md): the core never imports
// one by name. This finds every adapters/<name>/index.mjs and loads its default
// export, in name order, for the build and the local site (npm run site:dev).
import { readdir, access } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT } from './models.mjs';

export async function discoverAdapters(root = ROOT) {
  const dir = join(root, 'adapters');
  const adapters = [];
  const dirs = (await readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
  for (const d of dirs) {
    const entry = join(dir, d.name, 'index.mjs');
    try { await access(entry); } catch { continue; }
    adapters.push((await import(pathToFileURL(entry).href)).default);
  }
  return adapters;
}
