export function getFunctionsOrigin(): string {
  const raw =
    import.meta.env.VITE_FUNCTIONS_ORIGIN?.trim() ||
    "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
  return raw.replace(/\/$/, "");
}
