/**
 * 🔥 activityService - 활동 기록 서비스
 * 
 * 역할:
 * - 활동 기록 CRUD 작업
 * - Firestore activityHistory 컬렉션 관리
 * 
 * UX 목적:
 * - 기록 관리 기능 제공
 * - 데이터 일관성 유지
 */

import { collection, query, getDocs, orderBy, where, limit, doc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Activity, ActivityFilter } from "@/types/activity";
import { getDistanceKm, isValidLatLng, type LatLng } from "@/utils/geo";
import { toDate } from "@/utils/timeUtils";

/**
 * 🔥 모든 활동 기록 조회 (필터 및 정렬 지원)
 * 
 * @param filter 필터 옵션
 * @param sortType 정렬 타입
 * @param maxResults 최대 결과 수
 * @param currentLocation 현재 위치 (거리 계산용)
 * @returns 활동 기록 배열
 */
export const fetchAllActivities = async (
  filter?: ActivityFilter,
  sortType: "latest" | "distance" | "relevance" = "latest",
  maxResults: number = 50,
  currentLocation?: LatLng | null,
  typeFilter?: "TEAM" | "EVENT" | "MATCH" | "TRADE_ACTIVITY" | null
): Promise<Activity[]> => {
  try {
    // 🔥 activityLogs 컬렉션만 사용 (중앙 로그 - 모든 화면은 이 컬렉션을 필터링해서 보여줌)
    const activitiesRef = collection(db, "activityLogs");
    
    // 🔥 기본 쿼리: sport 필터 + 정렬
    const baseConstraints = [
      where("sport", "==", filter?.sport || "soccer"),
      orderBy("createdAt", "desc"),
      limit(maxResults),
    ];
    
    // 🔥 type 필터 추가 (탭별 필터링)
    const typeWhere = typeFilter 
      ? where("type", "==", typeFilter)
      : null;
    
    // 🔥 최종 쿼리 구성
    const q = typeWhere
      ? query(activitiesRef, where("sport", "==", filter?.sport || "soccer"), typeWhere, orderBy("createdAt", "desc"), limit(maxResults))
      : query(activitiesRef, ...baseConstraints);
    
    const snapshot = await getDocs(q);
    const allActivities: Activity[] = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = toDate(data.createdAt || new Date());
      const timestamp = createdAt.getTime();
      
      // 🔥 type 필드를 Activity 타입으로 매핑
      const activityType: Activity["type"] = 
        data.type === "TEAM" ? "team" :
        data.type === "EVENT" || data.type === "MATCH" ? "events" :
        data.type === "TRADE_ACTIVITY" ? "trading" :
        "team"; // 기본값
      
      return {
        id: doc.id,
        type: activityType,
        title: data.title || "",
        subtitle: data.content || "",
        description: data.content || "",
        image: data.images?.[0] || undefined,
        createdAt,
        timestamp,
        sport: data.sport as any,
        location: data.location ? {
          name: data.locationText || "",
          lat: data.location.lat,
          lng: data.location.lng,
        } : undefined,
        path: `/activity/post/${doc.id}`,
        views: data.views || 0,
        likeCount: data.likeCount || 0,
        commentCount: data.commentCount || 0,
        participantsCount: data.participantsCount || 0,
        status: data.status || "OPEN",
        metadata: {
          ...data,
        },
      } as Activity;
    });

    // 🔥 위치 필터 (클라이언트 사이드)
    let filteredActivities = allActivities;
    if (filter?.location && currentLocation && isValidLatLng(currentLocation)) {
      filteredActivities = allActivities.filter((activity) => {
        if (!activity.location?.lat || !activity.location?.lng) {
          return true; // 위치 없어도 표시
        }
        const distance = getDistanceKm(
          currentLocation,
          { lat: activity.location.lat, lng: activity.location.lng }
        );
        return distance <= (filter.location!.radiusKm || 20);
      });

      // 거리 기준 정렬
      if (sortType === "distance" && currentLocation) {
        filteredActivities.sort((a, b) => {
          const distA = getDistanceKm(
            currentLocation,
            { lat: a.location?.lat || 0, lng: a.location?.lng || 0 }
          );
          const distB = getDistanceKm(
            currentLocation,
            { lat: b.location?.lat || 0, lng: b.location?.lng || 0 }
          );
          return distA - distB;
        });
      }
    }

    // 🔥 최신순 정렬 (기본)
    if (sortType === "latest") {
      filteredActivities.sort((a, b) => b.timestamp - a.timestamp);
    }

    // 🔥 최대 결과 수 제한
    const limitedActivities = filteredActivities.slice(0, maxResults);

    console.log(`✅ [fetchAllActivities] activityPosts에서 ${limitedActivities.length}개 활동 조회 완료`);

    return limitedActivities;
  } catch (error: any) {
    // 🔥 에러는 콘솔에만 출력 (사용자에게는 정상 EmptyState 표시)
    console.error("❌ [fetchAllActivities] 활동 기록 조회 실패:", error);
    // 인덱스 에러는 조용히 처리 (나중에 인덱스 생성하면 해결됨)
    if (error?.code === "failed-precondition" || error?.message?.includes("index")) {
      console.debug("⚠️ [fetchAllActivities] 인덱스 필요 (무시):", error?.message);
      return []; // 빈 배열 반환 (EmptyState 표시)
    }
    return []; // 빈 배열 반환 (EmptyState 표시)
  }
};

/**
 * 🔥 활동 기록 삭제
 * 
 * @param id 활동 기록 ID
 * @throws Error if id is missing or deletion fails
 */
export const deleteActivity = async (id: string): Promise<void> => {
  if (!id) {
    throw new Error("id 없음");
  }

  await deleteDoc(doc(db, "activityHistory", id));
};
