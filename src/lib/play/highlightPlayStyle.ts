import type { PlayerSimImpact } from "@/lib/play/simulation";

export type HighlightPlayStyleKey = "pass" | "attack" | "dribble" | "defense" | "balanced";

export const HIGHLIGHT_PLAY_STYLE_LABEL_KO: Record<HighlightPlayStyleKey, string> = {
  pass: "패스형",
  attack: "공격형",
  dribble: "돌파형",
  defense: "수비형",
  balanced: "올라운드형",
};

function isKey(s: string): s is HighlightPlayStyleKey {
  return s === "pass" || s === "attack" || s === "dribble" || s === "defense" || s === "balanced";
}

export function parseHighlightPlayStyleKey(raw: unknown): HighlightPlayStyleKey | null {
  if (typeof raw !== "string") return null;
  const k = raw.trim() as HighlightPlayStyleKey;
  return isKey(k) ? k : null;
}

/** 하이라이트 선수 이벤트 로그 기반 성향 (한 경기 스냅샷) */
export function highlightPlayStyleFromImpact(imp: PlayerSimImpact): {
  key: HighlightPlayStyleKey;
  labelKo: string;
} {
  const nPass = imp.passOk + imp.passFail;
  const nDrib = imp.dribbleOk + imp.dribbleFail;
  const nShot = imp.shots;
  const nDef = imp.blocks + imp.saves;
  const total = nPass + nDrib + nShot + nDef || 1;

  const passShare = nPass / total;
  const dribShare = nDrib / total;
  const shotShare = nShot / total;
  const defShare = nDef / total;

  if (nDef >= 2 && defShare >= 0.28 && shotShare <= 0.32) {
    return { key: "defense", labelKo: HIGHLIGHT_PLAY_STYLE_LABEL_KO.defense };
  }
  if (imp.goals >= 1 || shotShare >= 0.26) {
    return { key: "attack", labelKo: HIGHLIGHT_PLAY_STYLE_LABEL_KO.attack };
  }
  if (passShare >= 0.44 && passShare >= dribShare + 0.06 && passShare >= shotShare + 0.06) {
    return { key: "pass", labelKo: HIGHLIGHT_PLAY_STYLE_LABEL_KO.pass };
  }
  if (dribShare >= 0.28 && dribShare >= shotShare) {
    return { key: "dribble", labelKo: HIGHLIGHT_PLAY_STYLE_LABEL_KO.dribble };
  }
  return { key: "balanced", labelKo: HIGHLIGHT_PLAY_STYLE_LABEL_KO.balanced };
}

/** 크로스 경기 성향 바뀜 표시 (동일 이름이면 ─) */
export function styleShiftSuffix(before: HighlightPlayStyleKey, after: HighlightPlayStyleKey): string {
  if (before === after) return " ─";
  if (after === "attack" && before !== "attack") return " 🔼";
  if (before === "attack" && after !== "attack") return " 🔽";
  return " ⚡";
}
