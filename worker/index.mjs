// Two jobs, the only paths that run this script (wrangler.jsonc, run_worker_first):
//   /mcp   the MCP server for AI agents (worker/mcp.mjs, #223)
//   /ns/*  content negotiation, below
//
// Content negotiation for the catalog's IRIs (/ns/<subject>/ and
// /ns/<subject>/<Term>, #196). Every path other than /ns/* and /mcp is served
// as static assets without this script.
//
// A browser gets what it got before: the 302 from _redirects to the
// documentation page. A client that prefers JSON-LD gets a 303 See Other to
// the subject's vocabulary (/vocab/<subject>/v<major>.jsonld), which defines
// every type and attribute IRI of the subject. 303 is what W3C recommends for
// an IRI that names a thing rather than a document
// (https://www.w3.org/TR/cooluris/). Only IRIs the catalog knows are answered
// that way: an unknown /ns/ path stays a 404.
import { handleMcp, MCP_PATH } from './mcp.mjs';

/** The quality (0 to 1) the Accept header gives each media type; a wildcard is not counted. */
function qualities(accept) {
  const out = new Map();
  for (const part of String(accept ?? '').split(',')) {
    const [type, ...params] = part.trim().toLowerCase().split(';');
    if (!type || type.includes('*')) continue;
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    const value = q ? Number(q.slice(2)) : 1;
    out.set(type, Math.max(out.get(type) ?? 0, Number.isFinite(value) ? value : 0));
  }
  return out;
}

/** True when the client ranks JSON-LD (or plain JSON) above HTML; a tie goes to the page. */
export function prefersJsonLd(accept) {
  const q = qualities(accept);
  const json = Math.max(q.get('application/ld+json') ?? 0, q.get('application/json') ?? 0);
  const html = Math.max(q.get('text/html') ?? 0, q.get('application/xhtml+xml') ?? 0);
  return json > 0 && json > html;
}

// The major version of each subject, from catalog.json. An isolate keeps them
// for five minutes, and caches keep a 303 for five more (max-age=300 below), so
// a new major version reaches JSON-LD clients within about ten minutes (#298).
// A failed read is not kept: that request gets the static answer, and the next
// one reads again.
export const MAJORS_TTL_MS = 5 * 60 * 1000;
let majors = null; // { at, map: Promise<Map<subject, major> | null> }, null when the read failed
/** Forgets the cached majors (tests). */
export function resetMajors() { majors = null; }
/** The current entry: the cached one while it is younger than five minutes, else a new read. */
function majorsEntry(env, request) {
  const now = Date.now();
  if (!majors || now - majors.at >= MAJORS_TTL_MS) {
    const entry = { at: now, map: null };
    entry.map = env.ASSETS.fetch(new URL('/catalog.json', request.url))
      .then((r) => { if (!r.ok) throw new Error(`catalog.json: ${r.status}`); return r.json(); })
      .then((catalog) => new Map((catalog.models ?? []).map((m) => [m.subject, String(m.version ?? '').split('.')[0]])))
      .catch(() => { if (majors === entry) majors = null; return null; });
    majors = entry;
  }
  return majors;
}

async function subjectMajor(env, request, subject) {
  const entry = majorsEntry(env, request);
  let map = await entry.map;
  // A failed read gives the static answer, even if a newer read is pending.
  if (!map) return null;
  // A read that outlived its five minutes (or was replaced meanwhile) is not
  // answered from: the request waits for the current read instead, once.
  const outdated = majors === entry ? Date.now() - entry.at >= MAJORS_TTL_MS : majors !== null;
  if (outdated) map = await majorsEntry(env, request).map;
  return map?.get(subject) || null;
}

export default {
  async fetch(request, env) {
    let path = null;
    try { path = new URL(request.url).pathname; } catch { /* the assets answer it, as before */ }
    if (path === MCP_PATH) return handleMcp(request, env);
    const res = await env.ASSETS.fetch(request);
    // Any error below falls back to the static answer, so the IRIs are never
    // worse off than without this script.
    try {
      const subject = /^\/ns\/([a-z0-9-]+)\//.exec(new URL(request.url).pathname)?.[1];
      const known = res.status >= 300 && res.status < 400;
      // Only reads are negotiated; a preflight or a POST gets the static answer.
      const read = request.method === 'GET' || request.method === 'HEAD';
      if (subject && known && read && prefersJsonLd(request.headers.get('accept'))) {
        const major = await subjectMajor(env, request, subject);
        if (major) {
          return new Response(null, {
            status: 303,
            headers: {
              location: `/vocab/${subject}/v${major}.jsonld`,
              vary: 'Accept',
              'access-control-allow-origin': '*',
              'cache-control': 'public, max-age=300',
            },
          });
        }
      }
      // Same answer as before, marked as depending on Accept for caches.
      const out = new Response(res.body, res);
      out.headers.append('vary', 'Accept');
      return out;
    } catch {
      return res;
    }
  },
};
