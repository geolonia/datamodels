// The subject's vocabulary as an RDFS document: one class per type the subject
// owns (aliases own no IRI), rdfs:subClassOf for every x-subclass-of, and one
// property per attribute IRI minted in the subject's namespace, labelled in
// Japanese and English. The toolkit's, with the settings of node.yaml (#226).
import { buildVocabulary as tkVocabulary } from '@geolonia/datamodels/build';
import { URLS, NODE } from './models.mjs';

export const buildVocabulary = (subject) => tkVocabulary(subject, { urls: URLS, languages: NODE.languages });
