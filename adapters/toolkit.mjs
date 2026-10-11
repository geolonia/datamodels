// The toolkit's adapters (@geolonia/datamodels/adapters) in this catalog's
// two-argument interface (adapters/README.md). adapters/csv, table-schema, ai
// and postgis each wrap one of them with toolkitAdapter().
//
// The toolkit's adapters take a third argument, `context`: the catalog's URL
// builders, its languages and the schemas the models refer to with $ref. Every
// $ref here is a schema of this catalog, so the schemas come from models/ and
// nothing is fetched: readRefs runs offline and trusts no site.
import { ADAPTERS, readRefs, localRefs, refsRead } from '@geolonia/datamodels/adapters';
import { loadSubjects, subjectUrls, modelUrls, BASE_URL } from '../scripts/lib/models.mjs';

const subjects = await loadSubjects();
const urls = { baseUrl: BASE_URL, subjectUrls, modelUrls };
const entities = subjects.flatMap((s) => s.models.filter((m) => m.kind === 'entity'));
const noNetwork = () => { throw new Error('adapters/toolkit.mjs: the adapters never read the network'); };
const { refs, problems } = await readRefs(entities, { local: localRefs(subjects, urls), offline: true, trusted: [], fetch: noNetwork });

export const context = { urls, languages: ['ja', 'en'], refs };

/**
 * The toolkit adapter `name` as this catalog's adapter. `download`: its files
 * are generic (no product), so model pages link them under "Download";
 * `guide`: the page that explains them.
 * A model whose $ref schema is not in models/ fails the build instead of
 * silently losing its files.
 */
export function toolkitAdapter(name) {
  const a = ADAPTERS.find((x) => x.name === name);
  if (!a) throw new Error(`@geolonia/datamodels has no adapter ${name} (has: ${ADAPTERS.map((x) => x.name).join(', ')})`);
  return {
    name: a.name,
    label: a.label,
    note: a.note,
    guide: '/toolkit/export',
    download: true,
    urlFor(subject, model) {
      if (model.kind === 'entity' && !refsRead(model, refs)) throw new Error(`${subject.name}/${model.type}: a schema it refers to with $ref is not in models/, and the adapters read no other site${problems.length ? ` (${problems.join('; ')})` : ''}`);
      return a.urlFor(subject, model, context);
    },
    content: (subject, model) => a.content(subject, model, context),
  };
}
