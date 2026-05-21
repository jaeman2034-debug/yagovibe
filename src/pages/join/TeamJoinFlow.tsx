/**
 * 팀 가입 요청 UI — `/join?teamId=` · `/teams/:teamId/join` 공통
 * 멤버 문서 직접 쓰기는 Rules상 불가 → teamJoinRequests만 생성
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { fetchTeamByIdOrSlug } from "@/services/teamService";
import {
  applicantProfileFromAuthUser,
  createTeamJoinRequest,
  type TeamJoinAs,
} from "@/lib/team/teamJoinRequest";
import { logTeamJoin } from "@/lib/activityLog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UserCircle, Users } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { markTeamPlayEntryFromAppNav, teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";

export function TeamJoinFlow({ teamIdRaw }: { teamIdRaw: string }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const rawTeamId = teamIdRaw.trim();

  const [loadingTeam, setLoadingTeam] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resolvedTeamId, setResolvedTeamId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState<string>("");
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [joinAs, setJoinAs] = useState<TeamJoinAs>("player");

  const load = useCallback(async () => {
    if (!rawTeamId || !user?.uid) {
      setLoadingTeam(false);
      return;
    }
    setLoadingTeam(true);
    try {
      const team = await fetchTeamByIdOrSlug(rawTeamId);
      if (!team?.id) {
        setResolvedTeamId(null);
        setTeamName("");
        return;
      }
      setResolvedTeamId(team.id);
      setTeamName(String((team as { name?: string }).name || "팀"));

      const memberSnap = await getDoc(doc(db, "teams", team.id, "members", user.uid));
      setAlreadyMember(memberSnap.exists());
    } catch (e) {
      console.error("[TeamJoinFlow] 팀 로드 실패:", e);
      toast.error("팀 정보를 불러오지 못했습니다.");
      setResolvedTeamId(null);
    } finally {
      setLoadingTeam(false);
    }
  }, [rawTeamId, user?.uid]);

  useEffect(() => {
    void load();
  }, [load]);

  const onSubmit = async () => {
    if (!user?.uid || !resolvedTeamId) return;
    if (alreadyMember) {
      navigate(`/team/${resolvedTeamId}`);
      return;
    }
    setSubmitting(true);
    try {
      await createTeamJoinRequest(resolvedTeamId, user.uid, {
        joinAs,
        ...applicantProfileFromAuthUser(user),
      });
      logTeamJoin(resolvedTeamId, teamName);
      toast.success("가입 요청을 보냈습니다. 팀에서 승인하면 알림으로 안내됩니다.");
      navigate("/my-teams");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "가입 요청에 실패했습니다.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingTeam) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!resolvedTeamId) {
    return (
      <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl py-8">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>팀을 찾을 수 없습니다</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">링크가 잘못되었거나 삭제된 팀일 수 있습니다.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate("/my-teams")}>
              내 팀으로 이동
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-none md:max-w-3xl space-y-4 px-4 py-8">
      <div className="text-center sm:text-left">
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">팀 가입 신청</h1>
        <p className="mt-1 text-sm text-gray-600 sm:text-base">
          <span className="font-medium text-gray-800">{teamName}</span>에 참여합니다.
        </p>
      </div>

      {alreadyMember ? (
        <Card>
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-gray-700">이미 이 팀의 멤버예요. 바로 플레이 화면으로 갈 수 있어요.</p>
            <Button
              className="w-full bg-violet-600 font-bold hover:bg-violet-700"
              onClick={() => {
                markTeamPlayEntryFromAppNav();
                navigate(teamPlayEntryPath(resolvedTeamId));
              }}
            >
              🚀 팀 플레이 시작하기
            </Button>
            <Button variant="outline" className="w-full" onClick={() => navigate(`/team/${encodeURIComponent(resolvedTeamId)}`)}>
              팀 홈 · 채팅 · 일정
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">신청 구분</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 pt-0">
              <button
                type="button"
                onClick={() => setJoinAs("player")}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  joinAs === "player"
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <UserCircle className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">선수</div>
                  <p className="mt-1 text-sm text-gray-600">
                    팀 훈련·경기에 참여하는 선수로 가입 요청합니다.
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setJoinAs("parent")}
                className={cn(
                  "flex items-start gap-3 rounded-lg border p-4 text-left transition-colors",
                  joinAs === "parent"
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-gray-200 hover:bg-gray-50"
                )}
              >
                <Users className="mt-0.5 h-6 w-6 shrink-0 text-blue-600" />
                <div>
                  <div className="font-semibold text-gray-900">학부모</div>
                  <p className="mt-1 text-sm text-gray-600">
                    자녀 연동·안내는 팀 승인 후 코치진이 진행합니다. 우선 학부모 신청으로 접수됩니다.
                  </p>
                </div>
              </button>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-3">
            <Button
              className="h-12 w-full bg-blue-600 hover:bg-blue-700"
              disabled={submitting}
              onClick={() => void onSubmit()}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  전송 중…
                </>
              ) : (
                "가입 요청 보내기"
              )}
            </Button>
            <Button variant="outline" className="h-12 w-full" disabled={submitting} onClick={() => navigate(-1)}>
              취소
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
