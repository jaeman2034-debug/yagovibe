/**
 * 매칭 리스트 — 검색·필터·카드·FAB (유저 메인 화면)
 */

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { normalizeSportId } from "@/constants/sports";
import { Plus, Search } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import type { Match, MatchLevel } from "@/types/match";
import { isSportTypeSlug } from "@/types/sport";
import { Input } from "@/components/ui/input";
import {
  MatchListCard,
  matchPassesDatePreset,
  type MatchDatePreset,
} from "@/components/match/MatchListCard";

type StatusFilter = "open" | "matched" | "finished";

const STATUS_LABEL: Record<StatusFilter, string> = {
  open: "모집중",
  matched: "확정",
  finished: "완료",
};

const DATE_PRESETS: { id: MatchDatePreset; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "today", label: "오늘" },
  { id: "tomorrow", label: "내일" },
  { id: "week", label: "7일 이내" },
];

const LEVEL_OPTIONS: (MatchLevel | "all")[] = [
  "all",
  "초보",
  "중급",
  "고급",
  "상관없음",
  "취미",
  "아마추어",
];

function chipBase(active: boolean) {
  return `shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "border-purple-600 bg-purple-50 text-purple-800"
      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
  }`;
}

export default function MatchListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const sportParam = params.get("sport") || undefined;

  const [hubDoneBanner, setHubDoneBanner] = useState<string | null>(null);

  const hubCreatedQ = params.get("hubCreated");
  const hubChatQ = params.get("hubChat");

  useEffect(() => {
    if (!hubCreatedQ && !hubChatQ) return;
    if (hubChatQ === "1") {
      setHubDoneBanner(
        "팀 채팅방이 준비됐어요. 상대 팀이 붙기 전까지는 우리 팀에서 매칭을 이야기하면 돼요."
      );
    } else if (hubCreatedQ === "1") {
      setHubDoneBanner("매칭 글이 등록되었어요.");
    }
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.delete("hubCreated");
        next.delete("hubChat");
        return next;
      },
      { replace: true }
    );
  }, [hubCreatedQ, hubChatQ, setParams]);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<MatchDatePreset>("all");
  const [levelFilter, setLevelFilter] = useState<MatchLevel | "all">("all");

  const hookSport = isSportTypeSlug(sportParam) ? sportParam : undefined;
  const matchCreateSport = normalizeSportId(sportParam) ?? "soccer";

  const { matches, loading, error } = useMatches({
    status: statusFilter,
    sport: hookSport,
    limit: 120,
  });

  const filteredMatches = useMemo(() => {
    let list: Match[] = [...matches];

    if (sportParam && !hookSport) {
      list = list.filter((m) => (m as { sport?: string }).sport === sportParam);
    }

    if (datePreset !== "all") {
      list = list.filter((m) => matchPassesDatePreset(m, datePreset));
    }

    if (levelFilter !== "all") {
      list = list.filter((m) => m.level === levelFilter);
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((m) => {
        const matchRegion = (m.matchRegion || m.region || "").toLowerCase();
        const stadium = (m.stadium || "").toLowerCase();
        return (
          m.teamName.toLowerCase().includes(q) ||
          matchRegion.includes(q) ||
          stadium.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      const ta = (a.date as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
      const tb = (b.date as { toDate?: () => Date })?.toDate?.()?.getTime() ?? 0;
      if (ta !== tb) return ta - tb;
      return (a.time || "").localeCompare(b.time || "");
    });

    return list;
  }, [
    matches,
    sportParam,
    hookSport,
    datePreset,
    levelFilter,
    searchQuery,
  ]);

  return (
    <div className="min-h-dvh bg-gray-50 pb-28">
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-[480px] pt-2">
        <section className="pt-2" aria-live="polite">
          <header className="mb-4 rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-white px-4 py-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h1 className="text-lg font-bold text-gray-900">🔥 지금 참여 가능한 경기</h1>
              {sportParam ? (
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                  종목 필터
                </span>
              ) : null}
            </div>
            <p className="text-sm text-gray-600">근처에서 바로 참여할 수 있어요</p>
          </header>

          {hubDoneBanner ? (
            <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              <div className="flex items-start justify-between gap-2">
                <p>{hubDoneBanner}</p>
                <button
                  type="button"
                  className="shrink-0 text-xs font-medium text-emerald-800 underline"
                  onClick={() => setHubDoneBanner(null)}
                >
                  닫기
                </button>
              </div>
            </div>
          ) : null}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-2xl bg-gray-200/80"
                />
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              매칭을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.
            </p>
          )}

          {!loading && !error && filteredMatches.length === 0 && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center">
              <p className="mb-1 font-medium text-gray-800">지금 참여 가능한 경기가 없어요</p>
              <p className="mb-4 text-sm text-gray-500">
                근처 경기가 없으면 직접 열어서 팀을 모아보세요.
              </p>
              <button
                type="button"
                onClick={() => navigate(`/sports/${encodeURIComponent(matchCreateSport)}/match/create`)}
                className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
              >
                👉 직접 경기 만들기
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filteredMatches.map((match) => (
              <MatchListCard
                key={match.id}
                match={match}
                onOpenDetail={() => navigate(`/match/${match.id}`)}
              />
            ))}

          <details className="mt-4 rounded-2xl border border-gray-200 bg-white p-4">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              필터/검색 열기
            </summary>
            <div className="mt-3">
              <div className="relative mb-3">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="팀명·지역·구장 검색"
                  className="h-10 border-gray-200 bg-white pl-9 pr-3 text-sm shadow-sm"
                  aria-label="매칭 검색"
                />
              </div>

              <p className="mb-1.5 text-xs font-medium text-gray-500">상태</p>
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {(Object.keys(STATUS_LABEL) as StatusFilter[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={chipBase(statusFilter === key)}
                    onClick={() => setStatusFilter(key)}
                  >
                    {STATUS_LABEL[key]}
                  </button>
                ))}
              </div>

              <p className="mb-1.5 text-xs font-medium text-gray-500">날짜</p>
              <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
                {DATE_PRESETS.map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    className={chipBase(datePreset === id)}
                    onClick={() => setDatePreset(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <p className="mb-1.5 text-xs font-medium text-gray-500">팀 수준</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {LEVEL_OPTIONS.map((lvl) => {
                  const label = lvl === "all" ? "전체" : lvl;
                  return (
                    <button
                      key={lvl}
                      type="button"
                      className={chipBase(levelFilter === lvl)}
                      onClick={() => setLevelFilter(lvl)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </details>
        </section>
      </div>

      {/* 플로팅: 매칭 만들기 (하단 탭 nav z-50 위에 안 가리게) */}
      <button
        type="button"
        onClick={() => navigate(`/sports/${encodeURIComponent(matchCreateSport)}/match/create`)}
        className="fixed bottom-24 right-4 z-[45] flex h-14 w-14 items-center justify-center rounded-full bg-gray-900 text-2xl font-light text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
        aria-label="매칭 만들기"
      >
        <Plus className="h-7 w-7" strokeWidth={2.5} />
      </button>
    </div>
  );
}
