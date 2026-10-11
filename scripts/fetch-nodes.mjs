// npm run nodes: read the catalog.json of every node in nodes.yaml into
// nodes.snapshot.json, keeping only what the pages show. A node that does not
// answer keeps its previous entry, so a short outage never removes it. Commit the
// result in a pull request: the diff is what datamodels.jp will show.
import { writeFile } from 'node:fs/promises';
import { readNodeList, readSnapshot, nodeEntry, SNAPSHOT_FILE } from './lib/nodes.mjs';

const TIMEOUT = 15000;
const previous = new Map((await readSnapshot()).nodes.map((n) => [n.index, n]));
const nodes = [];
let failed = 0;
for (const node of await readNodeList()) {
  try {
    const res = await fetch(node.index, { signal: AbortSignal.timeout(TIMEOUT), headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const entry = nodeEntry(node, await res.json(), new Date().toISOString().slice(0, 10));
    nodes.push(entry);
    console.error(`${node.index}: ${entry.models.length} model(s)`);
  } catch (e) {
    failed++;
    const old = previous.get(node.index);
    if (old) nodes.push(old);
    console.error(`${node.index}: not read (${e.cause?.code ?? e.message})${old ? `; kept the entry of ${old.fetchedAt}` : '; left out'}`);
  }
}
await writeFile(SNAPSHOT_FILE, `${JSON.stringify({ nodes }, null, 2)}\n`);
console.error(`${SNAPSHOT_FILE}: ${nodes.length} node(s)${failed ? `, ${failed} not read` : ''}`);
