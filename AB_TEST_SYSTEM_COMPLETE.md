# ✅ 온보딩 A/B 테스트 시스템 완료

> **"만들었다"가 아니라 "이게 더 낫다"를 증명하는 단계**

---

## 🎯 완료된 작업

### 1️⃣ 실험군 할당 시스템

**파일:** `src/lib/assignExperiment.ts`

- ✅ 가입 시 실험군 1회 할당 (50:50 랜덤)
- ✅ Firestore에 고정 저장 (새로고침/딥링크 안전)
- ✅ 중복 할당 방지

**사용 예시:**
```typescript
import { assignOnboardingExperiment, getMyExperimentVariant } from "@/lib/assignExperiment";

// 가입 시 자동 할당 (ensureUserProfile에서 호출됨)
const variant = await assignOnboardingExperiment(userUid);

// 현재 유저의 실험군 확인
const myVariant = await getMyExperimentVariant("onboarding_v1");
```

### 2️⃣ Firestore 유저 구조 확장

**파일:** `src/types/user.ts`

```typescript
interface UserProfile {
  // ... 기존 필드들
  
  // 🔥 A/B 실험 시스템
  experiment?: {
    onboarding_v1?: "A" | "B"; // 온보딩 실험군
    assignedAt?: any; // serverTimestamp
    [key: string]: any; // 확장 가능
  };
}
```

### 3️⃣ 자동 실험군 할당

**파일:** `src/utils/userProfile.ts`

- ✅ 신규 유저 생성 시 자동으로 실험군 할당
- ✅ 비동기 처리 (실패해도 프로필 생성은 완료)

### 4️⃣ 온보딩 실험 분기

**파일:** `src/pages/onboarding/OnboardingPage.tsx`

- ✅ 실험군에 따라 다른 컴포넌트 렌더링 가능
- ✅ 현재는 모든 Step에 variant prop 전달

**예시:**
```typescript
const variant = profile?.experiment?.onboarding_v1 ?? "A";

if (variant === "B") {
  return <OnboardingVariantB />;
}

return <OnboardingVariantA />;
```

### 5️⃣ GA 이벤트에 variant 포함

**파일:** `src/lib/analytics.ts`

- ✅ 모든 온보딩 이벤트에 `variant` 필드 추가
- ✅ GA4에서 실험군별 분석 가능

**사용 예시:**
```typescript
trackOnboarding.step({ 
  step: 0, 
  stepName: 'name',
  variant: "A", // 필수
});

trackOnboarding.complete({ 
  totalSteps: 5,
  variant: "A", // 필수
});
```

---

## 🔄 전체 흐름

```
1. 신규 유저 가입
   → ensureUserProfile() 호출
   → assignOnboardingExperiment() 자동 호출
   → Firestore에 experiment.onboarding_v1 = "A" or "B" 저장

2. 온보딩 시작
   → OnboardingPage에서 variant 확인
   → variant에 따라 다른 컴포넌트 렌더링 (현재는 동일)

3. 온보딩 진행
   → 각 Step에서 variant를 GA 이벤트에 포함
   → GA4에서 실험군별 분석 가능

4. 결과 분석
   → GA4에서 variant별 완료율 비교
   → 승자 결정 및 적용
```

---

## 📊 실험 예시 (현실적으로 잘 먹힘)

### 실험 ① Step 수

**A (현재):** 5-step
- Step 0: 이름
- Step 1: 목적
- Step 2: 종목
- Step 3: 지역
- Step 4: 완료

**B (실험):** 3-step
- Step 0: 이름 + 목적 (합침)
- Step 1: 종목 + 지역 (합침)
- Step 2: 완료

**측정 지표:**
- 완료율
- 완료까지 걸린 시간
- 이탈 포인트

### 실험 ② 첫 문구

**A (현재):** "이름을 알려주세요"
**B (실험):** "1분이면 시작 가능해요"

**측정 지표:**
- Step 0 → Step 1 전환율
- Step 0 체류 시간

### 실험 ③ CTA 버튼

**A (현재):** "다음"
**B (실험):** "바로 시작하기"

**측정 지표:**
- 버튼 클릭률
- 완료율

---

## 📈 결과 판단 기준 (미리 정해라!)

### 예시 기준

