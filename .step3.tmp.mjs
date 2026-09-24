import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
const OLD = 'https://models.geonicdb.com', NEW = 'https://datamodels.jp';
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === 'releases' || e.name === 'node_modules' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const read = (f) => fs.readFileSync(f, 'utf8');
const write = (f, s) => fs.writeFileSync(f, s);
const setNotes = (m, notes) => { const f = `models/${m}/notes.yaml`; const d = YAML.parse(read(f)); d.notes = notes; write(f, YAML.stringify(d, { lineWidth: 0 })); };

// ---- notes: one provenance line, design facts without version numbers
const prov = 'Derived from the Custom Data Models of the Takamatsu City flood-prevention headquarters application (geolonia/geonicdb-datamodels, September 2026). Type names generalised from the tenant-specific "Saitai" prefix; attribute names aligned with the task subject.';
setNotes('disaster/DisasterEvent', [prov, "An alias of the task subject's Project: the same IRI and the same attributes, under the name disaster response uses. A tenant that stores DisasterEvent and one that stores Project hold the same type."]);
const ir = YAML.parse(read('models/disaster/IncidentReport/notes.yaml')).notes;
setNotes('disaster/IncidentReport', [prov, 'A subclass of task Task: attributes with Task names carry the Task IRIs. From the source application: index → externalId (string), status → progress + statusLabel (status is a protected term of the NGSI-LD core context), category → subtype, memo → description, inputterTeam/inputterName → author (a Relationship to a person or team entity), updatedAt → dateModified; name is required, as Task requires it.', ir[2]]);
setNotes('disaster/IncidentResponseAction', [prov, 'A subclass of task Task with the incident report as its parent. From the source application: task → parent, content → name, isDone → progress, assignee (a free-text team name) → a multi-valued Relationship to team or person entities, updatedAt → dateModified. project is optional; the parent report carries the disaster event.']);
setNotes('disaster/IncidentHandoverNote', [prov, 'A subclass of task Comment. From the source application: content → text, fromTeam → author and toTeam → recipient (schema:recipient), both Relationships to team or person entities, updatedAt → dateModified.']);
setNotes('disaster/IncidentPhoto', [prov, 'A subclass of task Attachment. From the source application: imageKey → contentUrl (an object key becomes an object-store URL), updatedAt → dateModified; filename, author and location come from Attachment.']);
const rc = YAML.parse(read('models/disaster/RoadClosure/notes.yaml')).notes;
setNotes('disaster/RoadClosure', [prov, 'From the source application: status → closureStatus, normalised to the RoadSegment value space closed | limited | open, with the local wording in statusLabel (依頼中 is open with the label 依頼中: the road is still passable); area → location (core term; the closed section is the location of the closure); memo → description; the flat town and block fields → address (JapaneseAddress).', rc[4]]);
setNotes('disaster/EvacuationShelter', [prov,
  'From the source application: status → openingStatus, normalised to open | closed | full, with the local wording in statusLabel; evacuee counts are integers (strings in the source); memo → description.',
  'Upstream considered (2026-09-18): Smart Data Models has no shelter type. The Japanese reference is the Digital Agency 自治体標準オープンデータセット (successor of the 推奨データセット since 2023-03-31), list 03 指定緊急避難場所一覧, derived from the GSI 指定緊急避難場所データ. It is master data: name, address, coordinates, disaster kinds handled, maxCapacity. This type is the operational overlay and carries no master fields; the master could become an EvacuationSite type later, referenced by Relationship.',
  'externalShelterId is the ID column of that list, unique within the municipality; together with localGovernmentCode it identifies the shelter nationwide.']);
const tn = YAML.parse(read('models/task/Task/notes.yaml')).notes;
setNotes('task/Task', [...tn.slice(0, 5), 'project is optional: RFC 8984 has no project, and a calendar to-do or a stand-alone work order should not have to invent one; trackers whose issues always belong to a project can require it in their own model. name and progress are required.']);

// ---- dataset name: 推奨データセット → 自治体標準オープンデータセット
fs.renameSync('models/disaster/EvacuationShelter/mapping/suisho-dataset-shelter.yaml', 'models/disaster/EvacuationShelter/mapping/jichitai-opendata-shelter.yaml');
{
  const f = 'models/disaster/EvacuationShelter/mapping/jichitai-opendata-shelter.yaml'; const d = YAML.parse(read(f));
  d.standard.name = { ja: '自治体標準オープンデータセット 03 指定緊急避難場所一覧（デジタル庁）', en: 'Municipal standard open dataset 03, designated emergency evacuation sites (Digital Agency)' };
  write(f, YAML.stringify(d, { lineWidth: 0 }));
  const c = 'models/disaster/EvacuationShelter/catalog.yaml';
  write(c, read(c).replaceAll('指定緊急避難場所一覧（推奨データセット）', '指定緊急避難場所一覧（自治体標準オープンデータセット）').replaceAll("指定緊急避難場所一覧 (推奨データセット;", "指定緊急避難場所一覧 (自治体標準オープンデータセット, the municipal standard open dataset;"));
  const s = 'models/disaster/EvacuationShelter/schema.json';
  write(s, read(s).replaceAll('推奨データセット', '自治体標準オープンデータセット'));
}

