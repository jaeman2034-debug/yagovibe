import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, limit, orderBy, query, where, startAt, endAt } from "firebase/firestore";
import MarketPostCard from "@/components/market/MarketPostCard";
import type { MarketPost, Sport } from "@/types/market";

type FilterState = {
  sport: string;
  category: string;
};

function SearchMarketLegacyPage() {
  const [keyword, setKeyword] = useState("");
  const [debounced, setDebounced] = useState("");
  const [filter, setFilter] = useState<FilterState>({ sport: "all", category: "all" });
  const [posts, setPosts] = useState<MarketPost[]>([]);
  const [loading, setLoading] = useState(false);

  // 디바운스
  useEffect(() => {
    const t = setTimeout(() => setDebounced(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  useEffect(() => {
    const search = async () => {
      setLoading(true);
      try {
        const base = collection(db, "marketPosts");

        // Firestore prefix 검색: title 정렬 필수
        let q = query(base, orderBy("title"));

        if (debounced) {
          q = query(
            base,
            orderBy("title"),
            startAt(debounced),
            endAt(debounced + "\uf8ff"),
            limit(30)
          );
        } else {
          // 빈 검색어일 때는 최신순 일부 노출
          q = query(base, orderBy("createdAt", "desc" as any), limit(20));
        }

        const snap = await getDocs(q);
        let rows = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as MarketPost[];

        // 클라이언트 필터 (sport/category)
        rows = rows.filter((p) => {
          const sportOk = filter.sport === "all" || (p.sport || "all") === filter.sport;
          const catOk = filter.category === "all" || (p.category || "all") === filter.category;
          return sportOk && catOk;
        });

        setPosts(rows);
      } finally {
        setLoading(false);
      }
    };
    void search();
  }, [debounced, filter.sport, filter.category]);

  return (
    <div className="max-w-[720px] mx-auto">
      <SearchInput keyword={keyword} setKeyword={setKeyword} />
      <SearchFilters filter={filter} setFilter={setFilter} />
      <SearchResults posts={posts} loading={loading} />
    </div>
  );
}

function SearchInput({ keyword, setKeyword }: { keyword: string; setKeyword: (v: string) => void }) {
  return (
    <div className="p-4">
      <input
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        placeholder="검색어를 입력하세요"
        className="w-full border rounded-full px-4 py-2"
      />
    </div>
  );
}

function SearchFilters({
  filter,
  setFilter,
}: {
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
}) {
  return (
    <div className="flex gap-2 px-4 pb-2">
      <select
        value={filter.sport}
        onChange={(e) => setFilter((f) => ({ ...f, sport: e.target.value }))}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="all">전체 종목</option>
        <option value="soccer">축구</option>
        <option value="baseball">야구</option>
        <option value="basketball">농구</option>
        <option value="tennis">테니스</option>
        <option value="badminton">배드민턴</option>
      </select>
      <select
        value={filter.category}
        onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value }))}
        className="border rounded px-2 py-1 text-sm"
      >
        <option value="all">전체 카테고리</option>
        <option value="equipment">용품</option>
        <option value="recruit">모집</option>
        <option value="match">매칭</option>
      </select>
    </div>
  );
}

function SearchResults({ posts, loading }: { posts: MarketPost[]; loading: boolean }) {
  if (loading) return <div className="p-4 text-sm text-gray-500">불러오는 중...</div>;
  if (!loading && posts.length === 0)
    return <div className="p-6 text-center text-gray-500">검색 결과가 없습니다</div>;

  return (
    <div className="p-4 space-y-3">
      {posts.map((post, idx) => (
        <MarketPostCard
          key={post.id}
          post={post}
          contextSport={(post.sport || "all") as Sport}
          showSportBadge
          rank={idx + 1}
        />
      ))}
    </div>
  );
}

/**
 * 🔥 Global Search Page
 * 
 * 경로: /search?q=
 * 
 * 역할:
 * - 통합 검색 결과 표시
 * - Teams, Players, Events 통합 검색
 */

import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { globalSearch, type SearchIndexItem } from "@/services/searchService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Target, Trophy, Loader2 } from "lucide-react";

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(query);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{
    teams: SearchIndexItem[];
    players: SearchIndexItem[];
    events: SearchIndexItem[];
  }>({
    teams: [],
    players: [],
    events: [],
  });

  useEffect(() => {
    if (query) {
      performSearch(query);
    }
  }, [query]);

  const performSearch = async (q: string) => {
    if (!q || q.trim().length === 0) {
      setResults({ teams: [], players: [], events: [] });
      return;
    }

    try {
      setLoading(true);
      const searchResults = await globalSearch(q, { limit: 10 });
      setResults(searchResults);
    } catch (error) {
      console.error("검색 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchParams({ q: searchQuery });
  };

  const hasResults = results.teams.length > 0 || results.players.length > 0 || results.events.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">검색</h1>
          <p className="text-gray-600">팀, 선수, 대회를 검색하세요.</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="팀명, 선수명, 대회명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit">검색</Button>
          </div>
        </form>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : !query ? (
          <div className="text-center py-12">
            <p className="text-gray-500">검색어를 입력하세요.</p>
          </div>
        ) : !hasResults ? (
          <div className="text-center py-12">
            <p className="text-gray-500">"{query}"에 대한 검색 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Players Section */}
            {results.players.length > 0 && (
              <SearchSection
                title="선수"
                icon={<Users className="w-5 h-5" />}
                items={results.players}
              />
            )}

            {/* Teams Section */}
            {results.teams.length > 0 && (
              <SearchSection
                title="팀"
                icon={<Target className="w-5 h-5" />}
                items={results.teams}
              />
            )}

            {/* Events Section */}
            {results.events.length > 0 && (
              <SearchSection
                title="대회"
                icon={<Trophy className="w-5 h-5" />}
                items={results.events}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Search Section 컴포넌트
 */
interface SearchSectionProps {
  title: string;
  icon: React.ReactNode;
  items: SearchIndexItem[];
}

function SearchSection({ title, icon, items }: SearchSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {icon}
          {title} ({items.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {items.map((item) => (
            <SearchResultItem key={item.id} item={item} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Search Result Item 컴포넌트
 */
interface SearchResultItemProps {
  item: SearchIndexItem;
}

function SearchResultItem({ item }: SearchResultItemProps) {
  const meta = item.stats
    ? Object.entries(item.stats)
        .map(([key, value]) => {
          if (key === "matches") return `${value}경기`;
          if (key === "wins") return `${value}승`;
          if (key === "goals") return `${value}골`;
          if (key === "appearances") return `${value}경기`;
          if (key === "assists") return `${value}도움`;
          return null;
        })
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <Link
      to={item.url}
      className="block rounded-xl border bg-white px-4 py-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center gap-4">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="w-10 h-10 rounded-full object-cover"
          />
        )}
        <div className="flex-1">
          <div className="text-sm font-semibold text-gray-900">{item.title}</div>
          <div className="mt-1 text-sm text-gray-500">{item.subtitle}</div>
          {meta && <div className="mt-2 text-xs text-gray-400">{meta}</div>}
        </div>
      </div>
    </Link>
  );
}
