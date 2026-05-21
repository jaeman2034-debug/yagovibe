import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { CLOUD_CALLABLE_DEFAULT } from "@/config/cloudCallableNames";
import type { PlayFeedbackSubmitSummary } from "@/types/playMatchFeedback";
import type { MatchFeedbackMood } from "@/types/teamPlayerStats";

type Payload = {
  teamId: string;
  matchId: string;
  memberId: string;
  mood: MatchFeedbackMood;
};

type Response = { summary: PlayFeedbackSubmitSummary };

export async function callSubmitPlayMatchFeedbackRemote(payload: Payload): Promise<PlayFeedbackSubmitSummary> {
  const fn = httpsCallable<Payload, Response>(functions, CLOUD_CALLABLE_DEFAULT.submitPlayMatchFeedback);
  const { data } = await fn(payload);
  if (!data?.summary) {
    throw new Error("서버 응답이 올바르지 않습니다.");
  }
  return data.summary;
}
