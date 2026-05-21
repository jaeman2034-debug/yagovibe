import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type {
  TeamBrandStyleId,
  TeamOnboardMainActivityId,
  TeamOnboardRecruitId,
  TeamOnboardVibeId,
} from "@/lib/team/teamBrandingConstants";

export type FinalizeTeamBrandingPayload = {
  teamId: string;
  sportType: string;
  brandStyle: TeamBrandStyleId;
  mainActivity: TeamOnboardMainActivityId;
  vibe: TeamOnboardVibeId;
  recruitStyle: TeamOnboardRecruitId;
  /** 온보딩 다이얼로그를 건너뛴 경우 true — 서버가 aiProfile.aiSkipped 저장 */
  aiSkipped?: boolean;
  /** 팀 소유자가 공개 페이지에서 AI 카피만 다시 생성할 때 true */
  forceRegenerate?: boolean;
};

export type FinalizeTeamBrandingResult = {
  ok?: boolean;
  source?: string;
  forceRegenerate?: boolean;
};

export async function finalizeTeamBrandingCallable(
  payload: FinalizeTeamBrandingPayload
): Promise<FinalizeTeamBrandingResult> {
  const fn = httpsCallable<FinalizeTeamBrandingPayload, FinalizeTeamBrandingResult>(
    functions,
    "finalizeTeamBranding"
  );
  const result = await fn(payload);
  return result.data ?? {};
}
