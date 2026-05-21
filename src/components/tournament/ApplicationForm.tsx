/**
 * 🔥 참가 신청 폼 (팀 수 입력 + 참가비 자동 계산)
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calcEntryFee } from "@/lib/notice/feeCalc";
import type { FeePolicy } from "@/components/notice/FeeSummaryBox";
import { Calculator } from "lucide-react";

interface ApplicationFormProps {
  associationId: string;
  tournamentId: string;
  teamId: string;
  teamName: string;
  feePolicy: FeePolicy;
  onSubmit: (teamCount: number) => Promise<void>;
}

/**
 * 참가 신청 폼 컴포넌트
 */
export function ApplicationForm({
  associationId,
  tournamentId,
  teamId,
  teamName,
  feePolicy,
  onSubmit,
}: ApplicationFormProps) {
  const [teamCount, setTeamCount] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // 참가비 계산
  const validTeamCount = Math.max(1, teamCount);
  const feeCalc = calcEntryFee(validTeamCount, feePolicy);

  const handleSubmit = async () => {
    if (validTeamCount < 1) {
      alert("팀 수는 1팀 이상이어야 합니다.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(validTeamCount);
    } catch (error: any) {
      console.error("신청 오류:", error);
      alert(error.message || "신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>참가 신청</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          팀: {teamName}
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamCount">참가 팀 수</Label>
          <div className="flex items-center gap-2">
            <Input
              id="teamCount"
              type="number"
              min={1}
              value={teamCount}
              onChange={(e) => {
                const value = Number(e.target.value);
                setTeamCount(isNaN(value) || value < 1 ? 1 : value);
              }}
              className="w-24"
            />
            <span className="text-sm">팀</span>
          </div>
        </div>

        {/* 참가비 계산 결과 */}
        <div className="border rounded-md p-3 bg-muted space-y-1">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4" />
            <div className="font-semibold text-sm">참가비 산정</div>
          </div>
          <div className="text-sm">
            {validTeamCount}팀 참가 시:
            <br />
            {feePolicy.baseFee.toLocaleString()}원
            {feeCalc.extraTeams > 0 && (
              <>
                {" + "}
                ({feeCalc.extraTeams} × {feePolicy.extraFeePerTeam.toLocaleString()}원)
              </>
            )}
            {" = "}
            <span className="font-semibold">
              {feeCalc.total.toLocaleString()}원
            </span>
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full"
        >
          {submitting ? "신청 중..." : "참가 신청"}
        </Button>
      </CardContent>
    </Card>
  );
}

