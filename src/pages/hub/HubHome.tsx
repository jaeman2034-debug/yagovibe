/**
 * 🔥 HubHome - 앱 루트 페이지
 * 
 * 역할:
 * - Activity 중심 플랫폼의 메인 진입점
 * - Context Header 표시 (위치, 시간, 종목)
 * - Activity Feed 표시 (최근 활동)
 * - Personal Layer 표시 (개인화 추천)
 * - Quick Actions (빠른 액션)
 * 
 * 설계 원칙:
 * - 허브는 "정보의 중심"이 아니라 "활동의 시작점"
 * - 모든 Activity로의 진입점 제공
 * - 사용자 컨텍스트를 시각적으로 표현
 */

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useHubContext, useActiveSport, useTimeContext, useActivityFocus } from "@/hooks/useHubContext";
import { useAuth } from "@/context/AuthProvider";
import {
  SPORTS,
  getSportIcon,
  getSportLabel,
  getAllSports,
  POPULAR_SPORTS,
  normalizeSportId,
  type SportId,
  type SportConfig,
} from "@/constants/sports";
import type { SportType, ActivityFocus } from "@/context/HubContext";
import { collection, query, orderBy, limit, getDocs, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getAddressFromLatLngThrottled, type AddressResult } from "@/utils/getAddressFromLatLng";
import { useActivitySession } from "@/hooks/useActivitySession";
import { ActiveSessionCard, type ActiveSession } from "@/components/hub/ActiveSessionCard";
import { useCurrentSession } from "@/hooks/useCurrentSession";
import { WorkoutCompletedToast } from "@/components/hub/WorkoutCompletedToast";
import { WeeklyBarChartCard } from "@/components/hub/WeeklyBarChartCard";
import { useWeeklyChart } from "@/hooks/useWeeklyChart";
import { useAuthForFirestore } from "@/hooks/useAuthForFirestore";
import {
  sportHubHref,
  sportMarketListUrl,
  resolveLastSportId,
  normalizeSportHubTab,
  activityFocusToSportHubTab,
  sportMarketDetailUrl,
  VALID_SPORT_HUB_TABS,
  type SportHubTab,
} from "@/utils/sportHubHref";
import { sportChipActiveClass, sportChipInactiveClass } from "@/constants/sportChipStyles";
import { sportsCategories } from "@/data/sportsCategories";
import { rankHubActivities } from "@/utils/hubActivityFeedScore";
import { HubActivityFeedCard } from "@/components/hub/HubActivityFeedCard";
import { HubAvatarIdentityCard } from "@/components/hub/HubAvatarIdentityCard";
import { trackFeedSessionStart } from "@/lib/feedAnalytics";
import TopGameCard from "@/components/home/TopGameCard";
import { InstantPlayCta } from "@/components/play/InstantPlayCta";
import { mobileFullWidthScrollBleedClassName } from "@/components/layout/MobileFullWidthContainer";
/**
 * 🔥 Context Header 컴포넌트
 * 
 * 표시 정보:
 * - 현재 위치 (동/구 단위) - 행정동 변환
 * - 시간 컨텍스트 (아침/점심/저녁/밤)
 * - 활성 종목
 */
