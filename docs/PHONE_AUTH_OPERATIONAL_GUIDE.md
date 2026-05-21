# 📱 실전 전화번호 가입 시스템 운영 가이드

## ✅ 현재 상태 (최종 판정)

| 항목 | 상태 | 비고 |
|------|------|------|
| 전화번호 로그인 | ✅ 정상 동작 | reCAPTCHA v2 fallback 정상 |
| 운영/개발 분기 | ✅ 완료 | PROD에서 테스트 번호 차단 |
| SMS 실패 UX | ✅ 완료 | 에러 분류 및 친화적 메시지 |
| 유저 프로필 자동 생성 | ✅ 완료 | 회원 가입/재로그인 자동 처리 |

---

## 🔥 핵심 구조 (Firebase 설계 원칙)

Firebase는 의도적으로 이렇게 나뉘어 있다:

```
Auth        → "너 누구냐" (인증)
Firestore  → "너 어떤 유저냐" (프로필)
App Check  → "너 사람 맞냐" (봇 방어)
```

### 의도

- **로그인 ≠ 회원**: Auth는 인증만, Firestore는 유저 데이터
- **봇 방어 ≠ 인증**: App Check는 Firestore/Functions 보호용
- **확장성 확보**: 프로필 기반 권한/결제/커뮤니티 가능

---

## 🚀 운영 체크리스트

### ✅ 1. 운영/개발 분기 확인

**개발 환경 (`.env.development`)**
```env
VITE_AUTH_MODE=DEV
```

**운영 환경 (`.env.production`)**
```env
VITE_AUTH_MODE=PROD
```

**자동 차단**
- 운영 환경에서 `+821056890800` 사용 시 즉시 차단
- 에러 메시지: "🚫 테스트 번호는 운영 환경에서 사용할 수 없습니다."

---

### ✅ 2. SMS 실패 원인 분류

**에러 타입**
- `SMS_QUOTA`: 일일 SMS 한도 초과
- `CAPTCHA`: 봇 감지 / 보안 검증 실패
- `RATE_LIMIT`: 과도한 요청 (DDoS 방어)
- `INVALID_PHONE`: 전화번호 형식 오류
- `CODE_EXPIRED`: 인증번호 만료
- `INVALID_CODE`: 잘못된 인증번호
- `RETRY_LIMIT`: 재시도 한도 초과
- `UNKNOWN`: 알 수 없는 오류

**사용자 메시지**
- 명확한 원인 설명
- 다음 액션 안내
- 고객센터 연락처 (필요 시)

---

### ✅ 3. 유저 프로필 자동 생성

**신규 유저 (회원 가입)**
```typescript
{
  uid: string,
  phone: string,
  provider: "phone",
  role: "user",
  status: "active",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
}
```

**기존 유저 (재로그인)**
- 기존 프로필 업데이트 (merge)
- `createdAt` 유지 (가입일 보존)
- `status` 유지 (suspended 등 상태 보존)

---

## 🧪 실전 테스트 시나리오

### 1. 개발 환경 테스트

1. `.env.development`에 `VITE_AUTH_MODE=DEV` 설정
2. Firebase Console에 테스트 번호 등록 (`+821056890800`, 코드: `123456`)
3. 개발 서버 실행: `npm run dev`
4. 테스트 번호로 인증 테스트
5. ✅ 실제 SMS 발송 안 됨

### 2. 운영 환경 테스트

1. `.env.production`에 `VITE_AUTH_MODE=PROD` 설정
2. Firebase Console에서 테스트 번호 삭제
3. 빌드: `npm run build`
4. 배포: `firebase deploy`
5. 실제 전화번호로 SMS 발송 테스트
6. ✅ Firestore `users/{uid}` 자동 생성 확인

### 3. 운영 환경에서 테스트 번호 차단 확인

1. 운영 환경에서 `+821056890800` 입력 시도
2. ✅ 즉시 차단 및 에러 메시지 표시

---

## 📊 모니터링 포인트

### 에러 로깅

모든 SMS 실패는 `logAuthError()`로 기록:
- 에러 타입
- 원본 에러 코드/메시지
- 컨텍스트 (단계, 전화번호, 재시도 횟수)
- 타임스탬프

### 연동 가능한 서비스

```typescript
// 예: Analytics 연동
trackEvent('phone_auth_error', errorInfo);

// 예: 모니터링 서비스 연동
sendToMonitoringService('sms_failure', errorInfo);
```

---

## ⚠️ 주의사항

1. **운영 환경에서는 반드시 `VITE_AUTH_MODE=PROD` 설정**
2. **운영 환경에서는 Firebase Console 테스트 번호 삭제 필수**
3. **Blaze 요금제 필수 (실전 SMS 발송)**
4. **테스트 번호는 운영 환경에서 자동 차단됨**

---

## 🎯 다음 단계 (선택)

1. 전화번호 변경 / 재인증
2. SMS 비용 최소화 (국가별 전략)
3. 봇/어뷰징 서버 레벨 차단
4. 전화번호 → 온보딩 자동 연결

---

## 🔥 최종 판정

**실전 전화번호 가입 시스템이 완성되었습니다.**

- ✅ 운영/개발 분기 완료
- ✅ SMS 실패 UX 완료
- ✅ 유저 프로필 자동 생성 완료
- ✅ 사고 방지 메커니즘 완료

**이제 실제 서비스로 배포 가능한 상태입니다.** 🚀
