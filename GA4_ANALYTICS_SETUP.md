# ✅ GA4 지표 세팅 완료

> **"지금 잘 되고 있나?"를 느낌 말고 숫자로 보는 단계**

---

## 🎯 완료된 작업

### 1️⃣ Analytics 이벤트 설계 (핵심 5개)

| 이벤트                    | 언제        | 파일 위치 |
| ---------------------- | --------- | ----- |
| `phone_sms_request`    | SMS 요청    | `src/utils/authPhone.ts` |
| `phone_sms_success`    | SMS 전송 성공 | `src/utils/authPhone.ts` |
| `phone_verify_success` | 인증 성공     | `src/utils/authPhone.ts` |
| `onboarding_step`      | 각 단계 진입   | `src/pages/onboarding/steps/*.tsx` |
| `onboarding_complete`  | 온보딩 완료    | `src/pages/onboarding/steps/StepDone.tsx` |

### 2️⃣ 이벤트 추적 함수 추가

**파일:** `src/lib/analytics.ts`

```typescript
// SMS 인증 이벤트
export const trackSMS = {
  request: (params?) => track('phone_sms_request', params),
  success: (params?) => track('phone_sms_success', params),
  verifySuccess: (params?) => track('phone_verify_success', params),
};

// 온보딩 이벤트
export const trackOnboarding = {
  step: (params) => track('onboarding_step', params),
  complete: (params?) => track('onboarding_complete', params),
};
```

⚠️ **중요:** 전화번호는 절대 GA에 보내지 않습니다 (PII → 계정 정지 가능)  
✅ 국가 코드(`+82`)만 전송합니다.

### 3️⃣ 이벤트 연결 완료

#### SMS 흐름

```typescript:src/utils/authPhone.ts
// SMS 요청 시
trackSMS.request({
  platform: 'mobile' | 'web',
  countryCode: '+82'
});

// SMS 전송 성공 시
trackSMS.success({
  platform: 'mobile' | 'web',
  countryCode: '+82'
});

// 인증 성공 시
trackSMS.verifySuccess({
  platform: 'mobile' | 'web'
});
```

#### 온보딩 흐름

```typescript:src/pages/onboarding/steps/StepName.tsx
// 각 단계 진입 시
useEffect(() => {
  trackOnboarding.step({ 
    step: 0, 
    stepName: 'name' 
  });
}, []);

// 완료 시
trackOnboarding.complete({ 
  totalSteps: 5 
});
```

---

## 📊 GA4에서 바로 볼 수 있는 것

### 1️⃣ 실시간 이벤트 확인

**경로:** GA4 → 보고서 → 실시간 → 이벤트

- `phone_sms_request` - SMS 요청 수
- `phone_sms_success` - SMS 전송 성공 수
- `phone_verify_success` - 인증 성공 수
- `onboarding_step` - 온보딩 단계별 진입 수
- `onboarding_complete` - 온보딩 완료 수

### 2️⃣ 퍼널 분석 (핵심!)

**경로:** GA4 → 탐색 → 유입경로 탐색

```
SMS 요청 (phone_sms_request)
    ↓
SMS 전송 성공 (phone_sms_success)
    ↓
인증 성공 (phone_verify_success)
    ↓
온보딩 Step 0 (onboarding_step)
    ↓
온보딩 Step 1 (onboarding_step)
    ↓
온보딩 Step 2 (onboarding_step)
    ↓
온보딩 Step 3 (onboarding_step)
    ↓
온보딩 완료 (onboarding_complete)
```

### 3️⃣ 이탈률 확인

- **SMS 성공률:** `phone_sms_success / phone_sms_request * 100`
- **인증 성공률:** `phone_verify_success / phone_sms_success * 100`
- **온보딩 완료율:** `onboarding_complete / phone_verify_success * 100`

### 4️⃣ 플랫폼별 분석

**매개변수:** `platform` (mobile / web)

- 모바일 vs 데스크탑 SMS 성공률
- 플랫폼별 온보딩 완료율

---

## 🔧 BigQuery 연동 (선택)

### 왜 필요한가?

- GA4 UI는 **요약본**
- BigQuery는 **전체 데이터**
- 복잡한 분석, 커스텀 리포트 가능

### 연결 방법

1. GA4 → Admin → BigQuery Linking
2. 프로젝트 선택
3. 매일 자동 적재 활성화

### BigQuery로 가능한 것