// ---- subject descriptions
{
  const f = 'models/disaster/subject.yaml'; const d = YAML.parse(read(f));
  d.description = {
    ja: '自治体の災害対応を表すデータモデル。災害対応はタスク管理の一種としてモデル化しており、災害事象（DisasterEvent）はタスク管理の Project のエイリアス、通報・対応業務・申し送り・現地写真は Task・Comment・Attachment のサブクラスです。タスク管理向けのクライアントはこれらをそのまま読めます。通行止めと避難所運用状況は独自の型です。高松市の水防アプリのデータモデルを基に汎用化したもの。',
    en: "Data models for municipal disaster response. Disaster response is modelled as task management: DisasterEvent is an alias of the task subject's Project, and incident reports, response actions, handover notes and photos are subclasses of Task, Comment and Attachment, so a client written for task management reads them unchanged. Road closures and shelter operation are types of their own. Generalised from the data models of Takamatsu City's flood-response application.",
  };
  write(f, read(f).replace(/^description:\n(  .*\n)+/m, YAML.stringify({ description: d.description }, { lineWidth: 0 })));
}

// ---- domain and version reset across the tree (not releases/, not node_modules)
const versionPairs = [
  ['/context/task/v1.1.0.jsonld', '/context/task/v1.0.0.jsonld'],
  ['/context/disaster/v3.0.0.jsonld', '/context/disaster/v1.0.0.jsonld'],
  ['/context/disaster/v3.jsonld', '/context/disaster/v1.jsonld'],
];
for (const f of walk('models')) {
  let s = read(f); const o = s;
  s = s.replaceAll(OLD, NEW);
  for (const [a, b] of versionPairs) s = s.replaceAll(a, b);
  s = s.replace(/(\/schema\/task\/[A-Za-z]+\/)v1\.1\.0\.json/g, '$1v1.0.0.json').replace(/(\/schema\/disaster\/[A-Za-z]+\/)v3\.0\.0\.json/g, '$1v1.0.0.json').replace(/(\/schema\/disaster\/[A-Za-z]+\/)v3\.json/g, '$1v1.json');
  s = s.replace(/"x-version": "(1\.1\.0|3\.0\.0)"/g, '"x-version": "1.0.0"');
  s = s.replaceAll('https://github.com/geolonia/geonicdb-models/issues/22', 'https://github.com/geolonia/datamodels/issues/22');
  if (s !== o) write(f, s);
}
for (const f of ['models/task/subject.yaml', 'models/disaster/subject.yaml']) write(f, read(f).replace(/^version: .*$/m, 'version: 1.0.0'));
for (const s of ['common', 'task', 'disaster']) fs.rmSync(`models/${s}/releases`, { recursive: true, force: true });

// ---- model READMEs, one template
for (const subject of ['common', 'task', 'disaster']) {
  for (const type of fs.readdirSync(`models/${subject}`).filter((d) => fs.existsSync(`models/${subject}/${d}/schema.json`))) {
    const dir = `models/${subject}/${type}`; const schema = JSON.parse(read(`${dir}/schema.json`)); const cat = YAML.parse(read(`${dir}/catalog.yaml`));
    const isValue = schema['x-kind'] === 'value';
    const typeIri = schema['x-alias-of'] ?? `${NEW}/ns/${subject}/${type}`;
    let md = `# ${type}\n\n${cat.title.ja} / ${cat.title.en}${isValue ? ' (value type)' : ''}\n\n${cat.description.en}\n\n${cat.description.ja}\n\n`;
    md += `- ${isValue ? 'IRI' : 'Type IRI'}: \`${typeIri}\`${schema['x-alias-of'] ? ' (alias: the same IRI as the aliased type)' : ''}\n`;
    if (schema['x-subclass-of']) md += `- Subclass of: \`${schema['x-subclass-of']}\`\n`;
    md += `- Context: \`${NEW}/context/${subject}/v1.jsonld\` (alias), \`${NEW}/context/${subject}/v1.0.0.jsonld\` (exact)\n`;
    md += `- Schema: \`${NEW}/schema/${subject}/${type}/v1.json\` (alias), \`${NEW}/schema/${subject}/${type}/v1.0.0.json\` (exact)\n`;
    md += `- Page: ${NEW}/models/${subject}/${type}/\n\n`;
    md += 'Files follow the Smart Data Models layout: `schema.json` (key-values representation, with `x-ngsi`, `x-iri` and optional `x-personal-data` annotations), `catalog.yaml` (Japanese and English descriptions), `examples/`, `mapping/` where a corresponding standard exists, `notes.yaml`, `ADOPTERS.yaml`.\n';
    write(`${dir}/README.md`, md);
  }
}

// ---- post-conditions
const left = walk('models').filter((f) => /models\.geonicdb\.com|v1\.1\.0|v3\.0\.0|"x-version": "(1\.1|3\.0)|推奨データセット 03|x-geonicdb|in production use|実運用/.test(read(f)));
const expected = ['models/disaster/EvacuationShelter/notes.yaml']; // mentions 推奨データセット only as the predecessor name
const unexpected = left.filter((f) => !expected.includes(f));
if (unexpected.length) { console.error('leftovers:', unexpected); process.exit(1); }
for (const s of ['common', 'task', 'disaster']) if (!/^version: 1\.0\.0$/m.test(read(`models/${s}/subject.yaml`))) { console.error(`${s} version not 1.0.0`); process.exit(1); }
console.log('step 3 content ok');
