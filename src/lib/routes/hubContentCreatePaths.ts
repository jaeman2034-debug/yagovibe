/**
 * Hub FAB / CreateModal — canonical content-creation paths.
 * These flows must NOT be blocked by avatar onboarding gate (P0 regression hotfix).
 */

const CONTENT_CREATE_PATTERNS: readonly RegExp[] = [
  /^\/sports\/[^/]+\/market\/create$/,
  /^\/sports\/[^/]+\/market\/ai-create$/,
  /^\/sports\/[^/]+\/match\/create$/,
  /^\/sports\/[^/]+\/recruit\/create$/,
  /^\/sports\/[^/]+\/team\/create(?:\/|$)/,
  /^\/team\/create$/,
  /^\/app\/market\/create$/,
  /^\/recruit\/create$/,
  /^\/match\/create$/,
];

export function isHubContentCreatePath(pathname: string): boolean {
  return CONTENT_CREATE_PATTERNS.some((re) => re.test(pathname));
}
