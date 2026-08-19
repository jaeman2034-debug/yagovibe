import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { toast } from "sonner";
import { CreatePageContextBadges } from "@/components/create/CreatePageContextBadges";
import { CreateFormContainer } from "@/components/create/CreateFormContainer";
import { getSportLabel, normalizeSportId } from "@/constants/sports";
import {
  ACADEMY_AGE_GROUP_OPTIONS,
  ACADEMY_TRAINING_LEVEL_OPTIONS,
  mapAcademyAgeGroupToServer,
  mapAcademyTrainingLevelToServer,
  type AcademyAgeGroupUiId,
  type AcademyTrainingLevelUiId,
} from "@/lib/team/academyCreateMeta";
import { functions } from "@/lib/firebase";
import type { CreateTeamRequest } from "./createTeamShared";
import { executeCreateTeam, handleCreateTeamError } from "./executeCreateTeam";

export default function AcademyCreateFlow() {
  const navigate = useNavigate();
  const { sport, type } = useParams<{ sport?: string; type?: string }>();
  const sportType = (sport ?? type) as string | undefined;
  const { user } = useAuth();

  const [academyName, setAcademyName] = useState("");
  const [region, setRegion] = useState("");
  const [ageGroupUi, setAgeGroupUi] = useState<AcademyAgeGroupUiId>("elementary_upper");
  const [trainingLevelUi, setTrainingLevelUi] = useState<AcademyTrainingLevelUiId>("growth");
  const [description, setDescription] = useState("");
  const [recruitOpen, setRecruitOpen] = useState(true);
  const [linkSelfAsMainCoach, setLinkSelfAsMainCoach] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!sportType) {
    return <div>잘못된 경로입니다.</div>;
  }

  const buildPayload = (): CreateTeamRequest => ({
    name: academyName.trim(),
    region: region.trim(),
    sportType,
    type: "academy",
    associationId: null,
    academyMeta: {
      ageGroup: mapAcademyAgeGroupToServer(ageGroupUi),
      trainingLevel: mapAcademyTrainingLevelToServer(trainingLevelUi),
      recruitOpen,
      description: description.trim(),
      mainCoachUserId: linkSelfAsMainCoach && user?.uid ? user.uid : null,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      toast.error("로그인이 필요합니다.");
      navigate("/login");
      return;
    }
    if (!academyName.trim()) {
      toast.error("아카데미 이름을 입력해주세요.");
      return;
    }
    if (!region.trim()) {
      toast.error("훈련 지역을 입력해주세요.");
      return;
    }
    if (!functions) {
      toast.error("Firebase Functions가 초기화되지 않았습니다.");
      return;
    }

    setLoading(true);
    try {
      await executeCreateTeam({
        payload: buildPayload(),
        teamNameForRecovery: academyName.trim(),
        sportType,
        uid: user.uid,
        isAnonymous: Boolean(user.isAnonymous),
        onNavigateTeam: (teamId, afterQs) =>
          navigate(`/team/${encodeURIComponent(teamId)}/public?${afterQs}`, { replace: true }),
        onNavigateMyTeams: () => navigate("/my-teams", { replace: true }),
        onNavigateLogin: (from) => navigate("/login", { state: { from } }),
      });
    } catch (error) {
      await handleCreateTeamError(error, {
        teamNameForRecovery: academyName.trim(),
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

  const sportLabel = getSportLabel(normalizeSportId(sportType) ?? sportType);

  return (
    <div className="min-h-screen bg-gray-50 pb-24 dark:bg-gray-900">
      <CreateFormContainer>
        <CreatePageContextBadges sportSlug={sportType} kind="team" />

        <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 p-4 dark:border-violet-800 dark:bg-violet-950/30">
          <p className="text-sm font-medium text-violet-900 dark:text-violet-100">유소년 아카데미 만들기</p>
          <p className="mt-1 text-xs text-violet-700 dark:text-violet-300">
            훈련·연령 중심으로 등록합니다. 동호회용 AI 팀 빌더는 사용하지 않습니다.
          </p>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-800">
            <span className="text-gray-500 dark:text-gray-400">종목</span>
            <p className="font-medium text-gray-900 dark:text-white">{sportLabel}</p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              아카데미 이름
            </label>
            <input
              type="text"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="예: 노원 유나이티드 아카데미"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              훈련 지역
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="예: 서울 노원구"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              주 연령대
            </label>
            <select
              value={ageGroupUi}
              onChange={(e) => setAgeGroupUi(e.target.value as AcademyAgeGroupUiId)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {ACADEMY_AGE_GROUP_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              훈련 단계
            </label>
            <select
              value={trainingLevelUi}
              onChange={(e) => setTrainingLevelUi(e.target.value as AcademyTrainingLevelUiId)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            >
              {ACADEMY_TRAINING_LEVEL_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              checked={recruitOpen}
              onChange={(e) => setRecruitOpen(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-violet-600"
            />
            신규 선수 모집 공개
          </label>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              checked={linkSelfAsMainCoach}
              onChange={(e) => setLinkSelfAsMainCoach(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-violet-600"
            />
            나를 대표 코치로 연결
          </label>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
              소개 (선택)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
              placeholder="훈련 방향, 시설, 운영 시간 등"
            />
          </div>

          <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:justify-between">
            <button
              type="button"
              onClick={() =>
                navigate(`/sports/${encodeURIComponent(sportType)}/team/create?mode=non-member`)
              }
              className="text-sm text-gray-600 underline dark:text-gray-400"
            >
              일반 팀 만들기
            </button>
            <button
              type="submit"
              disabled={loading || !academyName.trim() || !region.trim()}
              className="w-full rounded-lg bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50 sm:w-auto sm:min-w-[200px] sm:px-8"
            >
              {loading ? "생성 중..." : "아카데미 만들기"}
            </button>
          </div>
        </form>
      </CreateFormContainer>
    </div>
  );
}
