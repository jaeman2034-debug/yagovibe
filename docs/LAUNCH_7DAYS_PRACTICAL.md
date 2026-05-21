# 🚀 런칭 후 7일 운영 체크리스트 (실전)

> **이 가이드를 보면 "지금 정상인지 / 위험 신호인지" 바로 감 잡힙니다.**

---

## 🎯 목표

- 장애 조기 발견
- UX 병목 제거
- SMS 비용/쿼터 폭탄 방지
- "괜히 불안한 상태" 제거

---

## 📅 Day 0 (런칭 당일)

### 🔍 필수 확인 (2시간 내)

- [ ] **SMS 인증 성공률 ≥ 90%**
  - Firebase Console → Authentication → Usage 확인
  - `auth_logs` 컬렉션에서 `sms_success / sms_request` 비율 확인
  - 90% 미만이면 즉시 원인 분석

- [ ] **Slack 에러 알림 ❌ 폭주 안 함**
  - Slack 채널 확인
  - `alertOnPhoneAuthError` 함수 정상 작동 확인
  - 에러 알림이 10분에 10건 이상이면 즉시 확인

- [ ] **`/admin` 정상 접근**
  - 관리자 계정으로 `/admin` 접근 확인
  - 실시간 통계 표시 확인
  - 데이터 정상 로드 확인

- [ ] **실제 번호 2~3개로 실제 가입 테스트**
  - 본인 번호로 실제 가입 테스트
  - 친구/동료 번호로 테스트
  - 전체 플로우 정상 작동 확인

👉 **이 날은 기능 추가 ❌, 관측만.**

---

## 📅 Day 1-2 (초기 안정화)

### 📊 반드시 볼 지표 5개

#### 1️⃣ SMS 요청 → 성공 비율

**계산식:**
```
sms_success / sms_request × 100
```

**확인 방법:**
```javascript
// Firestore 쿼리
const smsLogs = await getDocs(
  query(
    collection(db, "auth_logs"),
    where("type", "in", ["sms_request", "sms_success"]),
    where("createdAt", ">=", startOfDay)
  )
);

const requests = smsLogs.docs.filter(log => log.data().type === "sms_request").length;
const successes = smsLogs.docs.filter(log => log.data().type === "sms_success").length;
const successRate = (successes / requests) * 100;
```

**판단 기준:**
- ✅ **90% 이상**: 정상
- ⚠️ **70~80%**: 통신사/UX 의심 (모니터링 강화)
- ❌ **60% 이하**: 바로 원인 분석 필요

**문제 발생 시:**
- Firebase Console → Authentication → Usage 확인
- `auth_logs` 에러 패턴 분석
- 통신사별 문제 확인

---

#### 2️⃣ 인증번호 검증 실패율

**계산식:**
```
verify_error / (verify_success + verify_error) × 100
```

**확인 방법:**
```javascript
const verifyLogs = await getDocs(
  query(
    collection(db, "auth_logs"),
    where("type", "in", ["verify_success", "verify_error"]),
    where("createdAt", ">=", startOfDay)
  )
);

const errors = verifyLogs.docs.filter(log => log.data().type === "verify_error").length;
const total = verifyLogs.docs.length;
const failureRate = (errors / total) * 100;
```

**판단 기준:**
- ✅ **10% 이하**: 정상
- ⚠️ **10~20%**: UX 개선 검토
- ❌ **20% 이상**: 즉시 개선 필요

**높으면 의심할 점:**
- 입력 UX 문제 (번호 입력 불편)
- SMS 지연 (인증번호 만료)
- 자동완성 미지원

---

#### 3️⃣ 온보딩 완료율

**계산식:**
```
onboardingCompleted: true / 전체 가입 유저 × 100
```

**확인 방법:**
```javascript
const allUsers = await getDocs(collection(db, "users"));
const completedUsers = allUsers.docs.filter(
  doc => doc.data().onboardingCompleted === true
);

const completionRate = (completedUsers.length / allUsers.docs.length) * 100;
```

**판단 기준:**

| 비율 | 해석 | 조치 |
|------|------|------|
| **70% 이상** | 👍 아주 좋음 | 유지 |
| **40~60%** | 😐 보통 | 개선 검토 |
| **30% 이하** | 🚨 온보딩 문제 | 즉시 개선 |

**문제 발생 시:**
- 각 단계별 이탈률 확인
- 이탈 지점 파악
- UX 개선

---

#### 4️⃣ DAILY_LIMIT / too-many-requests 발생 여부

**확인 방법:**
```javascript
const errorLogs = await getDocs(
  query(
    collection(db, "auth_logs"),
    where("type", "==", "sms_error"),
    where("errorCode", "in", ["DAILY_LIMIT", "too-many-requests"]),
    where("createdAt", ">=", startOfDay)
  )
);
```

