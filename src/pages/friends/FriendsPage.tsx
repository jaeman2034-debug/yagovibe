import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserPlus, UserMinus, Users } from "lucide-react";
import { IdentityHeader } from "@/components/ui/layout/IdentityHeader";
import { HubLayout } from "@/components/ui/layout/HubLayout";
import {
  callFollowPlayer,
  callGetFriendsGraph,
  callSearchPlayers,
  callUnfollowPlayer,
  formatPlayerSubtitle,
} from "@/lib/social/socialGraphClient";
import type { FriendsGraphClient, SocialPlayerSnippetClient } from "@/lib/social/socialGraphTypes";

type TabId = "following" | "followers" | "mutuals" | "discover";

const TABS: { id: TabId; label: string }[] = [
  { id: "following", label: "Following" },
  { id: "followers", label: "Followers" },
  { id: "mutuals", label: "Mutuals" },
  { id: "discover", label: "Discover" },
];

export default function FriendsPage() {
  const [tab, setTab] = useState<TabId>("following");
  const [graph, setGraph] = useState<FriendsGraphClient | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SocialPlayerSnippetClient[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [actionUid, setActionUid] = useState<string | null>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await callGetFriendsGraph();
      setGraph(data);
    } catch {
      setError("친구 그래프를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGraph();
  }, [loadGraph]);

  useEffect(() => {
    if (tab !== "discover") return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        setSearchLoading(true);
        try {
          const rows = await callSearchPlayers(q);
          if (!cancelled) setSearchResults(rows);
        } finally {
          if (!cancelled) setSearchLoading(false);
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [tab, searchQuery]);

  const followingSet = useMemo(
    () => new Set(graph?.following.map((p) => p.uid) ?? []),
    [graph?.following],
  );

  const listForTab = useMemo((): SocialPlayerSnippetClient[] => {
    if (tab === "discover") return searchResults;
    if (!graph) return [];
    if (tab === "following") return graph.following;
    if (tab === "followers") return graph.followers;
    return graph.mutuals;
  }, [graph, tab, searchResults]);

  const handleToggleFollow = async (player: SocialPlayerSnippetClient) => {
    if (actionUid) return;
    setActionUid(player.uid);
    try {
      const isFollowing = player.isFollowing ?? followingSet.has(player.uid);
      if (isFollowing) {
        await callUnfollowPlayer(player.uid);
      } else {
        await callFollowPlayer(player.uid);
      }
      await loadGraph();
      if (tab === "discover" && searchQuery.trim().length >= 2) {
        const rows = await callSearchPlayers(searchQuery.trim());
        setSearchResults(rows);
      }
    } catch {
      setError("팔로우 상태를 변경하지 못했습니다.");
    } finally {
      setActionUid(null);
    }
  };

  const content = (
    <div className="mx-auto w-full max-w-lg space-y-3 px-1 pb-4">
      <div className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5">
        <Users className="h-5 w-5 text-sky-600" aria-hidden />
        <div>
          <p className="text-sm font-bold text-gray-900">Friends Graph</p>
          <p className="text-[10px] text-gray-500">팔로우 · 상호 팔로우 · 플레이어 검색</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-xl border border-gray-200 bg-white p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-1.5 py-2 text-[10px] font-bold uppercase tracking-wide ${
              tab === t.id ? "bg-sky-600 text-white" : "text-gray-500 hover:bg-gray-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "discover" ? (
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-2">
            <Search className="h-4 w-4 text-gray-400" aria-hidden />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="플레이어 이름 검색 (2자 이상)"
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      ) : null}

      {loading && tab !== "discover" ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          불러오는 중…
        </div>
      ) : error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">{error}</p>
      ) : tab === "discover" && searchLoading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          검색 중…
        </div>
      ) : listForTab.length === 0 ? (
        <p className="rounded-xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-500">
          {tab === "discover"
            ? searchQuery.trim().length < 2
              ? "이름을 입력해 플레이어를 찾아보세요."
              : "검색 결과가 없습니다."
            : "아직 목록이 비어 있습니다."}
        </p>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
          {listForTab.map((player) => {
            const isFollowing = player.isFollowing ?? followingSet.has(player.uid);
            const busy = actionUid === player.uid;
            return (
              <div
                key={player.uid}
                className="flex items-center gap-2 border-b border-gray-100 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-900">{player.displayName}</p>
                  <p className="truncate text-[10px] text-gray-500">{formatPlayerSubtitle(player)}</p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleToggleFollow(player)}
                  className={`inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-bold ${
                    isFollowing
                      ? "border border-gray-300 bg-white text-gray-700"
                      : "bg-sky-600 text-white"
                  } disabled:opacity-60`}
                >
                  {busy ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                  ) : isFollowing ? (
                    <UserMinus className="h-3 w-3" aria-hidden />
                  ) : (
                    <UserPlus className="h-3 w-3" aria-hidden />
                  )}
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );

  return (
    <HubLayout
      header={<IdentityHeader title="Friends" subtitle="Social graph" />}
      persona={content}
    />
  );
}
