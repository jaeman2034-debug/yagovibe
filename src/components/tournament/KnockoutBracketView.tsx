/**
 * 🔥 STEP 7 확장: 토너먼트 브라켓 뷰 (관리자/참가자용)
 * 
 * Single Elimination 토너먼트 브라켓을 시각적으로 표시
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { Trophy, Loader2, Play, FileDown } from "lucide-react";
import type { Tournament, MatchOps } from "@/types/tournament";
import { TournamentBracket } from "./TournamentBracket";
import { MatchListBoard } from "./MatchListBoard";

interface KnockoutBracketViewProps {
  associationId: string;
  tournament: Tournament;
  isAdmin: boolean;
}

export function KnockoutBracketView({
  associationId,
  tournament,
  isAdmin,
  onOpenScoreDialog,
  currentTeamId,
}: KnockoutBracketViewProps) {
  const [matches, setMatches] = useState<MatchOps[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hasKnockoutMatches, setHasKnockoutMatches] = useState(false);

  // 🔥 브라켓 생성 가능 여부
  const canGenerate = isAdmin && 
    (tournament.tournamentPhase === "ROSTER_LOCKED" || tournament.tournamentPhase === "DRAW_DONE") &&
    !hasKnockoutMatches;

  // 🔥 토너먼트 경기 조회
  useEffect(() => {
    if (!associationId || !tournament.id) {
      setLoading(false);
      return;
    }

    const matchesRef = collection(
      db,
      `associations/${associationId}/tournaments/${tournament.id}/matches`
    );

    // 토너먼트 경기만 조회
    const unsubscribe = onSnapshot(
      query(
        matchesRef,
        where("stage", "==", "KNOCKOUT"),
        orderBy("round", "asc"),
        orderBy("matchNo", "asc")
      ),
      (snapshot) => {
        const matchesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MatchOps[];

        setMatches(matchesData);
        setHasKnockoutMatches(matchesData.length > 0);
        setLoading(false);
      },
      (error) => {
        console.error("[토너먼트 브라켓 조회 오류]", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [associationId, tournament.id]);

  // 🔥 스코어 입력 다이얼로그 상태 (MatchListBoard와 공유)
  const [showScoreDialog, setShowScoreDialog] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<MatchOps | null>(null);

  // 🔥 PDF 다운로드
  const handleExportPdf = async () => {
    try {
      setExportingPdf(true);
      const functions = getFunctions(app, "asia-northeast3");
      const exportPdf = httpsCallable(functions, "exportBracketPdfCallable");

      const result: any = await exportPdf({
        associationId,
        tournamentId: tournament.id,
      });

      // Base64를 Blob으로 변환
      const binaryString = atob(result.data.file);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });

      // 다운로드
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = result.data.fileName;
      link.click();
      URL.revokeObjectURL(link.href);

      toast.success("브라켓 PDF가 다운로드되었습니다.");
    } catch (error: any) {
      console.error("[PDF 다운로드] 실패:", error);
      toast.error(error?.message || "PDF 다운로드에 실패했습니다.");
    } finally {
      setExportingPdf(false);
    }
  };

  // 🔥 브라켓 생성
  const handleGenerateBracket = async () => {
    if (!confirm("토너먼트 브라켓을 생성하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    try {
      setGenerating(true);
      const functions = getFunctions(app, "asia-northeast3");
      const generateBracket = httpsCallable(functions, "generateKnockoutBracketCallable");

      const result: any = await generateBracket({
        associationId,
        tournamentId: tournament.id,
      });

      toast.success(
        `토너먼트 브라켓이 생성되었습니다. (${result.data.bracketSize}팀, BYE ${result.data.byes}팀)`
      );

      // 페이지 새로고침 (경기 목록 업데이트)
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("[브라켓 생성] 실패:", error);
      toast.error(error?.message || "브라켓 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
          <p className="text-sm text-gray-500 mt-2">브라켓 정보를 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  // 브라켓이 없으면 생성 버튼 표시
  if (!hasKnockoutMatches) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏆 토너먼트 브라켓</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {canGenerate ? (
            <>
              <p className="text-sm text-gray-600">
                토너먼트 브라켓을 생성하면 Single Elimination 방식으로 경기가 자동 생성됩니다.
              </p>
              <Button
                onClick={handleGenerateBracket}
                disabled={generating}
                className="w-full"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    브라켓 생성
                  </>
                )}
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              {!isAdmin
                ? "관리자만 브라켓을 생성할 수 있습니다."
                : "명단 확정 후 브라켓을 생성할 수 있습니다."}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // 브라켓이 있으면 TournamentBracket 컴포넌트 사용
  return (
    <div className="space-y-6">
      {/* 브라켓 생성 버튼 (브라켓이 없을 때) */}
      {!hasKnockoutMatches && (
        <Card>
          <CardHeader>
            <CardTitle>🏆 토너먼트 브라켓</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {canGenerate ? (
              <>
                <p className="text-sm text-gray-600">
                  토너먼트 브라켓을 생성하면 Single Elimination 방식으로 경기가 자동 생성됩니다.
                </p>
                <Button
                  onClick={handleGenerateBracket}
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      생성 중...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      브라켓 생성
                    </>
                  )}
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {!isAdmin
                  ? "관리자만 브라켓을 생성할 수 있습니다."
                  : "명단 확정 후 브라켓을 생성할 수 있습니다."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 브라켓 뷰 (브라켓이 있을 때) */}
      {hasKnockoutMatches && (
        <>
          {/* PDF 다운로드 버튼 (관리자 전용) */}
          {isAdmin && (
            <Card>
              <CardContent className="p-4">
                <Button
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  className="w-full min-h-[44px] touch-manipulation"
                  variant="outline"
                >
                  {exportingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      PDF 생성 중...
                    </>
                  ) : (
                    <>
                      <FileDown className="w-4 h-4 mr-2" />
                      브라켓 PDF 다운로드
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  현장 게시/공지용 브라켓 PDF를 다운로드합니다.
                </p>
              </CardContent>
            </Card>
          )}

          <TournamentBracket
            matches={matches}
            isAdmin={isAdmin}
            onOpenScoreDialog={handleOpenScoreDialog}
          />

          {/* 경기 목록 보드 (스코어 입력용, 관리자 전용) */}
          {isAdmin && tournament.tournamentPhase === "MATCHES_RUNNING" && (
            <div className="mt-6">
              <MatchListBoard
                associationId={associationId}
                tournament={tournament}
                isAdmin={isAdmin}
                onOpenScoreDialog={handleOpenScoreDialog}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
