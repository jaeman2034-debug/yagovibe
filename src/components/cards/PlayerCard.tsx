/**
 * 🔥 Player Card 컴포넌트
 * 
 * 역할:
 * - Player 카드 UI
 * - Directory / Homepage에서 사용
 */

import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Target, TrendingUp } from "lucide-react";

interface PlayerCardProps {
  player: {
    playerId: string;
    name: string;
    profileImageUrl?: string;
    currentTeamName?: string;
    primaryPosition?: string;
    appearances: number;
    goals: number;
    assists: number;
  };
}

export function PlayerCard({ player }: PlayerCardProps) {
  return (
    <Link to={`/public/players/${player.playerId}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-center gap-4 mb-4">
            {player.profileImageUrl ? (
              <img
                src={player.profileImageUrl}
                alt={player.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                <Users className="w-6 h-6 text-gray-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">
                {player.name}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {player.primaryPosition || "-"} · {player.currentTeamName || "무소속"}
              </p>
            </div>
          </div>

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{player.appearances}경기</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-gray-600">{player.goals}골</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-gray-600">{player.assists}도움</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
