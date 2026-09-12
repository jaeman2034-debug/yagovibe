/**
 * Voice map NLU — local fast path + routeVoiceCommand (voice_map) server fallback.
 * No browser OpenAI.
 */

export type VoiceMapIntentResult = {
  intent: string;
  keyword: string;
  handled: boolean;
  source: "local" | "server";
};

export function matchVoiceMapIntentLocally(text: string): VoiceMapIntentResult {
  const trimmed = text.trim();
  let intent = "미확인";
  let keyword = "";

  if (/지도|맵/.test(trimmed) && /열|보|띄|이동|띄워/.test(trimmed)) intent = "지도열기";
  else if (/현재 위치|내 위치|지금 위치|위치 이동/.test(trimmed)) intent = "위치이동";
  else if (/홈|처음|메인/.test(trimmed)) intent = "홈이동";
  else if (/근처|주변|가까운/.test(trimmed)) {
    intent = "근처검색";
    keyword =
      trimmed.match(/편의점|식당|카페|약국|병원|마트|공원|주유소|축구장|경기장|구장/)?.[0] ?? "편의점";
  } else if (/경기장|구장/.test(trimmed) && /찾|검|어디|알려/.test(trimmed)) {
    intent = "근처검색";
    keyword = trimmed.match(/[\w가-힣]+(?:FC|fc)?\s*경기장|[\w가-힣]+구장|경기장|구장/)?.[0] ?? "경기장";
  } else if (/협회|회의|대관|회비|정산/.test(trimmed)) {
    intent = "ops_안내";
  } else if (/편의점|축구장/.test(trimmed) && /검|찾|부탁/.test(trimmed)) {
    intent = "근처검색";
    keyword = trimmed.match(/편의점|축구장/)?.[0] ?? "편의점";
  }

  return {
    intent,
    keyword,
    handled: intent !== "미확인",
    source: "local",
  };
}

export type RouteVoiceMapServerResult = {
  intent?: string;
  keyword?: string;
};

export async function resolveVoiceMapIntent(
  text: string,
  options?: {
    callServer?: (utterance: string) => Promise<RouteVoiceMapServerResult | null>;
  }
): Promise<VoiceMapIntentResult> {
  const local = matchVoiceMapIntentLocally(text);
  if (local.handled) return local;

  if (options?.callServer) {
    try {
      const server = await options.callServer(text.trim());
      const intent = (server?.intent || "미확인").trim();
      const keyword = (server?.keyword || "").trim();
      if (intent && intent !== "미확인" && intent !== "알수없음") {
        return {
          intent,
          keyword,
          handled: true,
          source: "server",
        };
      }
    } catch {
      // fall through
    }
  }

  return local;
}
