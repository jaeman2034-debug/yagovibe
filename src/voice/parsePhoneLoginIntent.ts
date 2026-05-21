// src/voice/parsePhoneLoginIntent.ts
// 🔥 전화번호 로그인 페이지 전용 인텐트 파서 (상태 기반)

export type PhoneLoginState =
  | "idle"           // 아무것도 안 하는 상태 (명령 대기)
  | "phone_input"    // 전화번호 숫자 입력 중
  | "waiting_send"   // 번호는 충분히 들어왔고, 인증번호 발송만 기다리는 상태
  | "waiting_code";  // 인증번호(숫자) 입력 기다리는 상태

export type PhoneLoginIntent =
  | "start_phone_input"  // 전화번호 입력 시작
  | "send_code"          // 인증번호 받기
  | "start_code_input"   // 인증번호 입력 시작
  | "go_home"           // 홈으로
  | "email_login"        // 이메일 로그인
  | "back"              // 뒤로가기
  | "unknown";

/**
 * 패턴 배열 중 하나라도 포함되는지 체크
 */
const includesAny = (text: string, patterns: string[]): boolean => {
  return patterns.some((p) => text.includes(p));
};

/**
 * 전화번호 로그인 페이지 전용 인텐트 파서 (상태 기반)
 * 🔥 상태에 따라 허용되는 인텐트를 다르게 처리
 * 
 * @param raw - STT 인식 결과 (원본 텍스트)
 * @param state - 현재 상태
 * @returns PhoneLoginIntent
 */
export function parsePhoneLoginIntent(
  raw: string,
  state: PhoneLoginState
): PhoneLoginIntent {
  if (!raw || !raw.trim()) {
    console.log("[parsePhoneLoginIntent] 빈 입력 → unknown");
    return "unknown";
  }

  // 🔥 띄어쓰기 제거해서 매칭 쉽게
  const text = raw.replace(/\s+/g, "");
  console.log("[parsePhoneLoginIntent] 원본:", raw, "→ 정제:", text, "→ 상태:", state);

  // ✅ 공통으로 항상 먹히는 전역 명령 (뒤로, 홈, 이메일로그인 등)
  if (includesAny(text, ["홈으로", "홈가기", "홈", "메인으로", "메인화면"])) {
    console.log("[parsePhoneLoginIntent] ✅ 전역 명령: go_home");
    return "go_home";
  }

  if (includesAny(text, ["이메일로그인", "이메일로로그인"])) {
    console.log("[parsePhoneLoginIntent] ✅ 전역 명령: email_login");
    return "email_login";
  }

  if (includesAny(text, ["뒤로가기", "뒤로", "이전으로", "이전페이지"])) {
    console.log("[parsePhoneLoginIntent] ✅ 전역 명령: back");
    return "back";
  }

  // ✅ 전화번호 입력 시작
  if (state === "idle" || state === "phone_input") {
    if (
      includesAny(text, [
        "전화번호입력",
        "번호입력",
        "휴대폰번호입력",
        "휴대폰입력",
        "핸드폰번호입력",
        "핸드폰입력",
      ])
    ) {
      console.log("[parsePhoneLoginIntent] ✅ start_phone_input (state:", state, ")");
      return "start_phone_input";
    }
  }

  // ✅ 인증번호 보내기 (state에 너무 꽉 묶지 말고, 번호가 이미 충분하면 다 허용)
  // 🔥 waiting_send, phone_input, idle 모두 허용 (phone_input은 전화번호 길이 체크는 상위에서)
  if (
    state === "waiting_send" ||
    state === "phone_input" || // 번호 적당히 들어온 뒤에도 인정
    state === "idle"
  ) {
    // 🔥 정규식 패턴으로 먼저 체크 (더 강력한 매칭)
    const sendCodePatterns = [
      /인증번호.*받기/i,
      /인증.*번호.*받기/i,
      /인증번호.*받아/i,
      /인증번호.*보내/i,
      /인증번호.*보내줘/i,
      /인증번호.*전송/i,
      /인증번호.*요청/i,
      /인증코드.*받기/i,
      /인증코드.*보내/i,
      /인증코드.*보내줘/i,
      /인증문자.*받기/i,
      /인증문자.*보내/i,
      /코드.*받기/i,
      /코드.*보내/i,
      /코드.*보내줘/i,
      /코드.*전송/i,
      /번호.*받기/i,
      /문자.*받기/i,
      /문자.*보내/i,
      /문자.*보내줘/i,
      /^보내줘$/i,
      /^보내$/i,
      /^전송해줘$/i,
      /^전송$/i,
      /^요청$/i,
    ];

    // 🔥 정규식으로 먼저 체크 (원본 텍스트와 정제된 텍스트 모두)
    for (const pattern of sendCodePatterns) {
      if (pattern.test(raw) || pattern.test(text)) {
        console.log("[parsePhoneLoginIntent] ✅ send_code (정규식 매칭, state:", state, ", pattern:", pattern.source, ")");
        return "send_code";
      }
    }

    // 🔥 띄어쓰기 제거 후 매칭: "인증번호받기" / "인증 번호 받기" 둘 다 잡히게
    if (
      includesAny(text, [
        "인증번호받기",      // "인증번호받기"
        "인증번호받아",      // "인증번호받아"
        "인증번호보내",      // "인증번호보내"
        "인증번호보내줘",    // "인증번호보내줘"
        "인증번호전송",      // "인증번호전송"
        "인증번호요청",      // "인증번호요청"
        "인증코드받기",      // "인증코드받기"
        "인증코드보내",      // "인증코드보내"
        "인증코드보내줘",    // "인증코드보내줘"
        "인증문자받기",      // "인증문자받기"
        "인증문자보내",      // "인증문자보내"
        "코드받기",          // "코드받기"
        "코드보내",          // "코드보내"
        "코드보내줘",        // "코드보내줘"
        "코드전송",          // "코드전송"
        "번호받기",          // "번호받기"
        "문자받기",          // "문자받기"
        "문자보내",          // "문자보내"
        "문자보내줘",        // "문자보내줘"
        "보내줘",            // "보내줘"
        "보내",              // "보내"
        "전송해줘",          // "전송해줘"
        "전송",              // "전송"
        "요청",              // "요청"
      ])
    ) {
      console.log("[parsePhoneLoginIntent] ✅ send_code (includesAny 매칭, state:", state, ")");
      return "send_code";
    }
  }

  // ✅ 인증번호(숫자) 입력
  if (state === "waiting_code") {
    if (
      includesAny(text, [
        "인증번호입력",
        "인증코드입력",
        "인증문자입력",
        "코드입력",
        "번호입력",
      ])
    ) {
      console.log("[parsePhoneLoginIntent] ✅ start_code_input (state: waiting_code)");
      return "start_code_input";
    }
  }

  console.log("[parsePhoneLoginIntent] ⚠️ 매칭 실패 → unknown (raw:", raw, ", text:", text, ", state:", state, ")");
  return "unknown";
}
