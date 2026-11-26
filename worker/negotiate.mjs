// Content negotiation for the IRI Worker (worker/index.mjs, #196): which
// clients prefer JSON-LD, and the current major version of each subject.
// Kept out of the Worker's main module, whose named exports the Workers runtime
// reads as entrypoints: only functions, classes and handlers may be exported
// there, and a number such as MAJORS_TTL_MS stops the runtime (#348).

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

/** The major version of `subject`, or null when it is not known or catalog.json could not be read. */
export async function subjectMajor(env, request, subject) {
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
