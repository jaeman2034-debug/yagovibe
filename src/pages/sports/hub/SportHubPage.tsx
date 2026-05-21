/**
 * 🔥 SportHubPage - 종목 허브 페이지
 *
 * 역할:
 * - 종목별 통합 허브 (경기 / 활동 / 팀 / 이벤트 탭은 `?tab=...`)
 * - 플레이 UI는 `/teams/:teamId/play` (허브 `?tab=play`는 리다이렉트만)
 * - 거래(마켓) 리스트는 단일 라우트 `/sports/:sport/market` 로만 진입
 *
 * URL: /sports/:sport?tab=match|activity|team|event  ·  마켓: /sports/:sport/market
 */

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useNavigate, useLocation } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";
import SportMatchFeed from "./SportMatchFeed";
import SportActivityFeed from "./SportActivityFeed";
import SportTeamFeed from "./SportTeamFeed";
import SportEventFeed from "./SportEventFeed";
import { SportHeader } from "@/components/sports/SportHeader";
import { isFirstSportHubVisit, markSportHubVisited } from "@/utils/sportVisit";
import { track } from "@/lib/analytics";
import { sportMarketListUrl } from "@/utils/sportHubHref";
import { cn } from "@/lib/utils";
import { markTeamPlayEntryFromAppNav, teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";

type HubContentTab = "match" | "activity" | "team" | "event";
type DefaultTabChoice = "market" | HubContentTab;

const VALID_HUB_TABS: HubContentTab[] = ["match", "activity", "team", "event"];
const DEFAULT_TAB_BY_SPORT: Record<string, DefaultTabChoice> = {
  baseball: "team",
  soccer: "team",
  basketball: "market",
  volleyball: "market",
  badminton: "market",
  tennis: "market",
  golf: "market",
  billiards: "market",
  running: "event",
  hiking: "event",
  climbing: "event",
  cycling: "event",
  yoga: "event",
  fitness: "market",
  swimming: "match",
  "table-tennis": "market",
  martial: "event",
  winter: "event",
};

type TabId = "market" | HubContentTab;

function parseTeamIdParam(raw: string | null): string | null {
  if (!raw || !raw.trim()) return null;
  const t = raw.trim();
  if (t === "null" || t === "undefined") return null;
  return t;
}

export default function SportHubPage() {
  const { sport: sportParam } = useParams<{ sport: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const tabParam = searchParams.get("tab");
  const sport = normalizeSportId(sportParam) ?? "soccer";
  const defaultTabBySport = DEFAULT_TAB_BY_SPORT[sport] ?? "market";

  const hubTabFromUrl: HubContentTab | null =
    tabParam && VALID_HUB_TABS.includes(tabParam as HubContentTab)
      ? (tabParam as HubContentTab)
      : null;

  const [activeTab, setActiveTab] = useState<HubContentTab>(() => {
    if (hubTabFromUrl !== null) return hubTabFromUrl;
    if (tabParam === "market") return "match";
    if (tabParam === "play") return "team";
    if (sport === "soccer") {
      if (!tabParam) return "team";
      if (!VALID_HUB_TABS.includes(tabParam as HubContentTab)) return "team";
    }
    return "match";
  });

  /** 레거시 `?tab=play` → 팀 플레이 단일 라우트 또는 팀 탭 */
  useEffect(() => {
    if (tabParam !== "play") return;
    const tid = parseTeamIdParam(searchParams.get("teamId"));
    if (tid) {
      markTeamPlayEntryFromAppNav();
      navigate(teamPlayEntryPath(tid), { replace: true });
      return;
    }
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    next.set("tab", "team");
    const qs = next.toString();
    navigate(`/sports/${encodeURIComponent(sport)}${qs ? `?${qs}` : ""}`, { replace: true });
  }, [tabParam, sport, searchParams, navigate]);

  useEffect(() => {
    localStorage.setItem("lastSport", sport);
    try {
      track("select_sport", { sport });
    } catch {
      /* ignore */
    }
  }, [sport]);

  useEffect(() => {
    if (hubTabFromUrl) {
      setActiveTab(hubTabFromUrl);
    }
  }, [hubTabFromUrl]);

  // 레거시 `?tab=market` → 마켓 리스트 단일 라우트
  useEffect(() => {
    if (tabParam !== "market") return;
    const next = new URLSearchParams(searchParams);
    next.delete("tab");
    const qs = next.toString();
    navigate(`/sports/${encodeURIComponent(sport)}/market${qs ? `?${qs}` : ""}`, { replace: true });
  }, [tabParam, sport, searchParams, navigate]);

  // 없거나 잘못된 tab → 종목 기본(마켓이면 `/market`으로)
  useEffect(() => {
    if (tabParam === "market") return;
    if (tabParam === "play") return;

    if (hubTabFromUrl !== null) return;

    if (!tabParam) {
      const initialTab: DefaultTabChoice =
        sport === "soccer" ? "team" : isFirstSportHubVisit() ? "match" : defaultTabBySport;
      markSportHubVisited();
      if (initialTab === "market") {
        navigate(sportMarketListUrl(sport), { replace: true });
        return;
      }
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set("tab", initialTab);
          return next;
        },
        { replace: true }
      );
      return;
    }

    const fallback: DefaultTabChoice = sport === "soccer" ? "team" : defaultTabBySport;
    if (fallback === "market") {
      navigate(sportMarketListUrl(sport), { replace: true });
      return;
    }
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", fallback);
        return next;
      },
      { replace: true }
    );
  }, [tabParam, hubTabFromUrl, sport, defaultTabBySport, navigate, setSearchParams, searchParams]);

  const handleTabClick = (newTab: TabId) => {
    if (newTab === "market") {
      navigate(sportMarketListUrl(sport));
      try {
        track("select_tab", { tab: "market", sport });
      } catch {
        /* ignore */
      }
      return;
    }
    if (newTab === activeTab && hubTabFromUrl === newTab) return;
    setActiveTab(newTab);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set("tab", newTab);
        return next;
      },
      { replace: true }
    );
    try {
      track("select_tab", { tab: newTab, sport });
    } catch {
      /* ignore */
    }
  };

  const marketPathPrefix = `/sports/${encodeURIComponent(sport)}/market`;
  const isMarketRouteActive =
    location.pathname === marketPathPrefix || location.pathname.startsWith(`${marketPathPrefix}/`);

  const tabs: { id: TabId; label: string }[] = [
    { id: "match", label: "경기" },
    { id: "activity", label: "활동" },
    { id: "team", label: "팀" },
    { id: "event", label: "이벤트" },
    { id: "market", label: "거래" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-16 z-20 bg-white shadow-sm mb-7">
        <div className="w-full max-w-4xl mx-auto">
          <SportHeader sport={sport} />
          <div className="border-b border-gray-200">
            <div className="flex gap-2 px-4 md:px-0">
              {tabs.map((tab) => {
                const isMarket = tab.id === "market";
                const isActive = isMarket ? isMarketRouteActive : activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleTabClick(tab.id)}
                    className={cn(
                      "px-3 py-2 text-sm font-medium transition-colors md:px-4",
                      isMarket
                        ? isActive
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-600 hover:text-gray-900"
                        : isActive
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-gray-600 hover:text-gray-900"
                    )}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-4 pb-20 w-full max-w-4xl mx-auto px-4 md:px-0">
        {(() => {
          switch (activeTab) {
            case "match":
              return <SportMatchFeed sport={sport} />;
            case "activity":
              return <SportActivityFeed sport={sport} />;
            case "team":
              return <SportTeamFeed sport={sport} />;
            case "event":
              return <SportEventFeed sport={sport} />;
            default:
              return <SportMatchFeed sport={sport} />;
          }
        })()}
      </div>
    </div>
  );
}
