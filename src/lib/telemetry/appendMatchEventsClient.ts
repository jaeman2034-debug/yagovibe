import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { MatchEventEnvelope } from "./matchEventTypes";

export type AppendMatchEventsRequest = {
  sessionId: string;
  events: MatchEventEnvelope[];
};

export type AppendMatchEventsResponse = {
  ok: boolean;
  appended: number;
  matchId: string;
};

export async function callAppendMatchEvents(
  request: AppendMatchEventsRequest,
): Promise<AppendMatchEventsResponse> {
  const sessionId = request.sessionId?.trim() ?? "";
  if (!sessionId) {
    throw new Error("sessionId가 필요합니다.");
  }
  if (!Array.isArray(request.events) || request.events.length === 0) {
    return { ok: true, appended: 0, matchId: "" };
  }

  const callable = httpsCallable<AppendMatchEventsRequest, AppendMatchEventsResponse>(
    functions,
    "appendMatchEvents",
  );
  try {
    const res = await callable({ sessionId, events: request.events });
    console.info("[TELEMETRY] appendMatchEvents response", res.data);
    return res.data;
  } catch (e) {
    const code =
      e && typeof e === "object" && "code" in e ? String((e as { code: string }).code) : "";
    const message = e instanceof Error ? e.message : String(e);
    console.warn("[TELEMETRY] appendMatchEvents callable failed", code, message);
    throw e;
  }
}
