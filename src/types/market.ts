import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

const normalizeNumber = (value: unknown): number | undefined => {
  if (value == null) return undefined;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const numeric = Number(value.replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }
  return undefined;
};

export interface MarketProduct {
  id: string;
  name: string;
  price?: number;
  imageUrl?: string;
  images?: string[];
  gallery?: string[];
  category?: string | null;
  location?: string | null;
  region?: string | null;
  distance?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  description?: string | null;
  summary?: string | null;
  aiSummary?: string | null;
  aiLabels?: string[];
  aiTags?: string[];
  createdAt?: any;
  timeAgo?: string;
  // 정렬/추천 엔진용 필드
  photoCount?: number; // 이미지 개수 (품질 점수용)
  hasDescription?: boolean; // 설명 있음/없음
  viewCount?: number; // 조회수 또는 인기 지표
  // 주소 (Kakao API로 변환된 행정동 주소)
  address?: string | null;
  // 행정동 (Google Geocoding API로 변환된 동 이름)
  dong?: string | null;
  // AI 한줄 요약 (리스트용)
  aiOneLine?: string | null;
}

export const parseMarketProduct = (
  doc: QueryDocumentSnapshot<DocumentData>
): MarketProduct => {
  const data = doc.data() ?? {};

  const images = Array.isArray(data.images)
    ? (data.images as unknown[]).filter(
        (src): src is string => typeof src === "string" && src.length > 0
      )
    : [];

  const gallery = Array.isArray(data.gallery)
    ? (data.gallery as unknown[]).filter(
        (src): src is string => typeof src === "string" && src.length > 0
      )
    : [];

  const aiLabels = Array.isArray(data.aiLabels)
    ? (data.aiLabels as unknown[]).filter(
        (tag): tag is string => typeof tag === "string" && tag.length > 0
      )
    : [];

  const aiTags = Array.isArray(data.aiTags)
    ? (data.aiTags as unknown[]).filter(
        (tag): tag is string => typeof tag === "string" && tag.length > 0
      )
    : [];

  const tags = Array.isArray(data.tags)
    ? (data.tags as unknown[]).filter(
        (tag): tag is string => typeof tag === "string" && tag.length > 0
      )
    : [];

  // tags 우선, 없으면 aiTags, aiLabels 순서로 병합
  const mergedTags = tags.length > 0 
    ? tags 
    : Array.from(new Set([...aiLabels, ...aiTags]));

  const directImage = [
    data.imageURL,
    data.imageUrl,
    data.image,
    data.img,
    data.thumbnailUrl,
    data.thumbnail,
  ].find((value): value is string => typeof value === "string" && value.length > 0);

  const allImages = [...images, ...gallery];
  const photoCount = allImages.length;
  const hasDescription = !!(
    typeof data.description === "string" && data.description.length > 0
  ) || !!(
    typeof data.desc === "string" && data.desc.length > 0
  ) || !!(
    typeof data.summary === "string" && data.summary.length > 0
  );

  return {
    id: doc.id,
    name: typeof data.name === "string" ? data.name : "",
    price: normalizeNumber(data.price),
    imageUrl: directImage || images[0] || gallery[0] || undefined,
    images: images.length ? images : undefined,
    gallery: gallery.length ? gallery : undefined,
    category: typeof data.category === "string" ? data.category : null,
    location: typeof data.location === "string" ? data.location : null,
    region: typeof data.region === "string" ? data.region : null,
    distance: typeof data.distance === "string" ? data.distance : null,
    // latitude/longitude 또는 lat/lng 모두 지원 (대소문자 변형 포함)
    latitude: normalizeNumber(data.latitude) ?? normalizeNumber(data.Latitude) ?? normalizeNumber(data.lat) ?? normalizeNumber(data.Lat) ?? null,
    longitude: normalizeNumber(data.longitude) ?? normalizeNumber(data.Longitude) ?? normalizeNumber(data.lng) ?? normalizeNumber(data.Lng) ?? null,
    description:
      typeof data.description === "string"
        ? data.description
        : typeof data.desc === "string"
        ? data.desc
        : null,
    summary: typeof data.summary === "string" ? data.summary : null,
    aiSummary: typeof data.aiSummary === "string" ? data.aiSummary : null,
    aiLabels: mergedTags,
    aiTags: mergedTags,
    createdAt: data.createdAt ?? null,
    timeAgo: typeof data.timeAgo === "string" ? data.timeAgo : undefined,
    // 정렬/추천 엔진용 필드
    photoCount: photoCount > 0 ? photoCount : undefined,
    hasDescription: hasDescription || undefined,
    viewCount: normalizeNumber(data.viewCount) || normalizeNumber(data.views),
    userId: typeof data.userId === "string" ? data.userId : typeof data.ownerId === "string" ? data.ownerId : null,
    aiOneLine: typeof data.aiOneLine === "string" ? data.aiOneLine : null, // AI 한줄 요약 (리스트용)
  };
};

