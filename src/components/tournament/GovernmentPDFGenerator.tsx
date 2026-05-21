/**
 * 🔥 구청 제출용 PDF 생성 컴포넌트
 * 
 * OPS 화면에서 사용
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileText, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { generateGovernmentPDFHTML } from "@/lib/tournament/governmentPDFTemplate";
import type { Tournament } from "@/types/tournament";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { collectPDFData } from "@/lib/tournament/generateOfficialPDF";
import { useAuth } from "@/context/AuthProvider";

interface GovernmentPDFGeneratorProps {
  associationId: string;
  tournament: Tournament;
  associationName: string;
}

export function GovernmentPDFGenerator({
  associationId,
  tournament,
  associationName,
}: GovernmentPDFGeneratorProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleGeneratePDF = async () => {
    if (!user) {
      setError("로그인이 필요합니다.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1️⃣ PDF 데이터 수집
      const pdfData = await collectPDFData({
        associationId,
        tournamentId: tournament.id,
        generatedBy: user.uid,
      });

      // 2️⃣ HTML 템플릿 생성
      const html = generateGovernmentPDFHTML({
        tournament,
        associationName,
        generatedAt: new Date().toLocaleString("ko-KR"),
        generatedBy: user.displayName || user.email || "시스템",
        generatedByEmail: user.email || undefined,
        participantSummary: {
          totalTeams: pdfData.teams.length,
          approvedTeams: pdfData.teams.filter((t) => t.status === "approved").length,
          totalPlayers: pdfData.players.length,
          verifiedPlayers: pdfData.players.filter((p) => p.ageVerified).length,
        },
        drawResult: pdfData.drawLog
          ? {
              executedAt: pdfData.drawLog.executedAt
                ? new Date(pdfData.drawLog.executedAt).toLocaleString("ko-KR")
                : "-",
              executedBy: pdfData.drawLog.executedBy || "-",
              algorithmVersion: tournament.algorithmVersion || "v1.0",
              groups: tournament.drawDivisions?.map((div) => ({
                groupId: div.division,
                teams: div.teams.map((t) => ({
                  teamId: t.teamId,
                  teamName: t.teamName,
                })),
              })) || [],
            }
          : undefined,
        matchSchedule: pdfData.matches.map((m) => ({
          date: m.date,
          facility: m.venueId || "-",
          time: m.time,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
        })),
        matchResults: pdfData.matches
          .filter((m) => m.status === "completed" && m.homeScore !== undefined)
          .map((m) => ({
            date: m.date,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            score: `${m.homeScore} : ${m.awayScore}`,
            status: "완료",
          })),
        operationLogs: pdfData.opsLogs.map((log) => ({
          timestamp: log.timestamp
            ? new Date(log.timestamp).toLocaleString("ko-KR")
            : "-",
          actor: log.executor || "-",
          action: log.action || "-",
          detail: log.details || "-",
        })),
        qrCheckinSummary: {
          totalCheckins: pdfData.checkIns.length,
          successCount: pdfData.checkIns.length, // 실제로는 성공/실패 구분 필요
          deniedCount: 0,
        },
      });

      // 3️⃣ Cloud Function 호출 (PDF 생성)
      const generatePDF = httpsCallable(functions, "generateTournamentPDFCallable");
      const result = await generatePDF({
        associationId,
        tournamentId: tournament.id,
        generatedBy: user.uid,
        html,
      });

      const pdfUrl = (result.data as any)?.pdfUrl;
      if (pdfUrl) {
        setSuccess("PDF 생성이 완료되었습니다.");
        
        // 새 창에서 PDF 열기
        window.open(pdfUrl, "_blank");
      } else {
        throw new Error("PDF URL을 받지 못했습니다.");
      }
    } catch (err: any) {
      console.error("PDF 생성 오류:", err);
      setError(err.message || "PDF 생성 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          구청 제출용 PDF 생성
        </CardTitle>
        <CardDescription>
          대회 운영 데이터를 기반으로 구청 제출용 PDF 문서를 자동 생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 안내 문구 */}
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-sm">
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>생성 시각 및 생성자가 자동으로 기록됩니다.</li>
              <li>테스트/공식 모드 구분이 자동으로 반영됩니다.</li>
              <li>한글 폰트가 완전히 임베딩되어 어떤 환경에서도 정상 출력됩니다.</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* 에러 메시지 */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 성공 메시지 */}
        {success && (
          <Alert>
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* 생성 버튼 */}
        <Button
          onClick={handleGeneratePDF}
          disabled={loading}
          className="w-full"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              PDF 생성 중...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 mr-2" />
              구청 제출용 PDF 생성
            </>
          )}
        </Button>

        {/* 파일명 안내 */}
        <p className="text-xs text-muted-foreground text-center">
          파일명: {new Date().getFullYear()}_{associationName.replace(/\s/g, "_")}_{tournament.name.replace(/\s/g, "_")}_운영보고서.pdf
        </p>
      </CardContent>
    </Card>
  );
}

