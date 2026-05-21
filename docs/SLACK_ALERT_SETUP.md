# 🔥 SMS 실패 자동 Slack 알림 설정 가이드

## 📋 개요

SMS 인증 오류를 실시간으로 감지하고 Slack으로 알림을 보내는 시스템입니다.

**목표:**
- "SMS 안 와요"가 사건 터지기 전에 Slack에 알림
- DAILY_LIMIT / too-many-requests 초기 징후 탐지
- 운영팀이 즉시 대응 가능

**원칙:**
- 클라 로그는 이미 있음
- Cloud Functions가 auth_logs 감시 → 조건 만족 시 Slack 알림
- 중요한 에러만 필터링 (너무 많은 알림 방지)

---

## ✅ 구현된 컴포넌트

### 1️⃣ `alertOnPhoneAuthError` Cloud Function

**파일:** `functions/src/authAlert.ts`

**역할:**
- `auth_logs` 컬렉션에 새 문서 생성 시 감지
- 중요한 에러만 필터링 (too-many-requests, quota, DAILY_LIMIT)
- Slack Webhook으로 실시간 알림

**필터링 조건:**
- `errorCode`에 `too-many-requests`, `quota`, `quota-exceeded`, `DAILY_LIMIT` 포함
- `errorMessage`에 `too many`, `quota`, `daily limit` 포함

---

## 🔧 설정 방법

### 1️⃣ Slack Incoming Webhook 준비

1. **Slack 워크스페이스 접속**
2. **앱 추가** → "Incoming Webhooks" 검색
3. **Incoming Webhooks 활성화**
4. **채널 선택** (예: `#alerts`, `#ops`, `#monitoring`)
5. **Webhook URL 발급**

예시 URL:
```
<SLACK_WEBHOOK_URL>
```

---

### 2️⃣ Firebase Functions 환경 변수 설정

**로컬에서 설정:**
```bash
firebase functions:config:set slack.webhook="<SLACK_WEBHOOK_URL>"
```

**설정 확인:**
```bash
firebase functions:config:get
```

**결과 예시:**
```json
{
  "slack": {
    "webhook": "<SLACK_WEBHOOK_URL>"
  }
}
```

---

### 3️⃣ Functions 배포

```bash
cd functions
npm install  # 필요한 경우
cd ..
firebase deploy --only functions:alertOnPhoneAuthError
```

**전체 Functions 배포:**
```bash
firebase deploy --only functions
```

---

## 🔔 Slack 알림 예시

### 일반적인 알림

```
🚨 SMS 인증 오류 감지

타입: sms_error
전화번호: 010-****-5678
에러 코드: auth/too-many-requests
에러 메시지: We have blocked all requests from this device...

발생 시간: 2024. 1. 15. 오후 3:30:45
```

### DAILY_LIMIT 알림

```
🚨 SMS 인증 오류 감지

타입: sms_error
전화번호: 010-****-1234
에러 코드: auth/quota-exceeded
에러 메시지: SMS quota exceeded for today

발생 시간: 2024. 1. 15. 오후 4:15:20
```

---

## 🧠 이게 왜 "운영급"이냐면

### ✅ 장애 인지 시간 ↓↓↓
- 유저가 문의하기 전에 운영팀이 먼저 인지
- 사전 대응 가능

### ✅ DAILY_LIMIT 접근 사전 감지
- 쿼터 초과 전에 경고
- 비용 관리 가능

### ✅ 특정 통신사/지역 문제 파악
- 패턴 분석 가능
- 원인 파악 빠름

### ✅ 고객 CS 전에 대응 가능
- 유저 문의 전에 해결
- CS 부담 감소

---

## 🔧 고급 설정 (선택)

### 1️⃣ 알림 빈도 제한

너무 많은 알림을 방지하려면:

