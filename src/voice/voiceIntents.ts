export type VoiceIntent =
  | "open_login"
  | "open_signup"
  | "open_guest"
  | "open_home"
  | "login_email"
  | "login_password"
  | "login_submit"
  | "signup_email"
  | "signup_password"
  | "signup_confirm"
  | "signup_submit"
  | "reset_email"
  | "reset_password"
  | "reset_confirm"
  | "unknown";

function includesAny(text: string, keys: string[]): boolean {
  return keys.some((k) => text.includes(k));
}

/**
 * Intent 판별 함수 (경로 기반)
 * 🔥 페이지별 명령을 먼저 체크하여 signup TTS가 정상 작동하도록 수정
 */
export function detectIntent(text: string, pathname: string): VoiceIntent {
  const t = text.replace(/\s+/g, "").toLowerCase();

  // 🔥 페이지별 세부 동작을 먼저 체크 (네비게이션보다 우선)
  const onLogin = pathname.startsWith("/login");
  const onSignup = pathname.startsWith("/signup");

  // 🔥 회원가입 페이지에서의 명령 우선 처리
  if (onSignup) {
    if (includesAny(t, ["이메일입력", "이메일말할게", "이메일다시", "이메일"])) return "signup_email";
    if (includesAny(t, ["비밀번호입력", "비번입력", "비밀번호말할게", "비밀번호", "비번"])) return "signup_password";
    if (includesAny(t, ["비밀번호확인입력", "확인비밀번호입력", "비밀번호확인", "확인비밀번호", "비번확인"])) return "signup_confirm";
    if (includesAny(t, ["가입할게", "가입하기", "회원가입완료", "가입", "완료"])) return "signup_submit";
    // 리셋 명령 (회원가입 페이지에서)
    if (includesAny(t, ["이메일다시", "이메일지워", "이메일수정", "이메일재입력"])) return "reset_email";
    if (includesAny(t, ["비밀번호다시", "비번다시", "비밀번호지워", "비밀번호수정", "비번지워"])) return "reset_password";
    if (includesAny(t, ["확인비밀번호다시", "비밀번호확인다시", "확인비밀번호지워", "확인비밀번호수정"])) return "reset_confirm";
  }

  // 🔥 로그인 페이지에서의 명령 처리
  if (onLogin) {
    if (includesAny(t, ["이메일입력", "이메일말할게", "이메일다시", "이메일"])) return "login_email";
    if (includesAny(t, ["비밀번호입력", "비번입력", "비밀번호말할게", "비밀번호", "비번"])) return "login_password";
    if (includesAny(t, ["로그인할게", "로그인해주세요", "로그인", "접속", "들어가기"])) return "login_submit";
    // 리셋 명령 (로그인 페이지에서)
    if (includesAny(t, ["이메일다시", "이메일지워", "이메일수정", "이메일재입력"])) return "reset_email";
    if (includesAny(t, ["비밀번호다시", "비번다시", "비밀번호지워", "비밀번호수정", "비번지워"])) return "reset_password";
  }

  // 🔥 공통 네비게이션 (페이지별 명령 처리 후)
  if (includesAny(t, ["홈으로", "처음으로", "메인으로", "홈", "메인"])) return "open_home";
  if (includesAny(t, ["게스트", "둘러보기", "그냥볼게", "체험"])) return "open_guest";
  if (includesAny(t, ["로그인으로", "로그인갈게", "로그인페이지", "로그인하러"])) return "open_login";
  if (includesAny(t, ["회원가입", "가입할게", "가입페이지", "회원가입하러"])) return "open_signup";

  return "unknown";
}

export function detectVoiceIntent(
  text: string,
  intentTable: Record<string, string[]>
): string | null {
  if (!text) return null;
  
  const normalized = text.toLowerCase().trim();
  
  for (const [intentKey, keywords] of Object.entries(intentTable)) {
    for (const keyword of keywords) {
      const regex = new RegExp(keyword.toLowerCase().replace(/\s+/g, ".*"));
      if (regex.test(normalized)) {
        return intentKey;
      }
    }
  }
  
  return null;
}

export const signupVoiceIntents = {
  open_email: ["이메일 입력", "이메일 말할게", "이메일 입력할게", "이메일"],
  open_password: ["비밀번호 입력", "비밀번호 말할게", "비밀번호 입력할게", "비밀번호"],
  open_confirm: ["비밀번호 확인 입력", "확인 비밀번호 말할게", "비밀번호 확인", "확인 비밀번호"],
  submit_signup: ["가입", "가입하기", "회원가입", "가입 완료", "완료"],
  go_login: ["로그인 갈게", "로그인으로", "로그인 페이지", "로그인"],
  go_home: ["홈으로", "처음으로", "홈", "메인"],
  reset_email: ["이메일 다시 입력", "이메일 지워", "이메일 다시", "이메일 수정"],
  reset_password: ["비밀번호 다시 입력", "비밀번호 지워", "비밀번호 다시", "비밀번호 수정"],
  reset_confirm: ["확인 비밀번호 다시 입력", "확인 비밀번호 지워", "확인 비밀번호 다시", "확인 비밀번호 수정"],
  next: ["다음", "다음 단계", "다음으로"],
  back: ["뒤로", "이전 단계", "이전으로"],
  cancel: ["취소", "그만", "중지", "안 할게"],
};

export const loginVoiceIntents = {
  open_email: ["이메일 입력", "이메일 말할게", "이메일 입력할게", "이메일"],
  open_password: ["비밀번호 입력", "비밀번호 말할게", "비밀번호 입력할게", "비밀번호"],
  submit_login: ["로그인", "로그인 할게", "접속", "들어가기"],
  go_signup: ["회원가입", "가입할게", "회원가입 할게"],
  go_guest: ["게스트", "게스트 둘러보기", "둘러보기", "그냥 볼게"],
  reset_email: ["이메일 다시 입력", "이메일 지워", "이메일 다시"],
  reset_password: ["비밀번호 다시 입력", "비밀번호 지워", "비밀번호 다시"],
  cancel: ["취소", "그만", "중지"],
};
