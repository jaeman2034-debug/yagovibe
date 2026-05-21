/**
 * 🔥 Teams Directory Page
 * 
 * 경로: /teams
 * 
 * 역할:
 * - 팀 목록 표시
 * - 팀 검색/필터/정렬
 * - Team Page로 이동
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getTeamsDirectory, type TeamDirectoryItem, type TeamSortOption } from "@/services/teamsDirectoryService";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trophy, Users, Target, TrendingUp } from "lucide-react";
import { Loader2 } from "lucide-react";

export default function TeamsDirectoryPage() {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<TeamDirectoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<TeamSortOption>("recent");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce 검색어
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    loadTeams();
  }, [debouncedQuery, sort]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const teamsData = await getTeamsDirectory({
        query: debouncedQuery || undefined,
        sort,
        limit: 100,
      });
      setTeams(teamsData);
    } catch (error) {
      console.error("팀 목록 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">팀 목록</h1>
          <p className="text-gray-600">팀 기록과 최근 성적을 확인하세요.</p>
        </div>

        {/* Search & Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-4">
            <Input
              type="text"
              placeholder="팀명으로 검색..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as TeamSortOption)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">최근 활동순</option>
              <option value="name">이름순</option>
              <option value="wins">승수순</option>
              <option value="matches">경기수순</option>
              <option value="championships">우승순</option>
            </select>
          </div>
        </div>

        {/* Teams Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : teams.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">팀을 찾을 수 없습니다.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {teams.map((team) => (
              <TeamCard key={team.teamId} item={team} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Team Card 컴포넌트
 */
interface TeamCardProps {
  item: TeamDirectoryItem;
}

function TeamCard({ item }: TeamCardProps) {
  return (
    <Link to={`/public/teams/${item.teamId}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            {item.logoUrl ? (
              <img
                src={item.logoUrl}
                alt={item.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-base font-semibold text-gray-900">{item.name}</h3>
              <p className="text-sm text-gray-500">{item.region || "-"}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">경기 {item.matches}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">승 {item.wins}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">득점 {item.goalsFor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-600">우승 {item.championships}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
