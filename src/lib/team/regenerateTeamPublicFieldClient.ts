import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";

export type RegenerateTeamPublicFieldPayload = {
  teamId: string;
  field: "description" | "highlights" | "recruitMessage" | "captainMessage";
};

export type RegenerateTeamPublicFieldResult = {
  ok?: boolean;
  field?: string;
  source?: "openai" | "template";
};

export async function regenerateTeamPublicFieldCallable(
  payload: RegenerateTeamPublicFieldPayload
): Promise<RegenerateTeamPublicFieldResult> {
  const fn = httpsCallable<RegenerateTeamPublicFieldPayload, RegenerateTeamPublicFieldResult>(
    functions,
    "regenerateTeamPublicField"
  );
  const result = await fn(payload);
  return result.data ?? {};
}
