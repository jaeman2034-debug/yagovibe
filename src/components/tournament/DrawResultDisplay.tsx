/**
 * 🔥 조 추첨 결과 표시 UI
 * 
 * 추첨 완료 후 결과 공개/비공개 표시
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Eye, EyeOff, Clock, Download, FileText, FileSpreadsheet, FileCode, AlertCircle } from "lucide-react";
import type { Tournament, DrawLog } from "@/types/tournament";
import { formatDate, safeToDate } from "@/utils/dateUtils";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { toast } from "sonner";
import { getTestGroups } from "@/lib/tournament/testModeUtils";
import { isTestModeFromURL } from "@/lib/tournament/testModeUtils";
import {
  convertDrawLogToAuditFormat,
  exportDrawLogAuditPdf,
  exportDrawLogAuditCsv,
  exportDrawLogAuditJson,
} from "@/utils/drawLogAudit";
import { generateDrawSystem1PagePdf } from "@/utils/drawSystem1PagePdf";
import { generateOfficialLetterToGuOfficePdf } from "@/utils/officialLetterToGuOfficePdf";
import { useAuth } from "@/context/AuthProvider";

interface DrawResultDisplayProps {
  tournament: Tournament;
  associationId: string;
  className?: string;
  isAdmin?: boolean; // 관리자 권한 여부
  testMode?: boolean; // 🔥 테스트 모드
}

export function DrawResultDisplay({
  tournament,
  associationId,
  className,
  isAdmin = false,
  testMode = false, // 🔥 테스트 모드 기본값
}: DrawResultDisplayProps) {
  const { user } = useAuth();
  const [loadingLog, setLoadingLog] = useState(false);
  const [drawLog, setDrawLog] = useState<DrawLog | null>(null);
  const [testGroups, setTestGroups] = useState<any | null>(null); // 🔥 테스트 그룹 데이터
  const [loadingTestGroups, setLoadingTestGroups] = useState(false);

  // 🔥 테스트 모드일 때 test_groups 조회
  useEffect(() => {
    if (testMode || isTestModeFromURL()) {
      const loadTestGroups = async () => {
        try {
          setLoadingTestGroups(true);
          const testData = await getTestGroups(associationId, tournament.id);
          if (testData) {
            setTestGroups(testData);
          }
        } catch (error) {
          console.error("테스트 그룹 조회 실패:", error);
        } finally {
          setLoadingTestGroups(false);
        }
      };
      loadTestGroups();
    }
  }, [testMode, associationId, tournament.id]);

  // 추첨 실행 여부 확인 (테스트 모드일 때는 test_groups 존재 여부로 판단)
  const isExecuted = testMode ? !!testGroups : tournament.drawExecuted === true;
  const drawDivisions = testMode && testGroups
    ? testGroups.groups.map((g: any) => ({
        division: g.division,
        teams: g.teams.map((t: any) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          seed: t.seed,
        })),
      }))
    : tournament.drawDivisions || [];
  const isPublic = tournament.drawDate?.isPublic ?? false;

  // 감사 로그 조회 (관리자용)
  useEffect(() => {
    if (isAdmin && tournament.drawLogId) {
      const loadDrawLog = async () => {
        try {
          setLoadingLog(true);
          const logRef = doc(
            db,
            `associations/${associationId}/tournaments/${tournament.id}/drawLogs/${tournament.drawLogId}`
          );
          const logSnap = await getDoc(logRef);
          if (logSnap.exists()) {
            setDrawLog({ id: logSnap.id, ...logSnap.data() } as DrawLog);
          }
        } catch (error: any) {
          console.error("감사 로그 조회 실패:", error);
        } finally {
          setLoadingLog(false);
        }
      };

      loadDrawLog();
    }
  }, [isAdmin, tournament.drawLogId, associationId, tournament.id]);

  // 감사 로그 다운로드 핸들러
  const handleExportAuditLog = async (format: "pdf" | "csv" | "json") => {
    if (!drawLog) {
      toast.error("감사 로그를 불러올 수 없습니다.");
      return;
    }

    try {
      const auditData = convertDrawLogToAuditFormat(tournament, drawLog);

      switch (format) {
        case "pdf":
          exportDrawLogAuditPdf(auditData);
          toast.success("감사 로그 PDF를 다운로드했습니다.");
          break;
        case "csv":
          exportDrawLogAuditCsv(auditData);
          toast.success("감사 로그 CSV를 다운로드했습니다.");
          break;
        case "json":
          exportDrawLogAuditJson(auditData);
          toast.success("감사 로그 JSON을 다운로드했습니다.");
          break;
      }
    } catch (error: any) {
      console.error("감사 로그 내보내기 실패:", error);
      toast.error("감사 로그 내보내기에 실패했습니다.");
    }
  };

  // 테스트 모드일 때 로딩 중 표시
  if (testMode && loadingTestGroups) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-gray-500">
          테스트 조 추첨 결과를 불러오는 중...
        </CardContent>
      </Card>
    );
  }

  if (!isExecuted || drawDivisions.length === 0) {
    return null; // 추첨 결과 없음
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            조 추첨 결과
            {testMode && (
              <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                🧪 테스트 모드
              </Badge>
            )}
            {isPublic && !testMode ? (
              <Badge variant="default" className="bg-green-600">
                <Eye className="w-3 h-3 mr-1" />
                공개
              </Badge>
            ) : !testMode ? (
              <Badge variant="secondary">
                <EyeOff className="w-3 h-3 mr-1" />
                비공개
              </Badge>
            ) : null}
          </CardTitle>
          {tournament.drawExecutedAt && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="w-4 h-4" />
              {safeToDate(tournament.drawExecutedAt).toLocaleString("ko-KR")}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 🔥 조 추첨 방식 정보 표시 */}
        {tournament.algorithmVersion && (
          <Alert className="mb-4 border-blue-200 bg-blue-50">
            <AlertCircle className="w-4 h-4 text-blue-600" />
            <AlertTitle className="text-blue-900">조 추첨 방식</AlertTitle>
            <AlertDescription className="text-sm mt-2 text-blue-800">
              <div className="space-y-1">
                <p>
                  {tournament.algorithmVersion === "v0.0" && "• 완전 랜덤 배정"}
                  {tournament.algorithmVersion === "v1.0" && "• 시드 분산 + 랜덤 배정"}
                  {tournament.algorithmVersion === "v2.1" && "• 시드 분산 + 동일 클럽 회피 + 균형 최적화"}
                </p>
                <p>• 알고리즘 버전: {tournament.algorithmVersion}</p>
                {/* 🔥 STEP 4: Seed 표시 (운영자 UX) */}
                {(tournament.drawSeed || (tournament.draw as any)?.seed) && (
                  <p className="text-xs text-gray-600 mt-2">
                    조 추첨 기준: Seed = <b className="font-mono">{(tournament.drawSeed || (tournament.draw as any)?.seed)}</b>
                  </p>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 추첨 안내 문구 */}
        <Alert className="bg-blue-50 border-blue-200">
          <AlertTitle className="text-blue-900">조 추첨 안내</AlertTitle>
          <AlertDescription className="text-blue-800 text-sm">
            조 추첨은 사전에 고지된 일정에 따라 협회 공식 시스템을 통해 무작위로 진행되었으며,
            추첨 결과는 시스템 로그로 기록되었습니다.
          </AlertDescription>
        </Alert>

        {/* 조별 팀 목록 */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {drawDivisions.map((division) => (
            <Card key={division.division} className="border-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">{division.division}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {division.teams.length}팀
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {division.teams.map((team, idx) => (
                  <div
                    key={team.teamId}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                        {team.seed}
                      </Badge>
                      <span className="font-medium">{team.teamName}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 추첨 실행 정보 (관리자용) */}
        {tournament.drawExecutedBy && (
          <div className="border-t pt-3 space-y-3">
            <div className="text-xs text-muted-foreground">
              추첨 실행자: {tournament.drawExecutedBy}
              {tournament.drawLogId && (
                <span className="ml-2">(로그 ID: {tournament.drawLogId.substring(0, 8)}...)</span>
              )}
            </div>

            {/* 감사 로그 다운로드 버튼 (관리자용) */}
            {isAdmin && (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportAuditLog("pdf")}
                    disabled={loadingLog || !drawLog}
                    className="flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    감사 로그 PDF
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportAuditLog("csv")}
                    disabled={loadingLog || !drawLog}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    감사 로그 CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExportAuditLog("json")}
                    disabled={loadingLog || !drawLog}
                    className="flex items-center gap-2"
                  >
                    <FileCode className="w-4 h-4" />
                    감사 로그 JSON
                  </Button>
                  {loadingLog && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3 animate-spin" />
                      로그 로딩 중...
                    </span>
                  )}
                </div>
                
                {/* 구청·협회 제출용 1페이지 요약 PDF */}
                <div className="border-t pt-3 space-y-3">
                  <p className="text-xs text-muted-foreground mb-2">구청·협회 제출용</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => generateDrawSystem1PagePdf()}
                      className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <FileText className="w-4 h-4" />
                      시스템 아키텍처 요약 (1P)
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generateOfficialLetterToGuOfficePdf()}
                      className="flex items-center gap-2"
                    >
                      <FileText className="w-4 h-4" />
                      구청 제출용 공문 PDF
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    결재·감사 대응용 정식 문서
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

