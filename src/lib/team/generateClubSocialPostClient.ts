import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { AI_CONTENT_PROMPT_VERSION } from "@/lib/team/aiContentPromptVersions";

export type ClubSocialPostFactsForAi = {
  teamName: string;
  region?: string;
  foundedYear?: number;
  homeGrounds?: string[];
  introSummary?: string;
  teamValues?: string[];
  recruitMessage?: string;
  recommendFor?: string[];
  activityDay?: string;
};

export async function generateClubSocialPostCallable(payload: {
  teamId: string;
  facts: ClubSocialPostFactsForAi;
}): Promise<{ socialPostDraft: string; source?: string; promptVersion: string }> {
  const fn = httpsCallable<
    typeof payload,
    { ok?: boolean; socialPostDraft?: string; source?: string; promptVersion?: string }
  >(functions, "generateClubSocialPost");
  const res = await fn(payload);
  const draft =
    typeof res.data?.socialPostDraft === "string" ? res.data.socialPostDraft.trim() : "";
  if (!draft) {
    throw new Error("SNS 홍보문 초안이 비어 있습니다.");
  }
  return {
    socialPostDraft: draft,
    source: res.data?.source,
    promptVersion: res.data?.promptVersion?.trim() || AI_CONTENT_PROMPT_VERSION.socialPost,
  };
}
