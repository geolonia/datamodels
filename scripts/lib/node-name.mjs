// A known node's name, the same on the pages, in the MCP index and in the
// duplicate check: its title when its catalog.json has one (toolkit 0.3.15),
// else its publisher, else its host. No imports, as the Worker bundles
// similar.mjs, which uses it.
const pick = (t, lang) => t?.[lang] ?? Object.values(t ?? {})[0];
export const nodeName = (node, lang) => pick(node.title, lang) ?? pick(node.publisher?.name, lang) ?? new URL(node.url).host;
