export type VoiceCommand =
  | { type: "navigate"; target: string }
  | { type: "search"; keyword: string }
  | { type: "unknown"; text: string };

export function parseCommand(text: string): VoiceCommand {
  const t = text.trim();

  // 페이지 이동 명령
  if (/홈(으로)?\s*가(자|줘)/.test(t)) return { type: "navigate", target: "/" };
  if (/회원(가입)?\s*열어?줘/.test(t)) return { type: "navigate", target: "/signup" };
  if (/팀\s*블로그/.test(t)) return { type: "navigate", target: "/teamblog" };
  if (/관리자|대시보드/.test(t)) return { type: "navigate", target: "/admin" };
  
  // ✅ 지도 페이지 이동 명령 추가
  if (/(지도\s*페이지?|지도\s*검색|음성\s*지도|맵\s*페이지?)/.test(t)) {
    return { type: "navigate", target: "/voice-map" };
  }

  // 지도 검색 명령
  if (/(검색|찾아줘|보여줘)/.test(t)) {
    const kw = t.replace(/(검색|찾아줘|보여줘)/g, "").trim();
    return { type: "search", keyword: kw || "축구장" };
  }

  return { type: "unknown", text: t };
}
