/**
 * 🔥 Firestore 마켓 쿼리 훅
 */

import { useState, useEffect } from "react";
import type { QueryDocumentSnapshot } from "firebase/firestore";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../../../lib/firebase";
import type { MarketQueryParams, MarketPost } from "../types";

const DEFAULT_LIMIT = 20;

/**
 * 🔥 market 컬렉션 문서를 MarketPost로 변환하는 어댑터
 * market 컬렉션은 이미 MarketPost 구조와 일치하므로 직접 매핑
 */
function mapDocToMarketPost(doc: QueryDocumentSnapshot): MarketPost {
  const data = doc.data();
  
  // 🚨 보호 코드: marketProducts 컬렉션과 호환 (name → title 변환)
  const title = data.title || data.name || "";
  const images = data.images || data.imageUrls || (data.imageUrl ? [data.imageUrl] : []);
  const thumbnailUrl = data.thumbnailUrl || data.thumbnail;
  const sport = data.sport || "etc"; // 🔥 sport 필드 없으면 "기타"
  
  return {
    id: doc.id,
    sport: sport as any,
    category: data.category as any,
    title: title,
    description: data.description || data.desc || "",
    price: typeof data.price === "number" ? data.price : (data.price ? Number(data.price) : undefined),
    location: data.location || data.locationText || data.address || "",
    images: images,
    thumbnailUrl: thumbnailUrl || images[0],
    status: (data.status as any) || "active" || "open", // 🔥 status 필드 호환
    authorId: data.authorId || data.userId || data.ownerId || data.sellerId || "",
    authorName: data.authorName || undefined,
    createdAt: data.createdAt, // Firestore Timestamp 유지
    viewCount: data.viewCount || 0,
    likeCount: data.likeCount || 0,
    
    // 🔥 카테고리별 특화 필드
    // 중고 (equipment)
    condition: data.condition,
    brand: data.brand,
    
    // 모집 (recruit)
    people: data.people ? Number(data.people) : undefined,
    currentPeople: data.currentPeople ? Number(data.currentPeople) : undefined,
    position: data.position || undefined,
    level: data.level,
    ageRange: data.ageRange,
    practiceDay: data.practiceDay,
    practiceLocation: data.practiceLocation,
    
    // 매칭 (match)
    matchDate: data.matchDate,
    matchType: data.matchType,
    fee: data.fee ? Number(data.fee) : undefined,
  };
}

export async function fetchMarket({
  contextSport,
  view,
  category,
  limit: size = DEFAULT_LIMIT,
}: MarketQueryParams): Promise<MarketPost[]> {
  // 🔥 디버깅: 쿼리 파라미터 확인
  console.log("🔥 QUERY PARAM", {
    view,
    category,
    contextSport,
    size,
  });

  // 🔥 디버깅: 실제 조건 확인
  const sportFilter = view === "sport";
  const categoryFilter = category !== "all";
  console.log("🔥 실제 조건", {
    sportFilter,
    categoryFilter,
    willUseSportWhere: sportFilter,
    willUseCategoryWhere: categoryFilter,
  });

  // 🔥 market 컬렉션 사용 (종목 전용 마켓)
  // 인덱스와 1:1 대응하도록 쿼리 구조 분리
  
  let q;
  
  // 🔥 쿼리 케이스 1: 전체 탭 (sport + createdAt 인덱스 사용)
  if (category === "all" && view === "sport") {
    // 인덱스: sport ASC + createdAt DESC
    q = query(
      collection(db, "market"),
      where("sport", "==", contextSport),
      orderBy("createdAt", "desc"),
      limit(size)
    );
    console.log("🔥 쿼리 타입: 전체 탭 (sport + createdAt)");
  }
  // 🔥 쿼리 케이스 2: 카테고리 탭 (sport + category + createdAt 인덱스 사용)
  else if (category !== "all" && view === "sport") {
    // 인덱스: sport ASC + category ASC + createdAt DESC
    q = query(
      collection(db, "market"),
      where("sport", "==", contextSport),
      where("category", "==", category),
      orderBy("createdAt", "desc"),
      limit(size)
    );
    console.log("🔥 쿼리 타입: 카테고리 탭 (sport + category + createdAt)");
  }
  // 🔥 쿼리 케이스 3: 전종목 (공통 마켓용 - 인덱스 없이 사용)
  else {
    // 기본 쿼리: createdAt만 정렬 (인덱스 필요 없음)
    q = query(
      collection(db, "market"),
      orderBy("createdAt", "desc"),
      limit(size)
    );
    console.log("🔥 쿼리 타입: 전종목 (createdAt만)");
  }
  
  // 🔥 status 필터는 클라이언트 사이드에서 처리 (인덱스 복잡도 방지)
  // Firestore 쿼리 후 필터링

  // 🔥 최종 쿼리 구조 로그
  console.log("🔥 최종 쿼리 구조:", {
    collection: "market",
    whereConditions: [
      { field: "status", operator: "==", value: "open" },
      ...(sportFilter ? [{ field: "sport", operator: "==", value: contextSport }] : []),
      ...(categoryFilter ? [{ field: "category", operator: "==", value: category }] : []),
    ],
    orderBy: { field: "createdAt", direction: "desc" },
  });

  try {
    const snapshot = await getDocs(q);
    console.log("✅ [fetchMarket] 조회 결과:", snapshot.size, "개");
    
    // 🔥 데이터 매핑 (market 컬렉션은 이미 MarketPost 구조와 일치)
    // 🔥 핵심: doc.id를 반드시 사용 (Firestore 문서 ID)
    let posts = snapshot.docs.map((doc) => {
      const post = mapDocToMarketPost(doc);
      // 🔥 디버깅: ID 확인
      console.log("🔥 [fetchMarket] 문서 ID 확인:", {
        docId: doc.id,
        postId: post.id,
        일치여부: doc.id === post.id
      });
      return post;
    });
    
    // 🔥 status 필터 클라이언트 사이드 처리 (인덱스 복잡도 방지)
    // "open" 또는 "active" 모두 허용 (기존 글 호환)
    posts = posts.filter((post) => {
      const status = post.status;
      return status === "open" || status === "active" || !status; // status 없으면 허용
    });
    console.log("✅ [fetchMarket] status 필터 후:", posts.length, "개");
    
    return posts;
  } catch (error: any) {
    console.error("❌ [fetchMarket] 쿼리 오류:", error);
    // 인덱스 오류인 경우 안내
    if (error.code === "failed-precondition") {
      console.error("⚠️ Firestore 인덱스가 필요합니다. 콘솔 에러 메시지의 링크를 클릭하세요.");
    }
    throw error;
  }
}