```typescript
// functions/src/authAlert.ts에 추가
const ALERT_COOLDOWN_MINUTES = 5; // 5분마다 최대 1회 알림

// Firestore에 마지막 알림 시간 저장
const lastAlertRef = admin.firestore().doc("alerts/lastPhoneAuthError");
const lastAlert = await lastAlertRef.get();

if (lastAlert.exists()) {
  const lastTime = lastAlert.data()?.timestamp?.toMillis() || 0;
  const now = Date.now();
  const diffMinutes = (now - lastTime) / 1000 / 60;
  
  if (diffMinutes < ALERT_COOLDOWN_MINUTES) {
    console.log("⏸️ [authAlert] 쿨다운 중, 알림 스킵");
    return;
  }
}

// 알림 전송 후 마지막 알림 시간 업데이트
await lastAlertRef.set({
  timestamp: admin.firestore.FieldValue.serverTimestamp(),
});
```

### 2️⃣ 알림 그룹화

같은 에러가 여러 번 발생하면 그룹화:

```typescript
// 같은 에러 코드가 10분 내에 5회 이상 발생하면 알림
const errorGroupRef = admin.firestore()
  .collection("errorGroups")
  .doc(`${errorCode}_${Math.floor(Date.now() / 600000)}`); // 10분 단위

await errorGroupRef.set({
  count: admin.firestore.FieldValue.increment(1),
  lastOccurred: admin.firestore.FieldValue.serverTimestamp(),
}, { merge: true });

const group = await errorGroupRef.get();
if (group.data()?.count >= 5) {
  // 그룹화된 알림 전송
}
```

### 3️⃣ 알림 채널 분리

에러 심각도에 따라 채널 분리:

```typescript
const CRITICAL_WEBHOOK = functions.config().slack?.webhookCritical;
const WARNING_WEBHOOK = functions.config().slack?.webhookWarning;

const isCritical = errorCode.includes("quota-exceeded");
const webhook = isCritical ? CRITICAL_WEBHOOK : WARNING_WEBHOOK;
```

---

## ✅ 체크리스트

### 개발 환경
- [ ] Slack Incoming Webhook 생성
- [ ] Firebase Functions 환경 변수 설정
- [ ] `alertOnPhoneAuthError` 함수 배포
- [ ] 테스트 SMS 오류 발생 → Slack 알림 확인

### 운영 환경
- [ ] Slack 알림 정상 작동 확인
- [ ] 중요한 에러만 필터링 확인
- [ ] 알림 빈도 적절한지 확인
- [ ] 운영팀이 알림을 받는지 확인

---

## 🚨 주의사항

1. **Slack Webhook URL 보안**
   - 환경 변수로 관리 (코드에 하드코딩 금지)
   - Git에 커밋하지 않기

2. **알림 빈도**
   - 너무 많은 알림은 오히려 방해
   - 쿨다운 또는 그룹화 고려

3. **에러 필터링**
   - 중요한 에러만 알림
   - 일반적인 에러는 로그만 남기기

---

## 📞 문제 해결

### 문제: Slack 알림이 오지 않음

**원인:**
- Slack Webhook URL이 설정되지 않음
- Functions 배포 실패
- Firestore Rules 문제

**해결:**
1. `firebase functions:config:get`로 Webhook URL 확인
2. Functions 로그 확인: `firebase functions:log`
3. Firestore Rules에서 `auth_logs` 쓰기 권한 확인

---

### 문제: 너무 많은 알림

**원인:**
- 필터링 조건이 너무 넓음
- 쿨다운 로직 없음

**해결:**
1. 필터링 조건 강화 (중요한 에러만)
2. 쿨다운 로직 추가
3. 알림 그룹화 구현

---

## 🎯 성공 기준

### 개발 환경
- ✅ SMS 오류 발생 시 Slack 알림 전송
- ✅ 중요한 에러만 필터링
- ✅ 전화번호 마스킹 정상 작동

### 운영 환경
- ✅ 운영팀이 실시간으로 알림 수신
- ✅ DAILY_LIMIT 접근 시 사전 경고
- ✅ 장애 인지 시간 단축