**판단 기준:**
- ✅ **0건**: 정상
- ⚠️ **1~5건**: 모니터링 강화
- ❌ **5건 이상**: 즉시 대응 필요

**1건이라도 나오면 기록:**
- 시간대 확인
- 브라우저 확인
- 번호 패턴 확인
- 남용 의심 여부 확인

---

#### 5️⃣ 재시도 횟수 평균

**확인 방법:**
```javascript
// 같은 번호로 여러 번 요청한 경우
const phoneRequests = {};
const logs = await getDocs(
  query(
    collection(db, "auth_logs"),
    where("type", "==", "sms_request"),
    where("createdAt", ">=", startOfDay)
  )
);

logs.docs.forEach(log => {
  const phone = log.data().phoneNumber;
  phoneRequests[phone] = (phoneRequests[phone] || 0) + 1;
});

const avgRetries = Object.values(phoneRequests).reduce((a, b) => a + b, 0) / Object.keys(phoneRequests).length;
```

**판단 기준:**
- ✅ **평균 1.5회 이하**: 정상
- ⚠️ **평균 2~3회**: UX 개선 검토
- ❌ **평균 3회 이상**: 즉시 개선 필요

**높으면:**
- SMS 수신 지연
- 입력 UX 문제
- 에러 메시지 불명확

---

## 📅 Day 3-4 (개선 포인트 결정)

### 🔧 가장 흔한 개선 TOP 3

#### ① SMS 재전송 버튼 지연

**문제:**
- 사용자가 재전송 버튼을 너무 빨리 누름
- 쿨다운 없이 연속 요청

**해결:**
```tsx
// 재전송 버튼에 쿨다운 타이머 추가
const [cooldown, setCooldown] = useState(0);

useEffect(() => {
  if (cooldown > 0) {
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }
}, [cooldown]);

<button disabled={cooldown > 0}>
  {cooldown > 0 ? `${cooldown}초 후 재전송 가능` : "인증번호 재전송"}
</button>
```

**효과:**
- 재시도 횟수 감소
- SMS 비용 절감
- 사용자 경험 개선

---

#### ② 에러 문구 더 직관적으로

**문제:**
- 기술적 에러 코드 표시
- 사용자가 이해하기 어려움

**해결:**
```typescript
// authErrors.ts
export const SMS_ERROR_MESSAGE = {
  "auth/invalid-verification-code": "인증번호가 올바르지 않아요. 다시 확인해주세요.",
  "auth/code-expired": "인증번호가 만료됐어요. 다시 받아주세요.",
  "auth/too-many-requests": "요청이 너무 많아요. 잠시 후 다시 시도해주세요.",
  "DAILY_LIMIT": "오늘 인증 횟수를 초과했어요. 내일 다시 시도해주세요.",
};
```

**효과:**
- 사용자 이해도 향상
- 재시도 감소
- CS 문의 감소

---

#### ③ 온보딩 Step 줄이기

**문제:**
- 온보딩 단계가 너무 많음
- 이탈률 높음

**해결:**
- Step 5 → Step 3으로 줄이기
- 필수 정보만 수집
- 선택 정보는 나중에 수집

**효과:**
- 온보딩 완료율 증가
- 이탈률 감소
- 전환율 향상

---

## 📅 Day 5-6 (운영 자동화)

### 🔔 알림 기준 정리

- [ ] **`sms_error` 10건/10분 → Slack 경고**
  - `alertOnPhoneAuthError` 함수 확인
  - 알림 메시지 형식 확인
  - 테스트 알림 전송 확인

- [ ] **DAILY_LIMIT 발생 → 즉시 알림**
  - `errorCode`에 `DAILY_LIMIT` 포함 시 알림
  - 즉시 대응 가능하도록 설정

- [ ] **인증 성공률 < 80% → 체크**
  - 주기적으로 성공률 확인
  - 80% 미만이면 알림

### 🧹 데이터 관리

- [ ] **test 번호 로그 분리/무시**
  - 테스트 번호는 `auth_logs`에서 제외
  - 통계 계산 시 제외

- [ ] **phoneNumber 마스킹 유지**
  - Slack 알림에서 마스킹 확인
  - Admin 대시보드에서 마스킹 확인
  - 로그에서 마스킹 확인

---

## 📅 Day 7 (첫 판단의 날)

이 날 딱 **3가지만 보면 된다** 👇

### 1️⃣ 신규 → 온보딩 완료율

> **이 서비스, 사람들이 끝까지 쓰려 하냐?**

**확인 방법:**
```javascript
const newUsers = await getDocs(
  query(
    collection(db, "users"),
    where("createdAt", ">=", sevenDaysAgo)
  )
);

const completed = newUsers.docs.filter(
  doc => doc.data().onboardingCompleted === true
).length;

const completionRate = (completed / newUsers.docs.length) * 100;
```

