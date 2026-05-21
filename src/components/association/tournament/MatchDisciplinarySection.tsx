/**
 * 경고/퇴장 기록 섹션
 */

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Match, MatchDisciplinary, MatchPlayer } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";
import { AlertTriangle, XCircle, Plus } from "lucide-react";
import { serverTimestamp } from "firebase/firestore";

interface MatchDisciplinarySectionProps {
  match: Match;
  onUpdate: (updates: Partial<Match>) => Promise<void>;
}

export function MatchDisciplinarySection({ match, onUpdate }: MatchDisciplinarySectionProps) {
  const { user } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: string; name: string; team: "home" | "away" } | null>(null);
  const [disciplinaryType, setDisciplinaryType] = useState<"yellow" | "red">("yellow");
  const [reason, setReason] = useState("");
  const [minute, setMinute] = useState("");

  const allPlayers: (MatchPlayer & { team: "home" | "away" })[] = [
    ...(match.homePlayers || []).map((p) => ({ ...p, team: "home" as const })),
    ...(match.awayPlayers || []).map((p) => ({ ...p, team: "away" as const })),
  ];

  const disciplinary = match.disciplinary || [];

  const handleAddDisciplinary = async () => {
    if (!selectedPlayer || !user) return;

    const newRecord: MatchDisciplinary = {
      id: `${Date.now()}`,
      playerId: selectedPlayer.id,
      playerName: selectedPlayer.name,
      jerseyNumber: allPlayers.find((p) => p.id === selectedPlayer.id)?.jerseyNumber || 0,
      type: disciplinaryType,
      minute: minute ? parseInt(minute) : undefined,
      reason: reason || undefined,
      recordedAt: serverTimestamp(),
      recordedBy: user.uid,
      recordedByName: user.displayName || "심판",
    };

    try {
      await onUpdate({
        disciplinary: [...disciplinary, newRecord],
      });

      // 폼 리셋
      setShowAddForm(false);
      setSelectedPlayer(null);
      setReason("");
      setMinute("");
    } catch (error) {
      console.error("경고/퇴장 기록 오류:", error);
      alert("기록에 실패했습니다.");
    }
  };

  const yellowCards = disciplinary.filter((d) => d.type === "yellow");
  const redCards = disciplinary.filter((d) => d.type === "red");

  // 경고 누적 체크 (같은 선수 경고 2회 = 퇴장)
  const yellowCardCounts = new Map<string, number>();
  yellowCards.forEach((card) => {
    const count = yellowCardCounts.get(card.playerId) || 0;
    yellowCardCounts.set(card.playerId, count + 1);
  });

  return (
    <Card className="rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-semibold">경고 / 퇴장</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              경고: {yellowCards.length}
            </Badge>
            <Badge variant="outline" className="bg-red-50 text-red-700">
              퇴장: {redCards.length}
            </Badge>
          </div>
        </div>

        {/* 기록 목록 */}
        {disciplinary.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            기록된 경고/퇴장이 없습니다.
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            {disciplinary.map((record) => {
              const player = allPlayers.find((p) => p.id === record.playerId);
              const yellowCount = yellowCardCounts.get(record.playerId) || 0;

              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <div className="flex items-center gap-3">
                    {record.type === "yellow" ? (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">
                        {record.playerName} (#{record.jerseyNumber})
                      </div>
                      {record.minute && (
                        <div className="text-xs text-muted-foreground">
                          {record.minute}분 {record.reason && `· ${record.reason}`}
                        </div>
                      )}
                      {yellowCount >= 2 && record.type === "yellow" && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          경고 누적 (2회)
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Badge variant={record.type === "yellow" ? "outline" : "destructive"}>
                    {record.type === "yellow" ? "경고" : "퇴장"}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}

        {/* 추가 버튼 */}
        {!showAddForm ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            경고/퇴장 추가
          </Button>
        ) : (
          <div className="space-y-3 p-4 border rounded">
            <div>
              <label className="text-sm font-medium mb-1 block">선수 선택</label>
              <select
                value={selectedPlayer?.id || ""}
                onChange={(e) => {
                  const player = allPlayers.find((p) => p.id === e.target.value);
                  if (player) {
                    setSelectedPlayer({
                      id: player.id,
                      name: player.name,
                      team: player.team,
                    });
                  }
                }}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="">선수 선택</option>
                {allPlayers.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.team === "home" ? "홈" : "원정"} - #{player.jerseyNumber} {player.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={disciplinaryType === "yellow" ? "default" : "outline"}
                size="sm"
                onClick={() => setDisciplinaryType("yellow")}
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                경고
              </Button>
              <Button
                variant={disciplinaryType === "red" ? "destructive" : "outline"}
                size="sm"
                onClick={() => setDisciplinaryType("red")}
              >
                <XCircle className="w-4 h-4 mr-1" />
                퇴장
              </Button>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">시간 (분, 선택)</label>
              <input
                type="number"
                value={minute}
                onChange={(e) => setMinute(e.target.value)}
                placeholder="예: 25"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">사유 (선택)</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="예: 반칙, 비신사적 행위"
                className="w-full px-3 py-2 border rounded"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleAddDisciplinary}
                disabled={!selectedPlayer}
                className="flex-1"
              >
                추가
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setSelectedPlayer(null);
                  setReason("");
                  setMinute("");
                }}
              >
                취소
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

