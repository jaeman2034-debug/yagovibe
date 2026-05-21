/**
 * 🔥 테스트 결과 → 공식 승격 버튼
 * 
 * 테스트 모드로 생성된 조 추첨 및 대진표를 공식 기록으로 승격
 * - 테스트 완료 조건 검증
 * - 2차 확인 모달
 * - 데이터 승격 로직
 * - 감사 로그 기록
 */

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { getTestGroups, getTestMatches } from "@/lib/tournament/testModeUtils";
import { collection, addDoc, serverTimestamp, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getTournament } from "@/lib/tournament/tournamentRepository";
import { calculateTotalMatchCount } from "@/lib/tournament/matchGenerator";

interface PromoteTestToOfficialButtonProps {
  associationId: string;
  tournamentId: string;
  onSuccess?: () => void;
}

interface TestCompletionStatus {
  hasTestGroups: boolean;
  hasTestMatches: boolean;
  matchCountValid: boolean;
  testGroups: any | null;
  testMatches: any[];
  expectedMatchCount: number;
  actualMatchCount: number;
}

export function PromoteTestToOfficialButton({
  associationId,
  tournamentId,
  onSuccess,
}: PromoteTestToOfficialButtonProps) {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [status, setStatus] = useState<TestCompletionStatus | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmedCheckbox, setConfirmedCheckbox] = useState(false);
  const [promoting, setPromoting] = useState(false);

  // 테스트 완료 조건 확인
  useEffect(() => {
    const checkTestCompletion = async () => {
      setChecking(true);
      try {
        // 1. 테스트 조 추첨 확인
        const testGroups = await getTestGroups(associationId, tournamentId);
        const hasTestGroups = !!testGroups && testGroups.groups?.length > 0;

        // 2. 테스트 대진표 확인
        const testMatches = await getTestMatches(associationId, tournamentId);
        const hasTestMatches = testMatches.length > 0;

        // 3. 경기 수 검증
        let matchCountValid = false;
        let expectedMatchCount = 0;
        let actualMatchCount = testMatches.length;

        if (hasTestGroups && testGroups.groups) {
          // 예상 경기 수 계산 (조별 리그: n*(n-1)/2)
          expectedMatchCount = calculateTotalMatchCount(
            testGroups.groups.map((g: any) => ({
              division: g.division || g.groupId + "조",
              teams: g.teams || [],
            }))
          );
          matchCountValid = actualMatchCount === expectedMatchCount;
        }

        setStatus({
          hasTestGroups,
          hasTestMatches,
          matchCountValid,
          testGroups,
          testMatches,
          expectedMatchCount,
          actualMatchCount,
        });
      } catch (error) {
        console.error("테스트 완료 조건 확인 오류:", error);
        toast.error("테스트 완료 조건을 확인하는 중 오류가 발생했습니다.");
      } finally {
        setChecking(false);
      }
    };

    checkTestCompletion();
  }, [associationId, tournamentId]);

  // 공식 승격 실행
  const handlePromote = async () => {
    if (!user || !status || !confirmedCheckbox || promoting) return;

    setPromoting(true);
    try {
      // 1. 대회 정보 조회
      const tournament = await getTournament(associationId, tournamentId);
      if (!tournament) {
        throw new Error("대회 정보를 찾을 수 없습니다.");
      }

      // 2. 이미 공식 조 추첨이 완료되었는지 확인
      if (tournament.drawExecuted) {
        throw new Error("이미 공식 조 추첨이 완료되었습니다.");
      }

      if (!status.testGroups || !status.testGroups.groups) {
        throw new Error("테스트 조 추첨 결과가 없습니다.");
      }

      // 3. 데이터 승격: test_groups → drawDivisions
      const tournamentRef = doc(db, `associations/${associationId}/tournaments/${tournamentId}`);
      const batch = writeBatch(db);

      // 3-1. 대회 문서 업데이트 (drawDivisions)
      const drawDivisions = status.testGroups.groups.map((g: any) => ({
        division: g.division || g.groupId + "조",
        teams: g.teams.map((t: any) => ({
          teamId: t.teamId,
          teamName: t.teamName,
          seed: t.seed || 0,
        })),
      }));

      batch.update(tournamentRef, {
        drawExecuted: true,
        drawExecutedAt: serverTimestamp(),
        drawExecutedBy: user.uid,
        drawDivisions,
        bracketStatus: "preparing",
        updatedAt: serverTimestamp(),
      });

      // 3-2. test_drawLogs → drawLogs 복사 (최신 1개)
      const testDrawLogsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/test_drawLogs`
      );
      const { getDocs, query, orderBy, limit } = await import("firebase/firestore");
      const testDrawLogsSnap = await getDocs(
        query(testDrawLogsRef, orderBy("executedAt", "desc"), limit(1))
      );
      if (!testDrawLogsSnap.empty) {
        const testLog = testDrawLogsSnap.docs[0].data();
        const drawLogsRef = collection(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/drawLogs`
        );
        const newLogRef = doc(drawLogsRef);
        batch.set(newLogRef, {
          ...testLog,
          promotedFromTest: true,
          promotedAt: serverTimestamp(),
          promotedBy: user.uid,
        });
      }

      // 3-3. test_matches → matches 복사
      const matchesRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/matches`
      );
      for (const testMatch of status.testMatches) {
        const { id, ...matchData } = testMatch;
        const newMatchRef = doc(matchesRef);
        batch.set(newMatchRef, {
          ...matchData,
          promotedFromTest: true,
          promotedAt: serverTimestamp(),
          promotedBy: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      // 4. 감사 로그 기록
      const auditLogsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/auditLogs`
      );
      const auditLogRef = doc(auditLogsRef);
      batch.set(auditLogRef, {
        type: "PROMOTE_TEST_RESULT",
        tournamentId,
        before: "test",
        after: "official",
        actor: user.uid,
        actorName: user.email || "관리자",
        timestamp: serverTimestamp(),
        details: `테스트 조 추첨(${status.testGroups.groups.length}조) 및 대진표(${status.testMatches.length}경기) 공식 승격`,
        metadata: {
          testGroupsCount: status.testGroups.groups.length,
          testMatchesCount: status.testMatches.length,
          expectedMatchCount: status.expectedMatchCount,
        },
      });

      // 5. 운영 로그 기록
      const opsLogsRef = collection(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/opsLogs`
      );
      const opsLogRef = doc(opsLogsRef);
      batch.set(opsLogRef, {
        action: "테스트 결과 공식 승격",
        executor: user.uid,
        executorName: user.email || "관리자",
        timestamp: serverTimestamp(),
        details: `테스트 조 추첨(${status.testGroups.groups.length}조) 및 대진표(${status.testMatches.length}경기) 공식 승격`,
        metadata: {
          testGroupsCount: status.testGroups.groups.length,
          testMatchesCount: status.testMatches.length,
        },
      });

      // 6. 일괄 실행
      await batch.commit();

      // 7. 테스트 데이터 보관 (삭제하지 않음 - 감사/재검증용)
      // test_groups, test_matches, test_drawLogs는 그대로 유지
      // 승격 이력은 auditLogs에 기록되어 있으므로 추적 가능

      toast.success(
        `✅ 공식 승격 완료: ${status.testGroups.groups.length}조, ${status.testMatches.length}경기`
      );

      setShowConfirm(false);
      setConfirmedCheckbox(false);

      if (onSuccess) {
        onSuccess();
      }

      // 페이지 새로고침 (상태 반영)
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error("공식 승격 실패:", error);
      toast.error(`❌ 공식 승격 실패: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setPromoting(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>테스트 완료 조건 확인 중...</span>
      </div>
    );
  }

  if (!status) {
    return null;
  }

  // 테스트 결과가 없으면 표시하지 않음
  if (!status.hasTestGroups && !status.hasTestMatches) {
    return null;
  }

  // 테스트 완료 조건 미충족
  const canPromote =
    status.hasTestGroups &&
    status.hasTestMatches &&
    status.matchCountValid;

  return (
    <>
      {/* 1️⃣ 상태 표시 박스 */}
      <Alert className={`mb-4 ${canPromote ? "border-blue-200 bg-blue-50" : "border-amber-200 bg-amber-50"}`}>
        <AlertCircle className={`w-4 h-4 ${canPromote ? "text-blue-600" : "text-amber-600"}`} />
        <AlertTitle className={canPromote ? "text-blue-900" : "text-amber-900"}>
          🧪 현재 테스트 모드 결과가 존재합니다
        </AlertTitle>
        <AlertDescription className={`text-sm mt-2 space-y-1 ${canPromote ? "text-blue-800" : "text-amber-800"}`}>
          <div className="flex items-center gap-2">
            <span>조 추첨:</span>
            {status.hasTestGroups ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" /> 완료 ({status.testGroups?.groups?.length || 0}조)
              </span>
            ) : (
              <span className="text-red-600">❌ 미완료</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span>대진표 생성:</span>
            {status.hasTestMatches ? (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-3 h-3" /> 완료 ({status.actualMatchCount}경기)
              </span>
            ) : (
              <span className="text-red-600">❌ 미완료</span>
            )}
          </div>
          {status.hasTestMatches && (
            <div className="flex items-center gap-2">
              <span>경기 수 검증:</span>
              {status.matchCountValid ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="w-3 h-3" /> 정상 (예상: {status.expectedMatchCount}경기)
                </span>
              ) : (
                <span className="text-red-600">
                  ❌ 불일치 (예상: {status.expectedMatchCount}경기, 실제: {status.actualMatchCount}경기)
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-300">
            <span>운영 기록 반영:</span>
            <span className="text-red-600">❌ 미반영</span>
          </div>
        </AlertDescription>
      </Alert>

      {/* 2️⃣ 관리자 확인 체크 + 3️⃣ 공식 승격 버튼 */}
      {canPromote && (
        <div className="border rounded-lg p-4 bg-white">
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="confirm-promote"
              checked={confirmedCheckbox}
              onCheckedChange={(checked) => setConfirmedCheckbox(checked as boolean)}
            />
            <Label
              htmlFor="confirm-promote"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              테스트 결과를 확인했으며, 공식 기록으로 반영하는 것에 동의합니다.
            </Label>
          </div>
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={!confirmedCheckbox || promoting}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            {promoting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                승격 중...
              </>
            ) : (
              <>
                <ArrowRight className="w-4 h-4 mr-2" />
                공식 조 추첨 및 대진표 확정
              </>
            )}
          </Button>
        </div>
      )}

      {/* 4️⃣ 2차 확인 모달 */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-6 h-6" />
              ⚠️ 공식 기록 반영 확인
            </DialogTitle>
            <DialogDescription className="text-gray-700 mt-2">
              <p className="mb-4">
                이 작업은 <strong>되돌릴 수 없습니다</strong>.
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>테스트 조 추첨 결과 → 공식 조</span>
                </div>
                <div className="flex items-start gap-2">
                  <ArrowRight className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>테스트 대진표 → 공식 경기 일정</span>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                  <span>이후 수정 시 기록이 남습니다</span>
                </div>
              </div>
              <p className="mt-4 font-semibold">계속 진행하시겠습니까?</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirm(false);
              }}
              disabled={promoting}
            >
              취소
            </Button>
            <Button
              onClick={handlePromote}
              disabled={promoting}
              className="bg-red-600 hover:bg-red-700"
            >
              {promoting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  확정 중...
                </>
              ) : (
                "확정"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

