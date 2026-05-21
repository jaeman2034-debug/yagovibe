import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { loadGoogleMap } from "@/lib/loadGoogleMap";
import { useMatches } from "@/hooks/useMatches";
import { useUserLocation } from "@/hooks/useUserLocation";
import { isSportTypeSlug } from "@/types/sport";
import type { Match } from "@/types/match";
import { getDistanceKm } from "@/utils/geo";
import { track } from "@/lib/eventLog";

type ViewportBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

function matchDateMillis(match: Match): number {
  const d = match.date as { toDate?: () => Date } | undefined;
  return d?.toDate?.().getTime() ?? 0;
}

function parseMatchStartAt(match: Match): Date | null {
  const base = (match.date as { toDate?: () => Date } | undefined)?.toDate?.();
  if (!base) return null;
  const [hh = "0", mm = "0"] = (match.time || "00:00").split(":");
  const next = new Date(base);
  next.setHours(Number(hh) || 0, Number(mm) || 0, 0, 0);
  return next;
}

function formatStartTimeLabel(match: Match): string | null {
  const start = parseMatchStartAt(match);
  if (!start) return null;
  const now = new Date();
  const isToday = start.toDateString() === now.toDateString();
  const hh = String(start.getHours()).padStart(2, "0");
  const mm = String(start.getMinutes()).padStart(2, "0");
  if (isToday) return `⏰ 오늘 ${hh}:${mm}`;
  return null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function getRemainingSeats(match: Match): number | null {
  const raw = match as Match & {
    maxPlayers?: number | string;
    people?: number | string;
    slots?: number | string;
    capacity?: number | string;
    currentPlayers?: number | string;
    currentPeople?: number | string;
    participants?: unknown;
  };

  const capacity =
    toFiniteNumber(raw.maxPlayers) ??
    toFiniteNumber(raw.people) ??
    toFiniteNumber(raw.slots) ??
    toFiniteNumber(raw.capacity);

  if (capacity == null || capacity <= 0) return null;

  const participantsCount = Array.isArray(raw.participants) ? raw.participants.length : null;
  const current =
    toFiniteNumber(raw.currentPlayers) ??
    toFiniteNumber(raw.currentPeople) ??
    participantsCount ??
    0;

  return Math.max(0, Math.floor(capacity - current));
}

function getTopMatchBadge(match: Match): { text: string; tone: "red" | "amber" | "blue" } {
  const remain = getRemainingSeats(match);
  if (remain != null) {
    if (remain <= 3) return { text: `🔥 ${remain}자리 남음`, tone: "red" };
    return { text: `👥 ${remain}자리 남음`, tone: "blue" };
  }

  const now = Date.now();
  const start = parseMatchStartAt(match);
  if (start) {
    const diffMs = start.getTime() - now;
    const sameDay = new Date(start).toDateString() === new Date(now).toDateString();
    if (diffMs >= 0 && diffMs <= 60 * 60 * 1000) {
      return { text: "⏰ 곧 시작", tone: "red" };
    }
    if (sameDay) {
      return { text: "🔥 오늘 경기", tone: "amber" };
    }
  }
  return { text: "👥 참여 가능", tone: "blue" };
}

function matchLatLng(match: Match): { lat: number; lng: number } | null {
  if (!Number.isFinite(match.stadiumLat) || !Number.isFinite(match.stadiumLng)) return null;
  return { lat: Number(match.stadiumLat), lng: Number(match.stadiumLng) };
}

function inBounds(pos: { lat: number; lng: number }, b: ViewportBounds): boolean {
  if (pos.lat < b.south || pos.lat > b.north) return false;
  if (b.west <= b.east) return pos.lng >= b.west && pos.lng <= b.east;
  return pos.lng >= b.west || pos.lng <= b.east;
}

function makeDevMockMatches(sport?: string): Match[] {
  const base = [
    { id: "mock-1", teamName: "포천 유나이티드", lat: 37.8948, lng: 127.2008, region: "경기 포천시", stadium: "포천 종합운동장" },
    { id: "mock-2", teamName: "의정부 FC", lat: 37.7381, lng: 127.0337, region: "경기 의정부시", stadium: "의정부 시민구장" },
    { id: "mock-3", teamName: "남양주 시티", lat: 37.6360, lng: 127.2165, region: "경기 남양주시", stadium: "남양주 체육공원" },
    { id: "mock-4", teamName: "강북 스트라이커스", lat: 37.6396, lng: 127.0257, region: "서울 강북구", stadium: "강북 풋살장" },
    { id: "mock-5", teamName: "노원 레이더스", lat: 37.6542, lng: 127.0568, region: "서울 노원구", stadium: "노원구민체육센터" },
    { id: "mock-6", teamName: "양주 타이거즈", lat: 37.7853, lng: 127.0458, region: "경기 양주시", stadium: "양주 보조경기장" },
  ];
  return base.map((m, i) => ({
    id: m.id,
    teamId: `mock-team-${i + 1}`,
    teamName: m.teamName,
    authorId: "mock-author",
    sport: (sport || "soccer") as Match["sport"],
    date: { toDate: () => new Date(Date.now() + (i + 1) * 86400000) } as Match["date"],
    time: "19:00",
    matchRegion: m.region,
    region: m.region,
    stadium: m.stadium,
    stadiumLat: m.lat,
    stadiumLng: m.lng,
    level: "상관없음",
    contact: "채팅",
    status: "open",
    createdAt: { toDate: () => new Date() } as Match["createdAt"],
  }));
}

export default function SportsMapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sportParam = searchParams.get("sport");
  const sport = isSportTypeSlug(sportParam) ? sportParam : undefined;
  const { matches, loading, error } = useMatches({ status: "open", sport, limit: 120 });
  const { loc: userLoc } = useUserLocation();

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const zoomExpandedOnceRef = useRef(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [sheetSnap, setSheetSnap] = useState<"peek" | "mid" | "full">("peek");
  const [viewportBounds, setViewportBounds] = useState<ViewportBounds | null>(null);

  const buildMatchDetailUrl = useCallback(
    (matchId: string, params: Record<string, string | number | null | undefined>) => {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value == null || value === "") return;
        qs.set(key, String(value));
      });
      const query = qs.toString();
      return `/match/${matchId}${query ? `?${query}` : ""}`;
    },
    []
  );

  const mapMatches = useMemo(() => matches.filter((m) => !!matchLatLng(m)), [matches]);
  const displayMatches = useMemo(() => {
    if (!import.meta.env.DEV) return mapMatches;
    if (mapMatches.length >= 6) return mapMatches;
    const mocks = makeDevMockMatches(sport).filter((m) => !mapMatches.some((x) => x.id === m.id));
    return [...mapMatches, ...mocks];
  }, [mapMatches, sport]);

  const radiusResolved = useMemo(() => {
    if (!userLoc) {
      return {
        scopeLabel: "전체",
        matches: displayMatches,
      };
    }
    const within = (km: number) =>
      displayMatches.filter((m) => {
        const pos = matchLatLng(m);
        if (!pos) return false;
        return getDistanceKm(userLoc, pos) <= km;
      });

    const within5 = within(5);
    if (within5.length > 0) return { scopeLabel: "5km", matches: within5 };
    const within10 = within(10);
    if (within10.length > 0) return { scopeLabel: "10km", matches: within10 };
    const within20 = within(20);
    if (within20.length > 0) return { scopeLabel: "20km", matches: within20 };
    return { scopeLabel: "전체", matches: displayMatches };
  }, [displayMatches, userLoc]);

  const visibleMatches = useMemo(() => {
    const radiusFiltered = radiusResolved.matches;
    if (!viewportBounds) return radiusFiltered;
    const inView = radiusFiltered.filter((m) => {
      const pos = matchLatLng(m);
      if (!pos) return false;
      return inBounds(pos, viewportBounds);
    });
    // 뷰포트 안 결과가 0이어도 완전 빈 화면을 만들지 않도록 범위 확장 결과를 그대로 노출
    return inView.length > 0 ? inView : radiusFiltered;
  }, [radiusResolved.matches, viewportBounds]);

  const orderedMatches = useMemo(() => {
    if (!selectedMatchId) return visibleMatches;
    return [...visibleMatches].sort((a, b) => {
      if (a.id === selectedMatchId) return -1;
      if (b.id === selectedMatchId) return 1;
      return 0;
    });
  }, [visibleMatches, selectedMatchId]);

  const sheetMatches = useMemo(() => {
    if (sheetSnap === "peek") return orderedMatches.slice(0, 3);
    if (sheetSnap === "mid") return orderedMatches.slice(0, 8);
    return orderedMatches.slice(0, 12);
  }, [orderedMatches, sheetSnap]);

  const distanceSortedMatches = useMemo(() => {
    return [...visibleMatches].sort((a, b) => {
      if (userLoc) {
        const ap = matchLatLng(a);
        const bp = matchLatLng(b);
        const ad = ap ? getDistanceKm(userLoc, ap) : Number.MAX_SAFE_INTEGER;
        const bd = bp ? getDistanceKm(userLoc, bp) : Number.MAX_SAFE_INTEGER;
        if (ad !== bd) return ad - bd;
      }
      return matchDateMillis(a) - matchDateMillis(b);
    });
  }, [visibleMatches, userLoc]);

  const top3Matches = useMemo(() => distanceSortedMatches.slice(0, 3), [distanceSortedMatches]);

  useEffect(() => {
    void track("sports_map_view", {
      sport: sport ?? "all",
      hasUserLocation: !!userLoc,
    });
  }, [sport, userLoc]);

  const selectedMatch = useMemo(
    () => displayMatches.find((m) => m.id === selectedMatchId) ?? null,
    [displayMatches, selectedMatchId]
  );

  const panToMatch = useCallback((match: Match, opts?: { focus?: boolean }) => {
    const map = mapInstanceRef.current;
    const pos = matchLatLng(match);
    if (!map || !pos) return;
    map.panTo(pos);
    if (opts?.focus) {
      map.setZoom(15);
      return;
    }
    if ((map.getZoom() ?? 0) < 13) map.setZoom(13);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadGoogleMap()
      .then(() => {
        if (cancelled || !mapRef.current || mapInstanceRef.current) return;
        mapInstanceRef.current = new window.google.maps.Map(mapRef.current, {
          center: userLoc || { lat: 37.5665, lng: 126.978 },
          zoom: userLoc ? 13 : 12,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        });
      })
      .catch((e) => {
        console.error(e);
        setMapError("지도를 불러오지 못했습니다.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current.clear();

    if (displayMatches.length === 0) return;
    const bounds = new window.google.maps.LatLngBounds();
    const idleListener = map.addListener("idle", () => {
      const b = map.getBounds();
      if (!b) return;
      const ne = b.getNorthEast();
      const sw = b.getSouthWest();
      setViewportBounds({
        north: ne.lat(),
        south: sw.lat(),
        east: ne.lng(),
        west: sw.lng(),
      });
    });

    displayMatches.forEach((match) => {
      const pos = matchLatLng(match);
      if (!pos) return;
      const marker = new window.google.maps.Marker({
        map,
        position: pos,
        title: match.teamName,
        icon: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
      });
      marker.addListener("click", () => {
        void track("map_marker_click", {
          matchId: match.id,
          lat: pos.lat,
          lng: pos.lng,
          sport: match.sport,
        });
        setSelectedMatchId(match.id);
        setSheetSnap("mid");
        panToMatch(match, { focus: true });
      });
      markersRef.current.set(match.id, marker);
      bounds.extend(pos);
    });
    if (!userLoc && !bounds.isEmpty()) map.fitBounds(bounds, 56);
    if (!selectedMatchId && displayMatches[0]) {
      setSelectedMatchId(displayMatches[0].id);
    }
    return () => {
      window.google.maps.event.removeListener(idleListener);
    };
  }, [displayMatches, selectedMatchId, userLoc, panToMatch]);

  useEffect(() => {
    markersRef.current.forEach((marker, id) => {
      const selected = id === selectedMatchId;
      marker.setIcon(
        selected
          ? "http://maps.google.com/mapfiles/ms/icons/blue-dot.png"
          : "http://maps.google.com/mapfiles/ms/icons/red-dot.png"
      );
      marker.setZIndex(selected ? 999 : 1);
    });
  }, [selectedMatchId]);

  useEffect(() => {
    if (!selectedMatch) return;
    panToMatch(selectedMatch);
  }, [selectedMatch, panToMatch]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !userLoc) return;
    if (radiusResolved.scopeLabel === "5km") {
      zoomExpandedOnceRef.current = false;
      return;
    }
    if (zoomExpandedOnceRef.current) return;
    zoomExpandedOnceRef.current = true;
    // 근처 결과가 없을 때 초기 탐색 범위를 자동 확장
    map.setZoom(11);
  }, [radiusResolved.scopeLabel, userLoc]);

  useEffect(() => {
    if (!selectedMatchId) return;
    const el = cardRefs.current.get(selectedMatchId);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selectedMatchId, sheetSnap]);

  return (
    <div className="min-h-dvh bg-gray-50 pb-20">
      <div className="w-full max-w-none px-3 py-4 md:mx-auto md:max-w-[820px]">
        <header className="mb-3">
          <h1 className="text-lg font-semibold text-gray-900">근처 경기 / 구장 지도</h1>
          <p className="text-sm text-gray-500">마커와 리스트가 서로 연동됩니다.</p>
          <p className="mt-1 text-xs text-gray-500">지도를 확대하면 더 많은 경기를 볼 수 있어요.</p>
          {radiusResolved.scopeLabel !== "5km" ? (
            <p className="mt-1 text-xs text-blue-600">
              근처에는 없어서 {radiusResolved.scopeLabel} 범위까지 넓게 찾아봤어요.
            </p>
          ) : null}
        </header>

        <div
          ref={mapRef}
          className="h-[62vh] min-h-[360px] w-full rounded-xl border border-gray-200 bg-gray-100"
        />
        {mapError ? <p className="mt-2 text-sm text-red-600">{mapError}</p> : null}
      </div>

      <section
        className={`fixed inset-x-0 bottom-0 z-30 rounded-t-2xl border border-gray-200 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.1)] transition-[height] ${
          sheetSnap === "peek" ? "h-[28vh]" : sheetSnap === "mid" ? "h-[44vh]" : "h-[70vh]"
        }`}
      >
        <div className="mx-auto flex h-full max-w-[820px] flex-col px-4 pb-4 pt-2">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className="mx-auto h-1.5 w-12 rounded-full bg-gray-300"
              onClick={() =>
                setSheetSnap((prev) => (prev === "peek" ? "mid" : prev === "mid" ? "full" : "peek"))
              }
              aria-label="리스트 높이 변경"
            />
            <div className="absolute right-4 top-3 flex gap-1 text-xs">
              <button type="button" className="rounded bg-gray-100 px-2 py-1" onClick={() => setSheetSnap("peek")}>작게</button>
              <button type="button" className="rounded bg-gray-100 px-2 py-1" onClick={() => setSheetSnap("mid")}>중간</button>
              <button type="button" className="rounded bg-gray-100 px-2 py-1" onClick={() => setSheetSnap("full")}>크게</button>
            </div>
          </div>

          {loading ? <p className="text-sm text-gray-500">경기 데이터를 불러오는 중...</p> : null}
          {error ? <p className="text-sm text-red-600">경기 데이터를 불러오지 못했습니다.</p> : null}

          {!loading && !error && visibleMatches.length === 0 ? (
            <div className="mt-2 rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
              <p className="font-medium text-gray-800">근처에 참여 가능한 경기가 없어요</p>
              <div className="mt-3 flex justify-center gap-2">
                <button
                  type="button"
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => navigate("/match/create")}
                >
                  👉 경기 만들기
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800"
                  onClick={() => navigate(`/sports/match${sport ? `?sport=${sport}` : ""}`)}
                >
                  👉 리스트 보기
                </button>
              </div>
            </div>
          ) : null}

          {!loading && !error && visibleMatches.length > 0 ? (
            <div className="mt-1 overflow-y-auto">
              {top3Matches.length > 0 ? (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50/70 p-3">
                  <p className="mb-2 text-sm font-semibold text-amber-900">🔥 추천 경기 TOP3</p>
                  <div className="space-y-2">
                    {top3Matches.map((m, idx) => {
                      const pos = matchLatLng(m);
                      const distance = userLoc && pos ? getDistanceKm(userLoc, pos) : null;
                      const distanceText = distance != null ? `📍 ${distance.toFixed(1)}km` : "📍 거리 정보 없음";
                      const badge = getTopMatchBadge(m);
                      const badgeToneClass =
                        badge.tone === "red"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : badge.tone === "amber"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200";
                      const top1 = idx === 0;
                      return (
                        <button
                          key={`top-${m.id}`}
                          type="button"
                          className={`w-full rounded-lg border px-3 text-left ${
                            top1
                              ? "border-amber-300 bg-white p-3.5 shadow-sm"
                              : "border-amber-200 bg-white p-2.5"
                          }`}
                          onClick={() => {
                            setSelectedMatchId(m.id);
                            panToMatch(m, { focus: true });
                          }}
                        >
                          {top1 ? (
                            <p className="mb-0.5 text-[11px] font-semibold text-amber-700">
                              🔥 지금 가장 가까운 경기
                            </p>
                          ) : null}
                          {top1 && formatStartTimeLabel(m) ? (
                            <p className="mb-1 text-[11px] font-semibold text-red-600">{formatStartTimeLabel(m)}</p>
                          ) : null}
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <div className="text-sm font-semibold text-gray-900">{m.teamName}</div>
                            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${badgeToneClass}`}>
                              {badge.text}
                            </span>
                          </div>
                          <div className="text-xs text-gray-600">
                            {distanceText} · {m.matchRegion || m.region}
                          </div>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              className="rounded-lg bg-gray-900 px-2.5 py-1 text-[11px] font-semibold text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                const remain = getRemainingSeats(m);
                                const rank = idx + 1;
                                const distanceKm = distance != null ? Number(distance.toFixed(2)) : null;
                                void track("match_top3_cta_click", {
                                  matchId: m.id,
                                  rank,
                                  distanceKm,
                                  hasSlots: remain !== null,
                                  remainingSlots: remain,
                                  sport: m.sport,
                                });
                                if (idx === 0) {
                                  void track("match_top1_click", {
                                    matchId: m.id,
                                    distanceKm,
                                    sport: m.sport,
                                  });
                                }
                                navigate(
                                  buildMatchDetailUrl(m.id, {
                                    source: "top3",
                                    rank,
                                    distanceKm,
                                    remainingSlots: remain,
                                  })
                                );
                              }}
                            >
                              👉 지금 참여하기 (자리 확보)
                            </button>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}

              <p className="mb-2 text-xs font-medium text-gray-500">전체 경기</p>
              <div className="space-y-2">
                {sheetMatches.map((m) => {
                  const selected = m.id === selectedMatchId;
                  const pos = matchLatLng(m);
                  const distance = userLoc && pos ? getDistanceKm(userLoc, pos) : null;
                  const distanceText = distance != null ? ` · ${distance.toFixed(1)}km` : "";
                  return (
                    <div
                      key={m.id}
                      ref={(el) => {
                        if (!el) {
                          cardRefs.current.delete(m.id);
                          return;
                        }
                        cardRefs.current.set(m.id, el);
                      }}
                      className={`rounded-xl border px-4 py-3 ${
                        selected ? "border-blue-500 bg-blue-50" : "border-gray-200 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full text-left"
                        onClick={() => {
                          setSelectedMatchId(m.id);
                          panToMatch(m, { focus: true });
                        }}
                      >
                        <div className="font-medium text-gray-900">{m.teamName}</div>
                        <div className="text-sm text-gray-600">
                          📍 {m.matchRegion || m.region}
                          {distanceText}
                          {m.stadium ? ` · ${m.stadium}` : ""}
                        </div>
                      </button>
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-semibold text-white"
                          onClick={() => {
                            const rank = sheetMatches.findIndex((item) => item.id === m.id) + 1;
                            const distanceKm = distance != null ? Number(distance.toFixed(2)) : null;
                            const remain = getRemainingSeats(m);
                            void track("match_list_cta_click", {
                              matchId: m.id,
                              rank,
                              distanceKm,
                              remainingSlots: remain,
                              sport: m.sport,
                            });
                            navigate(
                              buildMatchDetailUrl(m.id, {
                                source: "list",
                                rank,
                                distanceKm,
                                remainingSlots: remain,
                              })
                            );
                          }}
                        >
                          👉 지금 참여하기 (자리 확보)
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

