# 🔥 SMS / Phone Auth 이벤트 로그 수집 가이드

## 📋 개요

SMS 요청/성공/실패를 모두 기록하여 운영에서 "왜 안 오지?"를 데이터로 파악할 수 있도록 합니다.

**목표:**
- SMS 요청 / 성공 / 실패 전부 기록
- DAILY_LIMIT, too-many-requests 실제 발생률 파악
- 나중에 차단/완화/UX 개선 근거 데이터 확보

**원칙:**
- ❌ 콘솔 로그만 → 운영에서 쓸모 없음
- ✅ 이벤트 단위 로그 → 나중에 다 살림

---

## ✅ 구현된 컴포넌트

### 1️⃣ `authLogger` 유틸

**파일:** `src/lib/authLogger.ts`

**역할:**
- Phone Auth 관련 이벤트 로그 저장
- Firestore `auth_logs` 컬렉션에 기록
- 로깅 실패 시 UX에 영향 없음 (조용히 실패)

**이벤트 타입:**
- `sms_request`: SMS 요청 시도
- `sms_success`: SMS 전송 성공
- `sms_error`: SMS 전송 실패
- `verify_success`: 인증번호 확인 성공
- `verify_error`: 인증번호 확인 실패

**사용 예시:**
```typescript
import { logPhoneAuthEvent } from "@/lib/authLogger";

await logPhoneAuthEvent({
  type: "sms_request",
  phoneNumber: "+821012345678",
});

await logPhoneAuthEvent({
  type: "sms_error",
  phoneNumber: "+821012345678",
  errorCode: "auth/too-many-requests",
  errorMessage: "Too many requests",
});
```

---

### 2️⃣ `sendSMSCode` 로그 연결

**파일:** `src/utils/authPhone.ts`

**연결 포인트:**
1. SMS 요청 시도 → `sms_request` 로그
2. SMS 전송 성공 → `sms_success` 로그
3. SMS 전송 실패 → `sms_error` 로그 (에러 코드/메시지 포함)

---

### 3️⃣ `confirmSMSCode` 로그 연결

**파일:** `src/utils/authPhone.ts`

**연결 포인트:**
1. 인증번호 확인 성공 → `verify_success` 로그
2. 인증번호 확인 실패 → `verify_error` 로그 (에러 코드/메시지 포함)

---

## 🔐 Firestore 보안 규칙

**파일:** `firestore.rules`

```javascript
/* 🔥 Auth Logs (Phone Auth 이벤트 로그) - SMS 요청/성공/실패 추적 */
match /auth_logs/{logId} {
  // 읽기: 관리자만 (운영 관측용)
  allow read: if isGlobalAdmin();
  // 쓰기: 로그인 사용자 모두 가능 (자신의 인증 이벤트 기록)
  allow create: if isSignedIn();
  // 수정/삭제: 금지 (로그는 불변)
  allow update, delete: if false;
}
```

**포인트:**
- 클라이언트는 읽기 금지 (운영 전용)
- 로그인 사용자는 자신의 이벤트 기록 가능
- 로그는 불변 (수정/삭제 금지)

---

## 📊 로그 데이터 구조

### `auth_logs` 컬렉션

```typescript
interface PhoneAuthEvent {
  uid: string | null;              // Firebase Auth UID (로그인 전이면 null)
  phoneNumber: string | null;       // 전화번호 (마스킹 권장)
  type: PhoneAuthEventType;        // 이벤트 타입
  errorCode?: string | null;        // 에러 코드 (실패 시)
  errorMessage?: string | null;     // 에러 메시지 (실패 시)
  userAgent?: string;               // 브라우저 User Agent
  createdAt: Timestamp;            // 서버 타임스탬프
}
```

---

## 🧠 이 로그 구조가 좋은 이유

### ✅ DAILY_LIMIT 실제 발생 횟수
- `sms_error` + `errorCode: "auth/too-many-requests"` 필터링
- 일일 발생 횟수 추적 가능

### ✅ 특정 통신사/브라우저 문제 추적
- `userAgent` 필드로 브라우저별 실패율 분석
- 특정 통신사 번호 패턴 분석 가능

### ✅ "SMS 안 와요" → 팩트로 대응 가능
- 사용자 문의 시 `auth_logs`에서 실제 이벤트 확인
- 에러 코드 기반 정확한 원인 파악

