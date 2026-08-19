import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { AI_CONTENT_PROMPT_VERSION } from "@/lib/team/aiContentPromptVersions";

export type ClubEventMessageFactsForAi = {
  teamName: string;
  region?: string;
  foundedYear?: number;
  homeGrounds?: string[];
  introSummary?: string;
  teamValues?: string[];
  eventName?: string;
  eventPurpose?: string;
  eventSchedule?: string;
  eventPlace?: string;
};

export async function generateClubEventMessageCallable(payload: {
  teamId: string;
  facts: ClubEventMessageFactsForAi;
}): Promise<{ eventMessageDraft: string; source?: string; promptVersion: string }> {
  const fn = httpsCallable<
    typeof payload,
    { ok?: boolean; eventMessageDraft?: string; source?: string; promptVersion?: string }
  >(functions, "generateClubEventMessage");
  const res = await fn(payload);
  const draft =
    typeof res.data?.eventMessageDraft === "string" ? res.data.eventMessageDraft.trim() : "";
  if (!draft) {
    throw new Error("행사 소개 멘트 초안이 비어 있습니다.");
  }
  return {
    eventMessageDraft: draft,
    source: res.data?.source,
    promptVersion: res.data?.promptVersion?.trim() || AI_CONTENT_PROMPT_VERSION.eventMessage,
  };
}
