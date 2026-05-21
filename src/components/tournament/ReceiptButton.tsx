/**
 * 🔥 영수증 발급 버튼 (ADMIN 전용)
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileText, Download } from "lucide-react";
import { generateReceiptPdf, generateReceiptNo } from "@/utils/receiptPdf";
import { createReceipt } from "@/lib/tournament/applicationRepository";
import { auth } from "@/lib/firebase";
import { toast } from "sonner";
import type { TournamentApplication } from "@/types/tournament";

interface ReceiptButtonProps {
  associationId: string;
  tournamentId: string;
  application: TournamentApplication;
  onIssued?: () => void;
}

/**
 * 영수증 발급 버튼 컴포넌트
 */
export function ReceiptButton({
  associationId,
  tournamentId,
  application,
  onIssued,
}: ReceiptButtonProps) {
  const [issuing, setIssuing] = useState(false);

  const handleIssueReceipt = async () => {
    const user = auth.currentUser;
    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    if (!application.feeCalc) {
      toast.error("참가비 정보가 없습니다.");
      return;
    }

    setIssuing(true);
    try {
      const receiptNo = generateReceiptNo();
      const totalFee = application.feeCalc.totalFee;
      const paidTotal = application.paidTotal || 0;

      // 결제 방법 요약 (간단 버전)
      const methodSummary = "계좌이체"; // TODO: 실제 결제 기록에서 집계

      // Receipt 문서 생성
      await createReceipt({
        associationId,
        tournamentId,
        applicationId: application.id,
        receiptNo,
        issuedBy: user.uid,
        payerName: application.teamName,
        teamCount: application.teamCount,
        totalFee,
        paidTotal,
        methodSummary,
        note: null,
      });

      // PDF 생성 및 다운로드
      generateReceiptPdf({
        receiptNo,
        issuedAt: new Date(),
        payerName: application.teamName,
        teamCount: application.teamCount,
        totalFee,
        paidTotal,
        methodSummary,
        note: null,
      });

      toast.success("영수증이 발급되었습니다.");
      onIssued?.();
    } catch (error: any) {
      console.error("영수증 발급 오류:", error);
      toast.error(error.message || "영수증 발급 중 오류가 발생했습니다.");
    } finally {
      setIssuing(false);
    }
  };

  // 결제 완료 또는 부분 납부 시에만 발급 가능
  const canIssue =
    application.paymentStatus === "PAID" ||
    application.paymentStatus === "PARTIAL";

  if (!canIssue) {
    return null;
  }

  return (
    <Button
      onClick={handleIssueReceipt}
      disabled={issuing}
      variant="outline"
      size="sm"
    >
      {issuing ? (
        <>
          <FileText className="w-4 h-4 mr-2 animate-pulse" />
          발급 중...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          영수증 PDF 발급
        </>
      )}
    </Button>
  );
}

