import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { AI_CONTENT_PROMPT_VERSION } from "@/lib/team/aiContentPromptVersions";

export type GenerateClubIntroSummaryFacts = {
  teamName: string;
  chairmanName?: string;
  foundedYear?: number;
  foundedDate?: string;
  memberCountLabel?: string;
  homeGrounds?: string[];
  ageRange?: string;
  activityDay?: string;
  teamValues?: string[];
  achievements?: string[];
};

export async function generateClubIntroSummaryCallable(payload: {
  teamId: string;
  facts: GenerateClubIntroSummaryFacts;
}): Promise<{ introSummaryDraft: string; source?: string; promptVersion: string }> {
  const fn = httpsCallable<
    typeof payload,
    { ok?: boolean; introSummaryDraft?: string; source?: string; promptVersion?: string }
  >(functions, "generateClubIntroSummary");
  const res = await fn(payload);
  const draft = typeof res.data?.introSummaryDraft === "string" ? res.data.introSummaryDraft.trim() : "";
  if (!draft) {
    throw new Error("소개 초안이 비어 있습니다.");
  }
  return {
    introSummaryDraft: draft,
    source: res.data?.source,
    promptVersion: res.data?.promptVersion?.trim() || AI_CONTENT_PROMPT_VERSION.clubIntro,
  };
}
