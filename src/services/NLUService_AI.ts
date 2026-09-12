// 천생모드: 로컬 패턴 + routeVoiceCommand(voice_map) fallback — Migration 1B

import { resolveVoiceMapIntent } from "@/lib/voice/resolveVoiceMapIntent";
import { callRouteVoiceCommandForMap } from "@/lib/voice/routeVoiceCommandClient";

type NLUResult = { intent: string; confidence: number; meta?: Record<string, unknown> };

const tagByVoiceIntent: Record<string, string> = {
  지도열기: "지도_이동",
  위치이동: "현재위치",
  근처_편의점: "근처_편의점",
  근처_축구장: "근처_축구장",
  ops_안내: "운영_안내",
};

function mapToTag(intent: string, keyword: string): string {
  if (intent === "근처검색") {
    if (/축구|경기장|구장/.test(keyword)) return "근처_축구장";
    if (/편의점/.test(keyword)) return "근처_편의점";
    return "근처_편의점";
  }
  return tagByVoiceIntent[intent] || (intent === "기타" ? "기타" : intent);
}

export async function analyze(text: string): Promise<NLUResult> {
  const resolved = await resolveVoiceMapIntent(text, {
    callServer: callRouteVoiceCommandForMap,
  });
  if (!resolved.handled) {
    return { intent: "기타", confidence: 0.0 };
  }
  const tag = mapToTag(resolved.intent, resolved.keyword);
  console.log(`🎯 NLU(${resolved.source}):`, tag);
  return { intent: tag, confidence: resolved.source === "server" ? 0.85 : 1.0 };
}
export async function analyzeCommand(text: string): Promise<{ intent: string; target: string }> {
  const result = await analyze(text);
  let target = "";
  if (result.intent.includes("축구장")) target = "축구장";
  else if (result.intent.includes("편의점")) target = "편의점";
  return { intent: result.intent, target };
}
