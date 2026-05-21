/**
 * 🔥 구청 리포트 PDF 생성 버튼
 * Phase 1-4: 구청 리포트 자동화
 */

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { getTournamentReportData } from "@/lib/tournament/reportRepository";
import {
  generateTournamentReportPdf,
  convertReportDataToPdfParams,
} from "@/utils/reportPdf";

interface TournamentReportButtonProps {
  associationId: string;
  tournamentId: string;
}

export function TournamentReportButton({
  associationId,
  tournamentId,
}: TournamentReportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1. 리포트 데이터 조회
      const data = await getTournamentReportData(associationId, tournamentId);

      // 2. PDF 파라미터 변환
      const pdfParams = convertReportDataToPdfParams(data);

      // 3. PDF 생성 및 다운로드
      generateTournamentReportPdf(pdfParams);

      // 성공 메시지 (선택적)
      // alert("구청 제출용 리포트 PDF가 생성되었습니다.");
    } catch (e: any) {
      console.error("리포트 생성 오류:", e);
      setError(e.message || "리포트 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGenerateReport}
        disabled={loading}
        variant="outline"
        className="w-full sm:w-auto"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            생성 중...
          </>
        ) : (
          <>
            <Download className="w-4 h-4 mr-2" />
            구청 제출용 리포트 PDF
          </>
        )}
      </Button>
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}

