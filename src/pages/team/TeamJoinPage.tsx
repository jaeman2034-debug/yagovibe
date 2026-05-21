/**
 * 팀 가입 신청 — `/teams/:teamId/join`
 * (Rules상 members 직접 생성 불가 → {@link TeamJoinFlow} / teamJoinRequests)
 */

import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TeamJoinFlow } from "@/pages/join/TeamJoinFlow";
import { setPendingInviteTeamId } from "@/lib/team/pendingInviteTeam";

export default function TeamJoinPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const raw = teamId?.trim() ?? "";
  useEffect(() => {
    if (raw) setPendingInviteTeamId(raw);
  }, [raw]);

  if (!raw) {
    return (
      <div className="min-h-screen bg-gray-50 px-3 py-10">
        <Card className="mx-auto w-full max-w-none md:max-w-3xl">
          <CardHeader>
            <CardTitle>팀 정보가 없습니다</CardTitle>
          </CardHeader>
          <CardContent>
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
      <TeamJoinFlow teamIdRaw={raw} />
    </div>
  );
}
