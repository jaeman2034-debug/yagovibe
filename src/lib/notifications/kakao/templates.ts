/**
 * PR4 Sprint B — Kakao AlimTalk Template Final Design.
 * SoT path: src/lib/notifications/kakao/templates.ts
 *
 * Approval: fill templateCode via env; keep Queue/Ops/Provider unchanged.
 */

export type AlimTalkTemplateId =
  | "RESERVATION_REQUEST"
  | "RESERVATION_APPROVED"
  | "PAYMENT_REQUEST"
  | "PAYMENT_CONFIRMED"
  | "RESERVATION_CANCELLED"
  | "RESERVATION_REMINDER"
  | "MATCH_REMINDER"
  | "AI_REPORT_READY"
  | "NOTICE"
  | "WELCOME"
  /** @deprecated use RESERVATION_APPROVED */
  | "RESERVATION_COMPLETE";

export const ALIMTALK_COMMON_VARIABLES = [
  "team",
  "venue",
  "date",
  "time",
  "price",
  "deadline",
  "reservationNo",
  "reservationUrl",
  "paymentStatus",
  "coach",
  "player",
  "reportUrl",
  "noticeTitle",
  "noticeUrl",
] as const;

export type AlimTalkVariable = (typeof ALIMTALK_COMMON_VARIABLES)[number];

export type AlimTalkTemplateDef = {
  id: AlimTalkTemplateId;
  displayName: string;
  description: string;
  templateCode: string;
  templateCodeEnvKey: string;
  templateCodeEnvAliases?: string[];
  variables: string[];
  body: string;
};

function T(
  id: AlimTalkTemplateId,
  displayName: string,
  description: string,
  templateCodeEnvKey: string,
  variables: string[],
  bodyLines: string[],
  templateCodeEnvAliases: string[] = []
): AlimTalkTemplateDef & { templateCodeEnvAliases?: string[] } {
  return {
    id,
    displayName,
    description,
    templateCode: "PENDING",
    templateCodeEnvKey,
    templateCodeEnvAliases,
    variables,
    body: bodyLines.join("\n"),
  };
}

const RESERVATION_APPROVED = T(
  "RESERVATION_APPROVED",
  "예약 승인 / 결제 요청",
  "협회가 예약을 승인하고 입금/결제를 요청할 때",
  "KAKAO_TEMPLATE_RESERVATION_APPROVED",
  ["teamName", "venueName", "date", "time", "amount", "accountNumber"],
  [
    "[YAGO SPORTS]",
    "",
    "노원구축구협회",
    "",
    "구장 예약이 승인되었습니다.",
    "",
    "■ 팀",
    "#{teamName}",
    "",
    "■ 구장",
    "#{venueName}",
    "",
    "■ 일시",
    "#{date}",
    "#{time}",
    "",
    "■ 금액",
    "#{amount}",
    "",
    "■ 입금계좌",
    "#{accountNumber}",
  ]
);

export const ALIMTALK_TEMPLATE_REGISTRY: Record<
  AlimTalkTemplateId,
  AlimTalkTemplateDef
