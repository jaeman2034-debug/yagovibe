import { httpsCallable } from "firebase/functions";
import { auth, functions } from "@/lib/firebase";
import { initializeTeamAccountingCallable } from "@/lib/team/initializeTeamAccountingCallable";
import { finalizeTeamBrandingCallable } from "@/lib/team/finalizeTeamBrandingClient";
import { DEFAULT_TEAM_ONBOARDING, type TeamBrandStyleId } from "@/lib/team/teamBrandingConstants";
import type { TeamAiOnboardingAnswers } from "@/components/team/create/TeamAiOnboardingDialog";
import { track } from "@/lib/analytics";
import { toast } from "sonner";
import {
  isValidTeamId,
  parseSlugFromCallableResult,
  parseTeamIdFromCallableResult,
  resolveTeamPublicUrlKey,
} from "@/lib/team/createTeamResultParse";
import {
  buildTeamHomeAfterCreateQuery,
  extractTeamIdFromError,
  resolveTeamIdFromMembershipMirror,
  resolveTeamIdFromOwnedTeams,
  type CreateTeamRequest,
} from "./createTeamShared";

export type ExecuteCreateTeamOptions = {
  payload: CreateTeamRequest;
  teamNameForRecovery: string;
  sportType: string;
  uid: string;
  isAnonymous: boolean;
  /** Normal flow: AI branding after create. Academy: skip. */
  runAiBranding?: {
    brandStyle: TeamBrandStyleId;
    onboardingAnswers: TeamAiOnboardingAnswers;
    aiSkipped?: boolean;
  };
  /** First arg is public URL key: slug when present, else teamId (Sprint 1-4). */
  onNavigateTeam: (publicUrlKey: string, afterQs: string) => void;
  onNavigateMyTeams: () => void;
  onNavigateLogin: (fromPath: string) => void;
};

export async function executeCreateTeam(opts: ExecuteCreateTeamOptions): Promise<void> {
  const {
    payload,
    teamNameForRecovery,
    sportType,
    uid,
    isAnonymous,
    runAiBranding,
    onNavigateTeam,
    onNavigateMyTeams,
    onNavigateLogin,
  } = opts;

  if (!functions) {
    toast.error("Firebase Functions가 초기화되지 않았습니다.");
    return;
  }

  await auth.authStateReady();
  const sdkUser = auth.currentUser;
  if (!sdkUser?.uid) {
    toast.error("로그인 세션이 만료되었습니다. 새로고침 후 다시 시도해주세요.");
    onNavigateLogin(window.location.pathname);
    return;
  }

  const createTeamCallable = httpsCallable<CreateTeamRequest, { teamId: string; slug?: string }>(
    functions,
    "createTeam"
  );
  const result = await createTeamCallable(payload);

  let teamId = parseTeamIdFromCallableResult(result);
  const slug = parseSlugFromCallableResult(result);
  const message =
    result?.data && typeof result.data === "object" && "message" in result.data
      ? String((result.data as { message?: unknown }).message ?? "")
      : "";

  if (!isValidTeamId(teamId)) {
    teamId = await resolveTeamIdFromMembershipMirror(uid, teamNameForRecovery);
  }
  if (!isValidTeamId(teamId)) {
    teamId = await resolveTeamIdFromOwnedTeams(uid, teamNameForRecovery);
  }

  if (!isValidTeamId(teamId)) {
    const err = new Error(message || "팀 생성에 실패했습니다.") as Error & { code?: string };
    err.code = "CLIENT_NO_TEAM_ID_AFTER_CREATE";
    throw err;
  }

  // Sprint 1-5: always finalize branding (Academy uses youth defaults when omitted)
  const branding =
    runAiBranding ??
    ({
      brandStyle: (payload.type === "academy" ? "youth" : DEFAULT_TEAM_ONBOARDING.brandStyle) as TeamBrandStyleId,
      onboardingAnswers: {
        mainActivity: DEFAULT_TEAM_ONBOARDING.mainActivity,
        vibe: DEFAULT_TEAM_ONBOARDING.vibe,
        recruitStyle: DEFAULT_TEAM_ONBOARDING.recruitStyle,
      },
      aiSkipped: true,
    } as NonNullable<ExecuteCreateTeamOptions["runAiBranding"]>);

  let brandingOk = false;
  const brandingToast = toast.loading(
    branding.aiSkipped ? "팀 소개를 준비하고 있어요…" : "AI가 팀 소개를 만들고 있어요…"
  );
  try {
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    await finalizeTeamBrandingCallable({
      teamId,
      sportType,
      brandStyle: branding.brandStyle,
      mainActivity: branding.onboardingAnswers.mainActivity,
      vibe: branding.onboardingAnswers.vibe,
      recruitStyle: branding.onboardingAnswers.recruitStyle,
      aiSkipped: branding.aiSkipped === true,
    });
    brandingOk = true;
    toast.dismiss(brandingToast);
    void track(branding.aiSkipped ? "ai_skipped" : "ai_used", {
      team_id: teamId,
      sport_type: sportType,
      brand_style: branding.brandStyle,
    });
  } catch (brandErr) {
    toast.dismiss(brandingToast);
    console.warn("[executeCreateTeam] finalizeTeamBranding", brandErr);
    // createTeam already seeded minimal aiProfile — public home stays non-blank
    toast.warning("팀 소개 자동 생성에 실패했어요. 기본 소개으로 공개 홈을 열게요.");
  }

  void track("team_created", {
    team_id: teamId,
    team_slug: slug || undefined,
    sport_type: sportType,
    team_type: payload.type,
    branding_ok: brandingOk,
  });

  try {
    await toast.promise(initializeTeamAccountingCallable({ teamId }), {
      loading: "회비 시스템 초기화 중…",
      success: (r) =>
        r.skipped === "fee_already_exists"
          ? "이번 달 회비가 이미 있어 건너뛰었습니다."
          : "회비·납부 초기 설정이 완료되었습니다.",
      error: "회비 자동 설정에 실패했습니다. 팀 관리 → 회비에서 회차를 만들어 주세요.",
    });
  } catch (initErr) {
    console.error("[executeCreateTeam] initializeTeamAccountingCallable", initErr);
  }

  toast.success(payload.type === "academy" ? "아카데미가 생성되었습니다! 🎉" : "팀이 생성되었습니다! 🎉");
  const afterQs = buildTeamHomeAfterCreateQuery(isAnonymous);
  // Sprint 1-4: land on slug public URL when available; teamId remains SoT for CF calls above
  onNavigateTeam(resolveTeamPublicUrlKey(teamId, slug), afterQs);
}