```typescript
// 최소 표본
const MIN_SAMPLE_SIZE = 50; // 각 실험군당

// 성공 지표
const PRIMARY_METRIC = "onboarding_complete_rate"; // 온보딩 완료율

// 보조 지표
const SECONDARY_METRICS = [
  "completion_time", // 완료까지 걸린 시간
  "drop_off_rate",  // 이탈률
];

// 승자 결정 기준
const WIN_THRESHOLD = 0.10; // 10% 이상 차이

// 판단 로직
if (variantB.completeRate >= variantA.completeRate + WIN_THRESHOLD) {
  // B 승 → B 적용
} else if (variantA.completeRate >= variantB.completeRate + WIN_THRESHOLD) {
  // A 승 → A 유지
} else {
  // 차이 미미 → A 유지 (기본값)
}
```

---

## 🧠 A/B 실험에서 제일 흔한 실패

### ❌ 여러 개 동시에 바꿈

**문제:**
- Step 수, 문구, 버튼을 동시에 바꾸면 무엇이 효과인지 모름

**해결:**
- 한 번에 하나만 바꾼다
- 실험 결과를 보고 다음 실험 설계

### ❌ 표본 부족

**문제:**
- 각 실험군 10명으로 판단 → 통계적으로 무의미

**해결:**
- 최소 각 50명 (권장: 100명 이상)
- 통계적 유의성 검증

### ❌ "느낌상 좋아 보임"

**문제:**
- 데이터 없이 "B가 더 좋아 보인다"로 판단

**해결:**
- 지표로 승자 결정
- 완료율, 전환율 등 정량적 지표 사용

### ❌ 실험 끝내고 적용 안 함

**문제:**
- 실험 결과 B가 승자인데 A를 계속 사용

**해결:**
- 승자 결정 후 즉시 적용
- 실험 결과 문서화

---

## 📊 GA4에서 실험 결과 확인

### 1️⃣ 실시간 이벤트 확인

**경로:** GA4 → 보고서 → 실시간 → 이벤트

- `onboarding_step` 이벤트의 `variant` 파라미터 확인
- `onboarding_complete` 이벤트의 `variant` 파라미터 확인

### 2️⃣ 퍼널 분석 (실험군별)

**경로:** GA4 → 탐색 → 유입경로 탐색

**필터:**
- `variant = "A"` vs `variant = "B"`

**비교:**
- 각 단계별 전환율
- 완료율
- 이탈 포인트

### 3️⃣ BigQuery로 상세 분석

```sql
-- 실험군별 완료율
SELECT 
  event_params.value.string_value AS variant,
  COUNT(DISTINCT user_pseudo_id) AS total_users,
  COUNT(DISTINCT CASE 
    WHEN event_name = 'onboarding_complete' 
    THEN user_pseudo_id 
  END) AS completed_users,
  SAFE_DIVIDE(
    COUNT(DISTINCT CASE 
      WHEN event_name = 'onboarding_complete' 
      THEN user_pseudo_id 
    END),
    COUNT(DISTINCT user_pseudo_id)
  ) * 100 AS completion_rate
FROM `project.dataset.events_*`,
UNNEST(event_params) AS event_params
WHERE _TABLE_SUFFIX BETWEEN '20240101' AND '20240131'
  AND event_name IN ('onboarding_step', 'onboarding_complete')
  AND event_params.key = 'variant'
GROUP BY variant
ORDER BY variant;

-- 실험군별 단계별 이탈률
SELECT 
  event_params.value.string_value AS variant,
  event_params.value.int_value AS step,
  COUNT(DISTINCT user_pseudo_id) AS step_entries,
  LEAD(COUNT(DISTINCT user_pseudo_id)) OVER (
    PARTITION BY event_params.value.string_value 
    ORDER BY event_params.value.int_value
  ) AS next_step_entries,
  (1 - SAFE_DIVIDE(
    LEAD(COUNT(DISTINCT user_pseudo_id)) OVER (
      PARTITION BY event_params.value.string_value 
      ORDER BY event_params.value.int_value
    ),
    COUNT(DISTINCT user_pseudo_id)
  )) * 100 AS drop_off_rate
FROM `project.dataset.events_*`,
UNNEST(event_params) AS event_params
WHERE _TABLE_SUFFIX BETWEEN '20240101' AND '20240131'
  AND event_name = 'onboarding_step'
  AND event_params.key IN ('variant', 'step')
GROUP BY variant, step
ORDER BY variant, step;
```

