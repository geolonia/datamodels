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
import { prefersJsonLd, subjectMajor } from './negotiate.mjs';

// Only the handler is exported: the Workers runtime reads every named export of
// this module as an entrypoint (#348). The helpers are in negotiate.mjs.

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
              'x-content-type-options': 'nosniff',
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