### ✅ 나중에 Cloud Functions로 자동 차단/완화 가능
- `auth_logs` 데이터 기반 자동화 로직 구현 가능
- 어뷰징 패턴 감지 및 자동 대응

---

## 📈 운영 분석 예시

### 1. 일일 SMS 실패율 추적

```javascript
// Cloud Functions에서 실행
const today = new Date();
today.setHours(0, 0, 0, 0);

const logs = await db.collection("auth_logs")
  .where("createdAt", ">=", today)
  .get();

const total = logs.size;
const errors = logs.docs.filter(doc => doc.data().type === "sms_error").length;
const success = logs.docs.filter(doc => doc.data().type === "sms_success").length;

console.log(`일일 SMS 통계: 총 ${total}건, 성공 ${success}건, 실패 ${errors}건`);
console.log(`실패율: ${(errors / total * 100).toFixed(2)}%`);
```

### 2. 특정 에러 코드 발생 횟수

```javascript
const tooManyRequests = logs.docs.filter(
  doc => doc.data().errorCode === "auth/too-many-requests"
).length;

console.log(`too-many-requests 발생: ${tooManyRequests}건`);
```

### 3. 브라우저별 실패율 분석

```javascript
const browserStats = {};
logs.docs.forEach(doc => {
  const userAgent = doc.data().userAgent || "unknown";
  const browser = userAgent.includes("Chrome") ? "Chrome" :
                  userAgent.includes("Safari") ? "Safari" :
                  userAgent.includes("Firefox") ? "Firefox" : "Other";
  
  if (!browserStats[browser]) {
    browserStats[browser] = { total: 0, errors: 0 };
  }
  
  browserStats[browser].total++;
  if (doc.data().type === "sms_error") {
    browserStats[browser].errors++;
  }
});

console.log("브라우저별 실패율:", browserStats);
```

---

## ✅ 체크리스트

### 개발 환경
- [ ] `authLogger` 유틸 정상 작동 확인
- [ ] `sendSMSCode`에서 로그 저장 확인
- [ ] `confirmSMSCode`에서 로그 저장 확인
- [ ] Firestore Rules 정상 작동 확인

### 운영 환경
- [ ] `auth_logs` 컬렉션에 로그 저장 확인
- [ ] 관리자 대시보드에서 로그 조회 가능 확인
- [ ] 일일 통계 자동 수집 확인 (선택)

---

## 🚨 주의사항

1. **개인정보 보호**
   - 전화번호는 마스킹 권장 (예: `010-****-5678`)
   - `authLogger`에서 자동 마스킹 처리

2. **로그 저장 실패**
   - 로그 저장 실패해도 SMS 전송은 계속 진행
   - UX에 영향 없도록 조용히 실패 처리

3. **Firestore 비용**
   - 로그가 많아지면 Firestore 읽기 비용 증가
   - 주기적으로 오래된 로그 삭제 권장 (Cloud Functions)

---

## 📞 문제 해결

### 문제: 로그가 저장되지 않음

**원인:**
- Firestore Rules에서 쓰기 권한 없음
- 네트워크 오류

**해결:**
1. Firestore Rules 확인
2. 브라우저 콘솔에서 에러 확인
3. 네트워크 탭에서 Firestore 요청 확인

---

### 문제: 로그가 너무 많아서 비용 증가

**원인:**
- 로그 삭제 정책 없음

**해결:**
1. Cloud Functions로 오래된 로그 자동 삭제
2. 로그 보관 기간 설정 (예: 30일)

---

## 🎯 성공 기준

### 개발 환경
- ✅ SMS 요청 시 `auth_logs`에 `sms_request` 저장
- ✅ SMS 성공 시 `auth_logs`에 `sms_success` 저장
- ✅ SMS 실패 시 `auth_logs`에 `sms_error` 저장 (에러 코드 포함)
- ✅ 인증번호 확인 성공 시 `auth_logs`에 `verify_success` 저장
- ✅ 인증번호 확인 실패 시 `auth_logs`에 `verify_error` 저장

### 운영 환경
- ✅ 일일 SMS 통계 수집 가능
- ✅ 특정 에러 코드 발생 횟수 추적 가능
- ✅ 브라우저별 실패율 분석 가능
- ✅ 사용자 문의 시 정확한 원인 파악 가능
