import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { AI_CONTENT_PROMPT_VERSION } from "@/lib/team/aiContentPromptVersions";

export type ClubRecruitFactsForAi = {
  teamName: string;
  foundedYear?: number;
  foundedDate?: string;
  homeGrounds?: string[];
  region?: string;
  introSummary?: string;
  teamValues?: string[];
  activityDay?: string;
  ageRange?: string;
  contactMethod?: string;
};

export async function generateClubRecruitMessageCallable(payload: {
  teamId: string;
  facts: ClubRecruitFactsForAi;
}): Promise<{ recruitMessageDraft: string; source?: string; promptVersion: string }> {
  const fn = httpsCallable<
    typeof payload,
    { ok?: boolean; recruitMessageDraft?: string; source?: string; promptVersion?: string }
  >(functions, "generateClubRecruitMessage");
  const res = await fn(payload);
  const draft =
    typeof res.data?.recruitMessageDraft === "string" ? res.data.recruitMessageDraft.trim() : "";
  if (!draft) {
    throw new Error("회원 모집 글 초안이 비어 있습니다.");
  }
  return {
    recruitMessageDraft: draft,
    source: res.data?.source,
    promptVersion: res.data?.promptVersion?.trim() || AI_CONTENT_PROMPT_VERSION.recruitMessage,
  };
}
