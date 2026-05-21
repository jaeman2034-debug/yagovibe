# 📈 초기 지표 뭐 봐야 하는지

> **런칭 후 첫 주에 집중해야 할 핵심 지표를 정리했습니다.**

---

## 🔥 P0 지표 (즉시 확인 필수)

### 1. SMS 인증 성공률

**목표:** 95% 이상

**확인 방법:**
```javascript
// Firestore 쿼리 예시
const smsStats = await getDocs(
  query(
    collection(db, "auth_logs"),
    where("type", "in", ["sms_request", "sms_success", "sms_error"]),
    where("createdAt", ">=", startOfDay)
  )
);

const successRate = smsStats.filter(log => log.type === "sms_success").length 
  / smsStats.filter(log => log.type === "sms_request").length * 100;
```

**문제 발생 시:**
- 90% 미만: 즉시 원인 분석 필요
- Firebase Console → Authentication → Usage 확인
- `auth_logs` 에러 패턴 분석

---

### 2. 온보딩 완료율

**목표:** 70% 이상

**확인 방법:**
```javascript
// Firestore 쿼리 예시
const totalUsers = await getDocs(collection(db, "users"));
const completedUsers = totalUsers.docs.filter(
  doc => doc.data().onboardingCompleted === true
);

const completionRate = completedUsers.length / totalUsers.docs.length * 100;
```

**문제 발생 시:**
- 50% 미만: 온보딩 UX 개선 필요
- 각 단계별 이탈률 확인
- 이탈 지점 파악 및 개선

---

### 3. 일일 신규 가입자 수

**목표:** 지속적 증가 추세

**확인 방법:**
```javascript
// Firestore 쿼리 예시
const newUsers = await getDocs(
  query(
    collection(db, "users"),
    where("createdAt", ">=", startOfDay)
  )
);
```

**문제 발생 시:**
- 급격한 감소: 마케팅/프로모션 확인
- 0명: 서비스 접속 문제 확인

---

## 📊 P1 지표 (주간 확인)

### 4. D1 리텐션 (1일 후 재방문율)

**목표:** 40% 이상

**확인 방법:**
```javascript
// eventLogs 분석
const day1Users = await getDocs(
  query(
    collection(db, "eventLogs"),
    where("event", "==", "login_success"),
    where("createdAt", ">=", sevenDaysAgo),
    where("createdAt", "<", sixDaysAgo)
  )
);

const day2Users = await getDocs(
  query(
    collection(db, "eventLogs"),
    where("event", "==", "login_success"),
    where("createdAt", ">=", sixDaysAgo),
    where("createdAt", "<", fiveDaysAgo)
  )
);

// day1Users 중 day2Users에 포함된 유저 수
const retentionRate = day2Users.filter(user => 
  day1Users.some(d1 => d1.uid === user.uid)
).length / day1Users.length * 100;
```

**문제 발생 시:**
- 30% 미만: 첫 경험 개선 필요
- `FirstActionModal` 효과 확인
- `NextActionBanner` 효과 확인

---

### 5. 온보딩 단계별 이탈률

**목표:** 각 단계 10% 이하 이탈

**확인 방법:**
```javascript
// 각 단계별 유저 수
const step0 = users.filter(u => u.onboardingStep === 0).length;
const step1 = users.filter(u => u.onboardingStep === 1).length;
const step2 = users.filter(u => u.onboardingStep === 2).length;
// ...

// 이탈률 계산
const dropoffRate = {
  step0to1: (step0 - step1) / step0 * 100,
  step1to2: (step1 - step2) / step1 * 100,
  // ...
};
```

**문제 발생 시:**
- 특정 단계 이탈률 높음: 해당 단계 UX 개선
- 전체 이탈률 높음: 온보딩 길이/복잡도 검토

---

### 6. SMS 비용

**목표:** 예산 대비 80% 이하

**확인 방법:**
- Firebase Console → Authentication → Usage
- 일일 SMS 전송량 확인
- 비용 추이 확인

**문제 발생 시:**
- 예산 초과: 남용 패턴 확인
- `auth_logs` 분석
- 제한 강화 검토

---

## 🎯 P2 지표 (월간 확인)

