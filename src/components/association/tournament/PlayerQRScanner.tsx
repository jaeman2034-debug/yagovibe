/**
 * 모바일 선수 QR 스캔 컴포넌트
 * 실무: 장갑 끼고도 사용 가능 수준
 */

import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { decodePlayerQR, verifyQRToken, type PlayerQRData } from "@/lib/tournament/playerQR";
import { saveOfflineVerification } from "@/lib/tournament/offlineVerification";
import { CheckCircle2, XCircle, AlertTriangle, Camera, X, Smartphone } from "lucide-react";
import type { Match, MatchPlayer } from "@/types/tournament";
import { useAuth } from "@/context/AuthProvider";

interface PlayerQRScannerProps {
  match: Match;
  associationId: string;
  tournamentId: string;
  onVerificationComplete: (playerId: string, team: "home" | "away", status: MatchPlayer["verificationStatus"]) => Promise<void>;
  onClose: () => void;
}

type ScanResult = {
  type: "success" | "error" | "warning";
  message: string;
  playerId?: string;
  team?: "home" | "away";
};

export function PlayerQRScanner({
  match,
  associationId,
  tournamentId,
  onVerificationComplete,
  onClose,
}: PlayerQRScannerProps) {
  const { user } = useAuth();
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [lastScannedAt, setLastScannedAt] = useState<number>(0);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // 모든 선수 목록
  const allPlayers: (MatchPlayer & { team: "home" | "away" })[] = [
    ...(match.homePlayers || []).map((p) => ({ ...p, team: "home" as const })),
    ...(match.awayPlayers || []).map((p) => ({ ...p, team: "away" as const })),
  ];

  useEffect(() => {
    return () => {
      // 컴포넌트 언마운트 시 스캐너 정리
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current = null;
          })
          .catch(() => {});
      }
    };
  }, []);

  const startScanning = async () => {
    if (isScanning || scannerRef.current) return;

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" }, // 후면 카메라
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // 중복 스캔 방지 (1초 내 동일 QR)
          const now = Date.now();
          if (now - lastScannedAt < 1000) return;
          setLastScannedAt(now);

          handleQRScan(decodedText);
        },
        (errorMessage) => {
          // 스캔 에러는 무시 (연속 발생)
        }
      );

      setIsScanning(true);
      setScanResult(null);
    } catch (error) {
      console.error("[QRScanner] 스캔 시작 오류:", error);
      setScanResult({
        type: "error",
        message: "카메라를 사용할 수 없습니다. 카메라 권한을 확인해주세요.",
      });
    }
  };

  const stopScanning = async () => {
    if (!scannerRef.current) return;

    try {
      await scannerRef.current.stop();
      scannerRef.current = null;
      setIsScanning(false);
    } catch (error) {
      console.error("[QRScanner] 스캔 중지 오류:", error);
    }
  };

  const handleQRScan = async (qrString: string) => {
    // QR 파싱
    const qrData = decodePlayerQR(qrString);
    if (!qrData) {
      setScanResult({
        type: "error",
        message: "유효하지 않은 QR 코드입니다.",
      });
      // 진동 피드백
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }
      return;
    }

    // 팀 ID 추출 (홈/원정 모두 확인)
    const homeTeamId = match.homeSlot?.teamId || match.teamAId || "";
    const awayTeamId = match.awaySlot?.teamId || match.teamBId || "";
    
    // 토큰 검증 (홈 또는 원정 팀 일치 확인)
    const isValid =
      verifyQRToken(qrData, homeTeamId, tournamentId) ||
      verifyQRToken(qrData, awayTeamId, tournamentId);
    if (!isValid) {
      // 팀/대회 불일치 체크
      const homeTeamId = match.homeSlot?.teamId || match.teamAId || "";
      const awayTeamId = match.awaySlot?.teamId || match.teamBId || "";
      const isTeamMismatch = qrData.teamId !== homeTeamId && qrData.teamId !== awayTeamId;
      
      setScanResult({
        type: "warning",
        message: isTeamMismatch
          ? "대회/팀 불일치: 이 선수는 이 경기에 출전할 수 없습니다."
          : "QR 코드 검증에 실패했습니다.",
      });
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    }

    // 선수 찾기
    const player = allPlayers.find((p) => p.id === qrData.playerId || p.playerId === qrData.playerId);
    if (!player) {
      setScanResult({
        type: "error",
        message: "출전 명단에 등록되지 않은 선수입니다.",
      });
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      return;
    }

    // 이미 검인 완료 체크
    if (player.verificationStatus === "verified") {
      setScanResult({
        type: "warning",
        message: `${player.name} (#${player.jerseyNumber}) 이미 검인 완료되었습니다.`,
        playerId: player.id,
        team: player.team,
      });
      if (navigator.vibrate) {
        navigator.vibrate([100]);
      }
      return;
    }

    // 검인 처리
    try {
      // 네트워크 체크
      const isOnline = navigator.onLine;

      if (!isOnline) {
        // 오프라인: 로컬 저장
        saveOfflineVerification({
          id: `${Date.now()}`,
          matchId: match.id,
          division: match.division,
          associationId,
          tournamentId,
          playerId: player.id,
          team: player.team,
          status: "verified",
          timestamp: Date.now(),
          verifiedBy: user?.uid,
          verifiedByName: user?.displayName || "심판",
        });

        setScanResult({
          type: "success",
          message: `${player.name} (#${player.jerseyNumber}) 검인 완료 (오프라인 - 동기화 대기 중)`,
          playerId: player.id,
          team: player.team,
        });
      } else {
        // 온라인: 즉시 서버 반영
        await onVerificationComplete(player.id, player.team, "verified");

        setScanResult({
          type: "success",
          message: `${player.name} (#${player.jerseyNumber}) 검인 완료`,
          playerId: player.id,
          team: player.team,
        });
      }

      // 성공 피드백
      if (navigator.vibrate) {
        navigator.vibrate([50, 50, 50]);
      }

      // 2초 후 다음 스캔 대기
      setTimeout(() => {
        setScanResult(null);
      }, 2000);
    } catch (error) {
      console.error("[QRScanner] 검인 처리 오류:", error);
      setScanResult({
        type: "error",
        message: "검인 처리에 실패했습니다. 다시 시도해주세요.",
      });
    }
  };

  return (
    <Card className="rounded-xl fixed inset-4 md:max-w-md md:mx-auto md:inset-auto md:relative z-50 bg-white">
      <CardContent className="p-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            <h2 className="text-lg font-semibold">QR 검인</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* QR 스캐너 영역 */}
        <div className="mb-4">
          <div
            id="qr-reader"
            ref={scannerContainerRef}
            className="w-full rounded-lg overflow-hidden bg-black"
            style={{ minHeight: "300px" }}
          />
        </div>

        {/* 결과 표시 */}
        {scanResult && (
          <div
            className={`p-3 rounded-lg mb-4 ${
              scanResult.type === "success"
                ? "bg-green-50 border border-green-200"
                : scanResult.type === "warning"
                ? "bg-yellow-50 border border-yellow-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div className="flex items-start gap-2">
              {scanResult.type === "success" && <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />}
              {scanResult.type === "warning" && <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />}
              {scanResult.type === "error" && <XCircle className="w-5 h-5 text-red-600 mt-0.5" />}
              <div className="flex-1">
                <div className="text-sm font-medium">{scanResult.message}</div>
              </div>
            </div>
          </div>
        )}

        {/* 컨트롤 버튼 */}
        <div className="space-y-2">
          {!isScanning ? (
            <Button onClick={startScanning} className="w-full" size="lg">
              <Camera className="w-5 h-5 mr-2" />
              스캔 시작
            </Button>
          ) : (
            <Button onClick={stopScanning} variant="destructive" className="w-full" size="lg">
              스캔 중지
            </Button>
          )}

          <div className="text-xs text-muted-foreground text-center">
            {navigator.onLine ? (
              <span className="text-green-600">온라인 모드</span>
            ) : (
              <span className="text-yellow-600">오프라인 모드 (동기화 대기 중)</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

