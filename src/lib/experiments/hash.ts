/**
 * TRACK 8C Sprint 2 — deterministic experiment bucketing (no Math.random).
 */
export function fnv1aHash(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** 0–99 bucket for 50/50 split */
export function hashToBucket(subjectId: string, experimentId: string): number {
  return fnv1aHash(`${subjectId}:${experimentId}`) % 100;
}
