/**
 * 선수 검인 섹션
 * 수동 체크 방식 (다음 단계: QR 자동)
 */

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Match, MatchPlayer } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";
import { CheckCircle2, XCircle, AlertTriangle, QrCode } from "lucide-react";
import { serverTimestamp } from "firebase/firestore";
import { PlayerQRScanner } from "./PlayerQRScanner";
import { syncOfflineVerifications } from "@/lib/tournament/offlineVerification";

interface MatchVerificationSectionProps {
  match: Match;
  onUpdate: (updates: Partial<Match>) => Promise<void>;
  associationId?: string;
  tournamentId?: string;
}

export function MatchVerificationSection({
  match,
  onUpdate,
  associationId,
  tournamentId,
}: MatchVerificationSectionProps) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);

  const allPlayers: (MatchPlayer & { team: "home" | "away" })[] = [
    ...(match.homePlayers || []).map((p) => ({ ...p, team: "home" as const })),
    ...(match.awayPlayers || []).map((p) => ({ ...p, team: "away" as const })),
  ];

  // 오프라인 검인 동기화
  useEffect(() => {
    if (!associationId || !tournamentId) return;

    const syncOffline = async () => {
      if (!navigator.onLine) return;

      try {
        await syncOfflineVerifications(match.id, async (verification) => {
          await handleVerification(
            verification.playerId,
            verification.team,
            verification.status
          );
        });
      } catch (error) {
        console.error("[MatchVerificationSection] 오프라인 동기화 오류:", error);
      }
    };

    // 온라인 상태 변경 감지
    const handleOnline = () => {
      syncOffline();
    };

    window.addEventListener("online", handleOnline);
    syncOffline(); // 초기 동기화

    return () => {
      window.removeEventListener("online", handleOnline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match.id, associationId, tournamentId]);

  const handleVerification = async (
    playerId: string,
    team: "home" | "away",
    status: MatchPlayer["verificationStatus"]
  ) => {
    if (!user) return;

    setProcessing(playerId);

    try {
      const players = team === "home" ? match.homePlayers || [] : match.awayPlayers || [];
      const updatedPlayers = players.map((p) => {
        if (p.id === playerId) {
          return {
            ...p,
            verificationStatus: status,
            verifiedAt: status === "verified" ? serverTimestamp() : undefined,
            verifiedBy: status === "verified" ? user.uid : undefined,
            verifiedByName: status === "verified" ? user.displayName || "심판" : undefined,
          };
        }
        return p;
      });

      const updates: Partial<Match> = {};
      if (team === "home") {
        updates.homePlayers = updatedPlayers;
      } else {
        updates.awayPlayers = updatedPlayers;
      }

      await onUpdate(updates);
    } catch (error) {
      console.error("검인 업데이트 오류:", error);
      alert("검인 처리에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const verifiedCount = allPlayers.filter((p) => p.verificationStatus === "verified").length;
  const pendingCount = allPlayers.filter((p) => p.verificationStatus === "pending").length;
  const rejectedCount = allPlayers.filter((p) => p.verificationStatus === "rejected").length;

  return (
    <Card className="rounded-xl">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            <h2 className="text-lg font-semibold">선수 검인</h2>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline" className="bg-green-50 text-green-700">
              완료: {verifiedCount}
            </Badge>
            <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
              미검: {pendingCount}
            </Badge>
            {rejectedCount > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700">
                불가: {rejectedCount}
              </Badge>
            )}
          </div>
        </div>

        {/* QR 스캔 버튼 (모바일 우선) */}
        {associationId && tournamentId && (
          <div className="mb-4">
            <Button
              onClick={() => setShowQRScanner(true)}
              variant="default"
              size="lg"
              className="w-full"
            >
              <QrCode className="w-5 h-5 mr-2" />
              QR 스캔 (모바일)
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 홈팀 검인 */}
          <div>
            <div className="font-semibold mb-3 text-center border-b pb-2">
              {match.homeSlot?.teamName || match.teamA || "홈팀"}
            </div>
            <div className="space-y-2">
              {(match.homePlayers || []).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono font-semibold w-8 text-center">
                      {player.jerseyNumber}
                    </div>
                    <div>
                      <div className="font-medium">{player.name}</div>
                      {player.verifiedAt && (
                        <div className="text-xs text-muted-foreground">
                          검인: {player.verifiedByName || "심판"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={player.verificationStatus === "verified" ? "default" : "outline"}
                      onClick={() => handleVerification(player.id, "home", "verified")}
                      disabled={processing === player.id}
                      className="h-8"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={player.verificationStatus === "rejected" ? "destructive" : "outline"}
                      onClick={() => handleVerification(player.id, "home", "rejected")}
                      disabled={processing === player.id}
                      className="h-8"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 원정팀 검인 */}
          <div>
            <div className="font-semibold mb-3 text-center border-b pb-2">
              {match.awaySlot?.teamName || match.teamB || "원정팀"}
            </div>
            <div className="space-y-2">
              {(match.awayPlayers || []).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded border"
                >
                  <div className="flex items-center gap-3">
                    <div className="font-mono font-semibold w-8 text-center">
                      {player.jerseyNumber}
                    </div>
                    <div>
                      <div className="font-medium">{player.name}</div>
                      {player.verifiedAt && (
                        <div className="text-xs text-muted-foreground">
                          검인: {player.verifiedByName || "심판"}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant={player.verificationStatus === "verified" ? "default" : "outline"}
                      onClick={() => handleVerification(player.id, "away", "verified")}
                      disabled={processing === player.id}
                      className="h-8"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={player.verificationStatus === "rejected" ? "destructive" : "outline"}
                      onClick={() => handleVerification(player.id, "away", "rejected")}
                      disabled={processing === player.id}
                      className="h-8"
                    >
                      <XCircle className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </CardContent>

      {/* QR 스캐너 모달 */}
      {showQRScanner && associationId && tournamentId && (
        <PlayerQRScanner
          match={match}
          associationId={associationId}
          tournamentId={tournamentId}
          onVerificationComplete={handleVerification}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </Card>
  );
}