> = {
  RESERVATION_REQUEST: T(
    "RESERVATION_REQUEST",
    "예약 신청 완료",
    "클럽이 구장 예약을 신청했을 때",
    "KAKAO_TEMPLATE_RESERVATION_REQUEST",
    ["team", "venue", "date", "time", "reservationNo", "reservationUrl"],
    [
      "[YAGO SPORTS]",
      "",
      "예약 신청이 접수되었습니다.",
      "",
      "팀",
      "#{team}",
      "",
      "구장",
      "#{venue}",
      "",
      "희망일시",
      "#{date}",
      "#{time}",
      "",
      "예약번호",
      "#{reservationNo}",
      "",
      "승인 결과는",
      "알림톡으로 안내드립니다.",
      "",
      "예약 확인",
      "#{reservationUrl}",
    ]
  ),
  RESERVATION_APPROVED,
  PAYMENT_REQUEST: T(
    "PAYMENT_REQUEST",
    "결제 요청",
    "입금/결제 독촉 또는 결제 링크 안내",
    "KAKAO_TEMPLATE_PAYMENT_REQUEST",
    ["team", "venue", "date", "price", "deadline", "reservationUrl"],
    [
      "[YAGO SPORTS]",
      "",
      "결제를 진행해 주세요.",
      "",
      "팀",
      "#{team}",
      "",
      "구장",
      "#{venue}",
      "",
      "일시",
      "#{date}",
      "",
      "금액",
      "#{price}",
      "",
      "마감",
      "#{deadline}",
      "",
      "결제하기",
      "#{reservationUrl}",
    ],
    ["KAKAO_TEMPLATE_PAYMENT"]
  ),
  PAYMENT_CONFIRMED: T(
    "PAYMENT_CONFIRMED",
    "입금 확인",
    "입금 확인 후 예약 최종 확정",
    "KAKAO_TEMPLATE_PAYMENT_CONFIRMED",
    ["team", "venue", "date", "time", "reservationUrl"],
    [
      "[YAGO SPORTS]",
      "",
      "입금이 확인되었습니다.",
      "",
      "예약이 최종 확정되었습니다.",
      "",
      "팀",
      "#{team}",
      "",
      "구장",
      "#{venue}",
      "",
      "일시",
      "#{date}",
      "#{time}",
      "",
      "감사합니다.",
      "",
      "예약 보기",
      "",
      "#{reservationUrl}",
    ]
  ),
  RESERVATION_CANCELLED: T(
    "RESERVATION_CANCELLED",
    "예약 취소",
    "예약 취소 안내",
    "KAKAO_TEMPLATE_RESERVATION_CANCELLED",
    ["team", "venue", "date", "time", "reservationNo"],
    [
      "[YAGO SPORTS]",
      "",
      "예약이 취소되었습니다.",
      "",
      "팀",
      "#{team}",
      "",
      "구장",
      "#{venue}",
      "",
      "일시",
      "#{date}",
      "#{time}",
      "",
      "예약번호",
      "#{reservationNo}",
      "",
      "문의",
      "노원구축구협회",
    ],
    ["KAKAO_TEMPLATE_CANCEL"]
  ),
  RESERVATION_REMINDER: T(
    "RESERVATION_REMINDER",
    "예약 리마인더",
    "이용일 전 예약 리마인드",
    "KAKAO_TEMPLATE_RESERVATION_REMINDER",
    ["team", "venue", "date", "time", "reservationUrl"],
    [
      "[YAGO SPORTS]",
      "",
      "구장 이용 리마인더입니다.",
      "",
      "팀",
      "#{team}",
      "",
      "구장",
      "#{venue}",
      "",
      "일시",
      "#{date}",
      "#{time}",
      "",
      "예약 확인",
      "#{reservationUrl}",
    ]
  ),
  MATCH_REMINDER: T(
    "MATCH_REMINDER",
    "경기 리마인더",
    "경기/매치 일정 리마인드",
    "KAKAO_TEMPLATE_MATCH_REMINDER",
    ["team", "venue", "date", "time", "coach"],
    [
      "[YAGO SPORTS]",
      "",
      "경기 일정을 안내드립니다.",
      "",
      "팀",
      "#{team}",
      "",
      "장소",
      "#{venue}",
      "",
      "일시",
      "#{date}",
      "#{time}",
      "",
      "담당",
      "#{coach}",
    ]
  ),
  AI_REPORT_READY: T(
    "AI_REPORT_READY",
    "AI 분석 완료",
    "AI 분석 리포트 준비 완료",
    "KAKAO_TEMPLATE_AI_REPORT_READY",
    ["player", "reportUrl"],
    [
      "[YAGO SPORTS]",
      "",
      "AI 분석이 완료되었습니다.",
      "",
      "선수",
      "#{player}",
      "",
      "리포트 보기",
      "",
      "#{reportUrl}",
    ],
    ["KAKAO_TEMPLATE_AI_REPORT"]
  ),
  NOTICE: T(
    "NOTICE",
    "공지",
    "협회/플랫폼 공지",
    "KAKAO_TEMPLATE_NOTICE",
    ["noticeTitle", "noticeUrl"],
    [
      "[YAGO SPORTS]",
      "",
      "공지사항",
      "",
      "#{noticeTitle}",
      "",
      "자세히 보기",
      "#{noticeUrl}",
    ]
  ),
  WELCOME: T(
    "WELCOME",
    "환영",
    "가입/채널 추가 환영",
    "KAKAO_TEMPLATE_WELCOME",
    ["team"],
    [
      "[YAGO SPORTS]",
      "",
      "환영합니다.",
      "",
      "#{team}",
      "",
      "야고와 함께",
      "스포츠 운영을 시작해 보세요.",
    ]
  ),
  RESERVATION_COMPLETE: {
    ...RESERVATION_APPROVED,
    id: "RESERVATION_COMPLETE",
    displayName: "예약 승인(레거시)",
    description: "Deprecated: use RESERVATION_APPROVED",
    templateCodeEnvKey: "KAKAO_TEMPLATE_RESERVATION",
    templateCode: "PENDING",
  },
};

export function listAlimTalkTemplates(): AlimTalkTemplateDef[] {
  return Object.values(ALIMTALK_TEMPLATE_REGISTRY).filter(
    (t) => t.id !== "RESERVATION_COMPLETE"
  );
}

export function listAllAlimTalkTemplatesIncludingLegacy(): AlimTalkTemplateDef[] {
  return Object.values(ALIMTALK_TEMPLATE_REGISTRY);
}

export function renderAlimTalkPreview(
  id: AlimTalkTemplateId,
  vars: Record<string, string>
): string {
  let out = ALIMTALK_TEMPLATE_REGISTRY[id].body;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`#{${k}}`).join(v);
    out = out.split(`{${k}}`).join(v);
  }
  return out;
}

export function resolveTemplateCodeFromEnv(
  id: AlimTalkTemplateId,
  env: Record<string, string | undefined> = {}
): string {
  const def = ALIMTALK_TEMPLATE_REGISTRY[id];
  const keys = [def.templateCodeEnvKey, ...(def.templateCodeEnvAliases || [])];
  for (const k of keys) {
    const fromEnv = String(env[k] || "").trim();
    if (fromEnv) return fromEnv;
  }
  return def.templateCode;
}

export function mapVenueKeyToAlimTalkId(
  venueTemplateKey: string
): AlimTalkTemplateId | null {
  switch (venueTemplateKey) {
    case "RESERVATION_ASSIGNED":
      return "RESERVATION_APPROVED";
    case "RESERVATION_CONFIRMED":
      return "PAYMENT_CONFIRMED";
    case "PAYMENT_APPROVED":
    case "PAYMENT_CONFIRMED":
      return "PAYMENT_CONFIRMED";
    case "PAYMENT_RECEIVED":
    case "PAYMENT_GUIDE":
      return "PAYMENT_REQUEST";
    case "RESERVATION_CANCELLED":
      return "RESERVATION_CANCELLED";
    case "AI_REPORT_READY":
    case "GROWTH_REPORT_DELIVERED":
      return "AI_REPORT_READY";
    default:
      return null;
  }
}
