/**
 * 🔥 ApplicationCard - 참가 신청 카드 (관리자용)
 * 
 * 신청 카드 최소 구성:
 * - 팀 이름
 * - 팀장 이름
 * - 상태: pending / approved / rejected
 * - [승인] [반려] (pending일 때만)
 */

import { useState } from "react";
import { Card } from "@/components/ui/cards/Card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Users } from "lucide-react";
import type { TournamentApplication } from "@/types/tournament";
import { approveApplication, rejectApplication } from "@/lib/tournament/applicationStatus";

interface ApplicationCardProps {
  application: TournamentApplication;
  associationId: string;
  tournamentId: string;
  onStatusChanged?: () => void;
}

export function ApplicationCard({
  application,
  associationId,
  tournamentId,
  onStatusChanged,
}: ApplicationCardProps) {
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(null);

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = status?.toUpperCase();
    switch (normalizedStatus) {
      case "APPROVED":
        return <Badge className="bg-green-500 text-xs">✅ 승인</Badge>;
      case "REJECTED":
        return <Badge variant="destructive" className="text-xs">❌ 반려</Badge>;
      case "PENDING":
      default:
        return <Badge variant="secondary" className="text-xs">⏳ 대기</Badge>;
    }
  };

  const handleApprove = async () => {
    if (!confirm(`정말 ${application.teamName}의 참가 신청을 승인하시겠습니까?`)) {
      return;
    }

    setProcessing("approve");
    try {
      await approveApplication(associationId, tournamentId, application.id);
      onStatusChanged?.();
    } catch (error: any) {
      console.error("[ApplicationCard] 승인 실패:", error);
      alert(error.message || "승인에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!confirm(`정말 ${application.teamName}의 참가 신청을 반려하시겠습니까?`)) {
      return;
    }

    setProcessing("reject");
    try {
      await rejectApplication(associationId, tournamentId, application.id);
      onStatusChanged?.();
    } catch (error: any) {
      console.error("[ApplicationCard] 반려 실패:", error);
      alert(error.message || "반려에 실패했습니다.");
    } finally {
      setProcessing(null);
    }
  };

  const isPending = application.status?.toUpperCase() === "PENDING";

  return (
    <Card variant="info" className="hover:shadow-md transition-shadow">
      {/* 팀 정보 */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {application.teamName}
          </h3>
          {getStatusBadge(application.status)}
        </div>
        {application.managerName && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4" />
            <span>팀장: {application.managerName}</span>
          </div>
        )}
        {application.phone && (
          <p className="text-sm text-gray-600 mt-1">연락처: {application.phone}</p>
        )}
      </div>

      {/* 승인/반려 버튼 (pending일 때만) */}
      {isPending && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleApprove}
            disabled={processing !== null}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            size="sm"
          >
            <Check className="w-4 h-4 mr-1" />
            {processing === "approve" ? "처리 중..." : "승인"}
          </Button>
          <Button
            onClick={handleReject}
            disabled={processing !== null}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            size="sm"
          >
            <X className="w-4 h-4 mr-1" />
            {processing === "reject" ? "처리 중..." : "반려"}
          </Button>
        </div>
      )}
    </Card>
  );
}
