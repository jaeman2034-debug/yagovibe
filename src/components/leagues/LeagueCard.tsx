"use client";

import { Trophy, Users, Calendar, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
// Card 컴포넌트가 없으면 간단한 div로 대체
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white border border-gray-200 rounded-xl ${className}`}>
    {children}
  </div>
);

interface LeagueCardProps {
  league: {
    id: string;
    name: string;
    teamCount?: number;
    matchCount?: number;
    startDate?: string;
    endDate?: string;
    status?: string;
  };
  federationSlug: string;
}

export function LeagueCard({ league, federationSlug }: LeagueCardProps) {
  return (
    <Link to={`/activity/leagues/${league.id}`}>
      <Card className="p-6 hover:shadow-lg transition-all cursor-pointer border-2 hover:border-primary-300">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">
                {league.name}
              </h3>
              {league.status && (
                <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                  league.status === "active" 
                    ? "bg-green-100 text-green-700" 
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {league.status === "active" ? "진행중" : "예정"}
                </span>
              )}
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </div>

        <div className="space-y-2">
          {league.teamCount !== undefined && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Users className="w-4 h-4" />
              <span>{league.teamCount}팀</span>
            </div>
          )}
          {league.matchCount !== undefined && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>{league.matchCount}경기</span>
            </div>
          )}
          {league.startDate && league.endDate && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                {new Date(league.startDate).toLocaleDateString()} ~ {new Date(league.endDate).toLocaleDateString()}
              </span>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <button className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
            리그 보기
          </button>
        </div>
      </Card>
    </Link>
  );
}
