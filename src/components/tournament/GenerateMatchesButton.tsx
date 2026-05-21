/**
 * 🔥 경기 자동 생성 버튼 (사무국용)
 * 
 * 조 추첨 완료 후 조별 리그 방식으로 경기를 자동 생성합니다.
 * 
 * 위치: 대회 관리 > 운영(ops) 상단
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertCircle, Play, CheckCircle2, Loader2, Clock } from "lucide-react";
import type { Tournament } from "@/types/tournament";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { writeTournamentLog } from "@/utils/writeTournamentLog";
import { createTournamentTeamsSnapshot } from "@/utils/createTournamentTeamsSnapshot";

interface GenerateMatchesButtonProps {
  associationId: string;
  tournamentId: string;
  tournament: Tournament;
  onSuccess?: () => void; // 경기 생성 완료 후 콜백
  onLog?: (message: string) => void; // 🔥 로그 콜백
  testMode?: boolean; // 🔥 테스트 모드
}

export function GenerateMatchesButton({
  associationId,
  tournamentId,
  tournament,
  onSuccess,
  onLog,
  testMode = false, // 🔥 테스트 모드 기본값
}: GenerateMatchesButtonProps) {
  const { user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(true);
  const [canGenerate, setCanGenerate] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [matchCount, setMatchCount] = useState(0);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false); // 🔥 필수 확인 체크박스
  const [estimatedMatchCount, setEstimatedMatchCount] = useState(0);

  // 경기 생성 가능 여부 확인
  useEffect(() => {
    const checkGenerationStatus = async () => {
      setChecking(true);
      try {
        // 1. 조 추첨 완료 확인 (divisions 컬렉션 존재 여부)
        // 🔥 최신 구조: divisions 컬렉션이 있으면 조 추첨 완료
        const isDrawExecuted = tournament.drawExecuted === true || tournament.status === "draw_completed";
        const hasDivisions = tournament.draw?.locked === true || tournament.drawDivisions?.length > 0;

        if (!isDrawExecuted && !hasDivisions) {
          setCanGenerate(false);
          setReason("조 추첨이 완료되지 않았습니다. 먼저 조 추첨을 실행해주세요.");
          setChecking(false);
          return;
        }

        // 2. 이미 생성되었는지 확인
        const isAlreadyGenerated = tournament.status === "matches_generated" || tournament.bracket?.locked === true;
        if (isAlreadyGenerated) {
          setCanGenerate(false);
          setReason("이미 경기가 생성되었습니다. 경기 재생성은 불가능합니다.");
          setChecking(false);
          return;
        }

        // 3. 생성 가능
        setCanGenerate(true);
        setReason(null);
        
        // 예상 경기 수는 divisions 기준으로 계산 (임시로 0으로 설정)
        // 실제로는 divisions 컬렉션에서 teamIds를 읽어서 계산할 수 있지만,
        // 여기서는 간단하게 설정
        setEstimatedMatchCount(0);
      } catch (error) {
        console.error("경기 생성 상태 확인 오류:", error);
        setCanGenerate(false);
        setReason("경기 생성 상태를 확인하는 중 오류가 발생했습니다.");
      } finally {
        setChecking(false);
      }
    };

    checkGenerationStatus();
  }, [associationId, tournamentId, tournament]);

  // 경기 생성 실행
  const handleGenerate = async () => {
    if (!canGenerate || generating || !confirmedCheckbox) return;

    // 🔥 위험 액션 Confirm UX
    if (!window.confirm("정말 경기를 자동 생성하시겠습니까? 생성 후에는 되돌릴 수 없습니다.")) {
      return;
    }

    setGenerating(true);
    try {
      // 🔥 Cloud Function 호출
      const functions = getFunctions(app, "asia-northeast3");
      const generateMatches = httpsCallable(functions, "generateMatchesCallable");

      console.log("[경기 자동 생성] Cloud Function 호출 시작", {
        associationId,
        tournamentId,
      });

      const result = await generateMatches({
        associationId,
        tournamentId,
      });

      const data = result.data as any;
      const matchCount = data.matchCount || 0;

      console.log("[경기 자동 생성] ✅ 성공", {
        matchCount,
        data,
      });

      // 🔥 UI 로그에 기록 (즉시 반영)
      onLog?.(`✅ ${matchCount}개 경기 자동 생성됨`);

      // 🔥 대회 시작 시 팀 스냅샷 생성 (한 번만 실행)
      try {
        await createTournamentTeamsSnapshot({
          associationId,
          tournamentId,
        });
        console.log("[팀 스냅샷] ✅ 대회 시작 시점 팀 구성 스냅샷 생성 완료");
      } catch (snapshotError) {
        console.error("팀 스냅샷 생성 실패 (기능에는 영향 없음):", snapshotError);
        // 스냅샷 생성 실패해도 경기 생성은 성공이므로 계속 진행
      }

      // 🔥 Firestore에 영구 로그 저장
      try {
        await writeTournamentLog({
          associationId,
          tournamentId,
          type: "MATCH_AUTO_GENERATED",
          message: `✅ ${matchCount}개 경기 자동 생성됨`,
          actor: "system",
        });
      } catch (logError) {
        console.error("로그 저장 실패 (기능에는 영향 없음):", logError);
        // 로그 저장 실패해도 경기 생성은 성공이므로 계속 진행
      }

      toast.success(`✅ 경기 생성 완료: ${matchCount}경기`);

      setShowConfirm(false);
      setCanGenerate(false);
      setConfirmedCheckbox(false);
      setReason(`경기 생성 완료: 총 ${matchCount}경기`);
      setMatchCount(matchCount);

      // 콜백 호출 (화면 리프레시 등)
      if (onSuccess) {
        onSuccess();
      }

      // 약간의 지연 후 페이지 리로드 (경기 목록 갱신)
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("경기 생성 실패:", error);
      const message = error.message || error.details?.message || "경기 생성 중 오류가 발생했습니다.";
      toast.error(`❌ 경기 생성 실패: ${message}`);
    } finally {
      setGenerating(false);
    }
  };

  // 이미 생성된 경우
  if (matchCount > 0) {
    return (
      <Alert className="border-green-200 bg-green-50">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <AlertTitle className="text-green-900">경기 생성 완료</AlertTitle>
        <AlertDescription className="text-green-700">
          총 {matchCount}개의 경기가 생성되었습니다.
        </AlertDescription>
      </Alert>
    );
  }

  // 조 추첨 미완료
  if (!canGenerate && !checking && reason) {
    return (
      <Alert className="border-yellow-200 bg-yellow-50">
        <AlertCircle className="w-4 h-4 text-yellow-600" />
        <AlertTitle className="text-yellow-900">경기 생성 불가</AlertTitle>
        <AlertDescription className="text-yellow-700">{reason}</AlertDescription>
      </Alert>
    );
  }

  // 로딩 중
  if (checking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>경기 생성 상태 확인 중...</span>
      </div>
    );
  }

  // 경기 생성 가능
  return (
    <>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={!canGenerate || generating}
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        variant="default"
      >
        {generating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            생성 중...
          </>
        ) : (
          <>
            <Play className="w-4 h-4 mr-2" />
            경기 자동 생성
          </>
        )}
      </Button>

      {/* 확인 모달 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              경기 자동 생성을 실행하시겠습니까?
            </DialogTitle>
            <DialogDescription className="text-base mt-2">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900 mb-2">
                      ⚠️ 경기 생성은 되돌릴 수 없습니다
                    </p>
                    <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
                      <li>경기 생성은 <strong>1회만 실행</strong>됩니다.</li>
                      <li>실행 후 <strong>되돌릴 수 없습니다</strong>.</li>
                      <li>생성된 경기는 <strong>자동 저장</strong>되며,</li>
                      <li>운영 로그 및 <strong>행정 증빙</strong>으로 사용됩니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {/* 예상 경기 수 표시 */}
              {estimatedMatchCount > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-900">
                    <strong>예상 경기 수:</strong> 약 {estimatedMatchCount}경기
                    {tournament.drawDivisions && tournament.drawDivisions.length > 0 && (
                      <span className="ml-2">
                        ({tournament.drawDivisions.length}개 조)
                      </span>
                    )}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 🔥 필수 확인 체크박스 */}
            <div className="border-t pt-4">
              <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <Checkbox
                  id="confirm-match-checkbox"
                  checked={confirmedCheckbox}
                  onCheckedChange={(checked) => setConfirmedCheckbox(checked as boolean)}
                  className="mt-0.5"
                />
                <label
                  htmlFor="confirm-match-checkbox"
                  className="text-sm font-medium text-gray-900 cursor-pointer flex-1"
                >
                  ☑ 위 내용을 모두 확인했습니다.
                </label>
              </div>
              {!confirmedCheckbox && (
                <p className="text-xs text-red-600 mt-2 ml-6">
                  확인 체크박스를 선택해야 경기 생성을 실행할 수 있습니다.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
                setConfirmedCheckbox(false);
              }}
              disabled={generating}
            >
              취소
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generating || !confirmedCheckbox}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  생성 중...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  경기 자동 생성
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

