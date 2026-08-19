import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { ClubIntroFactsForAi } from "@/lib/team/clubIntroFactsFingerprint";
import { AI_CONTENT_PROMPT_VERSION } from "@/lib/team/aiContentPromptVersions";

export async function generateClubCaptainMessageCallable(payload: {
  teamId: string;
  facts: ClubIntroFactsForAi;
}): Promise<{ captainMessageDraft: string; source?: string; promptVersion: string }> {
  const fn = httpsCallable<
    typeof payload,
    { ok?: boolean; captainMessageDraft?: string; source?: string; promptVersion?: string }
  >(functions, "generateClubCaptainMessage");
  const res = await fn(payload);
  const draft =
    typeof res.data?.captainMessageDraft === "string" ? res.data.captainMessageDraft.trim() : "";
  if (!draft) {
    throw new Error("회장 인사말 초안이 비어 있습니다.");
  }
  return {
    captainMessageDraft: draft,
    source: res.data?.source,
    promptVersion: res.data?.promptVersion?.trim() || AI_CONTENT_PROMPT_VERSION.captainMessage,
  };
}
