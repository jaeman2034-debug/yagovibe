/**
 * 🔥 QR 스캐너 UI (현장 심판/사무국)
 * 
 * QR 스캔 → 검증 → 체크인
 */

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/context/AuthProvider";

interface QrScannerProps {
  associationId: string;
  tournamentId: string;
  matchId?: string; // 경기별 체크인인 경우
}

export function QrScanner({
  associationId,
  tournamentId,
  matchId,
}: QrScannerProps) {
  const { user } = useAuth();
  const [qrCode, setQrCode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    playerName?: string;
    teamName?: string;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 카메라 스캔 (옵션 - 라이브러리 필요)
  // 여기서는 수동 입력 방식으로 구현

  async function handleVerify() {
    if (!qrCode.trim()) {
      toast.error("QR 코드를 입력하거나 스캔해주세요.");
      return;
    }

    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setVerifying(true);
    setLastResult(null);

    try {
      const qrVerify = httpsCallable(getFunctions(), "qrVerifyAndCheckin");
      
      // Bearer 토큰 추가
      const idToken = await user.getIdToken();
      const result = await qrVerify(
        {
          associationId,
          tournamentId,
          matchId: matchId || null,
          qrToken: qrCode.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = result.data as any;
      if (data.ok) {
        setLastResult({
          success: true,
          message: "체크인 완료",
          playerName: data.playerName,
          teamName: data.teamName,
        });
        toast.success(`체크인 완료: ${data.playerName || "선수"}`);
        setQrCode(""); // 성공 시 입력 초기화
        inputRef.current?.focus(); // 다음 스캔 준비
      } else {
        throw new Error(data.message || "체크인 실패");
      }
    } catch (error: any) {
      console.error("QR 검증 실패:", error);
      
      let errorMessage = "체크인에 실패했습니다.";
      if (error.message) {
        errorMessage = error.message;
      } else if (error.code) {
        switch (error.code) {
          case "INVALID_QR":
            errorMessage = "유효하지 않은 QR 코드입니다.";
            break;
          case "QR_TOKEN_EXPIRED":
            errorMessage = "QR 코드가 만료되었습니다.";
            break;
          case "ALREADY_USED":
          case "TOKEN_ALREADY_USED":
            errorMessage = "이미 사용된 QR 코드입니다.";
            break;
          case "ALREADY_CHECKED_IN":
            errorMessage = "이미 체크인된 선수입니다.";
            break;
          case "NOT_APPROVED":
            errorMessage = "승인된 선수만 체크인할 수 있습니다.";
            break;
          case "PLAYER_NOT_FOUND":
            errorMessage = "선수를 찾을 수 없습니다.";
            break;
        }
      }

      setLastResult({
        success: false,
        message: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setVerifying(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR 코드 스캔</CardTitle>
        {matchId && (
          <p className="text-sm text-muted-foreground">경기별 체크인</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="QR 코드를 입력하거나 스캔하세요"
            value={qrCode}
            onChange={(e) => setQrCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && qrCode.trim()) {
                handleVerify();
              }
            }}
            autoFocus
          />
          <Button
            onClick={handleVerify}
            disabled={!qrCode.trim() || verifying}
            className="w-full"
          >
            {verifying ? "검증 중..." : "체크인"}
          </Button>
        </div>

        {lastResult && (
          <div
            className={`p-4 rounded-lg border ${
              lastResult.success
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {lastResult.success ? (
                <Badge className="bg-green-600">✅ 성공</Badge>
              ) : (
                <Badge variant="destructive">❌ 실패</Badge>
              )}
              <span className="text-sm font-medium">{lastResult.message}</span>
            </div>
            {lastResult.success && lastResult.playerName && (
              <div className="text-sm text-muted-foreground space-y-1">
                <div>선수: {lastResult.playerName}</div>
                {lastResult.teamName && <div>팀: {lastResult.teamName}</div>}
              </div>
            )}
          </div>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p>• 승인된 선수만 체크인 가능</p>
          <p>• QR 코드는 5분간 유효</p>
          <p>• 1회 사용 후 만료</p>
        </div>
      </CardContent>
    </Card>
  );
}

