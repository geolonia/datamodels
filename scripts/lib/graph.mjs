// The relationship graph on the subject pages and on /models/: models are
// nodes; Relationship targets (x-ngsi.target), value types used through $ref,
// aliases and subclasses are edges. Laid out at build time with dagre and
// emitted as inline SVG, so the page needs no JavaScript and every node is a
// link. Colours come from the theme (site/.vitepress/theme/custom.css).
import dagre from '@dagrejs/dagre';
import { modelUrls, BASE_URL } from './models.mjs';

const L = {
  ja: {
    agent: '人・組織・チーム', any: '任意のエンティティ', label: '型と関係の図',
    legend: { rel: 'Relationship（属性名）', value: '値型として使う', alias: 'エイリアス', subclass: 'サブクラス', self: '↻ 同じ型への Relationship', other: '他のサブジェクト' },
  },
  en: {
    agent: 'person, organisation or team', any: 'any entity', label: 'Types and their relationships',
    legend: { rel: 'Relationship (attribute name)', value: 'used as a value type', alias: 'alias', subclass: 'subclass', self: '↻ Relationship to the same type', other: 'other subject' },
  },
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Rough text widths for layout: Latin at about 0.6em, CJK at about 1em.
const textWidth = (s, px) => [...s].reduce((w, c) => w + (c.charCodeAt(0) > 0x2e80 ? px : px * 0.6), 0);

/** Every edge of the catalog, merged by (from, to, kind) with the attribute names as labels. */
export function catalogEdges(subjects) {
  const id = (s, m) => `${s.name}/${m.type}`;
  const owner = new Map(); // type IRI -> node id of the model that defines it (not an alias)
  const bySchema = new Map(); // schema URL (exact or alias) -> node id
  for (const s of subjects) for (const m of s.models) {
    const mu = modelUrls(s, m);
    if (!m.schema['x-alias-of']) owner.set(mu.typeIri, id(s, m));
    bySchema.set(mu.schemaExact, id(s, m)); bySchema.set(mu.schemaAlias, id(s, m));
  }
  const edges = new Map();
  const add = (from, to, kind, label) => {
    if (!to) return;
    const key = `${from}|${to}|${kind}`;
    const e = edges.get(key) ?? { from, to, kind, labels: [] };
    if (label && !e.labels.includes(label)) e.labels.push(label);
    edges.set(key, e);
  };
  for (const s of subjects) for (const m of s.models) {
    const from = id(s, m);
    for (const [name, prop] of Object.entries(m.schema.properties ?? {})) {
      const x = prop['x-ngsi'] ?? {};
      if (x.type === 'Relationship') {
        const target = x.target;
        add(from, target === 'agent' || target === 'any' ? `@${target}` : owner.get(target), 'rel', name);
      }
      const ref = (prop.$ref ?? prop.items?.$ref)?.split('#')[0];
      if (ref) add(from, bySchema.get(ref), 'value', name);
    }
    if (m.schema['x-alias-of']) add(from, owner.get(m.schema['x-alias-of']), 'alias');
    if (m.schema['x-subclass-of']) add(from, owner.get(m.schema['x-subclass-of']), 'subclass');
  }
  return [...edges.values()];
}

// Catmull-Rom through dagre's points, as cubic Bézier segments.
function smooth(pts) {
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
    d += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

/**
 * The graph for one subject (its models, and whatever they link to or are
 * linked from) or, with focus null, for the whole catalog. Returns '' when
 * there is no edge to show.
 */
export function graphSvg(lang, prefix, subjects, focus = null, rankdir = 'LR') {
  const t = L[lang];
  const all = catalogEdges(subjects);
  const inFocus = (nodeId) => !focus || nodeId.startsWith(`${focus.name}/`);
  const shown = all.filter((e) => inFocus(e.from) || inFocus(e.to));
  if (!shown.length) return '';
  // A model's links to its own type (Task.parent) are listed inside its node:
  // a loop drawn by the layout would float free of the node it belongs to.
  const selfLinks = new Map(shown.filter((e) => e.from === e.to).map((e) => [e.from, e.labels]));
  const edges = shown.filter((e) => e.from !== e.to);

  const nodes = new Map();
  for (const s of subjects) for (const m of s.models) {
    const nid = `${s.name}/${m.type}`;
    if (focus && !inFocus(nid) && !edges.some((e) => e.from === nid || e.to === nid)) continue;
    nodes.set(nid, {
      title: m.type, sub: m.catalog.title?.[lang] ?? '', self: selfLinks.get(nid)?.join(', ') ?? '', href: `${prefix}${modelUrls(s, m).page.slice(BASE_URL.length)}`,
      cls: [m.kind === 'value' ? 'value' : 'entity', focus && !inFocus(nid) ? 'other' : ''].filter(Boolean).join(' '),
    });
  }
  for (const target of ['agent', 'any']) if (edges.some((e) => e.to === `@${target}`)) nodes.set(`@${target}`, { title: t[target], sub: '', cls: 'pseudo' });

  const g = new dagre.graphlib.Graph({ multigraph: false });
  g.setGraph({ rankdir, nodesep: 28, ranksep: 70, edgesep: 14, marginx: 8, marginy: 8 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const [nid, n] of nodes) {
    n.width = Math.ceil(Math.max(textWidth(n.title, 14), textWidth(n.sub, 12), n.self ? textWidth(`↻ ${n.self}`, 12) : 0) + 28);
    n.height = (n.sub ? 46 : 32) + (n.self ? 16 : 0);
    g.setNode(nid, { width: n.width, height: n.height });
  }
  for (const e of edges) {
    const label = e.labels.join(', ');
    g.setEdge(e.from, e.to, label ? { label, width: Math.ceil(textWidth(label, 12) + 10), height: 18, labelpos: 'c' } : {});
  }
  dagre.layout(g);

  const W = Math.ceil(g.graph().width), H = Math.ceil(g.graph().height);
  // Nodes are plain SVG; the links are HTML anchors laid over them, because the
  // site's router and link prefetching expect HTML anchors (an SVG <a> has no
  // string href) and the theme's link styles would underline SVG text.
  const links = [];
  let svg = `<div class="model-graph"><div class="canvas" style="width:${W}px;height:${H}px"><svg xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="graph-title-${focus?.name ?? 'all'}" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
  svg += `<title id="graph-title-${focus?.name ?? 'all'}">${esc(t.label)}</title>`;
  svg += `<defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="arrowhead"/></marker>`;
  svg += `<marker id="hollow" viewBox="0 0 12 12" refX="11" refY="6" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M1,1 L11,6 L1,11 z" class="arrowhead hollow"/></marker></defs>`;
  for (const e of edges) {
    const ge = g.edge(e.from, e.to);
    svg += `<path class="edge ${e.kind}" d="${smooth(ge.points)}" marker-end="url(#${e.kind === 'alias' || e.kind === 'subclass' ? 'hollow' : 'arrow'})"/>`;
    const label = e.labels.join(', ') || t.legend[e.kind];
    if (e.labels.length || e.kind === 'alias' || e.kind === 'subclass') {
      const w = Math.ceil(textWidth(label, 12) + 10);
      svg += `<g class="edge-label"><rect x="${(ge.x - w / 2).toFixed(1)}" y="${(ge.y - 9).toFixed(1)}" width="${w}" height="18" rx="4"/><text x="${ge.x.toFixed(1)}" y="${(ge.y + 4).toFixed(1)}">${esc(label)}</text></g>`;
    }
  }
  for (const [nid, n] of nodes) {
    const p = g.node(nid);
    const x = p.x - n.width / 2, y = p.y - n.height / 2;
    let body = `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${n.width}" height="${n.height}" rx="8"/>`;
    const top = y + (n.sub ? 20 : 20);
    body += n.sub
      ? `<text class="type" x="${p.x.toFixed(1)}" y="${top.toFixed(1)}">${esc(n.title)}</text><text class="sub" x="${p.x.toFixed(1)}" y="${(top + 17).toFixed(1)}">${esc(n.sub)}</text>`
      : `<text class="sub" x="${p.x.toFixed(1)}" y="${top.toFixed(1)}">${esc(n.title)}</text>`;
    if (n.self) body += `<text class="self" x="${p.x.toFixed(1)}" y="${(top + (n.sub ? 33 : 16)).toFixed(1)}">↻ ${esc(n.self)}</text>`;
    svg += `<g class="node ${n.cls}">${body}</g>`;
    if (n.href) links.push(`<a href="${esc(n.href)}" aria-label="${esc(n.sub ? `${n.title} (${n.sub})` : n.title)}" style="left:${x.toFixed(1)}px;top:${y.toFixed(1)}px;width:${n.width}px;height:${n.height}px"></a>`);
  }
  svg += `</svg>${links.join('')}</div></div>\n\n`;
  // The legend names only what this graph shows.
  const kinds = new Set(shown.map((e) => e.kind));
  const items = [...['rel', 'value', 'alias', 'subclass'].filter((k) => kinds.has(k)), ...(selfLinks.size ? ['self'] : []), ...([...nodes.values()].some((n) => n.cls.includes('other')) ? ['other'] : [])];
  svg += `<p class="model-graph-legend">${items.map((k) => `<span class="${k}">${esc(t.legend[k])}</span>`).join('')}</p>\n\n`;
  return svg;
}

export const graphTitle = { ja: '型と関係', en: 'Types and relationships' };
