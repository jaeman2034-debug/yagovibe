/**
 * 🔥 TopEntitiesTable - Top Entities 테이블 컴포넌트
 * 
 * 역할:
 * - Top Events, Teams, Players 표시
 * - 클릭 시 상세 페이지 이동
 */

import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// Table 컴포넌트는 직접 HTML table 사용
import { ArrowRight } from "lucide-react";
import type { TopEvent, TopTeam, TopPlayer } from "@/services/analyticsService";

interface TopEntitiesTableProps {
  title: string;
  type: "events" | "teams" | "players";
  entities: TopEvent[] | TopTeam[] | TopPlayer[];
  loading?: boolean;
}

export function TopEntitiesTable({
  title,
  type,
  entities,
  loading = false,
}: TopEntitiesTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (entities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            데이터가 없습니다
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <table className="w-full text-xs sm:text-sm min-w-[500px]">
            <thead>
              <tr className="border-b bg-gray-50">
                {type === "events" && (
                  <>
                    <th className="text-left py-2 px-2 sm:py-3 sm:px-4 font-medium">대회명</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">경기</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">팀</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">득점</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">상태</th>
                  </>
                )}
                {type === "teams" && (
                  <>
                    <th className="text-left py-2 px-2 sm:py-3 sm:px-4 font-medium">팀명</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">경기</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">승</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">득점</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">우승</th>
                  </>
                )}
                {type === "players" && (
                  <>
                    <th className="text-left py-2 px-2 sm:py-3 sm:px-4 font-medium">선수명</th>
                    <th className="text-left py-2 px-2 sm:py-3 sm:px-4 font-medium">팀</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">득점</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">도움</th>
                    <th className="text-center py-2 px-2 sm:py-3 sm:px-4 font-medium">출전</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {entities.map((entity) => {
                if (type === "events") {
                  const event = entity as TopEvent;
                  return (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <Link
                          to={`/admin/events/${event.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          {event.name}
                        </Link>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{event.matches}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{event.teams}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{event.goals}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">
                        <span
                          className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs ${
                            event.status === "ongoing"
                              ? "bg-green-100 text-green-700"
                              : event.status === "completed"
                              ? "bg-gray-100 text-gray-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {event.status === "ongoing"
                            ? "진행중"
                            : event.status === "completed"
                            ? "완료"
                            : "예정"}
                        </span>
                      </td>
                    </tr>
                  );
                }

                if (type === "teams") {
                  const team = entity as TopTeam;
                  return (
                    <tr key={team.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <Link
                          to={`/teams/${encodeURIComponent(team.id)}/play`}
                          className="font-medium text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          {team.name}
                        </Link>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{team.matches}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{team.wins}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{team.goals}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{team.championships}</td>
                    </tr>
                  );
                }

                if (type === "players") {
                  const player = entity as TopPlayer;
                  return (
                    <tr key={player.id} className="hover:bg-gray-50">
                      <td className="py-2 px-2 sm:py-3 sm:px-4">
                        <Link
                          to={`/players/${player.id}`}
                          className="font-medium text-blue-600 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          {player.name}
                        </Link>
                      </td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-xs sm:text-sm">{player.teamName || "무소속"}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center font-semibold">{player.goals}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{player.assists}</td>
                      <td className="py-2 px-2 sm:py-3 sm:px-4 text-center">{player.appearances}</td>
                    </tr>
                  );
                }

                return null;
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
