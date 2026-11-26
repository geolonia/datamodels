// Starts the Worker in the local Workers runtime (wrangler dev) and asks it two
// questions: a JSON-LD client's request to a term IRI (/ns/*) and an MCP
// tools/list (/mcp). The unit tests import worker/index.mjs in Node, and the
// dry-run deploy only bundles it, so neither starts workerd: a main module that
// workerd refuses (a named export that is not a function or handler, #348)
// passed both. Run after the build (dist/ must exist). No Cloudflare account
// and no network are needed: wrangler dev runs locally.
//
//   node scripts/check-worker-start.mjs [port]   (default: a free port)
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const STARTUP_MS = 60_000;
const OVERALL_MS = 120_000;

/** A port nothing listens on now, so the check cannot talk to another server. */
const freePort = () => new Promise((resolve, reject) => {
  const server = createServer();
  server.on('error', reject);
  server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => resolve(port)); });
});

const port = Number(process.argv[2] ?? await freePort());
const base = `http://127.0.0.1:${port}`;

// wrangler itself, in a process group of its own, so that stopping the group also
// stops the workerd it starts (through pnpm or npx, a kill would reach only the
// wrapper). Being its own group, it does not get the terminal's Ctrl-C: the
// handlers below pass it on.
const bin = join(import.meta.dirname, '..', 'node_modules', '.bin', 'wrangler');
const wrangler = spawn(bin, ['dev', '--ip', '127.0.0.1', '--port', String(port), '--show-interactive-dev-session=false', '--log-level', 'warn'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
});
let output = '';
for (const stream of [wrangler.stdout, wrangler.stderr]) stream.on('data', (d) => { output += d; });
let exited = null;
wrangler.on('exit', (code, signal) => { exited = code ?? signal; });
wrangler.on('error', (e) => { exited = e.code ?? 'error'; output += `${e.message}\n`; });

const signalGroup = (signal) => { try { process.kill(-wrangler.pid, signal); } catch { /* already gone */ } };
/** Stops wrangler and its workerd: SIGTERM, then SIGKILL if the group is still there after 5 s. */
async function stop() {
  if (exited !== null) return;
  signalGroup('SIGTERM');
  for (let waited = 0; exited === null && waited < 5000; waited += 100) await sleep(100);
  if (exited === null) signalGroup('SIGKILL');
  wrangler.stdout.destroy();
  wrangler.stderr.destroy();
}
// Interrupted (Ctrl-C, a cancelled job) or out of time: the group goes too.
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { signalGroup('SIGKILL'); process.exit(130); });
process.on('exit', () => { if (exited === null) signalGroup('SIGKILL'); });
setTimeout(() => { console.error(`check-worker-start: no result within ${OVERALL_MS / 1000} s`); process.exit(1); }, OVERALL_MS).unref();

const failures = [];
try {
  // Wait until the Worker answers, or wrangler stops (the runtime refused the module).
  const deadline = Date.now() + STARTUP_MS;
  let up = false;
  while (!up && exited === null && Date.now() < deadline) {
    try { await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) }); up = true; } catch { await sleep(500); }
  }
  if (!up) throw new Error(exited !== null ? `wrangler dev stopped (${exited}) before the Worker answered` : `the Worker did not answer within ${STARTUP_MS / 1000} s`);

  const iri = await fetch(`${base}/ns/task/Task`, { redirect: 'manual', headers: { accept: 'application/ld+json' }, signal: AbortSignal.timeout(15_000) });
  const location = iri.headers.get('location') ?? '';
  if (iri.status !== 303 || !/^\/vocab\/task\/v\d+\.jsonld$/.test(location)) failures.push(`/ns/task/Task (JSON-LD): ${iri.status} ${location}, expected 303 to /vocab/task/v<major>.jsonld`);

  const mcp = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
    signal: AbortSignal.timeout(15_000),
  });
  const text = await mcp.text();
  let tools = [];
  try { tools = (JSON.parse(text).result?.tools ?? []).map((t) => t.name); } catch { /* reported below */ }
  if (mcp.status !== 200 || !tools.includes('validate')) failures.push(`/mcp tools/list: ${mcp.status}, tools ${tools.join(', ') || text.slice(0, 200)}`);
} catch (e) {
  failures.push(e.message);
} finally {
  await stop();
}

if (failures.length) {
  console.error(`The Worker does not start or answer in the local Workers runtime:\n- ${failures.join('\n- ')}\n\nwrangler output:\n${output.trim().slice(-3000)}`);
  process.exit(1);
}
console.log('Worker started in the local runtime: /ns/* answers JSON-LD clients with a 303, /mcp lists its tools.');
