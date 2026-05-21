/**
 * `marketPosts` 리스트 쿼리용 — `orderBy("price")` / `orderBy("viewCount")` 에서 문서 누락 방지
 */
export function withMarketPostsIndexDefaults<T extends Record<string, unknown>>(
  data: T
): T & { price: number; viewCount: number } {
  const raw = data.price;
  let price = 0;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    price = raw;
  } else if (typeof raw === "string") {
    const n = Number(String(raw).replace(/[^\d.-]/g, ""));
    price = Number.isFinite(n) ? n : 0;
  }
  const vcRaw = data.viewCount ?? data.views;
  const viewCount =
    typeof vcRaw === "number" && Number.isFinite(vcRaw) ? Math.max(0, Math.floor(vcRaw)) : 0;
  return { ...data, price, viewCount };
}
