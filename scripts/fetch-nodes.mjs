// pnpm run nodes: read the catalog.json of every node in nodes.yaml into
// nodes.snapshot.json, keeping only what the pages show. A node that does not
// answer keeps its previous entry, so a short outage never removes it. Commit the
// result in a pull request: the diff is what datamodels.jp will show. For a model
// built on a catalog model, it also records the attributes it adds (compared with
// the catalog models in models/), which the catalog model's page lists. It also
// reports the nodes that the known nodes link to but nodes.yaml does not list yet.
import { writeFile, rename } from 'node:fs/promises';
import { readNodeList, readSnapshot, readJsonLimited, nodeEntry, isIndex, catalogAttributeIris, unlistedNodes, SNAPSHOT_FILE } from './lib/nodes.mjs';
import { loadSubjects } from './lib/models.mjs';

const TIMEOUT = 15000;
const catalogIris = catalogAttributeIris(await loadSubjects());
const previous = new Map((await readSnapshot()).nodes.map((n) => [n.index, n]));
const nodes = [], read = [];
let failed = 0;
const list = await readNodeList();
for (const node of list) {
  try {
    const res = await fetch(node.index, { signal: AbortSignal.timeout(TIMEOUT), headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const catalog = await readJsonLimited(res);
    if (!isIndex(catalog)) throw new Error('not a node index (no models list)');
    const entry = nodeEntry(node, catalog, new Date().toISOString().slice(0, 10), catalogIris);
    nodes.push(entry);
    read.push({ node, catalog });
    console.error(`${node.index}: ${entry.models.length} model(s)`);
  } catch (e) {
    failed++;
    const old = previous.get(node.index);
    if (old) nodes.push(old);
    console.error(`${node.index}: not read (${e.cause?.code ?? e.message})${old ? `; kept the entry of ${old.fetchedAt}` : '; left out'}`);
  }
}
// Written next to the snapshot, then renamed over it: an interrupted run never leaves half a file.
await writeFile(`${SNAPSHOT_FILE}.tmp`, `${JSON.stringify({ nodes }, null, 2)}\n`);
await rename(`${SNAPSHOT_FILE}.tmp`, SNAPSHOT_FILE);
console.error(`${SNAPSHOT_FILE}: ${nodes.length} node(s)${failed ? `, ${failed} not read` : ''}`);
// Nodes are listed only by a reviewed pull request (#219), so the new ones are reported, not added.
for (const { index, from } of unlistedNodes(list, read)) console.error(`not in nodes.yaml: ${index}, linked from ${from.join(', ')}`);
