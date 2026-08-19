import { collection, doc, type CollectionReference, type DocumentReference, type Firestore, getDoc } from "firebase/firestore";

/**
 * 노원구 축구협회 — Firestore `federations/nowon-gu-football`
 * ⚠️ `gu-football` = 중랑구 축구협회 (별도 협회, 매핑 금지)
 */
export const NOWON_FEDERATION_URL_SLUG = "nowon-gu-football";

/** 중랑구 축구협회 — Firestore `federations/gu-football` */
export const JUNGNANG_FEDERATION_URL_SLUG = "gu-football";

/** 노원 레거시 slug만 → nowon-gu-football */
const NOWON_LEGACY_URL_SLUG_TO_CANONICAL: Record<string, string> = {
  "nowon-football": NOWON_FEDERATION_URL_SLUG,
};

const NOWON_OPERATIONAL_DOC_CANDIDATES = ["nowon-gu-football", "nowon-football"] as const;

/** CMS·팀/리그 운영 데이터 조회용 — 노원은 gu + legacy 문서 병합 */
export function collectFederationOperationalDocIds(urlOrDocSlug: string | undefined | null): string[] {
  const canonical = resolveFederationFirestoreId(urlOrDocSlug);
  const ids = new Set<string>();
  if (canonical) ids.add(canonical);
  const slug = String(urlOrDocSlug || "").trim();
  if (slug) ids.add(slug);
  if (
    canonical === NOWON_FEDERATION_URL_SLUG ||
    slug === NOWON_FEDERATION_URL_SLUG ||
    slug === "nowon-football"
  ) {
    NOWON_OPERATIONAL_DOC_CANDIDATES.forEach((id) => ids.add(id));
  }
  return [...ids];
}

/** URL slug → Firestore 문서 id (기본 1:1, 레거시만 매핑) */
export function resolveFederationFirestoreId(urlOrDocSlug: string | undefined | null): string {
  const raw = String(urlOrDocSlug || "").trim();
  if (!raw) return "";
  const canonical = NOWON_LEGACY_URL_SLUG_TO_CANONICAL[raw] ?? raw;
  return canonical;
}

/** 공개 포털 canonical URL slug (노원 레거시만 정규화) */
export function canonicalFederationUrlSlug(slugOrDocId: string | undefined | null): string {
  const raw = String(slugOrDocId || "").trim();
  if (!raw) return "";
  return NOWON_LEGACY_URL_SLUG_TO_CANONICAL[raw] ?? raw;
}

export function federationPublicPath(
  slugOrDocId: string | undefined | null,
  tab?: string | null
): string {
  const slug = canonicalFederationUrlSlug(slugOrDocId);
  if (!slug) return "/federations";
  if (!tab || tab === "home") return `/federations/${slug}`;
  return `/federations/${slug}?tab=${encodeURIComponent(tab)}`;
}

/** 노원 협회 공개 포털 홈 — 커버·홈 탭 (1번 화면) */
export const NOWON_FEDERATION_HOME_PATH = federationPublicPath(NOWON_FEDERATION_URL_SLUG);

/** 협회소개 탭 — 헤더·메뉴에서만 사용 */
export const NOWON_FEDERATION_ABOUT_PATH = federationPublicPath(
  NOWON_FEDERATION_URL_SLUG,
  "about"
);

/** 레거시 문서 id 그대로 읽기 (slug alias 미적용 — 커버 등 병합용) */
export function federationDocById(
  firestore: Firestore,
  docId: string,
  ...pathSegments: string[]
): DocumentReference {
  const id = String(docId || "").trim();
  if (pathSegments.length === 0) {
    return doc(firestore, "federations", id);
  }
  return doc(firestore, "federations", id, ...pathSegments);
}

/** Firestore 협회 문서에서 커버/히어로 URL 추출 */
export function resolveFederationCoverUrl(data: Record<string, unknown> | null | undefined): string {
  if (!data) return "";
  const published =
    data.published && typeof data.published === "object"
      ? (data.published as Record<string, unknown>)
      : null;
  const draft =
    data.draft && typeof data.draft === "object" ? (data.draft as Record<string, unknown>) : null;
  const branding =
    data.branding && typeof data.branding === "object"
      ? (data.branding as Record<string, unknown>)
      : null;
  const candidates = [
    data.coverImageUrl,
    data.heroImage,
    data.coverImage,
    data.heroImageUrl,
    data.bannerUrl,
    data.bannerImage,
    published?.coverImageUrl,
    published?.heroImage,
    published?.coverImage,
    draft?.coverImageUrl,
    draft?.heroImage,
    branding?.coverImageUrl,
    branding?.heroImage,
  ];
  for (const v of candidates) {
    const s = String(v ?? "").trim();
    if (s && !s.includes("unsplash.com/photo-1574629810360")) return s;
  }
  return "";
}