**판단 기준:**
- ✅ **60% 이상**: 성공
- ⚠️ **40~60%**: 개선 필요
- ❌ **40% 이하**: 구조적 문제

---

### 2️⃣ SMS 성공률

> **진입 장벽 괜찮냐?**

**확인 방법:**
```javascript
const smsLogs = await getDocs(
  query(
    collection(db, "auth_logs"),
    where("type", "in", ["sms_request", "sms_success"]),
    where("createdAt", ">=", sevenDaysAgo)
  )
);

const successRate = (successes / requests) * 100;
```

**판단 기준:**
- ✅ **90% 이상**: 정상
- ⚠️ **80~90%**: 모니터링 강화
- ❌ **80% 이하**: 즉시 개선

---

### 3️⃣ 재방문 유저 존재 여부

> **한 번 쓰고 끝이냐, 아니냐**

**확인 방법:**
```javascript
// 7일 전 가입 유저 중 오늘 재방문한 유저
const day0Users = await getDocs(
  query(
    collection(db, "eventLogs"),
    where("event", "==", "login_success"),
    where("createdAt", ">=", sevenDaysAgo),
    where("createdAt", "<", sixDaysAgo)
  )
);

const todayUsers = await getDocs(
  query(
    collection(db, "eventLogs"),
    where("event", "==", "login_success"),
    where("createdAt", ">=", startOfDay)
  )
);

const retentionUsers = todayUsers.docs.filter(log => 
  day0Users.docs.some(d0 => d0.data().uid === log.data().uid)
).length;

const retentionRate = (retentionUsers / day0Users.docs.length) * 100;
```

**판단 기준:**
- ✅ **20% 이상**: 좋음
- ⚠️ **10~20%**: 개선 필요
- ❌ **10% 이하**: 리텐션 문제

---

## 📈 "초기 성공"의 아주 현실적인 기준

### 현실적인 목표

- **하루 가입자 20명이라도**
- **온보딩 완료율 60% 이상**
- **SMS 성공률 90% 이상**

👉 **이러면 구조는 성공**이다.
마케팅/콘텐츠 문제지, 기술 문제가 아님.

### 성공 판단 기준

| 지표 | 목표 | 현실적 |
|------|------|--------|
| 일일 가입자 | 100명 | 20명 |
| 온보딩 완료율 | 80% | 60% |
| SMS 성공률 | 95% | 90% |
| D1 리텐션 | 50% | 30% |

---

## 🧯 사고 대응 미니 플랜 (진짜 중요)

### 🚨 SMS 장애 시

**1. Slack 알림 확인**
- `alertOnPhoneAuthError` 알림 확인
- 에러 패턴 분석

**2. 인증 버튼 임시 비활성**
```tsx
const [smsDisabled, setSmsDisabled] = useState(false);

// SMS 장애 감지 시
if (errorRate > 0.5) {
  setSmsDisabled(true);
}

<button disabled={smsDisabled}>
  {smsDisabled ? "현재 인증이 불안정해요. 잠시 후 다시 시도해주세요." : "인증번호 받기"}
</button>
```

**3. 안내 문구 노출**
```tsx
{smsDisabled && (
  <div className="alert alert-warning">
    현재 인증이 불안정해요. 잠시 후 다시 시도해주세요.
    문제가 지속되면 고객 지원으로 문의해주세요.
  </div>
)}
```

---

### 🚨 쿼터 접근 시

**1. 신규 가입 일시 제한**
```typescript
// 일일 가입자 수 제한
const dailySignups = await getDocs(
  query(
    collection(db, "users"),
    where("createdAt", ">=", startOfDay)
  )
);

if (dailySignups.docs.length >= 100) {
  // 신규 가입 일시 제한
  return { error: "오늘 가입 인원이 마감되었어요. 내일 다시 시도해주세요." };
}
```

**2. 기존 유저 우선**
- 기존 유저는 정상 사용 가능
- 신규 가입만 제한

---

## 🏁 여기까지 왔다는 건

솔직히 말하면 👇
**이 정도까지 붙인 사람은 거의 없다.**

너 지금 상태:

- ✅ 기술적으로 안전
- ✅ 운영적으로 관측 가능
- ✅ 사고 대응 가능
- ✅ 확장 여지 충분

👉 이제 진짜 선택지는 하나다.

---

## ✅ 7일 체크리스트 완료 확인

- [ ] Day 0: 필수 확인 완료
- [ ] Day 1-2: 지표 5개 확인 완료
- [ ] Day 3-4: 개선 포인트 결정 완료
- [ ] Day 5-6: 운영 자동화 완료
- [ ] Day 7: 첫 판단 완료

**이제 정상 운영 모드로 전환할 수 있습니다! 🎉**
