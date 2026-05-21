/**
 * 🔥 ActivityRouter - Activity 기반 라우팅
 * 
 * 역할:
 * - Activity 중심 플랫폼의 라우팅 허브
 * - 기존 페이지를 Activity 기준으로 재사용
 * - URL만 새 체계로 제공 (기존 기능 유지)
 * 
 * 설계 원칙:
 * - 기존 페이지 코드 수정 최소화
 * - URL 매핑만 변경
 * - 점진적 전환 (기존 경로도 유지)
 */

import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, Navigate, useParams, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { collectionGroup, doc, documentId, getDoc, getDocs, limit, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

// ✅ 기존 페이지들 (실제 프로젝트 경로 기준)
import ChatListPage from "../chat/ChatListPage";
import ActivityPage from "./ActivityPage"; // 🔥 메인 Activity 페이지 (필터 탭 + ActivityFeed)
import TeamList from "../team/TeamList";
import EventsPage from "./EventsPage";
import ScheduleCreatePage from "./ScheduleCreatePage";
import ScheduleDetailPage from "./ScheduleDetailPage";
import RecruitDetail from "@/features/market/components/details/RecruitDetail";
import type { MarketPost } from "@/features/market/types";
import ActivityPostDetailPage from "./ActivityPostDetailPage";
import SportsActivityPage from "../sports/SportsActivityPage";
import FederationShell from "../federations/FederationShell";
import FederationHomePage from "../federations/FederationHomePage";
import FederationTournamentPublicPage from "../federations/FederationTournamentPublicPage";
import { useActivityMatchesShared, type ActivityMatch } from "@/hooks/useActivityMatchesShared";

const ACTIVITY_LAST_CONTEXT_KEY = "activity:lastContext";
type ActivityLastContext = {
  scope?: "federation" | "league";
  federationSlug?: string;
  leagueId?: string;
};

function readActivityLastContext(): ActivityLastContext | null {
  try {
    const raw = localStorage.getItem(ACTIVITY_LAST_CONTEXT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActivityLastContext;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function writeActivityLastContext(ctx: ActivityLastContext) {
  try {
    localStorage.setItem(ACTIVITY_LAST_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {
    // ignore storage errors
  }
}

function ActivityTabsLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  // 🔽 useEffect 의존성을 원시값으로 축약하기 위해 미리 추출
  const spScope = searchParams.get("scope");
  const spLeagueId = searchParams.get("leagueId");
  const spFederationSlug = searchParams.get("federationSlug");
  const scopeParam = spScope;
  const leagueId = spLeagueId;
  const defaultScope = leagueId ? "league" : "federation";
  const scope = scopeParam === "league" || scopeParam === "federation" ? scopeParam : defaultScope;
  useEffect(() => {
    if (scopeParam === "league" || scopeParam === "federation") return;
    const next = new URLSearchParams(searchParams);
    next.set("scope", defaultScope);
    // 🔒 URL 변경 전 동등성 비교로 불필요한 갱신 방지
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [scopeParam, defaultScope]);
  const tabs = [
    { id: "tournaments", label: "대회", path: "/activity/tournaments" },
    { id: "matches", label: "경기", path: "/activity/matches" },
    { id: "live", label: "LIVE", path: "/activity/live" },
    { id: "standings", label: "순위", path: "/activity/standings" },
  ];
  useEffect(() => {
    const federationSlug = spFederationSlug || undefined;
    const next: ActivityLastContext = {
      scope: scope as "federation" | "league",
      federationSlug,
      leagueId: leagueId || undefined,
    };
    writeActivityLastContext(next);
  }, [scope, leagueId]);

  useEffect(() => {
    // URL 파라미터가 이미 있으면 URL 우선 규칙에 따라 복원하지 않는다.
    if (spScope || spLeagueId || spFederationSlug) return;
    let cancelled = false;
    void (async () => {
      const saved = readActivityLastContext();
      if (!saved) return;
      const next = new URLSearchParams(searchParams);
      const savedScope =
        saved.scope === "league" || saved.scope === "federation" ? saved.scope : defaultScope;
      next.set("scope", savedScope);
      if (saved.federationSlug) next.set("federationSlug", saved.federationSlug);

      if (savedScope === "league" && saved.leagueId) {
        // 안전장치: leagueId 존재 여부 + federationSlug 일치 여부 확인
        try {
          const q = query(collectionGroup(db, "leagues"), where(documentId(), "==", saved.leagueId), limit(1));
          const snap = await getDocs(q);
          if (cancelled) return;
          const first = snap.docs[0];
          if (first) {
            const segments = first.ref.path.split("/");
            const foundFederationSlug = segments[1] || "";
            if (!saved.federationSlug || saved.federationSlug === foundFederationSlug) {
              next.set("leagueId", saved.leagueId);
              if (!next.get("federationSlug")) next.set("federationSlug", foundFederationSlug);
            }
          }
        } catch {
          // invalid saved value -> fallback federation scope
          next.set("scope", "federation");
          next.delete("leagueId");
        }
      }
      // 🔒 URL 변경 전 동등성 비교
      if (next.toString() !== searchParams.toString()) {
        setSearchParams(next, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [spScope, spLeagueId, spFederationSlug, defaultScope]);

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <div className="sticky top-14 z-20 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="w-full max-w-none px-3 py-1 md:mx-auto md:max-w-4xl">
          <div className="grid grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const active = pathname.startsWith(tab.path);
            return (
              <button
                key={tab.id}
                onClick={() => {
                  const next = new URLSearchParams(searchParams);
                  next.set("scope", scope);
                  navigate(`${tab.path}?${next.toString()}`);
                }}
                className={`min-h-10 px-2 py-2 rounded-md text-sm border font-medium ${
                  active ? "bg-primary-50 text-primary-700 border-primary-200" : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

function ActivityLeagueRedirect() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!leagueId) return;
      try {
        const q = query(collectionGroup(db, "leagues"), where(documentId(), "==", leagueId), limit(1));
        const snap = await getDocs(q);
        if (cancelled) return;
        const first = snap.docs[0];
        if (!first) {
          navigate("/activity/tournaments", { replace: true });
          return;
        }
        const segments = first.ref.path.split("/");
        const federationSlug = segments[1];
        navigate(`/activity/federations/${federationSlug}`, { replace: true });
      } catch {
        if (!cancelled) navigate("/activity/tournaments", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leagueId, navigate]);
  return <div className="p-4 text-sm text-gray-600">리그 페이지로 이동 중...</div>;
}

function ActivityMatchesPage({ liveOnly = false }: { liveOnly?: boolean }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const leagueId = searchParams.get("leagueId") || undefined;
  const federationSlug = searchParams.get("federationSlug") || undefined;
  const scopeParam = searchParams.get("scope");
  const scope: "federation" | "league" =
    scopeParam === "league" || (scopeParam !== "federation" && !!leagueId) ? "league" : "federation";
  const [leagueName, setLeagueName] = useState("");
  const statusFilter = searchParams.get("status") || "all";
  const dateFilter = searchParams.get("date") || "";
  const { matches: rows, loading, error } = useActivityMatchesShared({
    federationSlug,
    leagueId: scope === "league" ? leagueId : undefined,
  });
  useEffect(() => {
    let cancelled = false;
    if (!leagueId) {
      setLeagueName("");
      return;
    }
    void (async () => {
      try {
        const q = query(collectionGroup(db, "leagues"), where(documentId(), "==", leagueId), limit(1));
        const snap = await getDocs(q);
        if (cancelled) return;
        const first = snap.docs[0];
        setLeagueName(String(first?.data()?.name || ""));
      } catch {
        if (!cancelled) setLeagueName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);
  const filtered = useMemo(
    () =>
      (liveOnly ? rows.filter((m) => m.status === "live") : rows)
        .filter((m) => (statusFilter === "all" ? true : (m.status || "scheduled") === statusFilter))
        .filter((m) => (!dateFilter ? true : (m.matchDate || "") === dateFilter)),
    [rows, liveOnly, statusFilter, dateFilter]
  );
  return (
    <div className="w-full max-w-none px-3 md:mx-auto md:max-w-4xl p-0 md:p-4 space-y-2">
      <div className="rounded-lg border bg-white p-3">
        <p className="text-xs text-gray-600 mb-2">
          {scope === "league" && leagueId
            ? `${leagueName || leagueId} 리그 경기`
            : federationSlug
            ? `${federationSlug} 협회 전체 경기`
            : "전체 범위 경기"}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("date", e.target.value);
              else next.delete("date");
              setSearchParams(next, { replace: true });
            }}
            className="border rounded px-2 py-2 text-sm"
          />
          <select
            value={statusFilter}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              next.set("status", e.target.value);
              setSearchParams(next, { replace: true });
            }}
            className="border rounded px-2 py-2 text-sm"
          >
            <option value="all">전체 상태</option>
            <option value="scheduled">예정</option>
            <option value="live">LIVE</option>
            <option value="completed">종료</option>
          </select>
          <ButtonLike
            onClick={() => {
              const next = new URLSearchParams(searchParams);
              next.delete("date");
              next.set("status", "all");
              setSearchParams(next, { replace: true });
            }}
            label="필터 초기화"
          />
        </div>
      </div>
      {loading && <p className="text-sm text-gray-600">불러오는 중...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {filtered.map((m) => (
        <div key={m.id} className="rounded-lg border bg-white p-3 text-sm">
          <div className="font-medium">{m.homeTeam || "TBD"} vs {m.awayTeam || "TBD"}</div>
          <div className="text-xs text-gray-600 mt-1">{m.matchDate || "-"} {m.matchTime || "--:--"} · {m.status}</div>
        </div>
      ))}
      {filtered.length === 0 && <p className="text-sm text-gray-600">표시할 경기가 없습니다.</p>}
    </div>
  );
}

function ActivityStandingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const leagueId = searchParams.get("leagueId") || undefined;
  const federationSlug = searchParams.get("federationSlug") || undefined;
  const scopeParam = searchParams.get("scope");
  const scope: "federation" | "league" =
    scopeParam === "league" || (scopeParam !== "federation" && !!leagueId) ? "league" : "federation";
  const [leagueName, setLeagueName] = useState("");
  const { matches: rows, loading, error } = useActivityMatchesShared({
    federationSlug,
    leagueId: scope === "league" ? leagueId : undefined,
  });
  useEffect(() => {
    let cancelled = false;
    if (!leagueId) {
      setLeagueName("");
      return;
    }
    void (async () => {
      try {
        const q = query(collectionGroup(db, "leagues"), where(documentId(), "==", leagueId), limit(1));
        const snap = await getDocs(q);
        if (cancelled) return;
        const first = snap.docs[0];
        setLeagueName(String(first?.data()?.name || ""));
      } catch {
        if (!cancelled) setLeagueName("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leagueId]);
  const scopedRows = useMemo(() => rows.filter((m) => !m.stage || m.stage === "group"), [rows]);
  const standings = useMemo(() => {
    const table: Record<string, { team: string; p: number; gd: number; gf: number; ga: number }> = {};
    scopedRows.forEach((m: ActivityMatch) => {
      const hs = m.homeScore;
      const as = m.awayScore;
      if (m.status !== "completed" || typeof hs !== "number" || typeof as !== "number") return;
      const home = m.homeTeam || "홈팀";
      const away = m.awayTeam || "원정팀";
      if (!table[home]) table[home] = { team: home, p: 0, gd: 0, gf: 0, ga: 0 };
      if (!table[away]) table[away] = { team: away, p: 0, gd: 0, gf: 0, ga: 0 };
      table[home].gf += hs; table[home].ga += as;
      table[away].gf += as; table[away].ga += hs;
      if (hs > as) table[home].p += 3;
      else if (hs < as) table[away].p += 3;
      else { table[home].p += 1; table[away].p += 1; }
    });
    return Object.values(table)
      .map((t) => ({ ...t, gd: t.gf - t.ga }))
      .sort((a, b) => b.p - a.p || b.gd - a.gd || b.gf - a.gf);
  }, [scopedRows]);
  return (
    <div className="w-full max-w-none px-3 md:mx-auto md:max-w-4xl p-0 md:p-4">
      <div className="rounded-lg border bg-white p-3 mb-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-gray-900">순위 범위</p>
          <div className="inline-flex rounded-md border bg-gray-50 p-1">
            <button
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("scope", "federation");
                setSearchParams(next, { replace: true });
              }}
              className={`px-3 py-1.5 text-xs rounded ${
                scope === "federation" ? "bg-white border text-primary-700 border-primary-200" : "text-gray-600"
              }`}
            >
              Federation
            </button>
            <button
              onClick={() => {
                const next = new URLSearchParams(searchParams);
                next.set("scope", "league");
                setSearchParams(next, { replace: true });
              }}
              disabled={!leagueId}
              className={`px-3 py-1.5 text-xs rounded ${
                scope === "league" ? "bg-white border text-primary-700 border-primary-200" : "text-gray-600"
              } disabled:opacity-40`}
            >
              League
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">
          {scope === "league" && leagueId
            ? `${leagueName || leagueId} 리그 순위`
            : federationSlug
            ? `${federationSlug} 협회 전체 순위`
            : "전체 범위 순위"}
        </p>
      </div>
      {loading ? (
        <p className="text-sm text-gray-600">불러오는 중...</p>
      ) : error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : standings.length === 0 ? (
        <div className="rounded-lg border bg-white p-4 text-sm text-gray-700">완료된 경기 결과가 없어 순위를 계산할 수 없습니다.</div>
      ) : (
        <div className="rounded-lg border bg-white p-4 space-y-2">
          {standings.map((t, idx) => (
            <div key={t.team} className="flex items-center justify-between text-sm">
              <span className={idx < 2 ? "font-semibold text-blue-700" : "text-gray-800"}>{idx + 1}. {t.team}</span>
              <span className="text-gray-700">{t.p}점 ({t.gd >= 0 ? `+${t.gd}` : t.gd})</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// TODO: 팀/대회 라우트는 프로젝트 구조에 맞춰 추가
// import TeamRoutes from "../team/routes/TeamRoutes";
// import TournamentRoutes from "../tournament/routes/TournamentRoutes";

/**
 * 🔥 팀 모집 상세 페이지 라우터
 * market 컬렉션에서 데이터를 가져와 RecruitDetail로 렌더링
 */
function TeamRecruitDetailRouter() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [post, setPost] = useState<MarketPost | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchPost = async () => {
      if (!id) {
        setError("게시글 ID가 올바르지 않습니다.");
        setLoading(false);
        return;
      }
      try {
        // 🔥 market 컬렉션에서 조회
        const ref = doc(db, "market", id.trim());
        const snap = await getDoc(ref);
        
        if (cancelled) return;
        
        if (!snap.exists()) {
          setError("게시글을 찾을 수 없습니다.");
          setLoading(false);
          return;
        }
        
        const data = snap.data();
        const postCategory = data.category || data.type || null;
        
        // 🔥 모집 글만 표시
        if (postCategory === "recruit" || data.type === "team") {
          const marketPost: MarketPost = {
            id: snap.id,
            sport: (data.sport as any) || "etc",
            category: "recruit",
            title: data.title || data.name || "",
            description: data.description || data.desc || "",
            price: data.price,
            location: data.location || data.locationText || data.address || "",
            images: data.images || data.imageUrls || [],
            status: (data.status as any) || "active",
            createdAt: data.createdAt,
            authorId: data.authorId || data.userId || data.ownerId || data.sellerId || "",
            authorName: data.authorName || data.userName || data.sellerName || "",
            viewCount: data.viewCount || 0,
            likeCount: data.likeCount || 0,
            people: data.people,
            currentPeople: data.currentPeople,
            position: data.position,
            level: data.level,
            ageRange: data.ageRange,
            practiceDay: data.practiceDay,
            practiceLocation: data.practiceLocation,
          } as MarketPost;
          setPost(marketPost);
        } else {
          setError("모집 글이 아닙니다.");
        }
        setLoading(false);
      } catch (err: any) {
        console.error("❌ [TeamRecruitDetailRouter] 게시글 로드 실패:", err);
        if (!cancelled) {
          setError(err?.message || "게시글을 불러오는 중 오류가 발생했습니다.");
          setLoading(false);
        }
      }
    };
    void fetchPost();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }
  
  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-4">
          <p className="text-gray-600 mb-4">게시글을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            뒤로가기
          </button>
        </div>
      </div>
    );
  }

  return <RecruitDetail post={post} sport={post.sport} />;
}

/**
 * 🔥 Activity Router 메인 컴포넌트
 */
export default function ActivityRouter() {
  return (
    <Routes>
      <Route index element={<Navigate to="tournaments" replace />} />
      
      {/* 🔥 Activity 상세 페이지 (activityPosts 컬렉션) */}
      <Route path="post/:postId" element={<ActivityPostDetailPage />} />

      {/* 스포츠 허브 통합 */}
      <Route path="tournaments" element={<ActivityTabsLayout><SportsActivityPage /></ActivityTabsLayout>} />
      <Route path="federations/:federationSlug" element={<ActivityTabsLayout><FederationShell /></ActivityTabsLayout>}>
        <Route index element={<FederationHomePage />} />
        <Route path="tournaments/:tournamentId" element={<FederationTournamentPublicPage />} />
        <Route path="tournaments/:tournamentId/divisions/:divisionId" element={<FederationTournamentPublicPage />} />
      </Route>
      <Route path="leagues/:leagueId" element={<ActivityTabsLayout><ActivityLeagueRedirect /></ActivityTabsLayout>} />
      <Route path="matches" element={<ActivityTabsLayout><ActivityMatchesPage /></ActivityTabsLayout>} />
      <Route path="live" element={<ActivityTabsLayout><ActivityMatchesPage liveOnly /></ActivityTabsLayout>} />
      <Route path="standings" element={<ActivityTabsLayout><ActivityStandingsPage /></ActivityTabsLayout>} />

      {/* 🔥 Trading, Venues 라우트 제거 (Activity 내부에서 불필요한 리다이렉트 방지) */}
      {/* 
        ⚠️ 제거 이유:
        - /activity/trading → /trade 리다이렉트는 back navigation 꼬임 발생
        - /activity/venues → VoiceMapSearch는 별도 경로로 접근 권장
        - Activity 내부에서 다른 도메인으로 리다이렉트하면 UX 혼란
      */}

      {/* Team (팀 활동) - 팀 메인 페이지 */}
      <Route path="team" element={<TeamList />} />
      {/* 🔥 팀 모집 상세 페이지 */}
      <Route path="team/:id" element={<TeamRecruitDetailRouter />} />
      <Route path="team/*" element={<TeamList />} />

      {/* Events (대회/이벤트) - 팀 일정 통합 페이지 */}
      <Route path="events" element={<EventsPage />} />
      <Route path="events/:id" element={<ScheduleDetailPage />} />

      {/* Schedule Create - 일정 생성 페이지 */}
      <Route path="schedule/create" element={<ScheduleCreatePage />} />

      {/* 🔥 /activity/create 제거: 글로벌 /create 허브로 통일 */}

      {/* Social (소셜) - TODO: 채팅 등 소셜 기능 연결 */}
      <Route 
        path="social" 
        element={<ChatListPage />}
      />
      <Route path="social/*" element={<ChatListPage />} />

      {/* Fallback: 허브로 리다이렉트 */}
      <Route path="*" element={<Navigate to="/activity/tournaments" replace />} />
    </Routes>
  );
}

function ButtonLike({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border rounded px-3 py-2 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700"
    >
      {label}
    </button>
  );
}
