import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

function parseInsightJson(raw: string) {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0];
  if (!jsonText) throw new Error("Invalid insight JSON");
  const parsed = JSON.parse(jsonText) as Record<string, unknown>;
  return {
    summary: String(parsed.summary || "").trim(),
    causes: Array.isArray(parsed.causes) ? parsed.causes.map(String) : [],
    anomalies: Array.isArray(parsed.anomalies) ? parsed.anomalies.map(String) : [],
    recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.map(String) : [],
  };
}

describe("MIGRATION 1B admin voice_logs insight schema", () => {
  it("parses server JSON contract fields", () => {
    const sample = `{
      "summary": "오늘 voice 명령이 지도 검색에 집중되었습니다.",
      "causes": ["피크 시간대 모바일 사용"],
      "anomalies": ["미확인 intent 비율 상승"],
      "recommendations": ["지도 UX 점검", "운영 공지 보강"]
    }`;
    const parsed = parseInsightJson(sample);
    expect(parsed.summary.length).toBeGreaterThan(0);
    expect(parsed.causes.length).toBe(1);
    expect(parsed.anomalies.length).toBe(1);
    expect(parsed.recommendations.length).toBe(2);
  });

  it("callable module declares generateAdminVoiceLogsInsight export", () => {
    const root = process.cwd();
    const src = readFileSync(
      path.join(root, "functions/src/lib/generateAdminVoiceLogsInsightCallable.ts"),
      "utf8"
    );
    expect(src).toContain("export const generateAdminVoiceLogsInsight");
    expect(src).not.toMatch(/collection\(/);
  });
});
