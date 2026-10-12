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

// How to use each file, for its section on /adapters/ (scripts/lib/adapter-pages.mjs).
const USE = {
  csv: {
    ja: '表計算ソフトで開き、1 行に 1 件ずつ入力して、CSV（UTF-8）で保存します。そのあと Table Schema で検査し、`datamodels convert` でモデルのエンティティに変換します（[データを変換する](/toolkit/convert#csv-template)）。',
    en: 'Open it in a spreadsheet, add one row per entity and save it as CSV (UTF-8). Then check it with the Table Schema and turn it into entities of the model with `datamodels convert` ([Converting your data](/en/toolkit/convert#csv-template)).',
  },
  'table-schema': {
    ja: '`frictionless validate <CSV> --schema <このファイル>` を実行すると、規則に合わないセルが行と列ごとに報告されます。',
    en: 'Run `frictionless validate <CSV> --schema <this file>`: it reports each cell that breaks a rule, by row and column.',
  },
  ai: {
    ja: '文書（PDF やメール）を読ませるリクエストにこのスキーマを付けると、答えがモデルの形のエンティティになり、そのままモデルの JSON Schema で検査できます。形の決まっていない属性があるモデルにはありません。strict モードの制限は[AI の構造化出力](/toolkit/export#ai)にあります。',
    en: 'Send it with a request that asks the model to read a document (a PDF, an email): the answer is an entity in the shape of the model, ready to check with the model\'s JSON Schema. A model with an attribute of no fixed shape has none. Limits of strict mode: [Structured output for AI](/en/toolkit/export#ai).',
  },
  postgis: {
    ja: '`psql -f <このファイル>` で実行すると、制約と空間インデックス付きのテーブルができます。データベースに PostGIS の拡張（`CREATE EXTENSION postgis`）が要ります。',
    en: 'Run it with `psql -f <this file>` to get a table with constraints and a spatial index. The database needs the PostGIS extension (`CREATE EXTENSION postgis`).',
  },
};

/**
 * The toolkit adapter `name` as this catalog's adapter. `download`: its files
 * are generic (no product), so model pages link them under "Download";
 * `guide`: the page that explains them; `use` and `command`: how to use a
 * file and how to make it yourself, for /adapters/.
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
    use: USE[a.name],
    command: `datamodels export <subject>/<Type> --to ${a.name}`,
    urlFor(subject, model) {
      if (model.kind === 'entity' && !refsRead(model, refs)) throw new Error(`${subject.name}/${model.type}: a schema it refers to with $ref is not in models/, and the adapters read no other site${problems.length ? ` (${problems.join('; ')})` : ''}`);
      return a.urlFor(subject, model, context);
    },
    content: (subject, model) => a.content(subject, model, context),
  };
}
