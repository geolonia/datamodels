// Starts the Worker in the local Workers runtime (wrangler dev) and asks it two
// questions: a JSON-LD client's request to a term IRI (/ns/*) and an MCP
// tools/list (/mcp). The unit tests import worker/index.mjs in Node, and the
// dry-run deploy only bundles it, so neither starts workerd: a main module that
// workerd refuses (a named export that is not a function or handler, #348)
// passed both. Run after the build (dist/ must exist).
//
//   node scripts/check-worker-start.mjs [port]
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';

const port = Number(process.argv[2] ?? 8799);
const base = `http://127.0.0.1:${port}`;
const STARTUP_MS = 60_000;
// Whatever happens, the check ends.
setTimeout(() => { console.error('check-worker-start: no result within 120 s'); try { process.kill(-wrangler.pid, 'SIGKILL'); } catch {} process.exit(1); }, 120_000).unref();

// wrangler itself, in a process group of its own, so that stopping the group also
// stops the workerd it starts (through pnpm or npx, a kill would reach only the wrapper).
const bin = join(import.meta.dirname, '..', 'node_modules', '.bin', 'wrangler');
const wrangler = spawn(bin, ['dev', '--ip', '127.0.0.1', '--port', String(port), '--show-interactive-dev-session=false', '--log-level', 'warn'], {
  stdio: ['ignore', 'pipe', 'pipe'],
  detached: true,
  env: { ...process.env, CI: 'true', WRANGLER_SEND_METRICS: 'false' },
});
let output = '';
for (const stream of [wrangler.stdout, wrangler.stderr]) stream.on('data', (d) => { output += d; });
let exited = null;
wrangler.on('exit', (code) => { exited = code ?? 'signal'; });

const failures = [];
try {
  // Wait until the Worker answers, or wrangler stops (the runtime refused the module).
  const deadline = Date.now() + STARTUP_MS;
  let up = false;
  while (!up && exited === null && Date.now() < deadline) {
    try { await fetch(`${base}/`, { signal: AbortSignal.timeout(2000) }); up = true; } catch { await sleep(500); }
  }
  if (!up) throw new Error(exited !== null ? `wrangler dev stopped (${exited}) before the Worker answered` : `the Worker did not answer within ${STARTUP_MS / 1000} s`);

  const iri = await fetch(`${base}/ns/task/Task`, { redirect: 'manual', headers: { accept: 'application/ld+json' } });
  const location = iri.headers.get('location') ?? '';
  if (iri.status !== 303 || !/^\/vocab\/task\/v\d+\.jsonld$/.test(location)) failures.push(`/ns/task/Task (JSON-LD): ${iri.status} ${location}, expected 303 to /vocab/task/v<major>.jsonld`);

  const mcp = await fetch(`${base}/mcp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
  });
  const text = await mcp.text();
  let tools = [];
  try { tools = (JSON.parse(text).result?.tools ?? []).map((t) => t.name); } catch { /* reported below */ }
  if (mcp.status !== 200 || !tools.includes('validate')) failures.push(`/mcp tools/list: ${mcp.status}, tools ${tools.join(', ') || text.slice(0, 200)}`);
} catch (e) {
  failures.push(e.message);
} finally {
  try { process.kill(-wrangler.pid, 'SIGTERM'); } catch { /* already gone */ }
  wrangler.stdout.destroy();
  wrangler.stderr.destroy();
}

if (failures.length) {
  console.error(`The Worker does not start or answer in the local Workers runtime:\n- ${failures.join('\n- ')}\n\nwrangler output:\n${output.trim().slice(-3000)}`);
  process.exit(1);
}
console.log(`Worker started in the local runtime: /ns/* answers JSON-LD clients with a 303, /mcp lists its tools.`);
