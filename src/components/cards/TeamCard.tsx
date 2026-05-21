/**
 * 🔥 Team Card 컴포넌트
 * 
 * 역할:
 * - Team 카드 UI
 * - Directory / Homepage에서 사용
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Trophy, Target } from "lucide-react";

interface TeamCardProps {
  team: {
    teamId: string;
    name: string;
    region?: string;
    logoUrl?: string;
    matches: number;
    wins: number;
    goalsFor: number;
    championships: number;
  };
}

export function TeamCard({ team }: TeamCardProps) {
  return (
    <Link to={`/public/teams/${team.teamId}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            {team.logoUrl ? (
              <img
                src={team.logoUrl}
                alt={team.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {team.name}
              </h3>
              {team.region && (
                <p className="text-sm text-gray-500 truncate">{team.region}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">경기 {team.matches}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">승 {team.wins}</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">득점 {team.goalsFor}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-600" />
              <span className="text-gray-600">우승 {team.championships}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
