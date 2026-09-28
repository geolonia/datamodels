// Build-time data for the extension builder (ExtensionBuilder.vue): every
// entity model with its schema and URLs, and the protected NGSI-LD core terms.
// VitePress runs this in Node at build time and bundles the result with the
// component, so only the builder page carries it.
import { readFileSync } from 'node:fs'
import { loadSubjects, subjectUrls, modelUrls, attributesOf, resolveContextTerms, CORE_CONTEXT_FIXTURE } from '../../../scripts/lib/models.mjs'
import { resolveContextDocument } from '../../../scripts/lib/releases.mjs'

export default {
  watch: ['../../../models/**/*'],
  async load() {
    const subjects = await loadSubjects()
    const common = subjects.find((s) => s.name === 'common')
    const geometry = common?.models.find((m) => m.type === 'Geometry')
    const core = JSON.parse(readFileSync(CORE_CONTEXT_FIXTURE, 'utf8'))['@context']
    // Every term each subject context defines, imported contexts included (as CI resolves them).
    const contextTerms = new Map()
    for (const s of subjects) contextTerms.set(s.name, Object.keys(await resolveContextTerms(s.context, subjects, resolveContextDocument)))
    return {
      coreTerms: Object.keys(core).filter((k) => !k.startsWith('@')),
      models: subjects.flatMap((s) => s.models.filter((m) => m.kind === 'entity').map((m) => ({
        id: `${s.name}/${m.type}`, type: m.type, subject: s.name, subjectTitle: s.title, title: m.catalog.title,
        schema: m.schema, schemaExact: modelUrls(s, m).schemaExact, contextAlias: subjectUrls(s).contextAlias,
        geometrySchema: geometry ? modelUrls(common, geometry).schemaExact : null,
        attributes: attributesOf(m).map(([name]) => name), contextTerms: contextTerms.get(s.name),
      }))),
    }
  },
}
