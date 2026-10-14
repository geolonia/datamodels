// The rate limit of /mcp: the MCP_LIMITER binding in wrangler.jsonc (production
// and previews). There is no login, so the client's address is the only key.

/** Requests a minute per key: "limit" of MCP_LIMITER in wrangler.jsonc, named in the 429 answer. */
export const RATE_LIMIT = 100;

/** The eight 16-bit groups of an IPv6 address, or null. Accepts "::" and a dotted IPv4 tail. */
function hextets(address) {
  let s = address.split('%')[0].toLowerCase();
  const dotted = /(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s);
  if (dotted) {
    const b = dotted.slice(1).map(Number);
    if (b.some((x) => x > 255)) return null;
    s = `${s.slice(0, dotted.index)}${((b[0] << 8) | b[1]).toString(16)}:${((b[2] << 8) | b[3]).toString(16)}`;
  }
  const halves = s.split('::');
  if (halves.length > 2) return null;
  const parse = (part) => (part ? part.split(':') : []);
  const head = parse(halves[0]); const tail = parse(halves[1]);
  const missing = 8 - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return null;
  const groups = [...head, ...Array(halves.length === 2 ? missing : 0).fill('0'), ...tail];
  if (!groups.every((g) => /^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => parseInt(g, 16));
}

/**
 * The key an address is counted under: an IPv4 address as it is; an IPv6
 * address by its /64 prefix, the block one customer usually gets, so a client
 * cannot get new limits by changing the rest of its address; an IPv4-mapped
 * IPv6 address (::ffff:1.2.3.4) as the IPv4 address. No address: "unknown".
 */
export function limiterKey(address) {
  const a = String(address ?? '').trim();
  if (!a) return 'unknown';
  if (!a.includes(':')) return a;
  const h = hextets(a);
  if (!h) return a.toLowerCase();
  if (h.slice(0, 5).every((x) => x === 0) && h[5] === 0xffff) return [h[6] >> 8, h[6] & 255, h[7] >> 8, h[7] & 255].join('.');
  return `${h.slice(0, 4).map((x) => x.toString(16)).join(':')}::/64`;
}

/**
 * Whether a request may be served. Cloudflare counts per location and
 * approximately; 100 a minute leaves room for an office behind one address,
 * while a loop is stopped. No binding (the tests; wrangler dev simulates it):
 * no limit. A failing limiter lets the request through, as the data is public
 * and the tools only read.
 */
export async function allowed(request, env) {
  if (!env.MCP_LIMITER) return true;
  try {
    const { success } = await env.MCP_LIMITER.limit({ key: limiterKey(request.headers.get('cf-connecting-ip')) });
    return success !== false;
  } catch (e) {
    console.error('mcp: rate limiter:', e);
    return true;
  }
}
