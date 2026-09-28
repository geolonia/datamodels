// Build-time data for the extension builder (ExtensionBuilder.vue): every
// entity model with its schema and URLs, and the protected NGSI-LD core terms.
// VitePress runs this in Node at build time and bundles the result with the
// component, so only the builder page carries it.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSubjects, subjectUrls, modelUrls, attributesOf, ROOT } from '../../../scripts/lib/models.mjs'

export default {
  watch: ['../../../models/**/*'],
  async load() {
    const subjects = await loadSubjects()
    const common = subjects.find((s) => s.name === 'common')
    const geometry = common?.models.find((m) => m.type === 'Geometry')
    const core = JSON.parse(readFileSync(join(ROOT, 'test', 'fixtures', 'ngsi-ld-core-context-v1.8.jsonld'), 'utf8'))['@context']
    return {
      coreTerms: Object.keys(core).filter((k) => !k.startsWith('@')),
      models: subjects.flatMap((s) => s.models.filter((m) => m.kind === 'entity').map((m) => ({
        id: `${s.name}/${m.type}`, type: m.type, subject: s.name, subjectTitle: s.title, title: m.catalog.title,
        schema: m.schema, schemaExact: modelUrls(s, m).schemaExact, contextAlias: subjectUrls(s).contextAlias,
        geometrySchema: geometry ? modelUrls(common, geometry).schemaExact : null,
        attributes: attributesOf(m).map(([name]) => name),
      }))),
    }
  },
}
