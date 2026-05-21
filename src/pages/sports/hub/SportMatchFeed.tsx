import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { getTimeAgo, toDate } from "@/utils/timeUtils";
import FeedSkeletonGrid from "@/components/sports/FeedSkeletonGrid";
import FeedEmptyState from "@/components/sports/FeedEmptyState";
import { useMatches } from "@/hooks/useMatches";
import { db } from "@/lib/firebase";
import type { Match } from "@/types/match";
import { isSportTypeSlug } from "@/types/sport";
import { getDistanceKm } from "@/utils/geo";
import { track } from "@/lib/analytics";

interface SportMatchFeedProps {
  sport: string;
}

type SortOption = "imminent" | "latest" | "distance";
type TimeFilter = "all" | "morning" | "afternoon" | "evening";

const ASSUMED_MAX_PARTICIPANTS = 10;

function toMatchDateTime(match: Match): Date {
  const baseDate = toDate(match.date);
  const [hourStr = "0", minStr = "0"] = (match.time || "00:00").split(":");
  const date = new Date(baseDate);
  date.setHours(Number(hourStr), Number(minStr), 0, 0);
  return date;
}

function getWhenLabel(date: Date): string {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86400000);
  const timeText = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

  if (diffDays === 0) return `오늘 ${timeText}`;
  if (diffDays === 1) return `내일 ${timeText}`;
  return `${date.toLocaleDateString("ko-KR")} ${timeText}`;
}

