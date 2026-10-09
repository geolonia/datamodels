// Content negotiation for the catalog's IRIs (/ns/<subject>/ and
// /ns/<subject>/<Term>, #196). wrangler.jsonc runs this script for /ns/* only;
// every other path is served as static assets without it.
//
// A browser gets what it got before: the 302 from _redirects to the
// documentation page. A client that prefers JSON-LD gets a 303 See Other to
// the subject's vocabulary (/vocab/<subject>/v<major>.jsonld), which defines
// every type and attribute IRI of the subject. 303 is what W3C recommends for
// an IRI that names a thing rather than a document
// (https://www.w3.org/TR/cooluris/). Only IRIs the catalog knows are answered
// that way: an unknown /ns/ path stays a 404.

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

// The major version of each subject, from catalog.json (read once per isolate).
let majors = null;
async function subjectMajor(env, request, subject) {
  majors ??= env.ASSETS.fetch(new URL('/catalog.json', request.url))
    .then((r) => (r.ok ? r.json() : { models: [] }))
    .then((catalog) => new Map((catalog.models ?? []).map((m) => [m.subject, String(m.version ?? '').split('.')[0]])))
    .catch(() => { majors = null; return new Map(); });
  return (await majors).get(subject) || null;
}

export default {
  async fetch(request, env) {
    const res = await env.ASSETS.fetch(request);
    const subject = /^\/ns\/([a-z0-9-]+)\//.exec(new URL(request.url).pathname)?.[1];
    const known = res.status >= 300 && res.status < 400;
    if (subject && known && prefersJsonLd(request.headers.get('accept'))) {
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
  },
};
