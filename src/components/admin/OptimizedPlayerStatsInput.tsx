/**
 * 🔥 Optimized Player Stats Input 컴포넌트
 * 
 * 역할:
 * - 빠른 선수 기록 입력
 * - 키보드 네비게이션
 * - 배치 저장
 */

import { useState, useEffect, useRef } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getPlayerGamesByMatchAndTeam, savePlayerGamesBatch } from "@/services/playerGameService";
import type { EventMatch } from "@/types/event";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { QuickInputButtons } from "./QuickInputButtons";
import { toast } from "sonner";
import { Loader2, CheckCircle, Save } from "lucide-react";

interface OptimizedPlayerStatsInputProps {
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

export function OptimizedPlayerStatsInput({
  match,
  eventId,
  divisionId,
  seasonId,
  teamId,
  teamName,
  players,
  onSaved,
}: OptimizedPlayerStatsInputProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<Record<string, PlayerStatsRow>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    loadExistingStats();
  }, [match.id, teamId]);

  // 키보드 단축키 (Ctrl+S 저장)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stats]);

  const loadExistingStats = async () => {
    try {
      setLoading(true);
      const existingGames = await getPlayerGamesByMatchAndTeam(match.id, teamId);

      const statsMap: Record<string, PlayerStatsRow> = {};

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
    setStats((prev) => {
      const updated = {
        ...prev,
        [playerId]: {
          ...prev[playerId],
          [field]: value,
        },
      };

      // 자동 계산: appearance
      if (field === "starter" || field === "goals" || field === "assists") {
        const player = updated[playerId];
        const shouldAppear =
          player.starter ||
          (player.goals > 0) ||
          (player.assists > 0) ||
          (player.yellowCards > 0) ||
          (player.redCards > 0);
        updated[playerId].appearance = shouldAppear;
      }

      // 자동 계산: starter면 기본 출전 시간 90분
      if (field === "starter" && value === true) {
        updated[playerId].minutesPlayed = updated[playerId].minutesPlayed || 90;
      }

      return updated;
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

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

      // statsCompleted 플래그 업데이트
      const matchRef = doc(db, "event_matches", match.id);
      await updateDoc(matchRef, {
        statsCompleted: true,
        statsCompletedAt: serverTimestamp(),
      });

      setSaved(true);
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{teamName}</CardTitle>
          {saved && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-medium">저장 완료</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">선수</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">출전</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">선발</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">골</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">도움</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">경고</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">퇴장</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {players.map((player, index) => {
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
                      <QuickInputButtons
                        value={stat.goals}
                        onChange={(value) => updateStat(player.id, "goals", value)}
                        min={0}
                        max={10}
                        className="justify-center"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <QuickInputButtons
                        value={stat.assists}
                        onChange={(value) => updateStat(player.id, "assists", value)}
                        min={0}
                        max={10}
                        className="justify-center"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <QuickInputButtons
                        value={stat.yellowCards}
                        onChange={(value) => updateStat(player.id, "yellowCards", value)}
                        min={0}
                        max={2}
                        className="justify-center"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <QuickInputButtons
                        value={stat.redCards}
                        onChange={(value) => updateStat(player.id, "redCards", value)}
                        min={0}
                        max={1}
                        className="justify-center"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Sticky Save Button (모바일) */}
        <div className="mt-6 flex gap-4">
          <Button
            onClick={handleSave}
            disabled={saving || saved}
            className="flex-1"
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                저장 완료
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                저장 (Ctrl+S)
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
