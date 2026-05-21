/**
 * 🔥 Platform Home Page
 * 
 * 역할:
 * - 플랫폼 메인 홈페이지
 * - Featured Events, Top Players, Top Teams, Recent Matches
 */

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, limit, getDocs, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { EventCard } from "@/components/cards/EventCard";
import { TeamCard } from "@/components/cards/TeamCard";
import { PlayerCard } from "@/components/cards/PlayerCard";
import { StatCard } from "@/components/ui/StatCard";
import { Trophy, Users, Target, Calendar, TrendingUp } from "lucide-react";

export default function PlatformHomePage() {
  const [featuredEvents, setFeaturedEvents] = useState<any[]>([]);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [topTeams, setTopTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      // Featured Events (진행중인 대회)
      const eventsQuery = query(
        collection(db, "events"),
        where("status", "==", "ongoing"),
        orderBy("startDate", "desc"),
        limit(3)
      );
      const eventsSnapshot = await getDocs(eventsQuery);
      const events = eventsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setFeaturedEvents(events);

      // Top Players (득점 많은 선수)
      // TODO: player_summary에서 가져오기
      // const playersQuery = query(
      //   collection(db, "player_summary"),
      //   orderBy("goals", "desc"),
      //   limit(6)
      // );

      // Top Teams (우승 많은 팀)
      // TODO: team_summary에서 가져오기
      // const teamsQuery = query(
      //   collection(db, "team_summary"),
      //   orderBy("championships", "desc"),
      //   limit(6)
      // );

      setLoading(false);
    } catch (error) {
      console.error("홈 데이터 로딩 실패:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold mb-4">
              YAGO SPORTS 플랫폼
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              아마추어 스포츠 대회 운영 및 기록 플랫폼
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                to="/events"
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
              >
                대회 보기
              </Link>
              <Link
                to="/teams"
                className="px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                팀 탐색
              </Link>
              <Link
                to="/players"
                className="px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-600 transition-colors"
              >
                선수 탐색
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Featured Events */}
        {featuredEvents.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-blue-600" />
                진행중인 대회
              </h2>
              <Link
                to="/events"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </section>
        )}

        {/* Stats Summary */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">플랫폼 통계</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="총 대회"
              value="0"
              icon={<Calendar className="w-5 h-5" />}
              variant="primary"
            />
            <StatCard
              label="등록 팀"
              value="0"
              icon={<Users className="w-5 h-5" />}
              variant="success"
            />
            <StatCard
              label="등록 선수"
              value="0"
              icon={<Target className="w-5 h-5" />}
              variant="primary"
            />
            <StatCard
              label="총 경기"
              value="0"
              icon={<TrendingUp className="w-5 h-5" />}
              variant="default"
            />
          </div>
        </section>

        {/* Top Teams */}
        {topTeams.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                인기 팀
              </h2>
              <Link
                to="/teams"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topTeams.map((team) => (
                <TeamCard key={team.teamId} team={team} />
              ))}
            </div>
          </section>
        )}

        {/* Top Players */}
        {topPlayers.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                인기 선수
              </h2>
              <Link
                to="/players"
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                전체 보기 →
              </Link>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {topPlayers.map((player) => (
                <PlayerCard key={player.playerId} player={player} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