export async function handleCreateTeamError(
  error: unknown,
  ctx: {
    teamNameForRecovery: string;
    uid: string | undefined;
    isAnonymous: boolean;
    onNavigateTeam: (teamId: string, afterQs: string) => void;
    onNavigateMyTeams: () => void;
    onNavigateLogin: (fromPath: string) => void;
  }
): Promise<boolean> {
  const err = error as { code?: string; message?: string; details?: { teamId?: string }; data?: { teamId?: string }; teamId?: string };

  if (err?.code === "functions/unauthenticated") {
    toast.error("인증 세션이 연결되지 않았습니다. 새로고침 후 다시 로그인해주세요.");
    ctx.onNavigateLogin(window.location.pathname);
    return true;
  }

  const isNetworkError =
    err?.message?.includes("Failed to fetch") ||
    err?.message?.includes("ERR_FAILED") ||
    err?.message?.includes("NetworkError") ||
    err?.code === "unavailable" ||
    err?.code === "deadline-exceeded";

  if (isNetworkError) {
    toast.error("네트워크 연결에 실패했습니다. Firebase Console에서 Functions 상태를 확인해주세요.");
    return true;
  }

  if (err?.code === "functions/not-found" || err?.message?.includes("not found")) {
    toast.error("서버 함수를 찾을 수 없습니다. createTeam 배포 상태를 확인해주세요.");
    return true;
  }

  if (err?.code === "functions/internal") {
    let recoveryId =
      err?.details?.teamId || err?.data?.teamId || err?.teamId || extractTeamIdFromError(error);
    if (!isValidTeamId(recoveryId) && ctx.uid) {
      recoveryId = await resolveTeamIdFromMembershipMirror(ctx.uid, ctx.teamNameForRecovery);
    }
    if (!isValidTeamId(recoveryId) && ctx.uid) {
      recoveryId = await resolveTeamIdFromOwnedTeams(ctx.uid, ctx.teamNameForRecovery);
    }
    if (isValidTeamId(recoveryId)) {
      const afterQs = buildTeamHomeAfterCreateQuery(ctx.isAnonymous);
      ctx.onNavigateTeam(recoveryId, afterQs);
      return true;
    }
    toast.error("팀이 생성됐을 수 있어요. 내 팀 목록에서 확인해 주세요.");
    ctx.onNavigateMyTeams();
    return true;
  }

  if (err?.code === "CLIENT_NO_TEAM_ID_AFTER_CREATE") {
    toast.error("응답에서 팀 ID를 확인하지 못했어요. 내 팀에서 방금 만든 팀을 눌러 들어가 주세요.");
    ctx.onNavigateMyTeams();
    return true;
  }

  toast.error("팀 생성 중 문제가 발생했어요. 다시 시도해주세요.");
  return true;
}
