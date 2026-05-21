# 🔧 QR 로그인 도메인 고정 가이드

## 🎯 변경 사항

### 문제점
- QR 코드에 들어가는 URL이 `window.location.origin`을 사용하여 환경에 따라 달라짐
- 개발 환경: `http://localhost:5173`
- 프로덕션: `https://yago-vibe-spt.web.app`
- 실서비스 기준에서 대표 도메인(`yagovibe.com`) 사용 필요

### 해결 방법
- QR URL 생성을 대표 도메인(`yagovibe.com`)으로 고정
- 환경 변수(`VITE_APP_BASE_URL`)로 관리 가능하도록 설정

---

## ✅ 수정 완료

### 파일: `src/lib/qrPhoneLogin.ts`

**변경 전:**
```typescript
export function generateQRLoginURL(sessionId: string): string {
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : "https://yago-vibe-spt.web.app";
  
  return `${baseUrl}/qr-login?sessionId=${sessionId}`;
}
```

**변경 후:**
```typescript
export function generateQRLoginURL(sessionId: string): string {
  // 🔥 실서비스: 대표 도메인으로 고정
  // 환경 변수가 있으면 사용, 없으면 기본값으로 yagovibe.com 사용
  const baseUrl = import.meta.env.VITE_APP_BASE_URL || "https://yagovibe.com";
  
  return `${baseUrl}/qr-login?sessionId=${sessionId}`;
}
```

---

## 🔍 환경 변수 설정 (선택사항)

### 개발 환경에서 다른 도메인 사용 시

`.env.local` 파일 생성:
```bash
VITE_APP_BASE_URL=https://yagovibe.com
```

또는 개발 환경에서 테스트용:
```bash
VITE_APP_BASE_URL=http://localhost:5173
```

---

## ✅ 변경 사항 확인

### 체크리스트

- [ ] QR 코드 생성 후 개발자 도구에서 `value` 속성 확인
- [ ] URL이 `https://yagovibe.com/qr-login?sessionId=xxx` 형식인지 확인
- [ ] `window.location.origin` 사용하지 않는지 확인

---

## 🎯 기대 효과

### 1. PWA/앱 열기 판단 로직 안정성
- 모바일 OS가 `yagovibe.com`을 메인 서비스로 인식
- 앱/브라우저 분기 판단이 안정적

### 2. 사용자 신뢰 & UX
- 공식 도메인으로 인식
- 로그인/전화번호 입력 시 신뢰도 향상

### 3. 향후 확장성
- 결제, 인증, 딥링크 등 모든 기능이 대표 도메인 기준으로 설계 가능

---

## 🧪 테스트 방법

### 1. PC에서 QR 생성
1. `/login/qr-phone` 접속
2. QR 코드 생성
3. 개발자 도구에서 QR 코드 `value` 속성 확인
4. URL이 `https://yagovibe.com/qr-login?sessionId=xxx` 형식인지 확인

### 2. 모바일에서 스캔
1. 기본 카메라 앱으로 QR 스캔
2. "브라우저에서 열기" 선택
3. 브라우저 주소창에 `yagovibe.com` 표시 확인
4. 전화번호 입력 화면 표시 확인

---

## 🏁 최종 확인

### 정상 동작 기준
- ✅ QR 코드 URL이 `https://yagovibe.com/qr-login?sessionId=xxx` 형식
- ✅ 모바일 스캔 시 `yagovibe.com`으로 열림
- ✅ 전화번호 입력 화면 표시
- ✅ 에러 없음

---

**변경 완료! 테스트 진행해주세요.** ✅
