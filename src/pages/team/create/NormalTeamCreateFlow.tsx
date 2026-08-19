import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useAssociations } from "@/hooks/useAssociations";
import { toast } from "sonner";
import { CreatePageContextBadges } from "@/components/create/CreatePageContextBadges";
import { CreateFormContainer } from "@/components/create/CreateFormContainer";
import {
  TeamAiOnboardingDialog,
  type TeamAiOnboardingAnswers,
} from "@/components/team/create/TeamAiOnboardingDialog";
import {
  TEAM_BRAND_STYLES,
  DEFAULT_TEAM_ONBOARDING,
  type TeamBrandStyleId,
} from "@/lib/team/teamBrandingConstants";
import { cn } from "@/lib/utils";
import { getSportLabel, normalizeSportId } from "@/constants/sports";
import { functions } from "@/lib/firebase";
import type { CreateTeamRequest } from "./createTeamShared";
import { executeCreateTeam, handleCreateTeamError } from "./executeCreateTeam";

type NormalTeamCreateFlowProps = {
  mode: "non-member" | "member-request";
};

export default function NormalTeamCreateFlow({ mode }: NormalTeamCreateFlowProps) {
  const navigate = useNavigate();
  const { sport, type } = useParams<{ sport?: string; type?: string }>();
  const sportType = (sport ?? type) as string | undefined;
  const { user } = useAuth();
  const { associations, loading: associationsLoading, error: associationsError } = useAssociations();

  const [teamName, setTeamName] = useState("");
  const [region, setRegion] = useState("");
  const [selectedAssociationId, setSelectedAssociationId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [brandStyle, setBrandStyle] = useState<TeamBrandStyleId>("social");
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const isMemberRequest = mode === "member-request";

  if (!sportType) {
    return <div>잘못된 경로입니다.</div>;
  }

  if (associationsError && isMemberRequest) {
    console.warn("⚠️ [NormalTeamCreateFlow] 협회 목록 조회 실패", associationsError);
  }

  const buildPayload = (): CreateTeamRequest => ({
    name: teamName.trim(),
    region: region.trim(),
    sportType,
    type: "normal",
    associationId: isMemberRequest && selectedAssociationId ? selectedAssociationId : null,
  });

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (!teamName.trim()) {
      toast.error("팀 이름을 입력해주세요.");
      return;
    }
    if (!region.trim()) {
      toast.error("활동 지역을 입력해주세요.");
      return;
    }
    if (isMemberRequest && !selectedAssociationId) {
      toast.error("협회를 선택해주세요.");
      return;
    }
    if (!functions) {
      toast.error("Firebase Functions가 초기화되지 않았습니다.");
      return;
    }
    setOnboardingOpen(true);
  };

  const runCreation = async (onboardingAnswers: TeamAiOnboardingAnswers, opts?: { aiSkipped?: boolean }) => {
    setOnboardingOpen(false);
    if (!user?.uid) return;
    setLoading(true);
    try {
      if (isMemberRequest) {
        alert("협회 회원팀 신청 기능은 준비 중입니다. 현재는 팀 생성 후 협회 연동은 별도로 안내드릴 예정입니다.");
      }
      await executeCreateTeam({
        payload: buildPayload(),
        teamNameForRecovery: teamName.trim(),
        sportType,
        uid: user.uid,
        isAnonymous: Boolean(user.isAnonymous),
        runAiBranding: {
          brandStyle,
          onboardingAnswers,
          aiSkipped: opts?.aiSkipped,
        },
        onNavigateTeam: (teamId, afterQs) => {
          setShowToast(true);
          navigate(`/team/${encodeURIComponent(teamId)}/public?${afterQs}`, { replace: true });
        },
        onNavigateMyTeams: () => navigate("/my-teams", { replace: true }),
        onNavigateLogin: (from) => navigate("/login", { state: { from } }),
      });
    } catch (error) {
      await handleCreateTeamError(error, {
        teamNameForRecovery: teamName.trim(),
        uid: user.uid,
        isAnonymous: Boolean(user.isAnonymous),
        onNavigateTeam: (teamId, afterQs) =>
          navigate(`/team/${encodeURIComponent(teamId)}/public?${afterQs}`, { replace: true }),
        onNavigateMyTeams: () => navigate("/my-teams", { replace: true }),
        onNavigateLogin: (from) => navigate("/login", { state: { from } }),
      });
    } finally {
      setLoading(false);
    }
  };

  const submitLabel = isMemberRequest ? "팀 신청하고 시작하기" : "✨ AI로 팀 만들기";

  const goAcademyCreate = () => {
    const qs = new URLSearchParams({ mode: "non-member", teamKind: "academy" });
    navigate(`/sports/${encodeURIComponent(sportType)}/team/create?${qs.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
      <CreateFormContainer>
        <CreatePageContextBadges sportSlug={sportType} kind="team" />

        <div className="mb-6">
          {user?.isAnonymous ? (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-50">
              <p className="font-medium">지금은 게스트(익명)로 시작해요</p>
              <p className="mt-1 text-xs leading-relaxed opacity-95">
                팀장도 팀 멤버 목록에 포함되는 것이 정상이에요. 팀을 만든 뒤에는 이메일 로그인·회원가입으로 계정만 연결해 주세요.
              </p>
            </div>
          ) : null}
          {isMemberRequest ? (
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                협회 회원 팀으로 신청을 진행합니다
              </p>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">비회원 팀으로 시작합니다</p>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                (협회 소속은 나중에 신청할 수 있습니다)
              </p>
            </div>
          )}
        </div>

        <form id="team-create-form" onSubmit={handleFormSubmit} className="space-y-8">
          <div className="space-y-3">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">팀 종류</span>
            <div className="grid grid-cols-2 gap-3">
              <div
                className="rounded-xl border-2 border-blue-500 bg-blue-50 p-4 text-left text-sm font-medium text-blue-900 dark:border-blue-400 dark:bg-blue-950/30 dark:text-blue-100"
              >
                <span className="flex flex-wrap items-center gap-2">
                  일반 팀
                  <span className="rounded bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                    추천
                  </span>
                </span>
                <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                  동호회·매칭·모집
                </span>
              </div>
              <button
                type="button"
                onClick={goAcademyCreate}
                className="rounded-xl border-2 border-gray-200 bg-white p-4 text-left text-sm font-medium text-gray-800 transition hover:border-violet-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              >
                유소년 아카데미
                <span className="mt-1 block text-xs font-normal text-gray-500 dark:text-gray-400">
                  별도 등록 화면
                </span>
              </button>
            </div>
          </div>

          {isMemberRequest && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                협회 선택
              </label>
              {associationsLoading ? (
                <div className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 animate-pulse">
                  협회 목록 불러오는 중...
                </div>
              ) : (
                <select
                  value={selectedAssociationId}
                  onChange={(e) => setSelectedAssociationId(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  required
                >
                  <option value="">협회를 선택하세요</option>
                  {associations.map((assoc) => (
                    <option key={assoc.id} value={assoc.id}>
                      {assoc.name} {assoc.region && `(${assoc.region})`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              팀 이름
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="예: 야고 FC, 노원 유나이티드"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              활동 지역
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              placeholder="예: 서울 노원구"
              required
            />
          </div>

          {teamName.trim() && region.trim() ? (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-violet-50/70 px-3 py-2.5 text-xs text-indigo-950 dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-violet-950/30 dark:text-indigo-50">
              <span className="font-semibold">추천 한 줄 · </span>
              {region.trim()} 기반 {getSportLabel(normalizeSportId(sportType) ?? sportType)} 팀 「{teamName.trim()}」
            </div>
          ) : null}

          <div className="space-y-2">
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              팀 스타일 <span className="text-xs font-normal text-gray-500">(공개 팀 홈 AI 카피용)</span>
            </span>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {TEAM_BRAND_STYLES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setBrandStyle(s.id)}
                  className={cn(
                    "rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition",
                    brandStyle === s.id
                      ? "border-violet-500 bg-violet-50 text-violet-950 dark:border-violet-400 dark:bg-violet-950/40 dark:text-violet-50"
                      : "border-gray-200 bg-white text-gray-800 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
                  )}
                >
                  <span className="mr-1" aria-hidden>
                    {s.emoji}
                  </span>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-2 md:justify-end">
            <button
              type="submit"
              disabled={
                loading ||
                (isMemberRequest && associationsLoading) ||
                !teamName.trim() ||
                !region.trim() ||
                (isMemberRequest && !selectedAssociationId)
              }
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 md:w-auto md:min-w-[240px] md:px-10"
            >
              {loading ? (isMemberRequest ? "신청 중..." : "생성 중...") : submitLabel}
            </button>
          </div>
        </form>

        {showToast && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg">
            팀이 생성되었습니다!
          </div>
        )}
      </CreateFormContainer>

      <TeamAiOnboardingDialog
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        loading={loading}
        onConfirm={(a) => void runCreation(a)}
        onSkip={() =>
          void runCreation(
            {
              mainActivity: DEFAULT_TEAM_ONBOARDING.mainActivity,
              vibe: DEFAULT_TEAM_ONBOARDING.vibe,
              recruitStyle: DEFAULT_TEAM_ONBOARDING.recruitStyle,
            },
            { aiSkipped: true }
          )
        }
      />
    </div>
  );
}
