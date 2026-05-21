// src/voice/intents.ts
// 🔥 인텐트 파서 (페이지별 독립 인텐트 + NLU 스코어링)

export type GlobalIntent =
  | "login"
  | "signup"
  | "email_input"
  | "password_input"
  | "password_confirm_input"
  | "guest"
  | "phone_login"
  | "phone_input"
  | "send_code"
  | "verify_code_input"
  | "go_back"
  | "home"
  | "login_email"
  | "restart"
  | "help"
  | "cancel"
  | "unknown";

/**
 * 🔥 NLU 간단 버전: 핵심 키워드 기반 스코어링
 * 문장 내 핵심 키워드 기반으로 Intent 분류
 */
const scoreIntent = (text: string): Partial<Record<GlobalIntent, number>> => {
  const scores: Partial<Record<GlobalIntent, number>> = {};

  // 🔥 전화번호 로그인 관련 (최고 우선순위 - login보다 먼저 체크)
  if (
    /전화|핸드폰|휴대폰|폰|번호/.test(text) && 
    /로그인/.test(text)
  ) {
    scores.phone_login = 10; // 최고 우선순위
  }

  // 🔥 인증번호 받기 관련 (높은 우선순위)
  // 정규식 패턴 (공백 포함/미포함 모두 매칭) - 더 많은 변형 추가
  if (
    /인증번호.*받기|인증.*번호.*받기|인증번호.*받아|인증번호.*보내|인증번호.*보내줘|인증번호.*전송|인증번호.*요청|인증.*코드.*받기|인증코드.*받기|인증코드.*보내|코드.*받기|코드.*받아|코드.*보내|코드.*보내줘|코드.*전송|코드.*요청|번호.*받기|번호.*받아|번호.*보내|문자.*받기|문자.*받아|문자.*보내|문자.*보내줘|보내줘|보내|전송해줘|전송/.test(text) ||
    // 키워드 조합 (공백 없는 텍스트) - 더 많은 변형 추가
    (text.includes("인증번호") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘") || text.includes("전송") || text.includes("요청"))) ||
    (text.includes("인증코드") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘"))) ||
    (text.includes("코드") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘") || text.includes("전송") || text.includes("요청"))) ||
    (text.includes("문자") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘"))) ||
    (text.includes("번호") && (text.includes("받기") || text.includes("받아") || text.includes("보내")) && !text.includes("전화번호") && !text.includes("입력")) ||
    // 단독 키워드 (맥락상 인증번호 요청으로 해석 가능)
    (text === "보내줘" || text === "보내" || text === "전송해줘" || text === "전송" || text === "요청")
  ) {
    scores.send_code = 10; // 높은 우선순위
    console.log("[scoreIntent] send_code 스코어링 성공:", text);
  }

  // 🔥 전화번호 입력 관련
  if (
    (text.includes("전화번호") && text.includes("입력")) ||
    text.includes("번호입력") ||
    text.includes("휴대폰입력")
  ) {
    scores.phone_input = 7;
  }

  // 가입 관련 (높은 우선순위)
  if (text.includes("가입하기") || text.includes("가입완료") || text.includes("회원가입완료") || text.includes("가입할게")) {
    scores.signup = 10;
  }
  if (text.includes("가입") && !text.includes("완료") && !text.includes("하기")) {
    scores.signup = 5;
  }

  // 비밀번호 확인 관련 (높은 우선순위)
  if (text.includes("비밀번호확인") || text.includes("비밀번호한번더") || text.includes("비번확인") || text.includes("확인비밀번호")) {
    scores.password_confirm_input = 10;
  }
  if (text.includes("확인") && (text.includes("비밀번호") || text.includes("비번"))) {
    scores.password_confirm_input = 8;
  }

  // 비밀번호 관련
  if (text.includes("비밀번호") || text.includes("비번") || text.includes("패스워드")) {
    if (!text.includes("확인")) {
      scores.password_input = 7;
    }
  }

  // 이메일 관련
  if (text.includes("이메일") || text.includes("메일")) {
    scores.email_input = 7;
  }

  // 로그인 관련 (전화번호 관련 제외)
  if (
    (text.includes("로그인") || text.includes("로그인할게") || text.includes("접속") || text.includes("들어가기")) &&
    !text.includes("전화번호") &&
    !text.includes("휴대폰") &&
    !text.includes("핸드폰") &&
    !text.includes("번호") &&
    !/전화|핸드폰|휴대폰|폰/.test(text)
  ) {
    scores.login = 7;
  }

  // 게스트 관련
  if (text.includes("게스트") || text.includes("둘러보기") || text.includes("그냥볼게")) {
    scores.guest = 7;
  }

  return scores;
};

/**
 * 음성 명령을 인텐트로 파싱
 * 🔥 페이지별로 독립적인 인텐트 파싱 (충돌 방지) + NLU 스코어링
 */
export const parseIntent = (raw: string, pathname?: string): GlobalIntent => {
  if (!raw) return "unknown";

  const text = raw.replace(/\s+/g, "").toLowerCase();
  const isSignupPage = pathname?.startsWith("/signup");
  const isPhoneLoginPage = pathname?.startsWith("/login/phone");
  const isLoginPage = pathname?.startsWith("/login") && !isPhoneLoginPage;

  // 🔥 NLU 스코어링 적용
  const scores = scoreIntent(text);
  
  // 🔥 디버깅 로그 (전화번호 로그인 페이지에서만)
  if (isPhoneLoginPage) {
    console.log("[parseIntent][phone-login] 원본:", raw);
    console.log("[parseIntent][phone-login] 정제:", text);
    console.log("[parseIntent][phone-login] scores:", scores);
  }
  
  // 🔥 페이지별 우선순위 적용
  if (isSignupPage) {
    // 회원가입 페이지: signup, password_confirm_input 우선
    if (scores.signup && scores.signup >= 5) return "signup";
    if (scores.password_confirm_input && scores.password_confirm_input >= 8) return "password_confirm_input";
    if (scores.password_input && scores.password_input >= 7) return "password_input";
    if (scores.email_input && scores.email_input >= 7) return "email_input";
    if (scores.login && scores.login >= 7) return "login";
  }
  
  if (isLoginPage) {
    // 🔥 로그인 페이지: phone_login을 login보다 먼저 체크 (우선순위 최고)
    if (scores.phone_login && scores.phone_login >= 10) return "phone_login";
    if (scores.login && scores.login >= 7) return "login";
    if (scores.email_input && scores.email_input >= 7) return "email_input";
    if (scores.password_input && scores.password_input >= 7) return "password_input";
    if (scores.signup && scores.signup >= 5) return "signup";
    if (scores.guest && scores.guest >= 7) return "guest";
  }

  // 🔥 추가 인텐트 (공통)
  if (text.includes("처음부터") || text.includes("다시시작") || text.includes("초기화")) {
    return "restart";
  }
  if (text.includes("다시안내") || text.includes("안내") || text.includes("도움말") || text.includes("help")) {
    return "help";
  }
  if (text.includes("취소") || text.includes("그만") || text.includes("중지")) {
    return "cancel";
  }

  // 🔥 전화번호 로그인 페이지: send_code 우선 체크 (스코어 기반 + 패턴 기반 통합)
  if (isPhoneLoginPage) {
    // 🔥 우선순위 1: 인증번호 받기 (스코어 기반)
    if (scores.send_code && scores.send_code >= 10) {
      console.log("[parseIntent][phone-login] send_code 인식됨 (스코어 기반)");
      return "send_code";
    }
    
    // 🔥 우선순위 1-2: 인증번호 받기 (패턴 기반 - 강화)
    // 원본 텍스트도 함께 체크 (공백 포함)
    const originalText = raw.toLowerCase();
    if (
      // 공백 없는 패턴 (text는 이미 공백 제거됨)
      text.includes("인증번호받기") ||
      text.includes("인증번호전송") ||
      text.includes("인증번호보내") ||
      text.includes("인증번호요청") ||
      text.includes("코드받기") ||
      text.includes("코드보내") ||
      text.includes("코드전송") ||
      text.includes("코드요청") ||
      text.includes("번호받기") ||
      text.includes("인증코드받기") ||
      text.includes("문자받기") ||
      text.includes("문자보내") ||
      // 단독 키워드 (맥락상 인증번호 요청)
      text === "보내줘" ||
      text === "보내" ||
      text === "전송해줘" ||
      text === "전송" ||
      text === "요청" ||
      // 공백 있는 패턴 (원본 텍스트) - 더 많은 변형 추가
      originalText.includes("인증번호 받기") ||
      originalText.includes("인증 번호 받기") ||
      originalText.includes("인증번호 받아") ||
      originalText.includes("인증번호 전송") ||
      originalText.includes("인증번호 보내") ||
      originalText.includes("인증번호 보내줘") ||
      originalText.includes("코드 받기") ||
      originalText.includes("코드 받아") ||
      originalText.includes("코드 보내") ||
      originalText.includes("코드 보내줘") ||
      originalText.includes("번호 받기") ||
      originalText.includes("번호 받아") ||
      originalText.includes("인증 코드 받기") ||
      originalText.includes("인증 코드 받아") ||
      originalText.includes("인증코드 받기") ||
      originalText.includes("인증코드 보내줘") ||
      originalText.includes("인증번호 요청") ||
      originalText.includes("코드 요청") ||
      originalText.includes("문자 받기") ||
      originalText.includes("문자 받아") ||
      originalText.includes("문자 보내") ||
      originalText.includes("문자 보내줘") ||
      originalText.includes("코드 전송") ||
      // 단독 키워드 (맥락상 인증번호 요청)
      originalText === "보내줘" ||
      originalText === "보내" ||
      originalText === "전송해줘" ||
      originalText === "전송" ||
      originalText === "요청" ||
      // 키워드 조합 패턴 (공백 없는 텍스트) - 더 많은 변형 추가
      (text.includes("인증번호") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘") || text.includes("전송") || text.includes("요청"))) ||
      (text.includes("인증코드") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘"))) ||
      (text.includes("코드") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘") || text.includes("요청"))) ||
      (text.includes("문자") && (text.includes("받기") || text.includes("받아") || text.includes("보내") || text.includes("보내줘"))) ||
      (text.includes("번호") && (text.includes("받기") || text.includes("받아") || text.includes("보내")) && !text.includes("전화번호") && !text.includes("입력")) ||
      // 키워드 조합 패턴 (원본 텍스트 - 공백 포함) - 더 많은 변형 추가
      (originalText.includes("인증번호") && (originalText.includes("받기") || originalText.includes("받아") || originalText.includes("보내") || originalText.includes("보내줘") || originalText.includes("전송") || originalText.includes("요청"))) ||
      (originalText.includes("인증코드") && (originalText.includes("받기") || originalText.includes("받아") || originalText.includes("보내") || originalText.includes("보내줘"))) ||
      (originalText.includes("코드") && (originalText.includes("받기") || originalText.includes("받아") || originalText.includes("보내") || originalText.includes("보내줘") || originalText.includes("요청"))) ||
      (originalText.includes("문자") && (originalText.includes("받기") || originalText.includes("받아") || originalText.includes("보내") || originalText.includes("보내줘")))
    ) {
      console.log("[parseIntent][phone-login] send_code 인식됨 (패턴 기반)");
      return "send_code";
    }

    // 🔥 우선순위 2: 전화번호 입력
    if (scores.phone_input && scores.phone_input >= 7) {
      return "phone_input";
    }

    // 🔥 우선순위 2: 전화번호 입력
    if (text.includes("전화번호입력") || text.includes("전화번호말할게") || text.includes("번호입력") || (text.includes("전화번호") && text.includes("입력"))) {
      return "phone_input";
    }

    // 인증번호 입력
    if (text.includes("인증번호입력") || text.includes("인증번호말할게") || text.includes("코드입력") || (text.includes("인증번호") && text.includes("입력"))) {
      return "verify_code_input";
    }

    // 뒤로 가기
    if (text.includes("뒤로가기") || text.includes("뒤로") || text.includes("이전")) {
      return "go_back";
    }

    // 홈으로
    if (text.includes("홈으로") || text.includes("홈") || text.includes("메인")) {
      return "home";
    }

    // 이메일 로그인
    if (text.includes("이메일로그인") || text.includes("이메일로로그인") || text.includes("이메일로") || (text.includes("이메일") && text.includes("로그인"))) {
      return "login_email";
    }
  }

  // 🔥 회원가입 페이지에서만 처리하는 인텐트
  if (isSignupPage) {
    // 🔥 우선순위 1: 가입하기 (회원가입 완료용) - signup 인텐트로 처리
    if (
      text.includes("가입하기") ||
      text.includes("가입완료") ||
      text.includes("회원가입완료") ||
      text.includes("가입할게")
    ) {
      return "signup";
    }

    // 🔥 우선순위 2: 비밀번호 확인 관련 (비밀번호보다 먼저 체크, strict rule)
    // "확인" 키워드가 포함된 경우 우선 처리
    if (
      text.includes("비밀번호확인") ||
      text.includes("비밀번호한번더") ||
      text.includes("비번확인") ||
      text.includes("확인비밀번호") ||
      text.includes("비밀번호재입력") ||
      (text.includes("확인") && (text.includes("비밀번호") || text.includes("비번")))
    ) {
      return "password_confirm_input";
    }

    // 🔥 우선순위 3: 비밀번호 관련 (확인이 아닌 경우만)
    if (
      (text.includes("비밀번호") || text.includes("비번") || text.includes("패스워드")) &&
      !text.includes("확인")
    ) {
      return "password_input";
    }

    // 🔥 우선순위 4: 이메일 관련 (확인/비밀번호가 아닌 경우만)
    if (
      (text.includes("이메일") || text.includes("메일") || text.includes("이메일입력") || text.includes("이메일말할게") || text.includes("이메일다시")) &&
      !text.includes("확인") &&
      !text.includes("비밀번호") &&
      !text.includes("비번")
    ) {
      return "email_input";
    }

    // 로그인 페이지로 이동
    if (text.includes("로그인페이지") || text.includes("로그인으로")) {
      return "login";
    }
  }

  // 🔥 로그인 페이지에서만 처리하는 인텐트
  if (isLoginPage) {
    // 🔥 전화번호 로그인 관련 (login보다 먼저 체크 - 우선순위 최고)
    // 🔥 강력한 패턴 매칭: 전화/핸드폰/휴대폰/폰/번호 + 로그인
    if (
      (/전화|핸드폰|휴대폰|폰|번호/.test(text) && /로그인/.test(text)) ||
      /^전화.*로그인/.test(text) ||
      /^휴대폰.*로그인/.test(text) ||
      /^폰.*로그인/.test(text) ||
      /^번호.*로그인/.test(text) ||
      text.includes("전화번호로그인") ||
      text.includes("전화번호로로그인") ||
      text.includes("휴대폰로그인") ||
      text.includes("핸드폰로그인") ||
      text.includes("번호로그인") ||
      (text.includes("전화번호") && text.includes("로그인")) ||
      (text.includes("휴대폰") && text.includes("로그인")) ||
      (text.includes("핸드폰") && text.includes("로그인")) ||
      (text.includes("전화") && text.includes("로그인")) ||
      (text.includes("번호") && text.includes("로그인"))
    ) {
      return "phone_login";
    }

    // 로그인 관련 (단독 사용될 때만 매칭 - 전화번호 관련 제외)
    if (
      (text === "로그인" ||
        text.startsWith("로그인할게") ||
        text.startsWith("로그인하겠습니다") ||
        text.startsWith("로그인해주세요") ||
        (text.includes("접속") && !text.includes("전화")) ||
        (text.includes("들어가기") && !text.includes("전화"))) &&
      !text.includes("전화번호") &&
      !text.includes("휴대폰") &&
      !text.includes("핸드폰") &&
      !text.includes("번호")
    ) {
      return "login";
    }

    // 비밀번호 관련
    if (
      text.includes("비밀번호") ||
      text.includes("비번") ||
      text.includes("패스워드")
    ) {
      return "password_input";
    }

    // 이메일 관련
    if (
      text.includes("이메일") ||
      text.includes("메일") ||
      text.includes("이메일입력") ||
      text.includes("이메일말할게")
    ) {
      return "email_input";
    }

    // 회원가입 페이지로 이동
    if (
      text.includes("회원가입") ||
      (text.includes("가입") && !text.includes("완료") && !text.includes("하기"))
    ) {
      return "signup";
    }

    // 게스트 관련
    if (
      text.includes("게스트") ||
      text.includes("둘러보기") ||
      text.includes("그냥볼게")
    ) {
      return "guest";
    }
  }

  // 🔥 페이지 정보 없을 때 기본 처리 (하위 호환성)
  if (!isSignupPage && !isLoginPage) {
    // 회원가입 관련 (페이지 이동용)
    if (
      text.includes("회원가입") ||
      (text.includes("가입") && !text.includes("완료") && !text.includes("하기"))
    ) {
      return "signup";
    }

    // 🔥 전화번호 로그인 관련 (login보다 먼저 체크 - 우선순위 최고)
    if (
      /^전화.*로그인/.test(text) ||
      /^휴대폰.*로그인/.test(text) ||
      /^폰.*로그인/.test(text) ||
      /^번호.*로그인/.test(text) ||
      text.includes("전화번호로그인") ||
      text.includes("전화번호로로그인") ||
      text.includes("휴대폰로그인") ||
      text.includes("핸드폰로그인") ||
      text.includes("번호로그인") ||
      (text.includes("전화번호") && text.includes("로그인")) ||
      (text.includes("휴대폰") && text.includes("로그인")) ||
      (text.includes("핸드폰") && text.includes("로그인"))
    ) {
      return "phone_login";
    }

    // 로그인 관련 (단독 사용될 때만 매칭 - 전화번호 관련 제외)
    if (
      (text === "로그인" ||
        text.startsWith("로그인할게") ||
        text.startsWith("로그인하겠습니다") ||
        text.startsWith("로그인해주세요") ||
        (text.includes("접속") && !text.includes("전화")) ||
        (text.includes("들어가기") && !text.includes("전화"))) &&
      !text.includes("전화번호") &&
      !text.includes("휴대폰") &&
      !text.includes("핸드폰") &&
      !text.includes("번호")
    ) {
      return "login";
    }

    // 게스트 관련
    if (
      text.includes("게스트") ||
      text.includes("둘러보기") ||
      text.includes("그냥볼게")
    ) {
      return "guest";
    }

    // 🔥 우선순위: 비밀번호 확인 관련 (비밀번호보다 먼저 체크, strict rule)
    if (
      text.includes("비밀번호확인") ||
      text.includes("비밀번호한번더") ||
      text.includes("비번확인") ||
      text.includes("확인비밀번호") ||
      text.includes("비밀번호재입력") ||
      (text.includes("확인") && (text.includes("비밀번호") || text.includes("비번")))
    ) {
      return "password_confirm_input";
    }

    // 비밀번호 관련
    if (
      text.includes("비밀번호") ||
      text.includes("비번") ||
      text.includes("패스워드")
    ) {
      return "password_input";
    }

    // 이메일 관련
    if (
      text.includes("이메일") ||
      text.includes("메일") ||
      text.includes("이메일입력") ||
      text.includes("이메일말할게")
    ) {
      return "email_input";
    }
  }

  // 🔥 전화번호 로그인 관련 (login보다 먼저 체크 - 우선순위 최고)
  if (
    /^전화.*로그인/.test(text) ||
    /^휴대폰.*로그인/.test(text) ||
    /^폰.*로그인/.test(text) ||
    /^번호.*로그인/.test(text) ||
    text.includes("전화번호로그인") ||
    text.includes("전화번호로로그인") ||
    text.includes("휴대폰로그인") ||
    text.includes("핸드폰로그인") ||
    text.includes("번호로그인") ||
    (text.includes("전화번호") && text.includes("로그인")) ||
    (text.includes("휴대폰") && text.includes("로그인")) ||
    (text.includes("핸드폰") && text.includes("로그인"))
  ) {
    return "phone_login";
  }

  // 로그인 관련 (단독 사용될 때만 매칭 - 전화번호 관련 제외)
  if (
    (text === "로그인" ||
      text.startsWith("로그인할게") ||
      text.startsWith("로그인하겠습니다") ||
      text.startsWith("로그인해주세요") ||
      (text.includes("접속") && !text.includes("전화")) ||
      (text.includes("들어가기") && !text.includes("전화"))) &&
    !text.includes("전화번호") &&
    !text.includes("휴대폰") &&
    !text.includes("핸드폰") &&
    !text.includes("번호")
  ) {
    return "login";
  }

  // 게스트 관련
  if (
    text.includes("게스트") ||
    text.includes("둘러보기") ||
    text.includes("그냥볼게")
  ) {
    return "guest";
  }

  // 비밀번호 확인 관련 (비밀번호보다 먼저 체크)
  if (
    text.includes("비밀번호확인") ||
    text.includes("비밀번호한번더") ||
    text.includes("비번확인") ||
    text.includes("확인비밀번호") ||
    text.includes("비밀번호재입력")
  ) {
    return "password_confirm_input";
  }

  // 비밀번호 관련
  if (
    text.includes("비밀번호") ||
    text.includes("비번") ||
    text.includes("패스워드")
  ) {
    return "password_input";
  }

  // 이메일 관련
  if (
    text.includes("이메일") ||
    text.includes("메일") ||
    text.includes("이메일입력") ||
    text.includes("이메일말할게")
  ) {
    return "email_input";
  }

  return "unknown";
};

