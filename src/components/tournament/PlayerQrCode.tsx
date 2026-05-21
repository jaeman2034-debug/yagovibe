/**
 * 🔥 선수 QR 코드 생성 UI (모바일)
 * 
 * 승인된 선수만 QR 토큰 발급 가능
 */

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "@/context/AuthProvider";

interface PlayerQrCodeProps {
  associationId: string;
  tournamentId: string;
  playerId: string;
  playerName?: string;
}

export function PlayerQrCode({
  associationId,
  tournamentId,
  playerId,
  playerName,
}: PlayerQrCodeProps) {
  const { user } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // 남은 시간 계산
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0) {
        setToken(null);
        setExpiresAt(null);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  async function handleGenerateQr() {
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    try {
      const issueQrToken = httpsCallable(getFunctions(), "issueQrToken");
      
      // Bearer 토큰 추가
      const idToken = await user.getIdToken();
      const result = await issueQrToken(
        {
          associationId,
          tournamentId,
          playerId,
        },
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        }
      );

      const data = result.data as any;
      if (data.ok && data.token) {
        setToken(data.token);
        const expiresIn = data.expiresIn || 300; // 5분
        setExpiresAt(new Date(Date.now() + expiresIn * 1000));
        toast.success("QR 코드가 생성되었습니다. (유효 시간: 5분)");
      } else {
        throw new Error(data.message || "QR 토큰 발급 실패");
      }
    } catch (error: any) {
      console.error("QR 토큰 발급 실패:", error);
      toast.error(error.message || "QR 코드 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  // QR 코드 렌더링 (간단한 텍스트 표시 또는 라이브러리 사용)
  function renderQrCode() {
    if (!token) return null;

    // QR 코드 라이브러리가 없으면 토큰 텍스트 표시
    return (
      <div className="space-y-4">
        <div className="bg-white p-8 rounded-lg border-2 border-dashed border-gray-300 text-center">
          <div className="text-xs font-mono break-all mb-2">{token}</div>
          <div className="text-sm text-muted-foreground">
            위 토큰을 스캔하세요
          </div>
        </div>
        {timeLeft > 0 && (
          <div className="text-center">
            <Badge variant="secondary">
              남은 시간: {Math.floor(timeLeft / 60)}분 {timeLeft % 60}초
            </Badge>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>QR 코드 생성</CardTitle>
        {playerName && (
          <p className="text-sm text-muted-foreground">선수: {playerName}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {!token ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              승인된 선수만 QR 코드를 생성할 수 있습니다.
            </p>
            <Button
              onClick={handleGenerateQr}
              disabled={loading}
              className="w-full"
            >
              {loading ? "생성 중..." : "QR 코드 생성"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {renderQrCode()}
            <Button
              variant="outline"
              onClick={() => {
                setToken(null);
                setExpiresAt(null);
              }}
              className="w-full"
            >
              새로 생성
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

