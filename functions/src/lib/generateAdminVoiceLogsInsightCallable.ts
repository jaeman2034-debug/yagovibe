/**
 * MIGRATION 1B — Admin voice_logs narrative insight (aggregation in, JSON out).
 * No Firestore write · no new insight SoT.
 */
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { getOpenAIClient, resolveOpenAIApiKey } from "./openaiClient";

const REGION = "asia-northeast3";

export type AdminVoiceLogsAggInput = {
  date?: string;
  total?: number;
  intents?: Record<string, number>;
  keywords?: Record<string, number>;
  hours?: Record<string, number>;
};

export type AdminVoiceLogsInsightResult = {
  summary: string;
  causes: string[];
  anomalies: string[];
  recommendations: string[];
};

function parseInsightJson(raw: string): AdminVoiceLogsInsightResult {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) {
    throw new Error("Invalid insight JSON");
  }
  const parsed = JSON.parse(jsonText) as Partial<AdminVoiceLogsInsightResult>;
  return {
    summary: String(parsed.summary || "").trim() || "요약을 생성하지 못했습니다.",
    causes: Array.isArray(parsed.causes) ? parsed.causes.map(String) : [],
    anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies.map(String) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
  };
}

export const generateAdminVoiceLogsInsight = onCall(
  { region: REGION, maxInstances: 10, secrets: ["OPENAI_API_KEY"] },
  async (req) => {
    const aggregation = req.data?.aggregation as AdminVoiceLogsAggInput | undefined;
    if (!aggregation || typeof aggregation !== "object") {
      throw new HttpsError("invalid-argument", "aggregation required");
    }

    const apiKey = resolveOpenAIApiKey();
    if (!apiKey) {
      throw new HttpsError("failed-precondition", "OPENAI_API_KEY not configured");
    }

    const prompt = `You are YAGO sports ops analyst. Using ONLY this aggregated voice command telemetry (no invented metrics), respond in Korean.

Aggregation JSON:
${JSON.stringify(aggregation).slice(0, 8000)}

Return ONLY valid JSON:
{
  "summary": "2-3 sentence executive summary",
  "causes": ["possible cause 1", "cause 2"],
  "anomalies": ["anomaly or risk 1"],
  "recommendations": ["action 1", "action 2"]
}`;

    try {
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 900,
      });
      const content = completion.choices[0]?.message?.content?.trim();
      if (!content) {
        throw new HttpsError("internal", "Empty AI response");
      }
      return parseInsightJson(content);
    } catch (err) {
      logger.error("generateAdminVoiceLogsInsight failed", err);
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", "Insight generation failed");
    }
  }
);