function ContextHeader() {
  const { currentLocation, timeContext } = useHubContext();
  const { activeSport } = useActiveSport();
  const { user } = useAuth();
  const [addressInfo, setAddressInfo] = useState<AddressResult | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // 🔥 위치 → 행정동 변환 (lat/lng 변경 시에만 실행 - 참조 변경으로 인한 무한루프 방지)
  const lat = currentLocation?.lat;
  const lng = currentLocation?.lng;
  useEffect(() => {
    if (!currentLocation || lat == null || lng == null) {
      setAddressInfo(null);
      return;
    }

    const fetchAddress = async () => {
      try {
        setLocationLoading(true);
        
        // 좌표 기반 캐싱 (같은 좌표는 재요청 안 함)
        const cacheKey = `address_${Math.round(currentLocation.lat * 1000)}_${Math.round(currentLocation.lng * 1000)}`;
        const cached = sessionStorage.getItem(cacheKey);
        
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            setAddressInfo(cachedData);
            setLocationLoading(false);
            return;
          } catch {
            // 캐시 파싱 실패 시 무시
            console.warn("⚠️ [ContextHeader] 캐시 파싱 실패");
          }
        }

        // 🔒 네트워크 안전 호출: 스로틀 + 타임아웃/재시도 내장
        const result = await getAddressFromLatLngThrottled(
          currentLocation.lat,
          currentLocation.lng,
          5000
        ).catch(() => null);

        if (result) {
          setAddressInfo(result);
          // 캐시 저장
          sessionStorage.setItem(cacheKey, JSON.stringify(result));
        } else {
          console.warn("⚠️ [ContextHeader] 행정동 변환 결과 없음");
          setAddressInfo(null);
        }
      } catch (err) {
        console.error("❌ [ContextHeader] 주소 변환 실패:", err);
        setAddressInfo(null);
      } finally {
        setLocationLoading(false);
      }
    };

    void fetchAddress();
  }, [lat, lng]); // lat/lng만 의존 (객체 참조 변경 시 무한루프 방지)

  // 위치 표시 텍스트
  const locationDisplay = (() => {
    if (!currentLocation) {
      return "위치 없음";
    }
    
    if (locationLoading) {
      return "위치 확인 중...";
    }
    
    if (addressInfo) {
      // 행정동 표시 (예: "상계동" 또는 "강남구 상계동")
      if (addressInfo.dong) {
        return addressInfo.dong;
      }
      if (addressInfo.gu) {
        return addressInfo.gu;
      }
      if (addressInfo.short) {
        return addressInfo.short;
      }
      if (addressInfo.full) {
        // 전체 주소에서 마지막 부분만 추출
        const parts = addressInfo.full.split(" ");
        return parts[parts.length - 1] || "내 위치";
      }
      return "내 위치";
    }
    
    return "내 위치";
  })();

  // 시간 컨텍스트 표시
  const timeDisplay = timeContext 
    ? {
        morning: "🌅 아침",
        afternoon: "☀️ 오후",
        evening: "🌆 저녁",
        night: "🌙 밤",
      }[timeContext]
    : "";

  return (
    <div className="w-full border-b border-gray-200 bg-white py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-sm ${locationLoading ? "text-gray-400" : "text-gray-600"}`}>
            {locationDisplay}
          </span>
          {timeDisplay && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-600">{timeDisplay}</span>
            </>
          )}
          {activeSport && (
            <>
              <span className="text-gray-300">•</span>
              <span className="text-sm font-semibold text-blue-600">
                {getSportIcon(activeSport)} {getSportLabel(activeSport)}
              </span>
            </>
          )}
        </div>
        {user && (
          <div className="text-xs text-gray-500">
            {user.displayName || user.email}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 🔥 Activity Feed 컴포넌트
 * 
 * 표시 정보:
 * - 최근 활동 (거래, 팀, 이벤트 등)
 * - 클릭 가능한 카드 형태
 * - 실시간 업데이트
 */
type HubActivityFeedRow = {
  type: ActivityFocus;
  title: string;
  subtitle?: string;
  time: string;
  id?: string;
  image?: string;
  timestamp?: number;
  extra?: Record<string, unknown>;
};

function ActivityFeed() {
  const { canQuery } = useAuthForFirestore();
  const { user } = useAuth();
  const { preferredSports, activeSport, currentLocation } = useHubContext();
  /** `activities` 컬렉션에서 온 원본 (null이면 레거시 병합 결과 사용) */
  const [rawActivitiesForRank, setRawActivitiesForRank] = useState<HubActivityFeedRow[] | null>(null);
  const [legacyActivities, setLegacyActivities] = useState<HubActivityFeedRow[]>([]);
  const [hiddenActivityIds, setHiddenActivityIds] = useState<Set<string>>(() => new Set());
  /** 제거 애니메이션 중 — 끝나면 hiddenActivityIds로 이동 */
  const [exitingActivityIds, setExitingActivityIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const feedSessionLoggedRef = useRef(false);

  const beginExitActivity = useCallback((id: string) => {
    setExitingActivityIds((prev) => new Set(prev).add(id));
  }, []);

  const finalizeExitActivity = useCallback((id: string) => {
    setExitingActivityIds((ex) => {
      if (!ex.has(id)) return ex;
      setHiddenActivityIds((h) => new Set(h).add(id));
      const next = new Set(ex);
      next.delete(id);
      return next;
    });
  }, []);

  const restoreActivity = useCallback((id: string) => {
    setHiddenActivityIds((h) => {
      const nh = new Set(h);
      nh.delete(id);
      return nh;
    });
    setExitingActivityIds((ex) => {
      const ne = new Set(ex);
      ne.delete(id);
      return ne;
    });
  }, []);

  /** 접근성: 모션 줄이기 켜진 경우 애니메이션 생략 후 즉시 목록에서 제거 */
  useEffect(() => {
    if (exitingActivityIds.size === 0) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!mq.matches) return;
    exitingActivityIds.forEach((id) => finalizeExitActivity(id));
  }, [exitingActivityIds, finalizeExitActivity]);

  const hubRankContext = useMemo(
    () => ({
      preferredSports,
      activeSport,
      userLocation: currentLocation,
    }),
    [preferredSports, activeSport, currentLocation]
  );

  const displayedActivities = useMemo(() => {
    let rows: HubActivityFeedRow[];
    if (rawActivitiesForRank !== null) {
      rows = rankHubActivities(rawActivitiesForRank, hubRankContext).slice(0, 10);
      if (hiddenActivityIds.size > 0) {
        rows = rows.filter((r) => {
          const aid = r.extra?.activityDocId;
          if (typeof aid !== "string" || aid === "") return true;
          return !hiddenActivityIds.has(aid);
        });
      }
    } else {
      rows = legacyActivities;
    }
    return rows;
  }, [rawActivitiesForRank, legacyActivities, hubRankContext, hiddenActivityIds]);

  useEffect(() => {
    if (loading) return;
    if (displayedActivities.length === 0) return;
    if (feedSessionLoggedRef.current) return;
    feedSessionLoggedRef.current = true;
    trackFeedSessionStart(user?.uid ? "logged_in" : "anon");
  }, [loading, displayedActivities.length, user?.uid]);

  // 🔥 Firestore에서 실제 활동 데이터 로드
  // /home 은 ProtectedRoute 밖 → 비로그인·Auth 복구 전 getDocs 시 permission-denied 폭주 방지
  useEffect(() => {
    if (!canQuery) {
      setRawActivitiesForRank(null);
      setLegacyActivities([]);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadActivities = async () => {
      try {
        setLoading(true);
        if (cancelled) return;

        /** 0) `activities` 단일 소스 — hubScore 정렬 우선, 인덱스 없으면 최신순 폴백 */
        try {
          let actSnap = await getDocs(
            query(
              collection(db, "activities"),
              where("visibility", "==", "public"),
              orderBy("hubScore", "desc"),
              orderBy("createdAt", "desc"),
              limit(30)
            )
          ).catch((err: unknown) => {
            const e = err as { code?: string; message?: string };
            if (e?.code === "failed-precondition" || (e?.message && e.message.includes("index"))) {
              return null;
            }
            throw err;
          });
          if (cancelled) return;
          if (actSnap === null) {
            actSnap = await getDocs(
              query(
                collection(db, "activities"),
                where("visibility", "==", "public"),
                orderBy("createdAt", "desc"),
                limit(30)
              )
            );
          }
          if (cancelled) return;
          if (actSnap.docs.length > 0) {
            const fromActs: HubActivityFeedRow[] = [];
            actSnap.docs.forEach((docSnap) => {
              const d = docSnap.data();
              const createdAt =
                d.createdAt?.toDate?.() ?? new Date(typeof d.createdAtMillis === "number" ? d.createdAtMillis : 0);
              const timeAgo = getTimeAgo(createdAt);
              const sid =
                (typeof d.sport === "string" && normalizeSportId(d.sport)) || resolveLastSportId();
              const homeRow = sportsCategories.find((r) => r.sportId === sid);
              const sportIcon = homeRow?.icon ?? getSportIcon(sid);
              const sportLabel = homeRow?.name ?? getSportLabel(sid);
              const at = String(d.type || "");
              let focus: ActivityFocus = "trading";
              if (
                at === "team_created" ||
                at === "team_notice" ||
                at === "recruit_created" ||
                at === "match_created" ||
                at === "match_join_requested" ||
                at === "match_confirmed"
              ) {
                focus = "team";
              } else if (at === "team_event") {
                focus = "events";
              }
              const isMarketCard = at === "market_created" || at === "equipment_created";
              const refType = typeof d.refType === "string" ? d.refType : undefined;
              const subtitleParts: string[] = [];
              if (d.summary && String(d.summary).trim()) subtitleParts.push(String(d.summary).trim());
              if (typeof d.price === "number" && Number.isFinite(d.price) && d.price > 0) {
                subtitleParts.push(`${d.price.toLocaleString()}원`);
              }
              /** 원본 매치·마켓 글 키 — 없으면 피드 카드의 id가 활동 문서 id로만 잡혀 `/match/:id` 가 깨짐 */
              const explicitRefId =
                typeof d.refId === "string" && d.refId.trim() ? d.refId.trim() : "";
              /** 목록으로 연결되는 원본 글 id가 있는 타입은 활동 문서 id(docSnap.id)를 네비게이션에 쓰면 상세 404 */
              const listingNeedsRefId =
                at === "recruit_created" ||
                at === "market_created" ||
                at === "equipment_created" ||
                at === "match_created" ||
                at === "match_join_requested" ||
                at === "match_confirmed";
              const refId = explicitRefId || (listingNeedsRefId ? "" : docSnap.id);
              const hubScoreN =
                typeof d.hubScore === "number" && Number.isFinite(d.hubScore) ? d.hubScore : undefined;
              const likeN = typeof d.likeCount === "number" && Number.isFinite(d.likeCount) ? d.likeCount : 0;
              const commentN =
                typeof d.commentCount === "number" && Number.isFinite(d.commentCount) ? d.commentCount : 0;
              const fbReport =
                typeof d.feedbackReportCount === "number" && Number.isFinite(d.feedbackReportCount)
                  ? d.feedbackReportCount
                  : 0;
              const fbHide =
                typeof d.feedbackHideCount === "number" && Number.isFinite(d.feedbackHideCount)
                  ? d.feedbackHideCount
                  : 0;
              const fbNi =
                typeof d.feedbackNotInterestedCount === "number" &&
                Number.isFinite(d.feedbackNotInterestedCount)
                  ? d.feedbackNotInterestedCount
                  : 0;
              const latRaw = d.latitude ?? d.stadiumLat ?? d.lat;
              const lngRaw = d.longitude ?? d.stadiumLng ?? d.lng;
              const listingLat = typeof latRaw === "number" && Number.isFinite(latRaw) ? latRaw : undefined;
              const listingLng = typeof lngRaw === "number" && Number.isFinite(lngRaw) ? lngRaw : undefined;
              fromActs.push({
                type: focus,
                title: typeof d.title === "string" && d.title.trim() ? d.title.trim() : "활동",
                subtitle: subtitleParts.length ? subtitleParts.join(" · ") : undefined,
                time: timeAgo,
                id: refId,
                image: typeof d.thumbnailUrl === "string" ? d.thumbnailUrl : undefined,
                timestamp: createdAt.getTime(),
                extra: {
                  activityDocId: docSnap.id,
                  ...(explicitRefId ? { refId: explicitRefId } : {}),
                  sport: sid,
                  ...(typeof d.authorId === "string" && d.authorId ? { authorId: d.authorId } : {}),
                  ...(isMarketCard ? { sportIcon, sportLabel } : {}),
                  originType: at,
                  refType,
                  refCollection: d.refCollection,
                  activityLikeCount: likeN,
                  activityCommentCount: commentN,
                  feedbackReportCount: fbReport,
                  feedbackHideCount: fbHide,
                  feedbackNotInterestedCount: fbNi,
                  ...(hubScoreN != null ? { hubScore: hubScoreN } : {}),
                  ...(listingLat != null && listingLng != null ? { listingLat, listingLng } : {}),
                  ...(typeof d.teamId === "string" && d.teamId ? { teamId: d.teamId } : {}),
                  ...(typeof d.associationId === "string" && d.associationId
                    ? { associationId: d.associationId }
                    : {}),
                },
              });
            });
            if (cancelled) return;
            setRawActivitiesForRank(fromActs);
            setLegacyActivities([]);
            setLoading(false);
            return;
          }
        } catch (actErr: unknown) {
          const err = actErr as { code?: string; message?: string };
          if (err?.code === "failed-precondition" || err?.message?.includes("index")) {
            console.debug("⚠️ [ActivityFeed] activities 인덱스 없음 → 레거시 병합:", err?.message);
          } else {
            console.warn("⚠️ [ActivityFeed] activities 조회 실패 → 레거시 병합:", actErr);
          }
        }

        if (cancelled) return;
        setRawActivitiesForRank(null);

        const activitiesList: HubActivityFeedRow[] = [];

        // 1. 최근 게시글 통합 조회 (marketPosts, recruitPosts, matchPosts) — 레거시 폴백
        try {
          // 🔥 모든 게시글 컬렉션을 병렬로 조회
          const [marketSnap, recruitSnap, matchSnap] = await Promise.all([
            // 거래 상품 (equipment)
            getDocs(query(
              collection(db, "marketPosts"),
              where("status", "in", ["active", "open"]),
              orderBy("createdAt", "desc"),
              limit(3)
            )).catch((err: any) => {
              // 🔥 인덱스 에러는 조용히 처리
              if (err?.code === "failed-precondition" || err?.message?.includes("index")) {
                console.debug("⚠️ [ActivityFeed] marketPosts 인덱스 필요 (무시):", err?.message);
              } else {
                console.warn("⚠️ [ActivityFeed] marketPosts 로드 실패:", err);
              }
              return { docs: [] } as any; // 빈 결과 반환
            }),
            // 모집 글 (recruit)
            getDocs(query(
              collection(db, "recruitPosts"),
              where("status", "in", ["active", "open"]),
              orderBy("createdAt", "desc"),
              limit(3)
            )).catch((err: any) => {
              if (err?.code === "failed-precondition" || err?.message?.includes("index")) {
                console.debug("⚠️ [ActivityFeed] recruitPosts 인덱스 필요 (무시):", err?.message);
              } else {
                console.warn("⚠️ [ActivityFeed] recruitPosts 로드 실패:", err);
              }
              return { docs: [] } as any;
            }),
            // 매칭 글 (match)
            getDocs(query(
              collection(db, "matchPosts"),
              where("status", "in", ["active", "open"]),
              orderBy("createdAt", "desc"),
              limit(3)
            )).catch((err: any) => {
              if (err?.code === "failed-precondition" || err?.message?.includes("index")) {
                console.debug("⚠️ [ActivityFeed] matchPosts 인덱스 필요 (무시):", err?.message);
              } else {
                console.warn("⚠️ [ActivityFeed] matchPosts 로드 실패:", err);
              }
              return { docs: [] } as any;
            }),
          ]);
          if (cancelled) return;

          // 🔥 거래 상품 (equipment)
          marketSnap.docs.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            const timeAgo = getTimeAgo(createdAt);
            const sid =
              (typeof data.sport === "string" && normalizeSportId(data.sport)) || resolveLastSportId();
            const homeRow = sportsCategories.find((r) => r.sportId === sid);
            const sportIcon = homeRow?.icon ?? getSportIcon(sid);
            const sportLabel = homeRow?.name ?? getSportLabel(sid);
            const priceStr =
              data.price != null && data.price !== ""
                ? `${Number(data.price).toLocaleString()}원`
                : undefined;

            activitiesList.push({
              type: "trading",
              title: data.title || data.name || "상품",
              subtitle: [priceStr].filter(Boolean).join(" · ") || undefined,
              time: timeAgo,
              id: doc.id,
              image: data.images?.[0],
              timestamp: createdAt.getTime(),
              extra: { sport: sid, sportIcon, sportLabel },
            });
          });
          
          // 🔥 모집 글 (recruit)
          recruitSnap.docs.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            const timeAgo = getTimeAgo(createdAt);
            
            activitiesList.push({
              type: "team",
              title: data.title || "팀원 모집",
              subtitle: data.people ? `모집 인원: ${data.people}명` : "팀원 모집",
              time: timeAgo,
              id: doc.id,
              image: data.images?.[0],
              timestamp: createdAt.getTime(),
            });
          });
          
          // 🔥 매칭 글 (match)
          matchSnap.docs.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            const timeAgo = getTimeAgo(createdAt);
            
            activitiesList.push({
              type: "team",
              title: data.title || "경기 매칭",
              subtitle: data.matchType ? `${data.matchType} 경기 · 팀` : "경기 매칭 · 팀",
              time: timeAgo,
              id: doc.id,
              image: data.images?.[0],
              timestamp: createdAt.getTime(),
              extra: { originType: "match_created", refType: "match" },
            });
          });
        } catch (err: any) {
          // 🔥 전체 쿼리 실패 시에도 페이지는 계속 로드
          console.warn("⚠️ [ActivityFeed] 게시글 로드 실패 (일부만 표시):", err);
        }
        if (cancelled) return;

        // 2. 최근 팀 모집 (teams 컬렉션에서 최신 팀)
        try {
          const teamsQuery = query(
            collection(db, "teams"),
            orderBy("createdAt", "desc"),
            limit(3)
          );
          const teamsSnap = await getDocs(teamsQuery);
          if (cancelled) return;
          
          teamsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || new Date();
            const timeAgo = getTimeAgo(createdAt);
            
            // 모집 중인 팀만 표시 (recruitStatus가 있으면)
            const isRecruiting = data.recruitStatus === "open" || data.recruitStatus === "recruiting";
            const title = isRecruiting 
              ? `${data.name || "팀"} 모집 중`
              : `${data.name || "팀"} 활동`;
            
            activitiesList.push({
              type: "team",
              title: title,
              subtitle: data.sportType ? `${data.sportType} 팀` : "팀 활동",
              time: timeAgo,
              id: doc.id,
              image: data.logo || data.image,
              timestamp: createdAt.getTime(),
            });
          });
        } catch (err) {
          console.warn("⚠️ [ActivityFeed] 팀 활동 로드 실패:", err);
        }
        if (cancelled) return;

        // 3. 최근 이벤트/대회 (events 컬렉션)
        try {
          const eventsQuery = query(
            collection(db, "events"),
            orderBy("createdAt", "desc"),
            limit(3)
          );
          const eventsSnap = await getDocs(eventsQuery);
          if (cancelled) return;
          
          eventsSnap.docs.forEach((doc) => {
            const data = doc.data();
            const createdAt = data.createdAt?.toDate?.() || 
                             (data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : new Date());
            const timeAgo = getTimeAgo(createdAt);
            
            activitiesList.push({
              type: "events",
              title: data.title || "이벤트",
              subtitle: data.date ? new Date(data.date).toLocaleDateString("ko-KR") : undefined,
              time: timeAgo,
              id: doc.id,
              image: data.image,
              timestamp: createdAt.getTime(),
            });
          });
        } catch (err: any) {
          if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
            console.debug("⚠️ [ActivityFeed] events 권한 없음 (무시)");
          } else {
            console.warn("⚠️ [ActivityFeed] 이벤트 로드 실패:", err);
          }
        }
        if (cancelled) return;

        // 4. 대회 데이터 (associations/{id}/tournaments) - 최근 2개만
        try {
          // 협회 문서 전체 스캔 금지: 소량만 조회 (SDK 부하·StrictMode 이중 호출 시 안정성)
          const associationsSnap = await getDocs(
            query(collection(db, "associations"), limit(8))
          );
          if (cancelled) return;

          const tournamentPromises: Promise<any>[] = [];

          // 각 협회의 대회 조회 (최대 3개 협회만)
          associationsSnap.docs.slice(0, 3).forEach((assocDoc) => {
            const tournamentsRef = collection(db, `associations/${assocDoc.id}/tournaments`);
            const tournamentsQuery = query(
              tournamentsRef,
              where("adminStatus", "==", "published"),
              orderBy("createdAt", "desc"),
              limit(1)
            );
            
            tournamentPromises.push(
              getDocs(tournamentsQuery).then((snap) => {
                return snap.docs.map((doc) => ({
                  id: doc.id,
                  associationId: assocDoc.id,
                  ...doc.data(),
                }));
              }).catch(() => [])
            );
          });

          const tournamentResults = await Promise.all(tournamentPromises);
          if (cancelled) return;
          const allTournaments = tournamentResults.flat().slice(0, 2);
          
          allTournaments.forEach((tournament: any) => {
            const createdAt = tournament.createdAt?.toDate?.() || new Date();
            const timeAgo = getTimeAgo(createdAt);
            
            activitiesList.push({
              type: "events",
              title: tournament.name || "대회",
              subtitle: tournament.startDate ? new Date(tournament.startDate).toLocaleDateString("ko-KR") : "대회",
              time: timeAgo,
              id: tournament.id,
              image: tournament.image,
              timestamp: createdAt.getTime(),
              extra: { associationId: tournament.associationId }, // 상세 페이지 이동용
            });
          });
        } catch (err: any) {
          if (err?.code === "permission-denied" || err?.message?.includes("permission")) {
            console.debug("⚠️ [ActivityFeed] 대회 권한 없음 (무시)");
          } else {
            console.warn("⚠️ [ActivityFeed] 대회 로드 실패:", err);
          }
        }

        // 최신순 정렬 (timestamp 기준, 없으면 time 파싱)
        activitiesList.sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return b.timestamp - a.timestamp; // 최신순
          }
          const timeA = parseTimeAgo(a.time);
          const timeB = parseTimeAgo(b.time);
          return timeA - timeB;
        });

        if (cancelled) return;
        setLegacyActivities(activitiesList.slice(0, 6)); // 최대 6개
      } catch (err) {
        console.error("❌ [ActivityFeed] 활동 로드 실패:", err);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadActivities();
    return () => {
      cancelled = true;
    };
  }, [canQuery]);

  // 시간 표시 헬퍼
  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    if (hours < 24) return `${hours}시간 전`;
    return `${days}일 전`;
  }

  // 시간 파싱 헬퍼 (정렬용)
  function parseTimeAgo(timeStr: string): number {
    if (timeStr === "방금 전") return 0;
    const match = timeStr.match(/(\d+)(분|시간|일) 전/);
    if (!match) return 999999;
    const value = parseInt(match[1]);
    const unit = match[2];
    if (unit === "분") return value;
    if (unit === "시간") return value * 60;
    if (unit === "일") return value * 60 * 24;
    return 999999;
  }

  if (loading) {
    return (
      <div className="w-full py-3">
        <h3 className="mb-3 text-base font-semibold text-gray-800">최근 활동</h3>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-3 bg-gray-50 rounded-lg animate-pulse"
            >
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (displayedActivities.length === 0) {
    return (
      <div className="w-full py-3">
        <h3 className="mb-3 text-base font-semibold text-gray-800">최근 활동</h3>
        <div className="py-8 text-center text-sm text-gray-500">아직 활동이 없어요</div>
      </div>
    );
  }

  return (
    <div className="w-full py-3">
      <h3 className="mb-3 text-base font-semibold text-gray-800">최근 활동</h3>
      <div className="flex flex-col gap-2">
        {displayedActivities.map((activity, index) => {
          const rowKey =
            (typeof activity.extra?.activityDocId === "string" && activity.extra.activityDocId) ||
            activity.id ||
            index;
          return (
            <HubActivityFeedCard
              key={rowKey}
              activity={activity}
              index={index}
              feedSource={rawActivitiesForRank !== null ? "activities" : "legacy"}
              loading={loading}
              exitingActivityIds={exitingActivityIds}
              beginExitActivity={beginExitActivity}
              restoreActivity={restoreActivity}
              finalizeExitActivity={finalizeExitActivity}
            />
          );
        })}
      </div>
    </div>
  );
}

/**
 * 🔥 Personal Layer 컴포넌트
 *
 * 표시 정보:
 * - 개인화 추천 (종목, 활동 등)
 * - 선호 종목 기반 추천
 * - 종목별 액션 연결 (거래/팀/모임)
 */
function PersonalLayer() {
  const { preferredSports, activeSport, setActiveSport } = useHubContext();
  const navigate = useNavigate();
  const [selectedSport, setSelectedSport] = useState<SportType | null>(null);

  const allSports = getAllSports();

  const userSportIds = new Set(
    preferredSports.map((sport) => normalizeSportId(sport)).filter(Boolean) as SportId[]
  );

  const handleSportClick = (sport: SportType) => {
    if (selectedSport === sport) {
      setSelectedSport(null);
    } else {
      setSelectedSport(sport);
      setActiveSport(sport);
    }
  };

  const handleSportAction = (sport: SportType, focus: ActivityFocus) => {
    setSelectedSport(null);
    localStorage.setItem("lastSport", sport);
    const sid = normalizeSportId(sport as SportId);
    if (focus === "trading") {
      navigate(sportMarketListUrl(sid, { source: "category" }));
      return;
    }
    const tab = normalizeSportHubTab(activityFocusToSportHubTab(focus));
    navigate(`/sports/${encodeURIComponent(sid)}?tab=${encodeURIComponent(tab)}`);
  };

  const handleCategoryClick = (sportId: SportId) => {
    setActiveSport(sportId as SportType);
    localStorage.setItem("lastSport", sportId);
    navigate(`/sports/${sportId}`);
  };

  return (
    <div className="w-full pb-3">
      <h3 className="mb-2 text-base font-semibold text-gray-900">스포츠 카테고리</h3>

      <div
        className={cn("mt-2 overflow-x-auto pb-2", mobileFullWidthScrollBleedClassName)}
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          WebkitOverflowScrolling: "touch",
          touchAction: "pan-x",
        }}
      >
        <style>{`
          .sports-horizontal-scroll::-webkit-scrollbar {
            display: none;
          }
        `}</style>

        <div
          className="sports-horizontal-scroll inline-grid gap-3"
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gridAutoColumns: "120px",
            gridTemplateRows: "repeat(2, auto)",
            width: "max-content",
          }}
        >
          {allSports.map((sportConfig) => {
            const sportId = sportConfig.id as SportType;
            const isUserSport = userSportIds.has(sportConfig.id);
            const isSelected = selectedSport === sportId;
            const isActive = activeSport === sportId;

            return (
              <div key={sportConfig.id} className="relative w-[120px] min-w-[120px]">
                <button
                  type="button"
                  onClick={() => handleCategoryClick(sportConfig.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    handleSportClick(sportId);
                  }}
                  className={`relative w-full cursor-pointer rounded-lg border p-4 transition-all ${
                    isActive || isSelected
                      ? sportChipActiveClass
                      : isUserSport
                        ? `${sportChipInactiveClass} border-emerald-400/90 dark:border-emerald-500/70`
                        : sportChipInactiveClass
                  }`}
                >
                  {isUserSport && (
                    <div className="absolute right-1 top-1 h-2 w-2 rounded-full bg-green-500" />
                  )}
                  <div className="mb-1 text-2xl">{sportConfig.icon}</div>
                  <div
                    className={`whitespace-nowrap text-xs font-medium ${
                      isActive || isSelected ? "text-white" : "text-gray-900 dark:text-gray-100"
                    }`}
                  >
                    {sportConfig.label}
                  </div>
                </button>

                {isSelected && (
                  <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-lg border border-gray-200 bg-white p-2 shadow-lg">
                    <button
                      type="button"
                      onClick={() => handleSportAction(sportId, "trading")}
                      className="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                    >
                      🛒 거래 보기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSportAction(sportId, "team")}
                      className="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                    >
                      👥 팀 찾기
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSportAction(sportId, "events")}
                      className="w-full rounded px-3 py-2 text-left text-sm transition-colors hover:bg-gray-50"
                    >
                      📅 모임 보기
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * 🔥 Quick Actions 컴포넌트
 * 
 * 빠른 액션 버튼:
 * - 거래
 * - 스포츠 찾기
 * - 이벤트
 */
function QuickActions() {
  const navigate = useNavigate();
  const { setActivityFocus } = useHubContext();
  const { activeSport } = useActiveSport();

  const resolveSportId = (): string => {
    if (activeSport) {
      const n = normalizeSportId(activeSport as string);
      if (n) return n;
    }
    return resolveLastSportId();
  };

  const handleQuickStart = (focus: ActivityFocus, tab: SportHubTab) => {
    const safeTab = normalizeSportHubTab(tab);
    const sportId = resolveSportId();
    setActivityFocus(focus);
    if (safeTab === "market") {
      navigate(sportMarketListUrl(sportId, { source: "quick" }));
      return;
    }
    // 빠른 시작 → 스포츠 허브 경기 탭 포커스
    if (safeTab === "match") {
      navigate("/sports?tab=match");
      return;
    }
    navigate(`/sports/${encodeURIComponent(sportId)}?tab=${encodeURIComponent(safeTab)}`);
  };

  // 마켓 리스트는 `/sports/:sport/market` 단일 라우트 — 존재하지 않는 /trade 등 사용 금지
  const actions: Array<{
    id: ActivityFocus;
    label: string;
    icon: string;
    tab: SportHubTab;
  }> = [
    { id: "trading", label: "거래", icon: "🛒", tab: "market" },
    { id: "team", label: "스포츠 찾기", icon: "⚽", tab: "match" },
    { id: "events", label: "이벤트", icon: "📅", tab: "event" },
  ];

  return (
    <div className="w-full py-3">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">빠른 시작</h3>
      <div className="grid grid-cols-3 gap-3">
        {actions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => {
              console.log("🔥 [QuickActions] 종목 허브로 이동:", {
                id: action.id,
                tab: action.tab,
                sportId: resolveSportId(),
              });
              handleQuickStart(action.id, action.tab);
            }}
            className="flex flex-col items-center justify-center rounded-xl border border-gray-200/90 bg-transparent px-2 py-4 transition hover:border-gray-400"
          >
            <span className="text-2xl" aria-hidden>
              {action.icon}
            </span>
            <span className="mt-2 text-sm font-medium text-gray-800">{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 🔥 Hub Question 컴포넌트
 *
 * 허브의 시작 질문:
 * - 사용자에게 행동을 유도
 * - 허브의 "활동 시작점" 역할 강조
 * - "응, 시작할게요" 버튼 클릭 시 ActivitySession 생성
 */
function HubQuestion({
  hasActiveSession,
}: {
  hasActiveSession: boolean;
}) {
  const { user } = useAuth();
  const { activeSport, setActiveSport } = useActiveSport();
  const navigate = useNavigate();
  const [answered, setAnswered] = useState(false);
  const [sportPickerOpen, setSportPickerOpen] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [weeklyXp, setWeeklyXp] = useState(0);
  const [gameTotalXp, setGameTotalXp] = useState(0);
  const [xpLoading, setXpLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const uid = user?.uid;
      if (!uid) {
        if (!alive) return;
        setGameTotalXp(0);
        setWeeklyXp(0);
        setXpLoading(false);
        return;
      }
      setXpLoading(true);
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        const userData = userSnap.exists() ? userSnap.data() : {};
        const totalXp = Math.max(0, Math.floor(Number(userData?.xp ?? 0) || 0));
        const weeklyTotal = Math.max(
          0,
          Math.floor(Number((userData as any)?.gameXpCap?.weeklyTotal ?? 0) || 0)
        );
        if (!alive) return;
        setGameTotalXp(totalXp);
        setWeeklyXp(weeklyTotal);
      } catch {
        if (!alive) return;
        setGameTotalXp(0);
        setWeeklyXp(0);
      } finally {
        if (alive) setXpLoading(false);
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!sportPickerOpen || isRouting) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSportPickerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sportPickerOpen, isRouting]);

  const { popularSportsList, otherSportsList } = useMemo(() => {
    const popular = POPULAR_SPORTS.map((id) => SPORTS[id]).filter(Boolean);
    const popularIds = new Set(popular.map((p) => p.id));
    const others = getAllSports()
      .filter((s) => !popularIds.has(s.id))
      .sort((a, b) => a.label.localeCompare(b.label, "ko"));
    return { popularSportsList: popular, otherSportsList: others };
  }, []);

  const handlePickSport = async (sportId: SportId) => {
    setIsRouting(true);
    setActiveSport(sportId as SportType);
    try {
      localStorage.setItem("lastSport", sportId);
    } catch {
      /* 비공개 모드 등 */
    }
    setSportPickerOpen(false);
    setAnswered(true);
    navigate("/play");
  };

  const hasPreferredSport = !!normalizeSportId(resolveLastSportId());
  const handlePlayClick = () => {
    if (hasPreferredSport) {
      navigate("/play");
      return;
    }
    setSportPickerOpen(true);
  };

  if (answered || hasActiveSession) {
    return null;
  }

  const renderSportTile = (sport: SportConfig) => (
    <button
      key={sport.id}
      type="button"
      disabled={isRouting}
      onClick={() => void handlePickSport(sport.id)}
      className={cn(
        "flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-3 text-center transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50",
        activeSport === sport.id && "border-blue-500 bg-blue-50/80"
      )}
    >
      <span className="text-2xl" aria-hidden>
        {sport.icon}
      </span>
      <span className="text-xs font-medium text-gray-800">{sport.label}</span>
    </button>
  );

  return (
    <div className="mt-2 w-full">
      <TopGameCard
        stage={!xpLoading && gameTotalXp > 0 ? "ACTIVE" : "NEW"}
        titleNew="🎮 아바타 시작"
        subtitleNew="첫 플레이 시 +20 XP"
        newBonusText="오늘 보너스 있음"
        titleActive="🏆 이번 주 진행도"
        activeHintText="다음 레벨까지"
        xp={weeklyXp}
        xpCap={300}
        primaryLabelNew={isRouting ? "이동 중…" : "지금 시작"}
        primaryLabelActive={isRouting ? "이동 중…" : "지금 플레이"}
        onPrimaryClick={handlePlayClick}
      />
      <div className="mt-3 space-y-2">
        <InstantPlayCta variant="compact" />
        <button
          type="button"
          onClick={() => navigate("/playground")}
          className="w-full rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-bold text-blue-700 transition-colors hover:bg-blue-100"
        >
          🗺️ 운동장 입장 (싱글 연습)
        </button>
      </div>

      {sportPickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
          role="presentation"
          onClick={(e) => {
            if (isRouting) return;
            if (e.target === e.currentTarget) setSportPickerOpen(false);
          }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="hub-sport-picker-title"
            aria-busy={isRouting}
            onClick={(e) => e.stopPropagation()}
          >
            {isRouting && (
              <div
                className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-white/90 px-4"
                role="status"
                aria-live="polite"
              >
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="mt-3 text-center text-sm font-medium text-gray-700">플레이 화면으로 이동 중…</p>
              </div>
            )}
            <h2 id="hub-sport-picker-title" className="mb-3 text-lg font-semibold text-gray-900">
              스포츠를 선택해 주세요
            </h2>
            <div className="max-h-[min(60vh,22rem)] overflow-y-auto overscroll-contain scrollbar-hide">
              <p className="mb-2 text-xs font-medium text-gray-500">인기</p>
              <div className="mb-4 grid grid-cols-3 gap-2">{popularSportsList.map(renderSportTile)}</div>
              {otherSportsList.length > 0 && (
                <>
                  <p className="mb-2 text-xs font-medium text-gray-500">전체</p>
                  <div className="grid grid-cols-3 gap-2 pb-1">{otherSportsList.map(renderSportTile)}</div>
                </>
              )}
            </div>
            <button
              type="button"
              disabled={isRouting}
              onClick={() => setSportPickerOpen(false)}
              className="mt-5 w-full rounded-lg py-2 text-sm text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 🔥 HubActiveSection - 활성 세션 섹션
 * 
 * ActiveSessionCard를 라우팅과 연결하는 래퍼
 * ⚠️ endActivity는 HubHome에서 주입 (useActivitySession 단일 호출로 무한루프 방지)
 */
function HubActiveSection({
  session,
  onEndSession,
}: {
  session: ActiveSession;
  onEndSession: (sessionId: string) => Promise<void>;
}) {
  const navigate = useNavigate();

  return (
    <div className="w-full">
      <ActiveSessionCard
        session={session}
        onFindTeam={(s) => {
          // 팀/사람 찾기 액션은 거래가 아닌 매치 탐색으로 연결
          navigate(`/sports/match?sport=${encodeURIComponent(s.sport)}`);
        }}
        onViewVenues={(s) => {
          // 장소 보기는 스포츠 지도 의미 경로로 이동
          navigate(`/sports/map?sport=${encodeURIComponent(s.sport)}`);
        }}
        onEndSession={async (s) => {
          if (confirm("활동을 종료하시겠습니까?")) {
            try {
              await onEndSession(s.id);
            } catch (err: any) {
              console.error("❌ [HubActiveSection] 세션 종료 실패:", err);
              alert("세션 종료에 실패했습니다. 다시 시도해주세요.");
            }
          }
        }}
      />
    </div>
  );
}

/**
 * 🔥 HubHome 메인 컴포넌트
 */
export default function HubHome() {
  const { user } = useAuth();
  // 🔥 userId 안정화 (user 객체 참조 변경 시 useCurrentSession 무한 구독 방지)
  const userId = useMemo(() => user?.uid ?? null, [user?.uid]);
  const { session: currentSession, loading: sessionLoading } = useCurrentSession(userId);
  // 🔥 useActivitySession 단일 호출 - 무한 루프 및 상태 분리 방지
  const {
    endActivity,
    completedSession,
    clearCompletedSession,
  } = useActivitySession();

  const weeklyData = useWeeklyChart(user?.uid);

  // endActivity 래퍼 (sessionId 전달로 안정적 호출)
  const handleEndSession = async (sessionId: string) => {
    await endActivity(sessionId);
  };

  // 🔥 완료된 세션의 duration을 분 단위로 변환
  const durationMin = completedSession
    ? Math.floor(completedSession.durationMs / 60000)
    : 0;

  return (
    <div className="w-full min-w-0 bg-gray-50">
        {/* Context Header */}
        <ContextHeader />

        <HubAvatarIdentityCard />

        {/* 메인 콘텐츠 */}
        <div className="space-y-6 py-4">
          {/* 🔥 운동 완료 Toast */}
          {completedSession && (
            <div className="w-full">
              <WorkoutCompletedToast
                sport={completedSession.sport}
                durationMin={durationMin}
                onDismiss={clearCompletedSession}
              />
            </div>
          )}
          {/* 🔥 ActiveSessionCard - 활성 세션이 있을 때 표시 */}
          {!sessionLoading && currentSession && (
            <HubActiveSection session={currentSession} onEndSession={handleEndSession} />
          )}

          {/* 🔥 Hub Question — 운동 세션용, 빠른 시작보다 약한 보조 CTA */}
          {!sessionLoading && !currentSession && (
            <HubQuestion hasActiveSession={!!currentSession} />
          )}

          <QuickActions />

          {/* 세션 없을 때: 오늘 요약·통계 (추천·피드 위) */}
          {!sessionLoading && !currentSession && (
            <div className="w-full space-y-4">
              <WeeklyBarChartCard data={weeklyData} />
            </div>
          )}

          <PersonalLayer />

          {/* Activity Feed — canQuery는 ActivityFeed 내부 useAuthForFirestore로 고정 (미선언 ReferenceError 방지) */}
          <ActivityFeed />
        </div>

        {/* 하단 여백 (BottomNav 고려) */}
        <div className="h-20" />
    </div>
  );
}