```sql
-- SMS 시간대별 성공률
SELECT 
  EXTRACT(HOUR FROM event_timestamp) AS hour,
  COUNTIF(event_name = 'phone_sms_request') AS requests,
  COUNTIF(event_name = 'phone_sms_success') AS successes,
  SAFE_DIVIDE(
    COUNTIF(event_name = 'phone_sms_success'),
    COUNTIF(event_name = 'phone_sms_request')
  ) * 100 AS success_rate
FROM `project.dataset.events_*`
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
GROUP BY hour
ORDER BY hour;

-- 온보딩 단계별 이탈률
SELECT 
  event_params.value.int_value AS step,
  COUNT(*) AS entries,
  LEAD(COUNT(*)) OVER (ORDER BY event_params.value.int_value) AS next_step,
  (1 - SAFE_DIVIDE(
    LEAD(COUNT(*)) OVER (ORDER BY event_params.value.int_value),
    COUNT(*)
  )) * 100 AS drop_off_rate
FROM `project.dataset.events_*`,
UNNEST(event_params) AS event_params
WHERE _TABLE_SUFFIX = FORMAT_DATE('%Y%m%d', CURRENT_DATE())
  AND event_name = 'onboarding_step'
  AND event_params.key = 'step'
GROUP BY step
ORDER BY step;
```

---

## 📌 운영 시 체크리스트

### 매일 확인할 것

- [ ] SMS 성공률 (90% 이상 유지)
- [ ] 인증 성공률 (95% 이상 유지)
- [ ] 온보딩 완료율 (70% 이상 목표)

### 주간 확인할 것

- [ ] 플랫�폼별 차이 (모바일/웹)
- [ ] 시간대별 트래픽
- [ ] 온보딩 단계별 이탈 포인트

### 월간 확인할 것

- [ ] 장기 트렌드 (성장/하락)
- [ ] 코호트 분석 (신규 vs 재방문)
- [ ] A/B 테스트 결과

---

## 🧠 이 시스템이 강력한 이유

### ✅ 과하지 않은 이벤트 설계

- **딱 5개 이벤트**로 90% 판단 가능
- 너무 많으면 관리 불가, 너무 적으면 인사이트 부족
- 핵심 퍼널만 추적

### ✅ PII 보호

- 전화번호는 절대 GA에 전송하지 않음
- 국가 코드만 전송 (지역 분석용)
- GDPR/개인정보보호법 준수

### ✅ 개발 환경 분리

```typescript
if (import.meta.env.DEV) {
  console.log("[Analytics]", event, params);
  return; // 개발 환경에서는 전송하지 않음
}
```

- 개발 중에는 console.log로 확인
- 프로덕션에서만 GA4 전송

### ✅ 실패해도 UX 영향 없음

```typescript
try {
  logEvent(analyticsInstance, event, params);
} catch (error) {
  console.warn("Analytics 이벤트 전송 실패:", error);
  // 에러 무시, 사용자에게 영향 없음
}
```

---

## 🚀 다음 단계

### 1️⃣ 지표 확인 루틴 만들기

- 매일 아침 10분: GA4 대시보드 확인
- 주간 회의: 주요 지표 리뷰
- 월간 리포트: 장기 트렌드 분석

### 2️⃣ 알림 설정

**GA4 → Admin → Custom Alerts**

- SMS 성공률 80% 이하 시 알림
- 온보딩 완료율 50% 이하 시 알림
- 일일 신규 가입 0명 시 알림

### 3️⃣ A/B 테스트 준비

- 온보딩 문구 A/B 테스트
- SMS 전송 타이밍 테스트
- 단계 순서 최적화

---

## 🎓 참고 자료

### GA4 학습

- [GA4 공식 문서](https://support.google.com/analytics/answer/9304153)
- [GA4 퍼널 분석 가이드](https://support.google.com/analytics/answer/9327974)

### BigQuery 학습

- [BigQuery + GA4 연동 가이드](https://support.google.com/analytics/answer/9358801)
- [BigQuery SQL 기초](https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax)

### 데이터 분석

- [코호트 분석 방법](https://mixpanel.com/blog/what-is-cohort-analysis/)
- [퍼널 최적화 전략](https://www.reforge.com/blog/growth-loops)

---

## ✅ 현재 상태

**지금 당신이 가진 것:**

- ✅ 핵심 이벤트 5개 설정 완료
- ✅ SMS 인증 퍼널 추적
- ✅ 온보딩 퍼널 추적
- ✅ PII 보호 완료
- ✅ 개발/프로덕션 분리
- ✅ 에러 핸들링 완료

**이제 할 수 있는 것:**

- 📊 실시간 지표 확인
- 📈 퍼널 분석
- 🔍 이탈 포인트 발견
- 🎯 개선 방향 데이터 기반 결정

---

**🎉 축하합니다! 이제 "느낌"이 아니라 "숫자"로 판단할 수 있습니다.**

**다음 단계: 성장 트랙 (초대/추천/리퍼럴) 또는 A/B 테스트 구축**
