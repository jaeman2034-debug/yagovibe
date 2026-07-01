/**
 * Vision RC1 — `/teams/:teamId/validation-console`
 * Pilot 팀에서 MP4 업로드 → visionMatchIndex 연결 → Play 탭 Vision 분석 실행
 */

import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "@/context/AuthProvider";
import { db } from "@/lib/firebase";
import { canViewAIGrowthValidationConsole } from "@/lib/academy/aiGrowthValidationSelectors";
import { normalizeMemberRole } from "@/lib/team/academyMemberRole";
import { teamPlayEntryPath } from "@/lib/team/teamPlayRoutes";
import AIGrowthValidationConsole from "@/pages/team/AIGrowthValidationConsole";

export default function TeamGrowthValidationPage() {
  const { teamId } = useParams<{ teamId: string }>();
  const [searchParams] = useSearchParams();
  const matchId = searchParams.get("matchId")?.trim() ?? "";
  const navigate = useNavigate();
  const { user } = useAuth();

  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [teamName, setTeamName] = useState<string | undefined>();

  useEffect(() => {
    if (!teamId || !user?.uid) {
      navigate("/me");
      return;
    }

    let cancelled = false;

    async function checkAccess() {
      try {
        const teamSnap = await getDoc(doc(db, "teams", teamId));
        if (!teamSnap.exists()) {
          navigate("/me");
          return;
        }

        const teamData = teamSnap.data();
        if (!cancelled) setTeamName(typeof teamData.name === "string" ? teamData.name : undefined);

        const isOwner = teamData.ownerUid === user.uid;
        const memberSnap = await getDoc(doc(db, "teams", teamId, "members", user.uid));
        const role = memberSnap.exists()
          ? normalizeMemberRole(String(memberSnap.data()?.role ?? ""))
          : undefined;

        const canView = isOwner || canViewAIGrowthValidationConsole(role);
        if (!cancelled) setAllowed(canView);
        if (!canView && !cancelled) navigate(teamPlayEntryPath(teamId));
      } catch (error) {
        console.error("[TeamGrowthValidationPage] access check failed", error);
        if (!cancelled) navigate(teamPlayEntryPath(teamId));
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    void checkAccess();
    return () => {
      cancelled = true;
    };
  }, [teamId, user?.uid, navigate]);

  if (!teamId) return null;

  if (checking) {
    return (
      <div className="mx-auto max-w-[1000px] px-4 py-10 text-center text-sm text-slate-500">
        Validation Console 권한 확인 중…
      </div>
    );
  }

  if (!allowed) return null;

  const playBackPath = teamPlayEntryPath(teamId, matchId ? { matchId } : undefined);

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-slate-100">
      <header className="border-b border-violet-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            to={playBackPath}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-violet-800 hover:text-violet-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Play 탭으로 돌아가기
          </Link>
          <p className="text-[10px] text-violet-700 sm:text-xs">
            MP4 업로드 · Vision 경기 연결
          </p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1000px] px-3 py-4 sm:px-6 sm:py-6">
        <div className="mb-4 rounded-xl border border-violet-200 bg-white/80 px-4 py-3">
          <h1 className="text-base font-black text-violet-950">AI Growth Validation Console</h1>
          <p className="mt-1 text-xs text-violet-800">
            종료 경기 영상을 업로드하면 Play 탭 Vision Coach에서 분석을 실행할 수 있습니다.
          </p>
          {matchId ? (
            <p className="mt-2 text-[11px] text-violet-700">
              연결 경기: <code className="font-mono text-[10px]">{matchId}</code>
            </p>
          ) : null}
        </div>
        <AIGrowthValidationConsole
          teamId={teamId}
          teamName={teamName}
          initialMatchId={matchId || undefined}
        />
      </main>
    </div>
  );
}
