import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import type { VoiceLogsAgg } from "@/lib/admin/voiceLogsAgg";

export const ADMIN_VOICE_LOGS_INSIGHT_CALLABLE = "generateAdminVoiceLogsInsight" as const;

export type AdminVoiceLogsInsight = {
  summary: string;
  causes: string[];
  anomalies: string[];
  recommendations: string[];
};

export async function generateAdminVoiceLogsInsightCallable(
  aggregation: VoiceLogsAgg
): Promise<AdminVoiceLogsInsight> {
  const fn = httpsCallable<{ aggregation: VoiceLogsAgg }, AdminVoiceLogsInsight>(
    functions,
    ADMIN_VOICE_LOGS_INSIGHT_CALLABLE
  );
  const { data } = await fn({ aggregation });
  if (!data?.summary) {
    throw new Error("Invalid insight response");
  }
  return {
    summary: data.summary,
    causes: data.causes || [],
    anomalies: data.anomalies || [],
    recommendations: data.recommendations || [],
  };
}
