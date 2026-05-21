/**
 * 🔥 팀원 등록 제어 패널 (관리자 전용, 천재 모드)
 * 
 * 기능:
 * - 팀원 등록 기간 시작 버튼
 * - 팀원 등록 잠금 버튼 (조 추첨 전)
 * - 개별 팀 잠금/해제
 */

import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Lock, Unlock, Users } from "lucide-react";
import type { Tournament } from "@/types/tournament";

interface RosterControlPanelProps {
  associationId: string;
  tournamentId: string;
  tournament: Tournament;
  onUpdate?: () => void;
}

export function RosterControlPanel({
  associationId,
  tournamentId,
  tournament,
  onUpdate,
}: RosterControlPanelProps) {
  const [opening, setOpening] = useState(false);
  const [locking, setLocking] = useState(false);

  const currentPhase = tournament.tournamentPhase;
  const isRosterOpen = currentPhase === "ROSTER_OPEN";
  const isRosterLocked = currentPhase === "ROSTER_LOCKED";

  // 🔥 팀원 등록 기간 시작
  const handleOpenRoster = async () => {
    if (!confirm("팀원 등록 기간을 시작하시겠습니까?\n\n팀 대표들이 팀원을 등록할 수 있게 됩니다.")) {
      return;
    }

    setOpening(true);
    const loadingToastId = toast.loading("팀원 등록 기간 시작 중...");

    try {
      const functions = getFunctions(undefined, "asia-northeast3");
      const openRosterFn = httpsCallable(functions, "openRosterPeriodCallable");

      await openRosterFn({
        associationId,
        tournamentId,
      });

      toast.success("팀원 등록 기간이 시작되었습니다.", {
        id: loadingToastId,
      });
      onUpdate?.();
    } catch (error: any) {
      console.error("[팀원 등록 기간 시작 오류]", error);
      const errorMessage =
        error?.message || error?.details?.message || "팀원 등록 기간 시작에 실패했습니다.";
      toast.error(errorMessage, {
        id: loadingToastId,
      });
    } finally {
      setOpening(false);
    }
  };

  // 🔥 팀원 등록 잠금
  const handleLockRoster = async () => {
    if (
      !confirm(
        "팀원 등록을 잠그시겠습니까?\n\n모든 팀의 팀원 등록이 불가능해지며, 조 추첨을 진행할 수 있습니다.\n\n이 작업은 되돌릴 수 없습니다."
      )
    ) {
      return;
    }

    setLocking(true);
    const loadingToastId = toast.loading("팀원 등록 잠금 중...");

    try {
      const functions = getFunctions(undefined, "asia-northeast3");
      const lockRosterFn = httpsCallable(functions, "lockRosterPeriodCallable");

      const result = await lockRosterFn({
        associationId,
        tournamentId,
      });

      const data = result.data as any;
      toast.success(
        data?.message || `팀원 등록이 잠겼습니다. (${data?.lockedTeamsCount || 0}개 팀)`,
        {
          id: loadingToastId,
        }
      );
      onUpdate?.();
    } catch (error: any) {
      console.error("[팀원 등록 잠금 오류]", error);
      const errorMessage =
        error?.message || error?.details?.message || "팀원 등록 잠금에 실패했습니다.";
      toast.error(errorMessage, {
        id: loadingToastId,
      });
    } finally {
      setLocking(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          팀원 등록 제어
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 현재 상태 */}
        <div className="space-y-2">
          <div className="text-sm font-medium text-gray-700">현재 상태</div>
          <div className="flex items-center gap-2">
            {isRosterOpen && (
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  ✅ 팀원 등록 기간 진행 중
                </AlertDescription>
              </Alert>
            )}
            {isRosterLocked && (
              <Alert className="bg-red-50 border-red-200">
                <AlertDescription className="text-red-800">
                  🔒 팀원 등록 잠금됨 (조 추첨 가능)
                </AlertDescription>
              </Alert>
            )}
            {!isRosterOpen && !isRosterLocked && (
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertDescription className="text-yellow-800">
                  ⏳ 팀원 등록 기간 미시작
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex gap-2">
          {!isRosterOpen && !isRosterLocked && (
            <Button
              onClick={handleOpenRoster}
              disabled={opening}
              className="flex-1"
            >
              <Unlock className="w-4 h-4 mr-2" />
              {opening ? "시작 중..." : "팀원 등록 기간 시작"}
            </Button>
          )}

          {isRosterOpen && (
            <Button
              onClick={handleLockRoster}
              disabled={locking}
              variant="destructive"
              className="flex-1"
            >
              <Lock className="w-4 h-4 mr-2" />
              {locking ? "잠금 중..." : "팀원 등록 잠금 (조 추첨 전)"}
            </Button>
          )}

          {isRosterLocked && (
            <div className="text-sm text-gray-600">
              팀원 등록이 잠겨 있습니다. 조 추첨을 진행할 수 있습니다.
            </div>
          )}
        </div>

        {/* 안내 메시지 */}
        <div className="text-xs text-gray-500 space-y-1">
          <div>• 팀원 등록 기간 시작: 팀 대표들이 팀원을 등록할 수 있습니다.</div>
          <div>• 팀원 등록 잠금: 모든 팀의 등록이 잠기며, 조 추첨을 진행할 수 있습니다.</div>
          <div>• 잠금 후에는 팀원 추가/삭제가 불가능합니다.</div>
        </div>
      </CardContent>
    </Card>
  );
}