export function useMarketQuery(params: MarketQueryParams) {
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔥 [useMarketQuery] 쿼리 시작:", params);
        const data = await fetchMarket(params);
        console.log("✅ [useMarketQuery] 데이터 로드 완료:", data.length, "개");
        setPosts(data);
        setHasMore(data.length === DEFAULT_LIMIT);
      } catch (err) {
        console.error("❌ [useMarketQuery] 데이터 페칭 실패:", err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [params.contextSport, params.view, params.category]);

  const loadMore = async () => {
    if (!hasMore || loading || !lastDoc) return;

    try {
      setLoading(true);

      // 🔥 market 컬렉션 사용 (종목 전용 마켓)
      // 인덱스와 1:1 대응하도록 쿼리 구조 분리
      let q;
      
      if (params.category === "all" && params.view === "sport") {
        // 인덱스: sport ASC + createdAt DESC
        q = query(
          collection(db, "market"),
          where("sport", "==", params.contextSport),
          orderBy("createdAt", "desc"),
          limit(DEFAULT_LIMIT)
        );
      } else if (params.category !== "all" && params.view === "sport") {
        // 인덱스: sport ASC + category ASC + createdAt DESC
        q = query(
          collection(db, "market"),
          where("sport", "==", params.contextSport),
          where("category", "==", params.category),
          orderBy("createdAt", "desc"),
          limit(DEFAULT_LIMIT)
        );
      } else {
        // 기본 쿼리
        q = query(
          collection(db, "market"),
          orderBy("createdAt", "desc"),
          limit(DEFAULT_LIMIT)
        );
      }

      const snapshot = await getDocs(q);
      
      // 🔥 데이터 매핑 + status 필터
      // 🔥 핵심: doc.id를 반드시 사용 (Firestore 문서 ID)
      let newPosts = snapshot.docs.map((doc) => {
        const post = mapDocToMarketPost(doc);
        // 🔥 디버깅: ID 확인
        console.log("🔥 [loadMore] 문서 ID 확인:", {
          docId: doc.id,
          postId: post.id,
          일치여부: doc.id === post.id
        });
        return post;
      });
      // 🔥 status 필터: "open" 또는 "active" 모두 허용 (기존 글 호환)
      newPosts = newPosts.filter((post) => {
        const status = post.status;
        return status === "open" || status === "active" || !status; // status 없으면 허용
      });

      setPosts(prev => [...prev, ...newPosts]);
      setHasMore(newPosts.length === DEFAULT_LIMIT);
    } catch (err) {
      console.error("❌ [useMarketQuery] 더보기 실패:", err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return { posts, loading, error, hasMore, loadMore };
}
