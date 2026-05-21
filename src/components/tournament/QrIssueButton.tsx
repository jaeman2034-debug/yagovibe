/**
 * 🔥 QR 발급 & PDF 다운로드 버튼
 * Phase 1-4: 현장 배포 단위
 * 
 * 사용 예시:
 * - 선수 관리 화면
 * - 참가 승인 화면
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { issueQrToken } from "@/lib/tournament/qrRepository";
import { generateQrPdf } from "@/utils/qrPdf";
import { Download, Loader2 } from "lucide-react";

interface QrIssueButtonProps {
  associationId: string;
  tournamentId: string;
  playerId: string;
  tournamentName: string;
  teamName: string;
  playerName: string;
  expiresAt?: string;
}

export function QrIssueButton({
  associationId,
  tournamentId,
  playerId,
  tournamentName,
  teamName,
  playerName,
  expiresAt,
}: QrIssueButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleIssueQrAndPdf = async () => {
    try {
      setLoading(true);

      // 1️⃣ 서버에서 QR 토큰 발급
      const { qrToken } = await issueQrToken({
        associationId,
        tournamentId,
        playerId,
        expiresAt,
      });

      // 2️⃣ PDF 생성 + 다운로드
      await generateQrPdf({
        tournamentName,
        teamName,
        playerName,
        qrToken,
      });
    } catch (error) {
      console.error("QR 발급 및 PDF 생성 오류:", error);
      alert("QR 발급에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleIssueQrAndPdf}
      disabled={loading}
      variant="outline"
      size="sm"
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          처리 중...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          QR 발급 & PDF 다운로드
        </>
      )}
    </Button>
  );
}

