# 🔥 온보딩 UX 고도화 가이드

## 📋 개요

단계형 온보딩, 중간 저장, 이탈 복구 기능을 구현하여 "로그인만 하고 튀는 유저"를 회수할 수 있도록 합니다.

**목표:**
- 온보딩 단계 분리 (Step 기반)
- 각 단계 즉시 Firestore 저장
- 새로고침 / 앱 종료 / 재접속 → 이어서 진행
- 완료 시 `onboardingCompleted = true`

**원칙:**
- 서버 상태 = UX 상태
- 중간 이탈해도 다음 접속 시 이어서 진행
- A/B 테스트, 단계 추가 쉬움

---

## ✅ 구현된 컴포넌트

### 1️⃣ `useOnboarding` 훅

**파일:** `src/hooks/useOnboarding.ts`

**역할:**
- 온보딩 단계 분리 (Step 기반)
- 각 단계 즉시 Firestore 저장
- 새로고침 / 앱 종료 / 재접속 → 이어서 진행
- 완료 시 `onboardingCompleted = true`

**함수:**
- `step`: 현재 단계 (0부터 시작)
- `data`: 입력 데이터
- `saveStep(nextStep, payload)`: 단계 저장 및 다음 단계로 이동
- `complete()`: 온보딩 완료 처리
- `goBack(prevStep)`: 이전 단계로 돌아가기

**사용 예시:**
```typescript
const { step, data, saveStep, complete } = useOnboarding();

await saveStep(1, { displayName: "민수" });
await complete();
```

---

### 2️⃣ `OnboardingPage` 컨트롤러

**파일:** `src/pages/onboarding/OnboardingPage.tsx`

**역할:**
- 현재 단계에 따라 적절한 Step 컴포넌트 렌더링
- 새로고침 / 앱 종료 / 재접속 시 이어서 진행

**단계:**
- Step 0: 이름 입력 (`StepName`)
- Step 1: 목적 선택 (`StepPurpose`)
- Step 2: 종목 선택 (`StepSport`)
- Step 3: 지역 선택 (`StepRegion`)
- Step 4: 완료 (`StepDone`)

---

### 3️⃣ Step 컴포넌트들

**파일:**
- `src/pages/onboarding/steps/StepName.tsx`
- `src/pages/onboarding/steps/StepPurpose.tsx`
- `src/pages/onboarding/steps/StepSport.tsx`
- `src/pages/onboarding/steps/StepRegion.tsx`
- `src/pages/onboarding/steps/StepDone.tsx`

**특징:**
- 각 Step은 독립적인 컴포넌트
- 기존 데이터 자동 불러오기 (`useEffect`)
- 뒤로가기 버튼 지원
- 즉시 Firestore 저장

---

## 🧠 온보딩 데이터 설계

### Firestore `users/{uid}` 구조

```typescript
{
  uid: "abc",
  phoneNumber: "+8210...",
  role: "user",
  
  // 🔥 온보딩 상태
  onboardingCompleted: false,
  onboardingStep: 2, // 현재 단계 (0부터 시작, 완료 시 null)
  
  // 🔥 온보딩 입력 데이터
  onboarding: {
    displayName: "민수",
    ageRange: "20s",
    purpose: "personal",
    sport: "축구",
    region: "서울",
    bio: "안녕하세요"
  }
}
```

**포인트:**
- `onboardingStep` → 현재 위치
- `onboarding` → 입력 데이터 묶음
- 서버 상태가 곧 UX 상태

---

## 🔄 온보딩 흐름

```
로그인 성공
  ↓
PostLoginGate 실행
  ↓
onboardingCompleted === false 감지
  ↓
/onboarding으로 리다이렉트
  ↓
OnboardingPage 렌더링
  ↓
현재 step에 따라 Step 컴포넌트 렌더링
  ↓
사용자 입력
  ↓
saveStep(nextStep, payload) 호출
  ↓
Firestore에 즉시 저장
  ↓
다음 Step으로 이동
  ↓
Step 4 (완료) 도달
  ↓
complete() 호출
  ↓
onboardingCompleted = true
  ↓
OnboardingRoute가 감지
  ↓
/sports-hub로 자동 리다이렉트
```