---

## 🚀 실험 Variant B 구현 예시

### 예시: Step 수 줄이기 (5-step → 3-step)

**파일:** `src/pages/onboarding/variants/OnboardingVariantB.tsx`

```typescript
import { useOnboarding } from "@/hooks/useOnboarding";
import StepNamePurpose from "./steps/StepNamePurpose"; // 이름 + 목적 합침
import StepSportRegion from "./steps/StepSportRegion"; // 종목 + 지역 합침
import StepDone from "../steps/StepDone";

export default function OnboardingVariantB() {
  const { step } = useOnboarding();

  switch (step) {
    case 0:
      return <StepNamePurpose variant="B" />;
    case 1:
      return <StepSportRegion variant="B" />;
    case 2:
      return <StepDone variant="B" />;
    default:
      return <StepNamePurpose variant="B" />;
  }
}
```

**OnboardingPage.tsx 수정:**

```typescript
import OnboardingVariantB from "./variants/OnboardingVariantB";

export default function OnboardingPage() {
  const { step } = useOnboarding();
  const { profile } = useAuthUser();
  const variant = profile?.experiment?.onboarding_v1 ?? "A";

  // 🔥 실험 분기
  if (variant === "B") {
    return <OnboardingVariantB />;
  }

  // A (기본)
  switch (step) {
    case 0:
      return <StepName variant={variant} />;
    // ... 기존 코드
  }
}
```

---

## ✅ 체크리스트

### 개발 환경 테스트

- [ ] 신규 유저 생성 시 실험군 자동 할당 확인
- [ ] Firestore에 `experiment.onboarding_v1` 저장 확인
- [ ] 온보딩에서 variant prop 전달 확인
- [ ] GA 이벤트에 variant 포함 확인

### 운영 환경 테스트

- [ ] 실제 가입 플로우에서 실험군 할당 확인
- [ ] GA4에서 variant별 이벤트 확인
- [ ] BigQuery에서 variant별 분석 가능 확인

### 실험 실행

- [ ] 실험 목표 및 지표 정의
- [ ] 최소 표본 수 결정 (각 50명 이상)
- [ ] 실험 기간 설정 (최소 1주일)
- [ ] 결과 분석 및 승자 결정
- [ ] 승자 적용

---

## 🧠 이 시스템이 강력한 이유

### ✅ 서버 상태 기반

- Firestore에 저장 → 새로고침/딥링크 안전
- 실험군이 가입 시 고정 → 일관성 보장

### ✅ GA4 통합

- 모든 이벤트에 variant 포함
- 실시간 분석 가능
- BigQuery로 상세 분석 가능

### ✅ 확장 가능

- 여러 실험 동시 실행 가능
- 실험군별 다른 컴포넌트 렌더링
- 보상/마케팅 실험에도 활용 가능

### ✅ 검증된 패턴

- 스타트업들 90%가 이 구조로 시작
- Firebase + GA4 정석 조합

---

## 📚 참고 자료

### A/B 테스트 설계

- [A/B Testing Guide](https://www.optimizely.com/optimization-glossary/ab-testing/)
- [Statistical Significance](https://www.optimizely.com/optimization-glossary/statistical-significance/)

### Firebase + GA4

- [Firebase Remote Config](https://firebase.google.com/docs/remote-config) (고급 실험)
- [GA4 Experiments](https://support.google.com/analytics/answer/9387574)

### 실험 문화

- [How to Build a Culture of Experimentation](https://www.reforge.com/blog/experimentation-culture)

---

## 🎉 완료!

**이제 당신의 서비스는:**

- ✅ 실험군 자동 할당
- ✅ 실험 분기 처리
- ✅ GA4로 결과 추적
- ✅ 데이터 기반 의사결정

**"만들었다" → "이게 더 낫다"를 증명할 수 있습니다! 🚀**

---

## 다음 단계

- **"마케팅"** → 첫 100명 현실 전략
- **"보상"** → 추천 리워드 설계
- **"자동화"** → 실험 결과 자동 적용

한 단어만 던져 😎
