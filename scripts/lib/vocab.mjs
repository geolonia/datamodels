// The subject's vocabulary as an RDFS document: one class per type the subject
// owns (aliases and value types of an external class own no IRI), rdfs:subClassOf for every x-subclass-of, and one
// property per attribute IRI minted in the subject's namespace, labelled in
// Japanese and English. This is what makes the subclass relations visible to
// tools other than this repository's validator.
import { attributesOf, subjectUrls, modelUrls } from './models.mjs';

const CONTEXT = {
  rdf: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  rdfs: 'http://www.w3.org/2000/01/rdf-schema#',
  owl: 'http://www.w3.org/2002/07/owl#',
  label: { '@id': 'rdfs:label', '@container': '@language' },
  comment: { '@id': 'rdfs:comment', '@container': '@language' },
  subClassOf: { '@id': 'rdfs:subClassOf', '@type': '@id' },
  isDefinedBy: { '@id': 'rdfs:isDefinedBy', '@type': '@id' },
  seeAlso: { '@id': 'rdfs:seeAlso', '@type': '@id' },
  versionInfo: 'owl:versionInfo',
};

const lang = (o) => Object.fromEntries(['ja', 'en'].filter((l) => o?.[l]).map((l) => [l, o[l]]));

export function buildVocabulary(subject) {
  const u = subjectUrls(subject);
  const graph = [{
    '@id': u.namespace, '@type': 'owl:Ontology', label: lang(subject.title), comment: lang(subject.description),
    versionInfo: subject.version, seeAlso: u.contextExact,
  }];
  const props = new Map();
  for (const model of subject.models) {
    const mu = modelUrls(subject, model);
    // Aliases and value types describing an external class own no IRI here.
    if (!model.schema['x-alias-of'] && mu.typeIri.startsWith(u.namespace)) {
      graph.push({
        '@id': mu.typeIri, '@type': 'rdfs:Class', label: lang(model.catalog.title), comment: lang(model.catalog.description),
        ...(model.schema['x-subclass-of'] ? { subClassOf: model.schema['x-subclass-of'] } : {}),
        isDefinedBy: u.namespace, seeAlso: mu.page,
      });
    }
    for (const [name, prop] of attributesOf(model)) {
      const iri = prop['x-iri'];
      if (!iri?.startsWith(u.namespace) || props.has(iri)) continue;
      props.set(iri, { '@id': iri, '@type': 'rdf:Property', label: { en: name }, comment: lang(model.catalog.attributes?.[name]), isDefinedBy: u.namespace, seeAlso: `${mu.page}#${name}` });
    }
  }
  graph.push(...[...props.values()].sort((a, b) => a['@id'].localeCompare(b['@id'])));
  return { '@context': CONTEXT, '@graph': graph };
}
