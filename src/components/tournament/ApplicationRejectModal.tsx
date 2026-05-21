/**
 * 🔥 참가 신청 반려 모달
 * 
 * 반려 전 확인 및 반려 처리
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getFunctions, httpsCallable } from "firebase/functions";
import type { TournamentApplication } from "@/types/tournament";

interface ApplicationRejectModalProps {
  application: TournamentApplication;
  associationId: string;
  tournamentId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ApplicationRejectModal({
  application,
  associationId,
  tournamentId,
  open,
  onClose,
  onSuccess,
}: ApplicationRejectModalProps) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  const handleReject = async () => {
    if (!reason.trim()) {
      toast.error("반려 사유를 입력해주세요.");
      return;
    }

    setRejecting(true);
    const loadingToastId = toast.loading("반려 처리 중입니다...");

    try {
      // 🔥 Cloud Function 호출 (프론트에서 Firestore 직접 업데이트 금지)
      // ⭐⭐⭐ 중요: region 명시 필수 (Callable 함수는 region이 다르면 호출 실패)
      const functions = getFunctions(undefined, "asia-northeast3");
      const updateFn = httpsCallable(functions, "updateApplicationStatusCallable");

      await updateFn({
        associationId,
        tournamentId,
        applicationId: application.id,
        status: "REJECTED",
        reason: reason.trim(),
      });

      toast.success("참가 신청이 반려되었습니다. 팀장에게 알림이 발송되었습니다.", {
        id: loadingToastId,
      });

      onSuccess();
      onClose();
      setReason("");
    } catch (error: any) {
      console.error("반려 오류:", error);
      
      const errorCode = error?.code;
      const errorMessage = error?.message || error?.details?.message;
      
      // ⭐⭐⭐ 핵심: aborted / failed-precondition은 "이미 처리됨"으로 처리 (정상 상태)
      if (errorCode === "functions/aborted" || errorCode === "aborted") {
        toast.info("이미 처리 중이거나 완료된 신청입니다. 목록을 새로고침해주세요.", {
          id: loadingToastId,
          duration: 4000,
        });
        onSuccess(); // 목록 새로고침
        onClose();
        setRejecting(false);
        return;
      }
      
      if (errorCode === "failed-precondition") {
        const isAlreadyProcessed = errorMessage?.includes("이미") || 
                                   errorMessage?.includes("already");
        
        if (isAlreadyProcessed) {
          toast.info(errorMessage || "이미 처리된 상태입니다. 목록을 새로고침해주세요.", {
            id: loadingToastId,
            duration: 4000,
          });
          onSuccess(); // 목록 새로고침
          onClose();
          setRejecting(false);
          return;
        }
      }
      
      // 그 외의 에러는 기존대로 처리
      const displayMessage = errorMessage || "알 수 없는 오류";
      toast.error(`반려 실패: ${displayMessage}`, {
        id: loadingToastId,
        duration: 5000,
      });
    } finally {
      setRejecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>참가 신청 반려</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">팀명:</span>
              <span className="text-sm font-medium">{application.teamName}</span>
            </div>
            {application.managerName && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">신청자:</span>
                <span className="text-sm font-medium">{application.managerName}</span>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="reject-reason" className="text-sm font-medium">
              반려 사유 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reject-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="반려 사유를 입력해주세요."
              className="mt-1 min-h-[100px]"
            />
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-xs text-red-700">
              반려된 신청은 복구할 수 없습니다. 신중히 결정해주세요.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={rejecting}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={rejecting || !reason.trim()}
          >
            {rejecting ? "반려 중..." : "반려하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