---

## 🧠 이 온보딩 구조가 강력한 이유

### ✅ 중간 이탈해도 다음 접속 시 이어서 진행
- 각 단계마다 Firestore에 즉시 저장
- 새로고침 / 앱 종료 / 재접속 시 `onboardingStep` 기준으로 이어서 진행

### ✅ 서버 상태 = UX 상태
- Firestore가 단일 소스 오브 트루스
- 클라이언트 상태 관리 불필요

### ✅ A/B 테스트, 단계 추가 쉬움
- Step 컴포넌트만 추가하면 됨
- `OnboardingPage`에서 switch 문만 수정

### ✅ CRM / 마케팅 데이터로 바로 활용 가능
- `onboarding` 필드에 모든 입력 데이터 저장
- 마케팅 분석, 개인화 추천 등에 활용 가능

---

## 📊 단계 확장 예시

### 현재 구조
- Step 0: 이름
- Step 1: 목적
- Step 2: 종목
- Step 3: 지역
- Step 4: 완료

### 확장 구조 (나중에)
- Step 0: 이름
- Step 1: 목적
- Step 2: 종목
- Step 3: 지역
- Step 4: 관심사 (신규)
- Step 5: 알림 설정 (신규)
- Step 6: 완료

**변경 사항:**
1. `OnboardingPage.tsx`에 Step 4, 5 추가
2. `StepInterest.tsx`, `StepNotification.tsx` 생성
3. `useOnboarding` 훅은 그대로 사용

---

## ✅ 체크리스트

### 개발 환경
- [ ] `useOnboarding` 훅 정상 작동 확인
- [ ] 각 Step 컴포넌트 정상 작동 확인
- [ ] 새로고침 후 이어서 진행 확인
- [ ] 뒤로가기 버튼 정상 작동 확인
- [ ] 완료 후 홈으로 리다이렉트 확인

### 운영 환경
- [ ] Firestore에 단계별 데이터 저장 확인
- [ ] 중간 이탈 후 재접속 시 이어서 진행 확인
- [ ] 완료 후 `onboardingCompleted = true` 확인

---

## 🚨 주의사항

1. **데이터 저장 실패**
   - 네트워크 오류 시 사용자에게 알림
   - 재시도 로직 구현 권장

2. **단계 건너뛰기**
   - 사용자가 뒤로가기로 이전 단계로 돌아갈 수 있음
   - 브라우저 뒤로가기 버튼도 처리 필요 (선택)

3. **완료 후 리다이렉트**
   - `OnboardingRoute`가 자동으로 처리
   - `sessionStorage`의 `afterOnboarding` 복원

---

## 📞 문제 해결

### 문제: 새로고침 후 처음부터 시작됨

**원인:**
- `onboardingStep`이 Firestore에 저장되지 않음
- `useOnboarding` 훅이 제대로 작동하지 않음

**해결:**
1. Firestore에서 `users/{uid}.onboardingStep` 확인
2. `saveStep` 함수가 정상 작동하는지 확인
3. Firestore Rules에서 쓰기 권한 확인

---

### 문제: 완료 후에도 온보딩 페이지로 리다이렉트됨

**원인:**
- `onboardingCompleted` 필드가 업데이트되지 않음
- `complete()` 함수가 제대로 작동하지 않음

**해결:**
1. Firestore에서 `users/{uid}.onboardingCompleted` 확인
2. `complete()` 함수가 정상 작동하는지 확인
3. Firestore Rules에서 쓰기 권한 확인

---

## 🎯 성공 기준

### 개발 환경
- ✅ 각 Step에서 입력 후 다음 버튼 클릭 시 Firestore 저장
- ✅ 새로고침 후 이어서 진행
- ✅ 뒤로가기 버튼 정상 작동
- ✅ 완료 후 홈으로 리다이렉트

### 운영 환경
- ✅ 중간 이탈 후 재접속 시 이어서 진행
- ✅ 완료 후 `onboardingCompleted = true` 확인
- ✅ 온보딩 데이터가 Firestore에 정상 저장
