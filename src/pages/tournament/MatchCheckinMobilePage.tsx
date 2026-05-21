/**
 * 🔥 모바일 선수 검인 (QR 스캔 MVP)
 * Phase 1-4: 현장 운영 핵심
 * 
 * BarcodeDetector 지원 브라우저에서는 카메라 스캔
 * 안 되면 토큰 수동 입력(현장 백업)
 */

import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { qrVerifyAndCheckin } from "@/lib/tournament/qrRepository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

type Params = {
  associationId: string;
  tournamentId: string;
  matchId: string;
};

export default function MatchCheckinMobilePage() {
  const { associationId, tournamentId, matchId } = useParams<Params>();
  const navigate = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [status, setStatus] = useState<"IDLE" | "SCANNING" | "SUCCESS" | "ERROR">("IDLE");
  const [message, setMessage] = useState<string>("");
  const [manualToken, setManualToken] = useState("");

  async function startCamera() {
    setMessage("");
    setStatus("SCANNING");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (error) {
      console.error("카메라 접근 오류:", error);
      setStatus("ERROR");
      setMessage("카메라 접근 권한이 필요합니다.");
    }
  }

  async function stopCamera() {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    streamRef.current = null;
    setStatus("IDLE");
  }

  async function handleToken(token: string) {
    if (!associationId || !tournamentId || !matchId) return;

    try {
      setMessage("검인 처리 중…");
      const result = await qrVerifyAndCheckin({
        associationId,
        tournamentId,
        matchId,
        qrToken: token,
      });
      setStatus("SUCCESS");
      setMessage(`✅ 검인 완료: ${result.playerId}`);
      // 다음 스캔을 위해 자동 복귀(현장용)
      setTimeout(() => {
        setStatus("SCANNING");
        setMessage("");
      }, 1500);
    } catch (e: any) {
      setStatus("ERROR");
      const code = e?.message || "ERROR";
      const m =
        code === "INVALID_QR"
          ? "❌ 유효하지 않은 QR"
          : code === "ALREADY_CHECKED_IN"
          ? "⚠️ 이미 검인됨"
          : code === "Not a referee for this match"
          ? "❌ 이 경기 심판 권한 없음"
          : `❌ 오류: ${code}`;
      setMessage(m);
      setTimeout(() => {
        setStatus("SCANNING");
        setMessage("");
      }, 2000);
    }
  }

  useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, []);

  // BarcodeDetector 기반 간단 스캐너 (지원 브라우저에서만)
  useEffect(() => {
    let raf = 0;
    let detector: any = null;
    let mounted = true;

    async function loop() {
      if (!mounted) return;
      const v = videoRef.current;
      if (!v || v.readyState < 2) {
        raf = requestAnimationFrame(loop);
        return;
      }

      try {
        if (!detector && "BarcodeDetector" in window) {
          detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
        }
        if (detector) {
          const barcodes = await detector.detect(v);
          if (barcodes?.length) {
            const raw = barcodes[0].rawValue;
            if (raw) {
              await handleToken(raw);
            }
          }
        }
      } catch {
        // ignore scan errors
      }

      raf = requestAnimationFrame(loop);
    }

    if (status === "SCANNING") {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      mounted = false;
      cancelAnimationFrame(raf);
    };
  }, [status, associationId, tournamentId, matchId]);

  if (!associationId || !tournamentId || !matchId) {
    return <div>경기 정보를 찾을 수 없습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">모바일 선수 검인 (QR)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              대회: {tournamentId} / 경기: {matchId}
            </div>

            <div className="rounded-lg overflow-hidden border bg-black">
              <video
                ref={videoRef}
                className="w-full h-[280px] object-cover"
                playsInline
                muted
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={startCamera} disabled={status === "SCANNING"} className="flex-1">
                스캔 시작
              </Button>
              <Button variant="outline" onClick={stopCamera} className="flex-1">
                카메라 종료
              </Button>
            </div>

            {message && (
              <div
                className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
                  status === "SUCCESS"
                    ? "bg-green-50 text-green-800"
                    : status === "ERROR"
                    ? "bg-red-50 text-red-800"
                    : "bg-blue-50 text-blue-800"
                }`}
              >
                {status === "SUCCESS" ? (
                  <CheckCircle className="w-4 h-4" />
                ) : status === "ERROR" ? (
                  <XCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                <span>{message}</span>
              </div>
            )}

            <div className="pt-4 border-t space-y-2">
              <div className="text-sm font-medium">백업: 수동 토큰 입력</div>
              <div className="flex gap-2">
                <Input
                  value={manualToken}
                  onChange={(e) => setManualToken(e.target.value)}
                  placeholder="QR 토큰 붙여넣기"
                  className="flex-1"
                />
                <Button
                  onClick={() => manualToken.trim() && handleToken(manualToken.trim())}
                  disabled={!manualToken.trim()}
                >
                  검인
                </Button>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() =>
                navigate(
                  `/association/${associationId}/admin/tournaments/${tournamentId}/matches/${matchId}`
                )
              }
            >
              경기 상세로 돌아가기
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