/** Firestore 협회 문서에서 로고 URL 추출 */
export function resolveFederationLogoUrl(data: Record<string, unknown> | null | undefined): string {
  if (!data) return "";
  const published =
    data.published && typeof data.published === "object"
      ? (data.published as Record<string, unknown>)
      : null;
  const draft =
    data.draft && typeof data.draft === "object" ? (data.draft as Record<string, unknown>) : null;
  const branding =
    data.branding && typeof data.branding === "object"
      ? (data.branding as Record<string, unknown>)
      : null;
  const meta = data.meta && typeof data.meta === "object" ? (data.meta as Record<string, unknown>) : null;
  const candidates = [
    data.logoUrl,
    data.logoImage,
    data.logo,
    published?.logoUrl,
    published?.logoImage,
    draft?.logoUrl,
    draft?.logoImage,
    branding?.logoUrl,
    meta?.logoUrl,
  ];
  for (const v of candidates) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function pickPresidentPhoto(data: Record<string, unknown> | null | undefined): string {
  if (!data) return "";
  const president =
    data.president && typeof data.president === "object"
      ? (data.president as Record<string, unknown>)
      : null;
  const candidates = [
    data.chairpersonPhotoUrl,
    data.chairPhotoUrl,
    president?.photoUrl,
    president?.photo,
    president?.imageUrl,
  ];
  for (const v of candidates) {
    const s = String(v ?? "").trim();
    if (s) return s;
  }
  return "";
}

function pickChairPhotoFromEmbeddedExecutives(data: Record<string, unknown> | null | undefined): string {
  if (!data) return "";
  const org =
    data.organization && typeof data.organization === "object"
      ? (data.organization as Record<string, unknown>)
      : null;
  const rows = Array.isArray(org?.executives)
    ? org.executives
    : Array.isArray(data.executives)
      ? data.executives
      : [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const exec = row as Record<string, unknown>;
    const role = String(exec.role || "").trim();
    if (!/(회장|협회장|chairman|president)/i.test(role)) continue;
    const url = String(exec.photo || exec.photoUrl || exec.imageUrl || "").trim();
    if (url) return url;
  }
  return "";
}

/** Firestore 협회 문서에서 협회장 사진 URL 추출 */
export function resolveFederationChairpersonPhotoUrl(
  data: Record<string, unknown> | null | undefined
): string {
  if (!data) return "";
  const published =
    data.published && typeof data.published === "object"
      ? (data.published as Record<string, unknown>)
      : null;
  const draft =
    data.draft && typeof data.draft === "object" ? (data.draft as Record<string, unknown>) : null;
  const live =
    data.live && typeof data.live === "object" ? (data.live as Record<string, unknown>) : null;
  const candidates = [
    pickPresidentPhoto(data),
    pickPresidentPhoto(published),
    pickPresidentPhoto(draft),
    pickPresidentPhoto(live),
    pickChairPhotoFromEmbeddedExecutives(data),
    pickChairPhotoFromEmbeddedExecutives(published),
    pickChairPhotoFromEmbeddedExecutives(draft),
    pickChairPhotoFromEmbeddedExecutives(live),
  ];
  for (const url of candidates) {
    if (url) return url;
  }
  return "";
}

/** placeholder region → 표시용 지역 (문서 name 기반) */
export function resolveFederationRegionLabel(data: Record<string, unknown> | null | undefined): string {
  if (!data) return "";
  const region = String(data.region || "").trim();
  if (region && region !== "지역 설정 예정") return region;
  const name = String(data.name || "").trim();
  if (name.includes("노원")) return "서울 노원구";
  if (name.includes("중랑")) return "서울 중랑구";
  return region;
}

export function federationDoc(
  firestore: Firestore,
  urlSlug: string,
  ...pathSegments: string[]
): DocumentReference {
  const docId = resolveFederationFirestoreId(urlSlug);
  if (pathSegments.length === 0) {
    return doc(firestore, "federations", docId);
  }
  return doc(firestore, "federations", docId, ...pathSegments);
}

export function federationCol(
  firestore: Firestore,
  urlSlug: string,
  ...pathSegments: string[]
): CollectionReference {
  const docId = resolveFederationFirestoreId(urlSlug);
  return collection(firestore, "federations", docId, ...pathSegments);
}

/** 팀 문서가 실제로 저장된 federations/{docId} (노원 legacy 포함) */
export async function resolveFederationTeamStorageDocId(
  firestore: Firestore,
  urlSlug: string,
  teamId: string
): Promise<string> {
  const tid = String(teamId || "").trim();
  if (!tid) return resolveFederationFirestoreId(urlSlug);
  for (const docId of collectFederationOperationalDocIds(urlSlug)) {
    try {
      const snap = await getDoc(doc(firestore, "federations", docId, "teams", tid));
      if (snap.exists()) return docId;
    } catch {
      /* ignore */
    }
  }
  return resolveFederationFirestoreId(urlSlug);
}
