/**
 * 팀 가입 신청 — `/join?teamId=...`
 * 공개 랜딩(/teams/:id) CTA → 로그인 후 본 페이지 → teamJoinRequests pending
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamJoinFlow } from "./TeamJoinFlow";
import { setPendingInviteTeamId } from "@/lib/team/pendingInviteTeam";

export default function JoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rawTeamId = searchParams.get("teamId")?.trim() || "";
  useEffect(() => {
    if (rawTeamId) setPendingInviteTeamId(rawTeamId);
  }, [rawTeamId]);

  if (!rawTeamId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
        <Card className="w-full max-w-none md:max-w-3xl">
          <CardHeader>
            <CardTitle>팀을 선택해 주세요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              공개 팀 페이지의 「선수 신청하기」를 통해 들어오면 자동으로 팀이 지정됩니다.
            </p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/my-teams")}>
              내 팀으로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TeamJoinFlow teamIdRaw={rawTeamId} />
    </div>
  );
}
