// Minimal static pages so type and attribute IRIs resolve to documentation.
// The full VitePress site replaces these later at the same URLs.
import { attributesOf, modelUrls, subjectUrls } from './models.mjs';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shell = (title, body) => `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · GeonicDB Data Models</title>
<style>
body{margin:0;font-family:system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif;color:#1a1a1a;background:#fff;line-height:1.6}
main{max-width:60rem;margin:0 auto;padding:2rem 1rem}
nav a{color:#0b5cad;text-decoration:none}nav{font-size:.9rem;margin-bottom:1.5rem}
h1{font-size:1.6rem;margin:.2rem 0}h2{font-size:1.15rem;margin-top:2rem}
table{border-collapse:collapse;width:100%;font-size:.9rem}th,td{text-align:left;vertical-align:top;padding:.4rem .5rem;border-bottom:1px solid #e5e5e5}th{background:#f6f6f6}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.85em}pre{background:#f6f6f6;padding:.8rem;overflow:auto}
.en{color:#444}.iri{word-break:break-all}.pill{display:inline-block;font-size:.75rem;padding:0 .4rem;border:1px solid #bbb;border-radius:.6rem;margin-left:.3rem}
dl{display:grid;grid-template-columns:max-content 1fr;gap:.3rem 1rem}dt{color:#555}
</style>
</head>
<body><main>${body}</main></body>
</html>
`;

export function subjectPage(subject) {
  const u = subjectUrls(subject);
  const rows = subject.models.map((m) => {
    const mu = modelUrls(subject, m);
    return `<tr><td><a href="${mu.page}">${esc(m.type)}</a></td><td>${esc(m.catalog.title?.ja)}<br><span class="en">${esc(m.catalog.title?.en)}</span></td><td><span class="pill">${esc(m.catalog.status)}</span></td></tr>`;
  }).join('\n');
  // Terms shared by several models resolve here.
  const shared = sharedTerms(subject);
  const sharedRows = [...shared].map(([name, types]) => `<tr id="${esc(name)}"><td><code>${esc(name)}</code></td><td class="iri"><code>${esc(u.namespace + name)}</code></td><td>${types.map((t) => `<a href="${modelUrls(subject, { type: t }).page}">${esc(t)}</a>`).join(', ')}</td></tr>`).join('\n');
  return shell(subject.title.ja, `
<nav><a href="/">GeonicDB Data Models</a> › ${esc(subject.name)}</nav>
<h1>${esc(subject.title.ja)} <span class="en">/ ${esc(subject.title.en)}</span></h1>
<p>${esc(subject.description.ja)}</p>
<p class="en" lang="en">${esc(subject.description.en)}</p>
<dl>
<dt>Subject</dt><dd><code>${esc(subject.name)}</code> <span class="pill">${esc(subject.source)}</span> <span class="pill">v${esc(subject.version)}</span></dd>
<dt>@context</dt><dd class="iri"><code>${esc(u.contextAlias)}</code><br><code>${esc(u.contextExact)}</code> (exact, immutable)</dd>
<dt>Namespace</dt><dd class="iri"><code>${esc(u.namespace)}</code></dd>
</dl>
<h2>データモデル / Models</h2>
<table><tr><th>Type</th><th>Title</th><th>Status</th></tr>${rows}</table>
${sharedRows ? `<h2>複数モデルで共有する属性 / Shared attributes</h2><table><tr><th>Term</th><th>IRI</th><th>Used by</th></tr>${sharedRows}</table>` : ''}
`);
}

export function sharedTerms(subject) {
  const uses = new Map();
  for (const m of subject.models) for (const [name] of attributesOf(m)) uses.set(name, [...(uses.get(name) ?? []), m.type]);
  return new Map([...uses].filter(([, t]) => t.length > 1));
}

export function modelPage(subject, model) {
  const u = subjectUrls(subject); const mu = modelUrls(subject, model);
  const required = new Set(model.schema.required ?? []);
  const rows = attributesOf(model).map(([name, p]) => {
    const iri = p['x-iri'] ?? '';
    const vt = p['x-ngsi'].type === 'Relationship' ? `→ ${esc(p['x-ngsi'].target?.split('/').pop() ?? 'entity')}` : p['x-ngsi'].type === 'GeoProperty' ? esc(p.properties?.type?.const ?? 'GeoJSON') : esc(p.format ? `${p.type} (${p.format})` : p.enum ? `${p.type}: ${p.enum.join(' | ')}` : p.type);
    const flags = [required.has(name) ? 'required' : '', p['x-geonicdb']?.indexed ? 'indexed' : '', p['x-geonicdb']?.pii ? 'PII' : ''].filter(Boolean).map((f) => `<span class="pill">${f}</span>`).join('');
    return `<tr id="${esc(name)}"><td><code>${esc(name)}</code>${flags}</td><td>${esc(p['x-ngsi'].type)}</td><td>${vt}</td><td>${esc(model.catalog.attributes?.[name]?.ja)}<br><span class="en">${esc(model.catalog.attributes?.[name]?.en)}</span></td><td class="iri"><code>${esc(iri)}</code></td></tr>`;
  }).join('\n');
  const notes = (model.notes?.notes ?? []).map((n) => `<li>${esc(n)}</li>`).join('');
  return shell(`${model.type}`, `
<nav><a href="/">GeonicDB Data Models</a> › <a href="${u.page}">${esc(subject.name)}</a> › ${esc(model.type)}</nav>
<h1>${esc(model.type)} <span class="pill">${esc(model.catalog.status)}</span></h1>
<p><strong>${esc(model.catalog.title?.ja)}</strong> <span class="en">/ ${esc(model.catalog.title?.en)}</span></p>
<p>${esc(model.catalog.description?.ja)}</p>
<p class="en" lang="en">${esc(model.catalog.description?.en)}</p>
<dl>
<dt>Type IRI</dt><dd class="iri"><code>${esc(mu.typeIri)}</code></dd>
<dt>@context</dt><dd class="iri"><code>${esc(u.contextAlias)}</code><br><code>${esc(u.contextExact)}</code> (exact, immutable)</dd>
<dt>Schema</dt><dd class="iri"><a href="${mu.schemaAlias}"><code>${esc(mu.schemaAlias)}</code></a><br><a href="${mu.schemaExact}"><code>${esc(mu.schemaExact)}</code></a></dd>
<dt>Examples</dt><dd><a href="${mu.examples}example.json">key-values</a> · <a href="${mu.examples}example-normalized.jsonld">normalized (JSON-LD)</a></dd>
<dt>GeonicDB</dt><dd><a href="${mu.geonicdb}">Custom Data Model body</a> (<code>POST /custom-data-models</code>)</dd>
<dt>Source</dt><dd><a href="https://github.com/geolonia/geonicdb-models/tree/main/models/${esc(subject.name)}/${esc(model.type)}">github.com/geolonia/geonicdb-models</a></dd>
</dl>
<h2>属性 / Attributes</h2>
<table><tr><th>Attribute</th><th>NGSI-LD</th><th>Value</th><th>Description</th><th>IRI</th></tr>${rows}</table>
<h2>例 (key-values) / Example</h2>
<pre>${esc(JSON.stringify(model.examples['example.json'], null, 2))}</pre>
<h2>Link header</h2>
<pre>Link: &lt;${esc(u.contextAlias)}&gt;; rel="http://www.w3.org/ns/json-ld#context"; type="application/ld+json"</pre>
${notes ? `<h2>Notes</h2><ul>${notes}</ul>` : ''}
<p class="en">Content licensed under <a href="/LICENSE-CONTENT">CC BY 4.0</a>.</p>
`);
}
