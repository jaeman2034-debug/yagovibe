# 🔐 라우트 가드 설계 규칙 (5줄 요약)

**생성일**: 2025-01-27  
**목적**: 팀 생성 페이지 접근 문제 해결 및 라우트 가드 설계 원칙 정립  
**상태**: ✅ 수정 완료

---

## 🎯 핵심 원칙 (5줄 요약)

1. **`/me` 페이지에서는 절대 자동 `navigate()`를 하지 않는다**
   - `/me`는 상태를 **보여주는 허브**
   - 이동을 **강제하는 컨트롤러가 아님**

2. **팀 생성 페이지는 어떤 가드에도 걸리지 않게 한다**
   - AuthGuard ✅ (로그인 필요)
   - TeamGuard ❌ (팀 없어도 생성 가능)
   - OnboardingGate ❌ (팀 생성 경로는 명시적 제외)

3. **상태에 따른 이동은 "이벤트 후"에만 한다**
   - ❌ 상태가 P1-A라서 이동
   - ✅ 버튼 클릭 → API 성공 → 그때 navigate

4. **OnboardingGate는 팀 생성 경로를 가장 먼저 체크한다**
   - 패턴 매칭 전에 `/team/create` 경로 제외
   - 팀 생성 경로는 무조건 children 렌더링

5. **가드는 읽기/관리/생성 3종으로 분리한다**
   - 읽기: 팀 정보 보기 (P2/P3)
   - 관리: 팀 관리 (P3만)
   - 생성: 팀 생성 (모든 로그인 유저)

---

## 🔴 발견된 문제 및 수정

### 문제: OnboardingGate가 팀 생성 경로를 차단

**증상:**
- `/me`에서 [팀 만들기] 클릭
- `/sports/football/team/create`로 이동
- 하지만 바로 다시 `/me`로 되돌아옴

**원인:**
```tsx
// ❌ 문제 코드
const teamRequiredPatterns = [
  /^\/sports\/[^/]+\/team/,  // 이 패턴이 /team/create도 매칭
];

const isTeamRequired = teamRequiredPatterns.some(...) && !isTeamCreatePath;
// isTeamCreatePath 체크가 패턴 매칭 후에 실행되어 제대로 작동하지 않음
```

**수정:**
```tsx
// ✅ 수정 코드
// 1. 팀 생성 경로 체크를 가장 먼저 수행
const isTeamCreatePath = location.pathname.includes('/team/create') || 
                         /\/sports\/[^/]+\/team\/create/.test(location.pathname);

if (isTeamCreatePath) {
  return <>{children}</>; // 무조건 통과
}

// 2. 정규식 패턴에서 /create 명시적 제외
const teamRequiredPatterns = [
  /^\/sports\/[^/]+\/team(?!\/create)/,  // negative lookahead로 /create 제외
];
```

---

## 📋 가드 분류 체계

### 1️⃣ 읽기 가드 (Read Guard)

**대상:**
- 팀 정보 보기 (`/teams/:teamId`)
- 팀 블로그 보기

**규칙:**
- 로그인 필요 ✅
- 팀 멤버십 필요 ✅ (P2/P3)
- 팀장 권한 불필요 ❌

**구현:**
```tsx
<Route 
  path="/teams/:teamId" 
  element={
    <ProtectedRoute>
      <TeamInfoPage />
    </ProtectedRoute>
  } 
/>
```

---

### 2️⃣ 관리 가드 (Manage Guard)

**대상:**
- 팀 관리 페이지 (`/me/team/:teamId/manage`)
- 팀원 관리
- 가입 요청 승인

**규칙:**
- 로그인 필요 ✅
- 팀장 권한 필요 ✅ (P3만)
- 팀원(P2) 접근 차단

**구현:**
```tsx
<Route 
  path="/me/team/:teamId/manage" 
  element={
    <ProtectedRoute>
      <CaptainOnlyRoute>
        <TeamManagePage />
      </CaptainOnlyRoute>
    </ProtectedRoute>
  } 
/>
```

---

### 3️⃣ 생성 가드 (Create Guard)

**대상:**
- 팀 생성 페이지 (`/sports/:type/team/create`)
- 팀 초대 링크 페이지

**규칙:**
- 로그인 필요 ✅
- 팀 멤버십 불필요 ❌
- OnboardingGate 제외 ✅

**구현:**
```tsx
<Route 
  path="/sports/:type/team/create" 
  element={
    <ProtectedRoute>  {/* enableOnboarding=false 기본값 */}
      <TeamCreate />
    </ProtectedRoute>
  } 
/>
```

---

## ✅ 수정 완료 사항

### 1. OnboardingGate.tsx 수정

**변경 내용:**
- 팀 생성 경로 체크를 가장 먼저 수행
- 정규식 패턴에서 `/create` 명시적 제외
- 팀 생성 경로는 무조건 children 렌더링

**파일:** `src/components/onboarding/OnboardingGate.tsx`

---

### 2. MePage.tsx 확인

**확인 결과:**
- ✅ 자동 리다이렉트 로직 없음
- ✅ 상태 기반 navigate 없음
- ✅ CTA 버튼만 제공

**결론:** MePage는 문제 없음

---

### 3. 라우트 구조 확인

**확인 결과:**
- ✅ `/sports/:type/team/create`는 `ProtectedRoute`로만 감싸짐
- ✅ `enableOnboarding` 옵션 없음 (기본값 false)
- ✅ `OnboardingGate` 적용 안 됨

**결론:** 라우트 구조는 문제 없음

---

## 🔍 문제 해결 과정

### 1단계: 증상 파악
- `/me`에서 [팀 만들기] 클릭
- 팀 생성 페이지로 이동
- 바로 다시 `/me`로 되돌아옴

### 2단계: 원인 추적
- MePage에 자동 리다이렉트 없음 ✅
- OnboardingGate 패턴 매칭 문제 발견 ❌

### 3단계: 수정
- OnboardingGate의 패턴 매칭 로직 수정
- 팀 생성 경로를 가장 먼저 체크하도록 변경

---

## 🎯 예방 규칙

### ❌ 하지 말 것

1. `/me` 페이지에서 상태 기반 자동 navigate
2. OnboardingGate에서 팀 생성 경로를 패턴으로 매칭
3. 팀 생성 페이지에 TeamGuard 적용

### ✅ 해야 할 것

1. 팀 생성 경로는 명시적으로 제외
2. 가드는 읽기/관리/생성으로 분리
3. 상태 변화는 이벤트 후에만 navigate

---

## 📝 체크리스트

- [x] OnboardingGate에서 팀 생성 경로 제외 로직 강화
- [x] MePage에 자동 리다이렉트 없음 확인
- [x] 라우트 구조 확인 (ProtectedRoute만 사용)
- [x] 가드 분류 체계 문서화

---

**완료일**: 2025-01-27  
**상태**: ✅ 문제 해결 완료  
**판정**: 정상 작동