### 7. D7 리텐션 (7일 후 재방문율)

**목표:** 20% 이상

**확인 방법:**
- 7일 전 가입자 중 오늘 재방문한 유저 수
- `eventLogs` 분석

**문제 발생 시:**
- 15% 미만: 장기 리텐션 전략 필요
- 푸시 알림 활용 검토
- 이벤트/프로모션 검토

---

### 8. 평균 세션 시간

**목표:** 5분 이상

**확인 방법:**
- `eventLogs`에서 `login_success`와 다음 이벤트 간 시간
- 또는 Analytics 연동

**문제 발생 시:**
- 3분 미만: 콘텐츠/기능 개선 필요
- 사용자 여정 분석

---

### 9. 첫 행동 선택률

**목표:** 60% 이상

**확인 방법:**
```javascript
const firstActionUsers = await getDocs(
  query(
    collection(db, "eventLogs"),
    where("event", "==", "first_action_selected")
  )
);

const totalUsers = await getDocs(collection(db, "users"));
const selectionRate = firstActionUsers.docs.length / totalUsers.docs.length * 100;
```

**문제 발생 시:**
- 50% 미만: `FirstActionModal` 개선 필요
- 행동 옵션 다양화 검토

---

## 📊 지표 대시보드 구성

### Admin 대시보드에 표시할 지표

1. **실시간 지표**
   - 현재 온라인 유저 수
   - 오늘 신규 가입자 수
   - 오늘 SMS 인증 성공률

2. **일일 지표**
   - 신규 가입자 수
   - 온보딩 완료율
   - SMS 인증 성공률
   - 에러 발생 수

3. **주간 지표**
   - D1 리텐션
   - 온보딩 이탈률
   - SMS 비용

---

## 🚨 지표 이상 징후 대응

### 급격한 지표 하락

**징후:**
- SMS 성공률 10% 이상 하락
- 온보딩 완료율 20% 이상 하락
- 신규 가입자 수 50% 이상 하락

**대응:**
1. 즉시 원인 분석
2. Firebase Console 확인
3. `auth_logs` 분석
4. 필요 시 긴급 수정

---

### 지표 정체

**징후:**
- 신규 가입자 수 증가 없음
- 리텐션 개선 없음

**대응:**
1. 마케팅/프로모션 검토
2. 사용자 피드백 수집
3. 기능 개선 검토

---

## ✅ 지표 확인 루틴

### 일일 (매일 아침)

- [ ] SMS 인증 성공률 확인
- [ ] 전날 신규 가입자 수 확인
- [ ] 에러 발생 여부 확인

### 주간 (매주 월요일)

- [ ] 주간 리포트 작성
- [ ] D1 리텐션 확인
- [ ] 온보딩 이탈률 확인
- [ ] SMS 비용 확인

### 월간 (매월 1일)

- [ ] 월간 리포트 작성
- [ ] D7 리텐션 확인
- [ ] 장기 트렌드 분석
- [ ] 개선 계획 수립

---

## 🎯 목표 설정 예시

### 첫 주 목표 (현실적)

- SMS 인증 성공률: **90% 이상** (95%는 이상적)
- 온보딩 완료율: **60% 이상** (70%는 이상적)
- 신규 가입자: **일일 20명 이상** (100명은 이상적)

### 첫 달 목표 (현실적)

- D1 리텐션: **30% 이상** (40%는 이상적)
- D7 리텐션: **15% 이상** (20%는 이상적)
- 평균 세션 시간: **3분 이상** (5분은 이상적)

### "초기 성공"의 현실적인 기준

> **하루 가입자 20명이라도**
> **온보딩 완료율 60% 이상**
> **SMS 성공률 90% 이상**

👉 **이러면 구조는 성공**이다.
마케팅/콘텐츠 문제지, 기술 문제가 아님.

---

## 📞 지표 확인 도구

### Firebase Console

- Authentication → Usage
- Firestore → Data
- Functions → Logs

### Admin 대시보드

- `/admin` 페이지
- 실시간 통계
- 이벤트 로그

### Slack 알림

- SMS 에러 알림
- 긴급 이슈 알림

---

**이제 지표를 추적하고 개선할 준비가 되었습니다! 📊**
