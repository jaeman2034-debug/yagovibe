# 🔥 로그인 + 회원가입 음성 전체 통합 완성본

## ✅ 완성된 구조

### 1. 공통 훅: `usePageVoiceCommand`
- **위치**: `src/voice/usePageVoiceCommand.ts`
- **기능**: 페이지별 독립적인 음성 명령 시스템
- **특징**:
  - 페이지 진입 시 자동으로 이전 음성 명령 정리
  - 페이지별 Intent 테이블 지원
  - FSM 기반 단계 관리
  - TTS → STT 타이밍 충돌 방지

### 2. 로그인 페이지 Intent 테이블
- **위치**: `src/pages/LoginPage.voice.ts`
- **Intent 목록**:
  - `email`: 이메일 입력
  - `password`: 비밀번호 입력
  - `login`: 로그인 실행
  - `signup`: 회원가입 페이지로 이동
  - `guest`: 게스트 모드
  - `phone`: 전화번호 로그인
  - `forgot`: 비밀번호 찾기
  - `cancel`: 취소

### 3. 회원가입 페이지 Intent 테이블
- **위치**: `src/pages/SignupPage.voice.ts`
- **Intent 목록**:
  - `email`: 이메일 입력
  - `password`: 비밀번호 입력
  - `passwordCheck`: 비밀번호 확인 입력
  - `submit`: 회원가입 완료
  - `back`: 로그인 페이지로 이동
  - `cancel`: 취소

## 📝 LoginPage 적용 방법

```typescript
// LoginPage.tsx 상단에 추가
import { usePageVoiceCommand } from "@/voice/usePageVoiceCommand";
import { loginIntents, createLoginIntentHandler } from "./LoginPage.voice";

// 컴포넌트 내부
const speak = useCallback((text: string, onEnd?: () => void) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 1.1;
  u.onend = () => {
    if (onEnd) setTimeout(() => onEnd(), 300);
  };
  window.speechSynthesis.speak(u);
}, []);

// Intent 핸들러 생성
const handleIntent = useMemo(
  () =>
    createLoginIntentHandler(
      navigate,
      () => startVoiceEmail(), // 이메일 입력 시작
      () => startVoicePassword(), // 비밀번호 입력 시작
      () => handleLogin() // 로그인 실행
    ),
  [navigate, handleLogin]
);

// 음성 명령 훅 사용
const {
  startVoiceCommand,
  startVoiceEmail,
  startVoicePassword,
  voiceStep,
  isListening,
  preview,
  currentIntent,
} = usePageVoiceCommand({
  speak,
  intents: loginIntents,
  onIntent: handleIntent,
  onEmailChange: setEmail,
  onPasswordChange: setPassword,
  onSubmit: () => handleLogin(),
  initialMessage: "음성 로그인 모드입니다. 이메일 또는 비밀번호 입력을 말씀하세요.",
});
```

## 📝 SignupPage 적용 방법

```typescript
// SignupPage.tsx 상단에 추가
import { usePageVoiceCommand } from "@/voice/usePageVoiceCommand";
import { signupIntents, createSignupIntentHandler } from "./SignupPage.voice";

// 컴포넌트 내부
const speak = useCallback((text: string, onEnd?: () => void) => {
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "ko-KR";
  u.rate = 1.1;
  u.onend = () => {
    if (onEnd) setTimeout(() => onEnd(), 300);
  };
  window.speechSynthesis.speak(u);
}, []);

// Intent 핸들러 생성
const handleIntent = useMemo(
  () =>
    createSignupIntentHandler(
      navigate,
      () => startVoiceEmail(), // 이메일 입력 시작
      () => startVoicePassword(), // 비밀번호 입력 시작
      () => startVoiceConfirmPassword(), // 비밀번호 확인 입력 시작
      () => handleSignup() // 회원가입 실행
    ),
  [navigate, handleSignup]
);

// 음성 명령 훅 사용
const {
  startVoiceCommand,
  startVoiceEmail,
  startVoicePassword,
  startVoiceConfirmPassword,
  voiceStep,
  isListening,
  preview,
  currentIntent,
} = usePageVoiceCommand({
  speak,
  intents: signupIntents,
  onIntent: handleIntent,
  onEmailChange: setEmail,
  onPasswordChange: setPassword,
  onConfirmPasswordChange: setConfirm,
  onSubmit: () => handleSignup(),
  initialMessage: "회원가입 페이지입니다. 이메일 입력을 시작하려면 마이크 버튼을 누르고 '이메일 입력'이라고 말씀해주세요.",
});
```

## 🎯 핵심 특징

### ✅ 페이지별 독립성
- 각 페이지마다 완전히 독립적인 Intent 테이블
- 페이지 이동 시 자동으로 이전 시스템 정리
- 다른 페이지의 Intent가 간섭하지 않음

### ✅ 안정성
- TTS → STT 타이밍 충돌 방지
- STT 시작 실패 시 자동 재시도
- 페이지 진입/이탈 시 완전한 정리

### ✅ 확장성
- 새로운 페이지 추가 시 Intent 테이블만 정의하면 됨
- FSM 기반 단계 관리로 복잡한 플로우 지원
- 공통 로직은 `usePageVoiceCommand`에 집중

## 🚀 다음 단계

1. **LoginPage.tsx 수정**: 기존 `useVoiceCommand`를 `usePageVoiceCommand`로 교체
2. **SignupPage.tsx 수정**: 기존 `useVoiceCommand`를 `usePageVoiceCommand`로 교체
3. **테스트**: 각 페이지에서 음성 명령이 독립적으로 동작하는지 확인

## 📌 주의사항

- 기존 `useVoiceCommand`는 유지하되, 새로운 페이지에는 `usePageVoiceCommand` 사용 권장
- Intent 테이블은 각 페이지의 `.voice.ts` 파일에서 관리
- 페이지 진입 시 자동으로 초기화되므로 별도의 정리 코드 불필요

