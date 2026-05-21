/**
 * 🔥 marketService - 마켓 조회 서비스 (1원화)
 * 
 * 역할:
 * - 마켓 게시글 조회를 단일 서비스로 통일
 * - 허브 탭/전역 거래/레거시 페이지 모두 동일 서비스 사용
 * - 데이터 일관성 보장
 * 
 * 사용처:
 * - /sports/:sport/market (종목 마켓 리스트)
 * - /trade (전역 거래)
 * - /soccer/market (레거시 - 리다이렉트 후 동일 서비스)
 */

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  type QueryDocumentSnapshot,
  type QueryConstraint,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost } from "@/types/market";

/** URL `sort` — Firestore와 맞는 것만 서버 정렬·커서, 나머지는 서비스 내 폴백 */
export type MarketListSort = "latest" | "price_low" | "price_high" | "views";

/** `/sports/:sport/market?category=` — `all`이면 필터 없음 */
export type MarketListCategoryFilter = "all" | "equipment" | "recruit" | "match";

export function normalizeMarketListCategory(
  raw: string | null | undefined
): MarketListCategoryFilter {
  if (raw === "equipment" || raw === "recruit" || raw === "match") return raw;
  return "all";
}

export interface MarketQueryParams {
  sport?: string | null;
  category?: string | null;
  status?: string[] | null;
  limit?: number;
  orderBy?: "createdAt" | "rankScore" | "views";
  orderDirection?: "asc" | "desc";
}

export interface MarketPostsPageParams {
  sport: string;
  sort?: MarketListSort;
  /** `marketPosts.category` — `all`/미지정이면 where 생략 */
  category?: string | null;
  status?: string[] | null;
  pageSize?: number;
  /** 이전 페이지 마지막 문서 (동일 `sort` 기준) */
  startAfterDoc?: QueryDocumentSnapshot | null;
}

export interface MarketPostsPageResult {
  items: MarketPost[];
  /** 다음 `startAfter`에 넘길 마지막 문서 (없으면 더 없음) */
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
  /** 복합 인덱스 미배포 등으로 쿼리가 막힌 경우(빈 목록과 구분용 힌트) */
  indexUnavailable?: boolean;
}

const DEFAULT_LIST_STATUS = ["active", "open", "reserved", "completed"];

export function normalizeMarketListSort(raw: string | null | undefined): MarketListSort {
  if (raw === "price_low" || raw === "price_high" || raw === "views" || raw === "latest") {
    return raw;
  }
  return "latest";
}

function mapMarketPostDoc(doc: QueryDocumentSnapshot): MarketPost {
  const data = doc.data();
  return { id: doc.id, ...data } as MarketPost;
}

function listOrderField(sort: MarketListSort): { field: "createdAt" | "price" | "viewCount"; direction: "asc" | "desc" } {
  switch (sort) {
    case "price_low":
      return { field: "price", direction: "asc" };
    case "price_high":
      return { field: "price", direction: "desc" };
    case "views":
      return { field: "viewCount", direction: "desc" };
    default:
      return { field: "createdAt", direction: "desc" };
  }
}

/**
 * 🔥 마켓 게시글 조회 (통합 서비스)
 * 
 * @param params 쿼리 파라미터
 * @returns 마켓 게시글 배열
 */
