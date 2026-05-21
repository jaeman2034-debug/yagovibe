/**
 * 🔥 ActivityFeed - Activity 피드 컴포넌트 (v1 아키텍처)
 * 
 * 역할:
 * - activities 컬렉션만 조회 (activityLogs 제거)
 * - 전체 커뮤니티 피드 (visibility: "public")
 * - 실시간 업데이트 (onSnapshot)
 * - 최신순 정렬
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useParams, useLocation } from "react-router-dom";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  where,
  limit,
  startAfter,
  getDocs,
  getDoc,
  doc,
} from "firebase/firestore";
import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import ActivityCard from "./ActivityCard";
import type { Activity, ActivityType } from "@/types/activity";

interface ActivityFeedProps {
  filter?: "all" | "market" | "team" | "event" | "전체" | "거래" | "팀" | "이벤트";
}

export default function ActivityFeed({ filter: propFilter }: ActivityFeedProps = {}) {
  // 🔥 디버그: ActivityFeed 마운트 확인
  useEffect(() => {
    console.log("🔥 ActivityFeed mounted");
  }, []);

  const location = useLocation();
  
  // 🔥 작성 페이지에서는 쿼리 실행 금지 (무한루프 방지)
  const isCreatePage = location.pathname.includes("/create");
  
  const [items, setItems] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "market" | "team" | "event" | "전체" | "거래" | "팀" | "이벤트">(propFilter || "all");
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // 🔥 무한루프 방지: lastDoc를 ref로도 관리 (loadMore에서 사용)
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // 🔥 props로 받은 filter가 있으면 사용, 없으면 내부 state 사용
  const activeFilter = propFilter || filter;

  // 🔥 URL에서 sport 파라미터 읽기 (정규화: 대소문자, 공백 제거)
  const [searchParams] = useSearchParams();
  const { sport: sportParam } = useParams<{ sport?: string }>();
  const sportRaw = searchParams.get("sport") || sportParam || null;
  const sport = sportRaw ? sportRaw.toLowerCase().trim() : null;

  // 🔥 초기 로드 및 필터/sport 변경 시 (무한루프 방지: 초기화와 로드를 하나의 useEffect로 통합)
  useEffect(() => {
    // 🔥 작성 페이지에서는 쿼리 실행 금지 (ActivityCreate는 폼 전용)
    if (isCreatePage) {
      console.log("⏭️ [ActivityFeed] 작성 페이지 감지 - 쿼리 실행 스킵:", location.pathname);
      console.log("⏭️ [ActivityFeed] ActivityCreate는 폼 전용 페이지입니다. ActivityFeed 쿼리를 실행하지 않습니다.");
      setItems([]);
      setLoading(false);
      return;
    }
    
    // 🔥 필터 또는 sport 변경 시 초기화 (로딩 중에는 items 유지하여 깜빡임 방지)
        // setItems([]); // 🔥 초기화 제거 - 로딩 중에도 이전 데이터 유지
        setLastDoc(null);
        lastDocRef.current = null; // 🔥 ref도 초기화
        setHasMore(true);
    
    const loadInitial = async () => {
      try {
        setLoading(true);
        
        const user = auth.currentUser;
        if (!user) {
          setItems([]);
          setLoading(false);
          return;
        }
        
        // 🔥 activities 컬렉션에서 Activity 조회 (전체 데이터 - 클라이언트에서 필터링)
        const activitiesConditions: any[] = [];
        
        // 🔥 전체 커뮤니티 피드: visibility == "public"만 조회
        activitiesConditions.push(where("visibility", "==", "public"));
        
        // 🔥 sport 필터 제거 - 클라이언트에서 처리
        // 🔥 탭 필터 제거 - 클라이언트에서 처리
        
        // 🔥 정렬 및 제한 추가 (orderBy는 마지막에)
        activitiesConditions.push(orderBy("createdAt", "desc"));
        activitiesConditions.push(limit(30)); // 더 많은 데이터 가져오기 (클라이언트 필터링 대비)
        
        // 🔥 쿼리 구성: activities 컬렉션 사용 (activityLogs 제거)
        const activitiesQuery = query(
          collection(db, "activities"),
          ...activitiesConditions
        );

        const activitiesSnap = await getDocs(activitiesQuery);
        
        // 🔥 디버그: 쿼리 결과 확인
        console.log("🔥 [ActivityFeed] query results:", {
          queryConditions: activitiesConditions.length,
          conditions: activitiesConditions.map(c => {
            if (c.type === 'where') {
              return `${c.fieldPath} ${c.opStr} ${c.value}`;
            }
            if (c.type === 'orderBy') {
              return `orderBy(${c.fieldPath}, ${c.direction})`;
            }
            if (c.type === 'limit') {
              return `limit(${c.limit})`;
            }
            return c.type;
          }),
          sportFilter: sport,
          typeFilter: activeFilter,
          resultCount: activitiesSnap.docs.length,
        });
        
        // 🔥 디버깅: 실제 조회된 문서의 type 값 확인
        if (activitiesSnap.docs.length > 0) {
          const types = activitiesSnap.docs.map(d => d.data().type).filter(Boolean);
          const uniqueTypes = [...new Set(types)];
          console.log("📊 [ActivityFeed] 조회된 문서의 type 값들:", uniqueTypes);
          console.log("📊 [ActivityFeed] 각 type별 개수:", types.reduce((acc, t) => {
            acc[t] = (acc[t] || 0) + 1;
            return acc;
          }, {} as Record<string, number>));
        } else {
          console.warn("⚠️ [ActivityFeed] 조회된 문서가 없습니다. 필터 조건을 확인하세요.");
          console.warn("⚠️ [ActivityFeed] 필터 조건:", {
            visibility: "public",
            type: activeFilter === "market" ? "market_created" : activeFilter,
            sport: sport || "없음",
          });
        }
        
        // 🔥 디버그: 쿼리 결과 상세 (임시)
        console.log("📋 [ActivityFeed] 쿼리 결과 상세:", {
          results: activitiesSnap.docs.map(d => ({
            id: d.id,
            data: {
              type: d.data().type,
              sourceType: d.data().sourceType,
              sport: d.data().sport,
              title: d.data().title,
              authorId: d.data().authorId,
              createdAt: d.data().createdAt
            }
          }))
        });
        
        // 🔥 activities 문서를 Activity 형식으로 변환 (v1 스키마)
        const activitiesListResults = await Promise.allSettled(
          activitiesSnap.docs.map(async (d) => {
            try {
              const data = d.data();
              
              // 🔥 v1 스키마 기반 변환
              return {
                id: d.id,
                type: data.type || "market_created",
                refType: data.refType || "market",
                refId: data.refId || d.id,
                authorId: data.authorId || "",
                authorName: data.authorName || undefined,
                authorPhotoUrl: data.authorPhotoUrl || undefined,
                teamId: data.teamId || undefined,
                teamName: data.teamName || undefined,
                title: data.title || "",
                summary: data.summary || undefined,
                thumbnailUrl: data.thumbnailUrl || undefined,
                visibility: data.visibility || "public",
                likeCount: data.likeCount || 0,
                commentCount: data.commentCount || 0,
                createdAt: data.createdAt,
                // 호환성 필드
                sport: data.sport || "",
                category: data.category || undefined,
                address: data.address || undefined,
                // 레거시 호환성
                sourceId: data.refId || d.id,
                sourceType: data.refType || "market",
              } as Activity;
            } catch (err) {
              console.error("❌ [ActivityFeed] Activity 변환 실패:", err, d.id);
              return null;
            }
          })
        );
        
        // 🔥 성공한 항목만 필터링
        const activitiesList: Activity[] = activitiesListResults
          .filter((result): result is PromiseFulfilledResult<Activity> => 
            result.status === "fulfilled" && result.value !== null
          )
          .map((result) => result.value);
        
        console.log("🔥 [ActivityFeed] 변환된 activities:", {
          originalCount: activitiesSnap.docs.length,
          convertedCount: activitiesList.length,
          activities: activitiesList.map(a => ({
            id: a.id,
            title: a.title,
              type: a.type,
              refType: (a as any).refType || (a as any).sourceType,
              sport: a.sport
          }))
        });
        
        setItems(activitiesList);
        setHasMore(activitiesSnap.docs.length === 20);
        if (activitiesSnap.docs.length > 0) {
          const newLastDoc = activitiesSnap.docs[activitiesSnap.docs.length - 1];
          setLastDoc(newLastDoc);
          lastDocRef.current = newLastDoc; // 🔥 ref도 동기화
        } else {
          lastDocRef.current = null; // 🔥 빈 결과면 ref도 null
        }
      } catch (error: any) {
        console.error("❌ [ActivityFeed] 초기 로드 실패:", error);
        // 🔥 인덱스 에러 처리 및 사용자에게 안내
        if (error?.code === "failed-precondition" || error?.message?.includes("index") || error?.message?.includes("requires an index")) {
          // 인덱스 생성 링크 추출
          const indexUrlMatch = error?.message?.match(/https:\/\/console\.firebase\.google\.com[^\s\)]+/);
          
          console.error("=".repeat(80));
          console.error("🚨🚨🚨 [ActivityFeed] Firestore 인덱스가 필요합니다! 🚨🚨🚨");
          console.error("=".repeat(80));
          
          if (indexUrlMatch?.[0]) {
            console.error("🔗 인덱스 생성 링크 (클릭하세요):");
            console.error(`   ${indexUrlMatch[0]}`);
            console.error("");
            console.error("📋 인덱스 생성 방법:");
            console.error("   1. 위 링크를 클릭하세요");
            console.error("   2. 'Create Index' 버튼 클릭");
            console.error("   3. 인덱스 생성 완료까지 30초~3분 대기");
            console.error("   4. 페이지 새로고침");
          } else {
            console.error("📋 필요한 인덱스:");
            console.error("   Collection: activities");
            console.error("   Fields:", [
              { field: "visibility", order: "ASCENDING" },
              ...(sport ? [{ field: "sport", order: "ASCENDING" }] : []),
              ...(activeFilter !== "all" ? [{ field: "type", order: "ASCENDING" }] : []),
              { field: "createdAt", order: "DESCENDING" },
            ]);
            console.error("");
            console.error("🔗 Firebase Console:");
            console.error("   https://console.firebase.google.com/project/yago-vibe-spt/firestore/indexes");
            console.error("");
            console.error("📋 수동 생성 방법:");
            console.error("   1. Firebase Console → Firestore → Indexes 탭");
            console.error("   2. 'Create Index' 버튼 클릭");
            console.error("   3. 위 필드 순서대로 추가");
            console.error("   4. 인덱스 생성 완료까지 대기");
          }
          console.error("=".repeat(80));
          
          // 🔥 인덱스 에러 시 빈 배열 반환 (에러 화면 대신 빈 상태 표시)
          setItems([]);
        } else {
          // 🔥 다른 에러는 그대로 표시
          console.error("❌ [ActivityFeed] 예상치 못한 에러:", error);
          setItems([]);
        }
      } finally {
        setLoading(false);
      }
    };

    void loadInitial();
  }, [activeFilter, isCreatePage, location.pathname]); // 🔥 sport 제거 - 클라이언트 필터링이므로 Firestore 쿼리 변경 불필요

  // 🔥 무한스크롤: 더 불러오기 (useCallback으로 안정화하여 무한루프 방지)
  // 🔥 핵심: lastDoc를 dependency에서 제거하고 ref로 참조 (무한루프 방지)
  const loadMore = useCallback(async () => {
    const currentLastDoc = lastDocRef.current; // 🔥 ref에서 최신 값 가져오기
    if (loadingMore || !hasMore || !currentLastDoc) return;

    try {
      setLoadingMore(true);
      
      const user = auth.currentUser;
      if (!user) {
        setHasMore(false);
        return;
      }
      
      // 🔥 activities 컬렉션에서 Activity 조회 (전체 데이터 - 클라이언트에서 필터링)
      const activitiesConditions: any[] = [];
      
      // 🔥 전체 커뮤니티 피드: visibility == "public"만 조회
      activitiesConditions.push(where("visibility", "==", "public"));
      
      // 🔥 sport 필터 제거 - 클라이언트에서 처리
      // 🔥 탭 필터 제거 - 클라이언트에서 처리
      
      // 🔥 정렬, startAfter, 제한 추가 (orderBy는 마지막에)
      activitiesConditions.push(orderBy("createdAt", "desc"));
      activitiesConditions.push(startAfter(currentLastDoc)); // 🔥 ref 값 사용
      activitiesConditions.push(limit(30)); // 더 많은 데이터 가져오기 (클라이언트 필터링 대비)
      
      // 🔥 쿼리 구성: activities 컬렉션 사용 (v1 아키텍처)
      const activitiesQuery = query(
        collection(db, "activities"),
        ...activitiesConditions
      );

      let activitiesSnap = await getDocs(activitiesQuery);
      
      // 🔥 디버그: loadMore 쿼리 결과 확인
      console.log("🔥 [ActivityFeed] loadMore query results:", {
        queryConditions: activitiesConditions.length,
        sportFilter: sport,
        typeFilter: activeFilter,
        resultCount: activitiesSnap.docs.length,
      });
      
      // 🔥 디버깅: 실제 조회된 문서의 type 값 확인
      if (activitiesSnap.docs.length > 0) {
        const types = activitiesSnap.docs.map(d => d.data().type).filter(Boolean);
        const uniqueTypes = [...new Set(types)];
        console.log("📊 [ActivityFeed] loadMore 조회된 문서의 type 값들:", uniqueTypes);
      } else {
        console.warn("⚠️ [ActivityFeed] loadMore: 조회된 문서가 없습니다.");
      }
      
      // 🔥 activities 문서를 Activity 형식으로 변환 (v1 스키마)
      const newItemsResults = await Promise.allSettled(
        activitiesSnap.docs.map(async (d) => {
          try {
            const data = d.data();
            
            // 🔥 v1 스키마 기반 변환
            return {
              id: d.id,
              type: data.type || "market_created",
              refType: data.refType || "market",
              refId: data.refId || d.id,
              authorId: data.authorId || "",
              authorName: data.authorName || undefined,
              authorPhotoUrl: data.authorPhotoUrl || undefined,
              teamId: data.teamId || undefined,
              teamName: data.teamName || undefined,
              title: data.title || "",
              summary: data.summary || undefined,
              thumbnailUrl: data.thumbnailUrl || undefined,
              visibility: data.visibility || "public",
              likeCount: data.likeCount || 0,
              commentCount: data.commentCount || 0,
              createdAt: data.createdAt,
              // 호환성 필드
              sport: data.sport || "",
              category: data.category || undefined,
              address: data.address || undefined,
              // 레거시 호환성
              sourceId: data.refId || d.id,
              sourceType: data.refType || "market",
            } as Activity;
          } catch (err) {
            console.error("❌ [ActivityFeed] Activity 변환 실패:", err, d.id);
            return null;
          }
        })
      );
      
      // 🔥 성공한 항목만 필터링
      const newItems: Activity[] = newItemsResults
        .filter((result): result is PromiseFulfilledResult<Activity> => 
          result.status === "fulfilled" && result.value !== null
        )
        .map((result) => result.value);

      setItems((prev) => [...prev, ...newItems]);
      setHasMore(activitiesSnap.docs.length === 20);
      if (activitiesSnap.docs.length > 0) {
        const newLastDoc = activitiesSnap.docs[activitiesSnap.docs.length - 1];
        setLastDoc(newLastDoc);
        lastDocRef.current = newLastDoc; // 🔥 ref도 동기화
      } else {
        setHasMore(false);
        lastDocRef.current = null; // 🔥 빈 결과면 ref도 null
      }
    } catch (error: any) {
      console.error("❌ [ActivityFeed] 더 불러오기 실패:", error);
      // 🔥 인덱스 에러 처리
      if (error?.code === "failed-precondition" || error?.message?.includes("index") || error?.message?.includes("requires an index")) {
        console.warn("⚠️ [ActivityFeed] Firestore 인덱스가 필요합니다.");
      }
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, activeFilter]); // 🔥 sport 제거 - 클라이언트 필터링이므로 Firestore 쿼리 변경 불필요

  // 🔥 Intersection Observer로 하단 감지 (무한루프 방지: loadMore만 dependency에 포함)
  useEffect(() => {
    if (!loadMoreRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          void loadMore();
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadMoreRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMore]); // 🔥 loadMore는 useCallback으로 안정화되어 있으므로 dependency에 포함

  if (loading) {
    return (
      <div className="text-center text-gray-400 py-10">로딩 중...</div>
    );
  }

  // 🔥 필터 라벨 매핑
  const filterLabels: Record<string, string> = {
    all: "전체",
    market: "거래",
    team: "팀",
    event: "이벤트",
  };

  return (
    <div className="space-y-3 p-4">
      {/* 🔥 필터 탭 (props로 filter를 받은 경우 숨김, 내부 state 사용 시만 표시) */}
      {!propFilter && (
        <div className="flex gap-2 p-3 bg-white rounded-lg border border-gray-200 sticky top-0 z-10">
          {(["all", "market", "team", "event"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full border transition-colors text-sm font-medium ${
                filter === f
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
      )}

      {/* 🔥 활동 리스트 */}
      {(() => {
        // 🔥 sport 값 정규화 매핑 (한글 → 영문)
        const sportMap: Record<string, string> = {
          "축구": "soccer",
          "야구": "baseball",
          "농구": "basketball",
          "배구": "volleyball",
          "배드민턴": "badminton",
          "테니스": "tennis",
          "러닝": "running",
          "사이클": "cycling",
          "수영": "swimming",
          "골프": "golf",
          "헬스": "fitness",
        };

        // 🔥 클라이언트 사이드 필터링
        const filteredActivities = items
          // 1. system 타입 제외 (클라이언트 필터링)
          .filter((activity) => {
            const activityType = (activity as any).type || "";
            return activityType !== "system";
          })
          // 2. sport 필터 (URL 파라미터가 있을 때만) - 정규화 로직 포함
          .filter((activity) => {
            if (!sport) return true;
            
            // 🔥 Activity의 sport 값 정규화
            const activitySportValue = activity.sport || "";
            const activitySport = sportMap[activitySportValue] || activitySportValue;
            
            // 🔥 URL 파라미터도 정규화
            const normalizedSportParam = sportMap[sport] || sport;
            
            return activitySport === normalizedSportParam.toLowerCase().trim();
          })
          // 3. 탭 필터 (refType + type 기준)
          .filter((activity) => {
            if (activeFilter === "all" || activeFilter === "전체") return true;
            
            if (activeFilter === "market" || activeFilter === "거래") {
              const t = (activity as any).type || "";
              // 레거시 데이터(refType=market) 중 match_*는 거래 탭에서 제외
              if (t === "match_created" || t === "match_join_requested" || t === "match_confirmed") {
                return false;
              }
              return (activity as any).refType === "market";
            }
            
            if (activeFilter === "team" || activeFilter === "팀") {
              // 🔥 팀 필터: refType 또는 type으로 판단 (더 관대한 필터)
              const refType = (activity as any).refType;
              const activityType = (activity as any).type || "";
              
              return (
                refType === "teams" ||
                refType === "team" ||  // 레거시 호환
                activityType === "team_created" ||
                activityType === "recruit_created" ||  // 팀 모집
                activityType.includes("team")  // 안전장치
              );
            }
            
            if (activeFilter === "event" || activeFilter === "이벤트") {
              return (activity as any).refType === "events";
            }
            
            return true;
          });

        if (loading) {
          return <div className="text-center text-gray-400 py-10">로딩 중...</div>;
        }

        if (filteredActivities.length === 0) {
          return (
            <div className="text-center text-gray-400 py-10">
              활동이 없습니다
            </div>
          );
        }

        return (
          <>
            {filteredActivities.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          
            {/* 🔥 무한스크롤 트리거 */}
            {hasMore && (
              <div ref={loadMoreRef} className="py-4 text-center">
                {loadingMore ? (
                  <div className="text-sm text-gray-400">더 불러오는 중...</div>
                ) : (
                  <div className="text-sm text-gray-400">스크롤하여 더 보기</div>
                )}
              </div>
            )}
          
            {!hasMore && filteredActivities.length > 0 && (
              <div className="text-center text-gray-400 py-4 text-sm">
                모든 활동을 불러왔습니다
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}
