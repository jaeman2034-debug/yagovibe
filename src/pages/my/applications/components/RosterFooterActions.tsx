/**
 * 선수 명단 하단 액션 버튼
 * 
 * 🔥 v2: 결제 완료 후에만 명단 제출 가능
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Save, Send, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { usePayment } from "@/hooks/usePayment";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface RosterFooterActionsProps {
  rosterStatus: "draft" | "submitted" | "locked";
  playerCount: number;
  applicationId: string;
  associationId?: string;
  tournamentId?: string;
}

export function RosterFooterActions({
  rosterStatus,
  playerCount,
  applicationId,
  associationId,
  tournamentId,
}: RosterFooterActionsProps) {
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 🔥 v2: 결제 정보 조회
  const { payment, loading: paymentLoading } = usePayment(
    associationId,
    tournamentId,
    applicationId,
    { realtime: true }
  );

  // 🔥 v2: 결제 완료 여부 확인
  const isPaid = payment?.status === "paid";

  if (rosterStatus !== "draft") {
    return null;
  }

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      // TODO: rosterRepository.saveDraft 호출
      toast.success("임시 저장되었습니다.");
    } catch (error) {
      console.error("[선수 명단] 임시 저장 실패:", error);
      toast.error("임시 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    // 🔥 v2: 결제 완료 확인
    if (!isPaid) {
      toast.error("참가비 결제를 완료한 후 명단을 제출할 수 있습니다.");
      return;
    }

    if (playerCount === 0) {
      toast.error("최소 1명의 선수를 등록해야 합니다.");
      return;
    }

    if (!confirm("명단을 제출하시겠습니까? 제출 후에는 수정할 수 없습니다.")) {
      return;
    }

    if (!associationId || !tournamentId) {
      toast.error("대회 정보를 찾을 수 없습니다.");
      return;
    }

    try {
      setSubmitting(true);

      // 🔥 v2: application.rosterStatus를 "submitted"로 업데이트
      const appRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/applications/${applicationId}`
      );

      await updateDoc(appRef, {
        rosterStatus: "submitted",
        rosterSubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      toast.success("명단이 제출되었습니다.");
      
      // 페이지 새로고침 또는 상태 업데이트는 부모 컴포넌트에서 처리
      window.location.reload();
    } catch (error: any) {
      console.error("[선수 명단] 제출 실패:", error);
      toast.error(`명단 제출에 실패했습니다: ${error.message || "알 수 없는 오류"}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 max-w-2xl mx-auto">
      {/* 🔥 v2: 결제 미완료 안내 */}
      {!paymentLoading && !isPaid && (
        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-yellow-800">
            <CreditCard className="w-4 h-4" />
            <span>참가비 결제를 완료한 후 명단을 제출할 수 있습니다.</span>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={handleSaveDraft}
          className="flex-1"
          disabled={saving || submitting}
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? "저장 중..." : "임시 저장"}
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          disabled={
            playerCount === 0 ||
            saving ||
            submitting ||
            paymentLoading ||
            !isPaid
          }
        >
          <Send className="w-4 h-4 mr-2" />
          {submitting ? "제출 중..." : "명단 제출"}
        </Button>
      </div>
    </div>
  );
}