export async function fetchMarketPosts(params: MarketQueryParams = {}): Promise<MarketPost[]> {
  try {
    const {
      sport = null,
      category = null,
      status = ["active", "open"],
      limit: limitCount = 30,
      orderBy: orderByField = "createdAt",
      orderDirection = "desc",
    } = params;

    // 🔥 marketPosts 컬렉션 사용 (통일)
    let q = query(
      collection(db, "marketPosts"),
      where("status", "in", status),
      orderBy(orderByField, orderDirection),
      limit(limitCount * 2) // Shadow Ban 필터링을 위해 여유있게 가져옴
    );

    // 🔥 sport 필터 추가
    // - 종목별 허브에서는 해당 종목 글만 표시 (전종목/잡화는 /market에서 필터)
    if (sport && sport !== "all") {
      q = query(q, where("sport", "==", sport));
    }

    // 🔥 category 필터 추가
    if (category && category !== "all") {
      q = query(q, where("category", "==", category));
    }

    const snapshot = await getDocs(q);

    // 🔥 데이터 매핑 + Shadow Ban 필터링
    const posts: MarketPost[] = snapshot.docs
      .map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
        } as MarketPost;
      })
      .filter((post: any) => !post.isShadowBanned)
      .slice(0, limitCount); // 최종 개수 제한

    console.log(`✅ [marketService] 조회 완료: ${posts.length}개 게시글`, {
      sport,
      category,
      status,
    });

    return posts;
  } catch (err: any) {
    // 🔥 인덱스 에러는 조용히 처리 (나중에 인덱스 생성하면 해결됨)
    if (err?.code === "failed-precondition" || err?.message?.includes("index")) {
      console.debug("⚠️ [marketService] 인덱스 필요 (무시):", err?.message);
      return []; // 빈 배열 반환 (EmptyState 표시)
    }
    
    console.error("❌ [marketService] 조회 실패:", err);
    throw err;
  }
}

/**
 * 종목 마켓 리스트 페이지네이션 (`marketPosts`)
 * - 동일 `sort`로만 `startAfter` 체인 유지
 * - Shadow Ban 제거 후 `pageSize`개까지 슬라이스
 */
export async function fetchMarketPostsPage(
  params: MarketPostsPageParams
): Promise<MarketPostsPageResult> {
  const {
    sport,
    sort: sortRaw = "latest",
    category: categoryRaw = null,
    status = DEFAULT_LIST_STATUS,
    pageSize = 20,
    startAfterDoc = null,
  } = params;

  const categoryFilter = normalizeMarketListCategory(categoryRaw ?? undefined);

  if (!sport || sport === "all") {
    return { items: [], lastDoc: null, hasMore: false, indexUnavailable: false };
  }

  const sort = normalizeMarketListSort(sortRaw);
  const { field, direction } = listOrderField(sort);
  const fetchBuffer = pageSize + 12;

  try {
    const constraints: QueryConstraint[] = [where("sport", "==", sport)];
    if (categoryFilter !== "all") {
      constraints.push(where("category", "==", categoryFilter));
    }
    constraints.push(
      where("status", "in", status),
      orderBy(field, direction),
      limit(fetchBuffer)
    );
    if (startAfterDoc) {
      constraints.push(startAfter(startAfterDoc));
    }

    const snapshot = await getDocs(query(collection(db, "marketPosts"), ...constraints));

    const pairs = snapshot.docs
      .map((d) => ({ doc: d, post: mapMarketPostDoc(d) }))
      .filter((row) => !(row.post as { isShadowBanned?: boolean }).isShadowBanned);

    const page = pairs.slice(0, pageSize);
    const items = page.map((p) => p.post);
    const lastRow = page[page.length - 1];
    const lastDoc = lastRow ? lastRow.doc : null;
    const hasMore =
      pairs.length > pageSize ||
      (items.length === pageSize && snapshot.docs.length >= fetchBuffer);

    return { items, lastDoc, hasMore, indexUnavailable: false };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    const message = String((err as { message?: string })?.message ?? "");
    if (code === "failed-precondition" || message.includes("index")) {
      if (import.meta.env.DEV) {
        console.warn("⚠️ [marketService] fetchMarketPostsPage 인덱스 필요:", message);
      } else {
        console.debug("⚠️ [marketService] fetchMarketPostsPage 인덱스 필요");
      }
      return { items: [], lastDoc: null, hasMore: false, indexUnavailable: true };
    }
    console.error("❌ [marketService] fetchMarketPostsPage 실패:", err);
    throw err;
  }
}

/**
 * 단일 마켓 글 (`marketPosts`) — 상세·미리보기 등
 *
 * @param postId 게시글 ID
 */
export async function fetchMarketPost(postId: string): Promise<MarketPost | null> {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const postRef = doc(db, "marketPosts", postId);
    const postSnap = await getDoc(postRef);

    if (!postSnap.exists()) {
      return null;
    }

    return {
      id: postSnap.id,
      ...postSnap.data(),
    } as MarketPost;
  } catch (err: any) {
    console.error("❌ [marketService] 단일 조회 실패:", err);
    return null;
  }
}

export const getMarketPost = fetchMarketPost;