function getMatchCoordinates(match: Match): { lat: number; lng: number } | null {
  const source = match as Match & {
    lat?: number;
    lng?: number;
    latitude?: number;
    longitude?: number;
  };
  const lat = source.stadiumLat ?? source.latitude ?? source.lat;
  const lng = source.stadiumLng ?? source.longitude ?? source.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export default function SportMatchFeed({ sport }: SportMatchFeedProps) {
  const navigate = useNavigate();
  const [sortOption, setSortOption] = useState<SortOption>("imminent");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [requestCountByMatchId, setRequestCountByMatchId] = useState<Record<string, number>>({});
  const [recentMatches, setRecentMatches] = useState<string[]>([]);

  const hookSport = sport !== "all" && isSportTypeSlug(sport) ? sport : undefined;

  const { matches, loading, error } = useMatches({
    sport: hookSport,
    status: "open",
    limit: hookSport ? 30 : 120,
  });

  const scopedMatches = useMemo(() => {
    if (sport === "all" || hookSport) return matches;
    return matches.filter((m) => (m.sport as string) === sport);
  }, [matches, sport, hookSport]);

  const userRegion = useMemo(() => {
    const keys = ["user_region", "region", "preferred_region"];
    for (const key of keys) {
      const value = localStorage.getItem(key);
      if (value?.trim()) return value.trim();
    }
    return null;
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("lastSport", String(sport || ""));
    } catch {}
    try {
      const stored = localStorage.getItem("recentMatches") || "[]";
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) setRecentMatches(parsed.slice(0, 10));
    } catch {}
  }, [sport]);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // 위치 권한이 없어도 피드는 계속 동작해야 함
        setUserLocation(null);
      },
      { enableHighAccuracy: false, timeout: 7000, maximumAge: 300000 }
    );
  }, []);

  useEffect(() => {
    const run = async () => {
      if (!scopedMatches.length) {
        setRequestCountByMatchId({});
        return;
      }

      const counts = await Promise.all(
        scopedMatches.map(async (match) => {
          const countQuery = query(
            collection(db, "match_requests"),
            where("matchId", "==", match.id),
            where("status", "==", "pending")
          );
          const snapshot = await getCountFromServer(countQuery);
          return [match.id, snapshot.data().count] as const;
        })
      );
      setRequestCountByMatchId(Object.fromEntries(counts));
    };

    void run();
  }, [scopedMatches]);

  const filteredAndSortedMatches = useMemo(() => {
    const copied = [...scopedMatches];

    const filtered = copied.filter((match) => {
      if (timeFilter !== "all") {
        const hour = toMatchDateTime(match).getHours();
        if (timeFilter === "morning" && (hour < 6 || hour >= 12)) return false;
        if (timeFilter === "afternoon" && (hour < 12 || hour >= 18)) return false;
        if (timeFilter === "evening" && (hour < 18 || hour > 23)) return false;
      }

      if (onlyAvailable) {
        const pending = requestCountByMatchId[match.id] ?? 0;
        if (pending >= ASSUMED_MAX_PARTICIPANTS) return false;
      }

      return true;
    });

    if (sortOption === "latest") {
      return filtered.sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime());
    }

    if (sortOption === "distance") {
      if (userLocation) {
        return filtered.sort((a, b) => {
          const aCoords = getMatchCoordinates(a);
          const bCoords = getMatchCoordinates(b);
          if (aCoords && bCoords) {
            const distanceA = getDistanceKm(userLocation, aCoords);
            const distanceB = getDistanceKm(userLocation, bCoords);
            if (distanceA !== distanceB) return distanceA - distanceB;
          }
          if (aCoords && !bCoords) return -1;
          if (!aCoords && bCoords) return 1;
          return toMatchDateTime(a).getTime() - toMatchDateTime(b).getTime();
        });
      }

      return filtered.sort((a, b) => {
        if (!userRegion) return toMatchDateTime(a).getTime() - toMatchDateTime(b).getTime();
        const aSameRegion = a.region === userRegion ? 0 : 1;
        const bSameRegion = b.region === userRegion ? 0 : 1;
        if (aSameRegion !== bSameRegion) return aSameRegion - bSameRegion;
        return toMatchDateTime(a).getTime() - toMatchDateTime(b).getTime();
      });
    }

    return filtered.sort((a, b) => toMatchDateTime(a).getTime() - toMatchDateTime(b).getTime());
  }, [scopedMatches, sortOption, userRegion, userLocation, timeFilter, onlyAvailable, requestCountByMatchId]);

  const urgentCandidate = useMemo(() => {
    // 🔥 마감 임박: 80% 이상
    return filteredAndSortedMatches.find((m) => {
      const pending = requestCountByMatchId[m.id] ?? 0;
      return pending / ASSUMED_MAX_PARTICIPANTS >= 0.8;
    }) || null;
  }, [filteredAndSortedMatches, requestCountByMatchId]);

  const nearbyNewCandidate = useMemo(() => {
    // 📍 근처에 방금 열린 경기: 6시간 이내 생성 + 10km 이내
    const createdWithinMs = 6 * 60 * 60 * 1000;
    const now = Date.now();
    return filteredAndSortedMatches.find((m) => {
      const createdAtMs = toDate(m.createdAt).getTime();
      if (now - createdAtMs > createdWithinMs) return false;
      if (!userLocation) return false;
      const coords = getMatchCoordinates(m);
      if (!coords) return false;
      const dist = getDistanceKm(userLocation, coords);
      return dist <= 10;
    }) || null;
  }, [filteredAndSortedMatches, userLocation]);

  const lowParticipationImminent = useMemo(() => {
    // 😢 시간 임박 + 인원 부족: 6시간 내 시작 && 신청팀 < 3
    const now = Date.now();
    const horizonMs = 6 * 60 * 60 * 1000;
    return filteredAndSortedMatches.find((m) => {
      const start = toMatchDateTime(m).getTime();
      if (start - now > horizonMs) return false;
      const pending = requestCountByMatchId[m.id] ?? 0;
      return pending < 3;
    }) || null;
  }, [filteredAndSortedMatches, requestCountByMatchId]);

  const lastSport = useMemo(() => {
    try {
      const s = localStorage.getItem("lastSport");
      return s || null;
    } catch {
      return null;
    }
  }, []);

  const recommended = useMemo(() => {
    if (!filteredAndSortedMatches.length) return [];
    const scored = filteredAndSortedMatches.map((m) => {
      let score = 0;
      if (lastSport && m.sport === lastSport) score += 2;
      if (recentMatches.includes(m.id)) score += 3;
      if (userLocation) {
        const coords = getMatchCoordinates(m);
        if (coords) {
          // 거리가 가까울수록 가산 (10km 이내면 +2, 20km 이내면 +1)
          const d = getDistanceKm(userLocation, coords);
          if (d <= 10) score += 2;
          else if (d <= 20) score += 1;
        }
      } else if (userRegion && m.region === userRegion) {
        score += 1;
      }
      return { match: m, score };
    });
    return scored
      .sort((a, b) => b.score - a.score || toMatchDateTime(a.match).getTime() - toMatchDateTime(b.match).getTime())
      .filter((s) => s.score > 0)
      .map((s) => s.match);
  }, [filteredAndSortedMatches, lastSport, recentMatches, userLocation, userRegion]);

  function saveRecentAndNavigate(matchId: string) {
    try {
      track("click_match", { matchId });
    } catch {}
    try {
      const prev = JSON.parse(localStorage.getItem("recentMatches") || "[]");
      const list: string[] = Array.isArray(prev) ? prev : [];
      const updated = [matchId, ...list.filter((id) => id !== matchId)].slice(0, 10);
      localStorage.setItem("recentMatches", JSON.stringify(updated));
      setRecentMatches(updated);
    } catch {}
    navigate(`/match/${matchId}`);
  }

  if (loading) return <FeedSkeletonGrid />;

  if (error) {
    return (
      <FeedEmptyState
        title="경기 정보를 불러올 수 없어요"
        description="잠시 후 다시 시도해주세요."
        ctaText="새로고침"
        onClick={() => window.location.reload()}
      />
    );
  }

  if (!scopedMatches.length) {
    return (
      <FeedEmptyState
        title="지금 참여 가능한 경기가 없어요"
        description="직접 경기를 만들거나 다른 시간대 경기를 확인해보세요."
        ctaText="경기 만들기"
        onClick={() => navigate(`/sports/${encodeURIComponent(sport)}/match/create`)}
        secondaryCtaText="다른 시간대 보기"
        onSecondaryClick={() => navigate(`/sports/${sport}?tab=event`, { replace: true })}
      />
    );
  }

  return (
    <div className="px-4 py-4 space-y-3">
      {recommended.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-bold text-lg">🔥 추천 경기</h2>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recommended.slice(0, 5).map((match) => {
              const matchDateTime = toMatchDateTime(match);
              const matchCoords = getMatchCoordinates(match);
              const distanceLabel =
                userLocation && matchCoords
                  ? `${getDistanceKm(userLocation, matchCoords).toFixed(1)}km`
                  : null;
              const pendingRequestCount = requestCountByMatchId[match.id] ?? 0;
              const isHot = pendingRequestCount / ASSUMED_MAX_PARTICIPANTS >= 0.8;
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => saveRecentAndNavigate(match.id)}
                  className="min-w-[220px] text-left rounded-lg border bg-white p-3 hover:shadow-sm"
                >
                  <div className="text-xs font-semibold text-blue-700 mb-0.5">
                    {getWhenLabel(matchDateTime)}
                  </div>
                  <div className="text-sm font-semibold text-gray-900 truncate">{match.teamName}</div>
                  <div className="text-xs text-gray-600 mt-1 truncate">
                    {match.region}
                    {match.stadium ? ` · ${match.stadium}` : ""}
                    {distanceLabel ? ` · ${distanceLabel}` : ""}
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    👥 {pendingRequestCount} / {ASSUMED_MAX_PARTICIPANTS}
                    {isHot && <span className="ml-2 text-amber-600 font-semibold">🔥 임박</span>}
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {(urgentCandidate || nearbyNewCandidate || lowParticipationImminent) && (
        <div className="space-y-2">
          {urgentCandidate && (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                🔥 마감 임박 경기! <span className="font-semibold">{urgentCandidate.teamName}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/match/${urgentCandidate.id}`)}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                참여하기
              </button>
            </div>
          )}
          {nearbyNewCandidate && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                📍 근처에 새로운 경기 열렸어요 · <span className="font-semibold">{nearbyNewCandidate.teamName}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/match/${nearbyNewCandidate.id}`)}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
              >
                바로 보기
              </button>
            </div>
          )}
          {lowParticipationImminent && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 flex items-center justify-between gap-3">
              <div className="text-sm">
                😢 아직 인원이 부족해요 · <span className="font-semibold">{lowParticipationImminent.teamName}</span>
              </div>
              <button
                type="button"
                onClick={() => navigate(`/match/${lowParticipationImminent.id}`)}
                className="rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
              >
                도와주기
              </button>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSortOption("imminent")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            sortOption === "imminent" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          임박순
        </button>
        <button
          type="button"
          onClick={() => setSortOption("latest")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            sortOption === "latest" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          최신순
        </button>
        <button
          type="button"
          onClick={() => setSortOption("distance")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            sortOption === "distance" ? "bg-blue-600 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          가까운순
        </button>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setTimeFilter("all")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            timeFilter === "all" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          전체 시간
        </button>
        <button
          type="button"
          onClick={() => setTimeFilter("morning")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            timeFilter === "morning" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          오전
        </button>
        <button
          type="button"
          onClick={() => setTimeFilter("afternoon")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            timeFilter === "afternoon" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          오후
        </button>
        <button
          type="button"
          onClick={() => setTimeFilter("evening")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            timeFilter === "evening" ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          저녁
        </button>
        <button
          type="button"
          onClick={() => setOnlyAvailable((prev) => !prev)}
          className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
            onlyAvailable ? "bg-emerald-600 text-white" : "bg-white text-gray-700 border border-gray-200"
          }`}
        >
          자리 있는 경기만
        </button>
      </div>

      {sortOption === "distance" && !userLocation && (
        <p className="text-xs text-gray-500">위치 권한이 없어서 가까운순은 지역 기준으로 정렬됩니다.</p>
      )}

      {!filteredAndSortedMatches.length && (
        <FeedEmptyState
          title="필터 조건에 맞는 경기가 없어요"
          description="필터를 해제하거나 다른 정렬로 확인해보세요."
          ctaText="필터 초기화"
          onClick={() => {
            setTimeFilter("all");
            setOnlyAvailable(false);
          }}
        />
      )}

      {filteredAndSortedMatches.map((match) => {
        const matchDateTime = toMatchDateTime(match);
        const pendingRequestCount = requestCountByMatchId[match.id] ?? 0;
        const hasCrowdedSignal = pendingRequestCount >= 3;
        const matchCoords = getMatchCoordinates(match);
        const distanceLabel =
          sortOption === "distance" && userLocation && matchCoords
            ? `${getDistanceKm(userLocation, matchCoords).toFixed(1)}km`
            : null;

        return (
        <div
          key={match.id}
            onClick={() => saveRecentAndNavigate(match.id)}
          className="rounded-lg border-2 border-blue-200 bg-blue-50 p-4 transition-all hover:shadow-md cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
                <div className="mb-1 text-sm font-semibold text-blue-700">{getWhenLabel(matchDateTime)}</div>
              <h3 className="text-sm font-semibold text-gray-900">{match.teamName}</h3>
              <div className="mt-2 text-sm text-gray-600">
                {match.region}
                {match.stadium ? ` · ${match.stadium}` : ""}
                  {distanceLabel ? ` · ${distanceLabel}` : ""}
                </div>
                <div className="mt-1 text-sm text-gray-600">
                  👥 지원 팀 {pendingRequestCount}개 / {ASSUMED_MAX_PARTICIPANTS}팀
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                <span>{match.level}</span>
                <span>•</span>
                <span>{getTimeAgo(toDate(match.createdAt))}</span>
                  {hasCrowdedSignal && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-amber-600">마감 임박 🔥</span>
                    </>
                  )}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                  try {
                    track("join_match", { matchId: match.id });
                  } catch {}
                  saveRecentAndNavigate(match.id);
              }}
              className="rounded-md bg-blue-600 px-3 py-2 text-xs font-medium text-white hover:bg-blue-700"
            >
              참여하기
            </button>
          </div>
        </div>
        );
      })}

      {!filteredAndSortedMatches.length && scopedMatches.length > 0 && (
        <div className="hidden">
          {/* 조건부 렌더링 순서를 유지하기 위한 안전 블록 */}
          <span />
        </div>
      )}
    </div>
  );
}
