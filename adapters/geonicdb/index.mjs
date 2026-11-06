// GeonicDB adapter: publishes a ready-made Custom Data Model request body per
// entity model at /adapters/geonicdb/<subject>/<Type>.json.
//
// The conversion is the toolkit's (@geolonia/datamodels/adapters, #134), the
// same one every toolkit node can turn on. This file gives it this catalog's
// context: the URL builders and languages of adapters/toolkit.mjs, and each
// subject's context terms (loadSubjects) for VocabProperty terms.
//
// Adapter interface (see adapters/README.md): { name, label, urlFor, content }.
// The catalog core never imports an adapter; scripts/build.mjs discovers them.
import { PRODUCT_ADAPTERS, toCustomDataModel as convert, expandVocabTerm } from '@geolonia/datamodels/adapters';
import { context } from '../toolkit.mjs';

const geonicdb = PRODUCT_ADAPTERS.find((a) => a.name === 'geonicdb');
if (!geonicdb) throw new Error('@geolonia/datamodels has no geonicdb adapter (0.4.0 or later has)');

/** The adapters' context for one subject, with the terms of its context. */
function contextFor(subject) {
  const why = subject.contextTermsError ?? (subject.contextTerms ? undefined : 'the subject was not loaded with loadSubjects()');
  return {
    ...context,
    terms: { [subject.name]: subject.contextTerms },
    termsProblems: why ? { [subject.name]: why } : {},
  };
}

/**
 * The body for `model` of `subject`, with the options for a tenant's variant
 * (typePrefix, typeName, contextUrl, allowAdditional, extend, rename,
 * contextTerms): see the toolkit's src/adapters/geonicdb/custom-data-model.mjs.
 */
export const toCustomDataModel = (subject, model, options) => convert(subject, model, contextFor(subject), options);
export { expandVocabTerm };

export default {
  name: geonicdb.name,
  label: geonicdb.label,
  note: geonicdb.note,
  guide: '/guide/geonicdb',
  use: { ja: 'GeonicDB の `/custom-data-models` に POST して、テナントにモデルを登録します。登録すると、その型のエンティティはモデルで検証されます。', en: 'POST it to GeonicDB\'s `/custom-data-models` to register the model in a tenant; entities of that type are then validated against the model.' },
  // Tenant-specific variants (prefixes, aliases, extra attributes), from a clone of this repository.
  command: 'node adapters/geonicdb/export.mjs <subject>',
  /** URL of this adapter's file for a model, or null when the model has none. */
  urlFor: (subject, model) => geonicdb.urlFor(subject, model, context),
  content: (subject, model) => geonicdb.content(subject, model, contextFor(subject)),
};
