/**
 * 검색 메타데이터 유틸 (동의어 확장, searchText 생성)
 * - generateSearchMeta Cloud Function
 * - rebuildSearchMeta Admin Script
 * 에서 공유
 */

/** 영어 → 한국어 동의어 (단방향). buildSynonymMap으로 역방향 자동 생성 */
const SYNONYMS_BASE: Record<string, string[]> = {
  box: ["박스", "상자"],
  bag: ["가방", "백"],
  ball: ["공", "볼"],
  shoe: ["신발", "화"],
  shoes: ["신발", "운동화", "화"],
  basketball: ["농구", "농구공"],
  soccer: ["축구", "풋볼"],
  football: ["축구", "미식축구"],
  glove: ["글러브", "장갑"],
  bat: ["방망이", "배트"],
  racket: ["라켓", "채"],
  jacket: ["자켓", "점퍼", "재킷"],
  pants: ["바지", "팬츠"],
  shirt: ["셔츠", "상의", "티셔츠"],
  uniform: ["유니폼", "교복", "팀복"],
  net: ["네트", "그물"],
  pump: ["펌프", "공기주입기"],
  used: ["중고"],
  new: ["새것", "미개봉"],
  share: ["나눔", "기부"],
  case: ["케이스", "박스", "파우치"],
  cleats: ["축구화", "풋살화", "스파이크"],
  sneakers: ["운동화", "스니커즈", "스니커스"],
};

/** 역방향 포함 동의어 맵 (박스 → box, 상자 검색 시 box 상품 노출) */
function buildSynonymMap(base: Record<string, string[]>): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};

  Object.entries(base).forEach(([key, values]) => {
    if (!map[key]) map[key] = new Set();
    values.forEach((v) => {
      map[key].add(v);
      if (!map[v]) map[v] = new Set();
      map[v].add(key);
    });
  });

  return map;
}

const SYNONYM_MAP = buildSynonymMap(SYNONYMS_BASE);

/** 토큰 + 동의어를 Set에 추가 */
function addTokenWithSynonyms(tokens: Set<string>, token: string): void {
  const t = token.trim();
  if (!t) return;
  tokens.add(t);
  const lower = t.toLowerCase();
  const syns = SYNONYM_MAP[lower] ?? SYNONYM_MAP[t];
  if (syns) syns.forEach((s) => tokens.add(s));
}

/** 토큰 배열을 동의어로 확장 */
export function expandWithSynonyms(tokens: string[]): string[] {
  const expanded = new Set<string>();
  tokens.forEach((t) => addTokenWithSynonyms(expanded, t));
  return [...expanded];
}

/** 상품 정보로 fallback 검색 메타 생성 (keywordTokens, searchText, tags) */
export function buildSearchMetaFromProduct(product: {
  name?: string;
  title?: string;
  productName?: string;
  category?: string;
  description?: string;
  brand?: string;
  tags?: string[];
}): { keywordTokens: string[]; searchText: string; tags: string[] } {
  const name = product.name || product.title || product.productName || "";
  const category = product.category || "";
  const description = product.description || "";
  const brand = product.brand || "";
  const tags = Array.isArray(product.tags) ? product.tags : [];

  const tokens = new Set<string>();
  function addTokens(text?: string) {
    if (!text || typeof text !== "string") return;
    text.split(/\s+/).forEach((t) => {
      const trimmed = t.trim();
      if (trimmed) addTokenWithSynonyms(tokens, trimmed);
    });
  }
  addTokens(name);
  addTokens(category);
  addTokens(description);
  addTokens(brand);
  tags.forEach((tag) => addTokens(typeof tag === "string" ? tag : ""));
  (description || "")
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .slice(0, 5)
    .forEach((w) => addTokenWithSynonyms(tokens, w));

  const keywordTokens = [...new Set(tokens)];
  const fallbackTags = [category, name, brand, ...tags].filter(Boolean).slice(0, 6) as string[];

  const searchText = [
    name,
    category,
    brand,
    description,
    ...tags,
    ...keywordTokens,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim();

  return {
    keywordTokens,
    searchText: searchText || `${name} ${category}`.trim(),
    tags: fallbackTags,
  };
}
