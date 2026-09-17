import { attributesOf } from './models.mjs';
/** Attribute names used by more than one model of a subject → list of types. */
export function sharedTerms(subject) {
  const uses = new Map();
  for (const m of subject.models) for (const [name] of attributesOf(m)) uses.set(name, [...(uses.get(name) ?? []), m.type]);
  return new Map([...uses].filter(([, t]) => t.length > 1));
}
