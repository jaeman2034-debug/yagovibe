/**
 * GEV v1 — 15종 Growth Event Vocabulary
 * @see docs/GEV_V1_15_EVENTS.md
 */

export const GEV_V1_VERSION = "v1.0.0";

export const GEV_V1_EVENTS = [
  { key: "SPACE_CREATION", labelKo: "공간 창출", legacyCore: "SCAN" as const },
  { key: "SUPPORT_ANGLE", labelKo: "지원각 제공", legacyCore: "SCAN" as const },
  { key: "PENETRATION", labelKo: "침투", legacyCore: "QUICK_RECOVERY" as const },
  { key: "PRESSING", labelKo: "압박", legacyCore: "PRESS_RESIST" as const },
  { key: "PRESS_ESCAPE", labelKo: "압박 회피", legacyCore: "PRESS_RESIST" as const },
  { key: "TRANSITION", labelKo: "전환", legacyCore: "QUICK_RECOVERY" as const },
  { key: "COVER", labelKo: "커버", legacyCore: "PRESS_RESIST" as const },
  { key: "OVERLAP", labelKo: "오버래핑", legacyCore: "SCAN" as const },
  { key: "UNDERLAP", labelKo: "언더래핑", legacyCore: "SCAN" as const },
  { key: "FORWARD_PASS", labelKo: "전진 패스", legacyCore: "SCAN" as const },
  { key: "BACK_SUPPORT", labelKo: "후방 지원", legacyCore: "SCAN" as const },
  { key: "BALL_PROTECTION", labelKo: "볼 보호", legacyCore: "PRESS_RESIST" as const },
  { key: "LINE_BREAKING", labelKo: "라인 브레이킹", legacyCore: "QUICK_RECOVERY" as const },
  { key: "SECOND_BALL", labelKo: "세컨드 볼 대응", legacyCore: "QUICK_RECOVERY" as const },
  { key: "COMMUNICATION", labelKo: "커뮤니케이션", legacyCore: "SCAN" as const },
] as const;

export type GevV1EventKey = (typeof GEV_V1_EVENTS)[number]["key"];
export type LegacyCoreAxis = "SCAN" | "PRESS_RESIST" | "QUICK_RECOVERY";

export const GEV_V1_EVENT_KEYS: GevV1EventKey[] = GEV_V1_EVENTS.map((e) => e.key);

export function gevV1LabelKo(key: GevV1EventKey): string {
  return GEV_V1_EVENTS.find((e) => e.key === key)?.labelKo ?? key;
}

export function gevV1ToLegacyCore(key: GevV1EventKey): LegacyCoreAxis {
  return GEV_V1_EVENTS.find((e) => e.key === key)?.legacyCore ?? "SCAN";
}

/** 코치 발화 키워드 (Rule 기반 1차 태깅) */
export const GEV_V1_KEYWORD_RULES: Array<{
  key: GevV1EventKey;
  patterns: RegExp[];
  guardianPhrase: string;
}> = [
  {
    key: "SPACE_CREATION",
    patterns: [/공간\s*(창출|만들|열)/, /스페이스/, /width|폭\s*넓/, /주변\s*보/, /헤드업/, /둘러/i],
    guardianPhrase: "공간을 만들어 팀에 선택지를 주는 판단이 보여요.",
  },
  {
    key: "SUPPORT_ANGLE",
    patterns: [/지원\s*각/, /각\s*만들/, /패스\s*각/, /support\s*angle/i],
    guardianPhrase: "패스 각을 만들어 동료에게 도움을 주는 모습이 좋아요.",
  },
  {
    key: "PENETRATION",
    patterns: [/침투/, /칼\s*같이\s*들어/, /penetration/i, /뚫고\s*들어/],
    guardianPhrase: "수비 라인 사이로 과감히 침투하는 모습이 인상적이에요.",
  },
  {
    key: "PRESSING",
    patterns: [/압박/, /프레싱/, /pressing/i, /붙어\s*서/],
    guardianPhrase: "상대에게 압박을 가해 볼 회수 기회를 만드는 모습이 좋아요.",
  },
  {
    key: "PRESS_ESCAPE",
    patterns: [/압박\s*(회피|탈출|빠져)/, /press\s*escape/i, /압박\s*받.*(빠져|탈출|연결)/, /압박.*버텼/, /버텼.*연결/],
    guardianPhrase: "압박 속에서도 침착하게 탈출하거나 연결하는 모습이 성장하고 있어요.",
  },
  {
    key: "TRANSITION",
    patterns: [/전환/, /transition/i, /수비.*공격|공격.*수비/, /빠른\s*전환/, /리커버리/, /recovery/i, /실수.*따라/, /따라가/],
    guardianPhrase: "수비·공격 전환 순간에 집중력을 유지하는 모습이 좋아요.",
  },
  {
    key: "COVER",
    patterns: [/커버/, /cover/i, /뒤\s*막/, /보험/],
    guardianPhrase: "동료 뒤를 커버하며 팀 수비를 지키는 모습이 보여요.",
  },
  {
    key: "OVERLAP",
    patterns: [/오버\s*랩/, /overlap/i, /윙\s*올라/, /겹쳐\s*달려/],
    guardianPhrase: "오버래핑으로 측면 공격 폭을 넓히는 전술 이해가 보여요.",
  },
  {
    key: "UNDERLAP",
    patterns: [/언더\s*랩/, /underlap/i, /안쪽\s*칼/],
    guardianPhrase: "언더래핑으로 중앙 공간을 활용하는 판단이 좋아요.",
  },
  {
    key: "FORWARD_PASS",
    patterns: [/전진\s*패스/, /앞\s*공간\s*패스/, /forward\s*pass/i, /전방\s*연결/, /패스해/],
    guardianPhrase: "전진 패스로 공격 템포를 올리는 모습이 인상적이에요.",
  },
  {
    key: "BACK_SUPPORT",
    patterns: [/후방\s*지원/, /뒤\s*받/, /back\s*support/i, /리시브\s*각/],
    guardianPhrase: "후방에서 받쳐주며 빌드업을 돕는 모습이 좋아요.",
  },
  {
    key: "BALL_PROTECTION",
    patterns: [/볼\s*보호/, /몸\s*막/, /ball\s*protect/i, /공\s*지켜/],
    guardianPhrase: "압박 상황에서도 볼을 보호하는 기술이 성장하고 있어요.",
  },
  {
    key: "LINE_BREAKING",
    patterns: [/라인\s*브레이킹/, /line\s*break/i, /라인\s*깨/, /한\s*줄\s*넘/],
    guardianPhrase: "수비 라인을 끊는 움직임으로 공격 기회를 만들었어요.",
  },
  {
    key: "SECOND_BALL",
    patterns: [/세컨드\s*볼/, /second\s*ball/i, /리바운드/, /떨어진\s*공/],
    guardianPhrase: "세컨드 볼에 먼저 반응하는 집중력이 좋아요.",
  },
  {
    key: "COMMUNICATION",
    patterns: [/커뮤니케이션/, /소리\s*질/, /지시/, /call/i, /말\s*걸/],
    guardianPhrase: "코트에서 동료와 소통하며 팀 플레이를 이끄는 모습이 보여요.",
  },
];

export const LEGACY_TO_GEV_V1: Record<LegacyCoreAxis, GevV1EventKey> = {
  SCAN: "SPACE_CREATION",
  PRESS_RESIST: "PRESS_ESCAPE",
  QUICK_RECOVERY: "TRANSITION",
};
