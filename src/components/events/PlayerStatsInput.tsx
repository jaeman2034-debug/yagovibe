/**
 * 🔥 Player Stats 입력 컴포넌트
 * 
 * 역할:
 * - 경기별 선수 기록 입력
 * - player_games 저장
 */

import { useState, useEffect } from "react";
import { getPlayerGamesByMatchAndTeam, savePlayerGamesBatch } from "@/services/playerGameService";
import type { PlayerGame } from "@/types/playerGame";
import type { EventMatch } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface PlayerStatsInputProps {
  match: EventMatch;
  eventId: string;
  divisionId?: string | null;
  seasonId: string;
  teamId: string;
  teamName: string;
  players: Array<{
    id: string;
    name: string;
  }>;
  onSaved?: () => void;
}

interface PlayerStatsRow {
  playerId: string;
  playerName: string;
  appearance: boolean;
  starter: boolean;
  minutesPlayed: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
}

export function PlayerStatsInput({
  match,
  eventId,
  divisionId,
  seasonId,
  teamId,
  teamName,
  players,
  onSaved,
}: PlayerStatsInputProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<Record<string, PlayerStatsRow>>({});

  useEffect(() => {
    loadExistingStats();
  }, [match.id, teamId]);

  const loadExistingStats = async () => {
    try {
      setLoading(true);
      const existingGames = await getPlayerGamesByMatchAndTeam(match.id, teamId);
      
      const statsMap: Record<string, PlayerStatsRow> = {};
      
      // 기존 기록이 있으면 로드
      existingGames.forEach((game) => {
        statsMap[game.playerId] = {
          playerId: game.playerId,
          playerName: game.playerName,
          appearance: game.appearance,
          starter: game.starter,
          minutesPlayed: game.minutesPlayed,
          goals: game.goals,
          assists: game.assists,
          yellowCards: game.yellowCards,
          redCards: game.redCards,
        };
      });

      // 기존 기록이 없는 선수는 기본값으로 초기화
      players.forEach((player) => {
        if (!statsMap[player.id]) {
          statsMap[player.id] = {
            playerId: player.id,
            playerName: player.name,
            appearance: false,
            starter: false,
            minutesPlayed: 0,
            goals: 0,
            assists: 0,
            yellowCards: 0,
            redCards: 0,
          };
        }
      });

      setStats(statsMap);
    } catch (error) {
      console.error("기존 기록 로드 실패:", error);
      toast.error("기존 기록을 불러오는데 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const updateStat = (playerId: string, field: keyof PlayerStatsRow, value: any) => {
    setStats((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // 출전한 선수만 필터링
      const playerGames = Object.values(stats)
        .filter((stat) => stat.appearance)
        .map((stat) => ({
          eventId,
          divisionId,
          seasonId,
          teamId,
          playerId: stat.playerId,
          playerName: stat.playerName,
          appearance: stat.appearance,
          starter: stat.starter,
          minutesPlayed: stat.minutesPlayed || 0,
          goals: stat.goals || 0,
          assists: stat.assists || 0,
          yellowCards: stat.yellowCards || 0,
          redCards: stat.redCards || 0,
          playedAt: match.scheduledAt?.toDate?.() || new Date(),
        }));

      await savePlayerGamesBatch(match.id, playerGames);

      toast.success("선수 기록이 저장되었습니다.");
      onSaved?.();
    } catch (error: any) {
      console.error("기록 저장 실패:", error);
      toast.error(error.message || "기록 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{teamName}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">선수</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">출전</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">선발</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">출전시간(분)</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">골</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">도움</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">경고</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">퇴장</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.map((player) => {
                const stat = stats[player.id] || {
                  playerId: player.id,
                  playerName: player.name,
                  appearance: false,
                  starter: false,
                  minutesPlayed: 0,
                  goals: 0,
                  assists: 0,
                  yellowCards: 0,
                  redCards: 0,
                };

                return (
                  <tr key={player.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      {player.name}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Checkbox
                        checked={stat.appearance}
                        onCheckedChange={(checked) =>
                          updateStat(player.id, "appearance", checked === true)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Checkbox
                        checked={stat.starter}
                        disabled={!stat.appearance}
                        onCheckedChange={(checked) =>
                          updateStat(player.id, "starter", checked === true)
                        }
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Input
                        type="number"
                        min="0"
                        max="120"
                        value={stat.minutesPlayed || ""}
                        onChange={(e) =>
                          updateStat(player.id, "minutesPlayed", parseInt(e.target.value) || 0)
                        }
                        disabled={!stat.appearance}
                        className="w-20 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Input
                        type="number"
                        min="0"
                        value={stat.goals || ""}
                        onChange={(e) =>
                          updateStat(player.id, "goals", parseInt(e.target.value) || 0)
                        }
                        disabled={!stat.appearance}
                        className="w-16 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Input
                        type="number"
                        min="0"
                        value={stat.assists || ""}
                        onChange={(e) =>
                          updateStat(player.id, "assists", parseInt(e.target.value) || 0)
                        }
                        disabled={!stat.appearance}
                        className="w-16 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Input
                        type="number"
                        min="0"
                        max="2"
                        value={stat.yellowCards || ""}
                        onChange={(e) =>
                          updateStat(player.id, "yellowCards", parseInt(e.target.value) || 0)
                        }
                        disabled={!stat.appearance}
                        className="w-16 text-center"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Input
                        type="number"
                        min="0"
                        max="1"
                        value={stat.redCards || ""}
                        onChange={(e) =>
                          updateStat(player.id, "redCards", parseInt(e.target.value) || 0)
                        }
                        disabled={!stat.appearance}
                        className="w-16 text-center"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
