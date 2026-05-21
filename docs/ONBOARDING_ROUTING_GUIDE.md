# 🔥 온보딩 분기 라우팅 가이드

## 📋 개요

전화번호 로그인 성공 후 자동으로 온보딩 분기를 처리하는 실전 표준 패턴입니다.

**흐름:**
```
로그인 성공
  ↓
Firestore 유저 문서 생성 (upsertUserProfile)
  ↓
PostLoginGate 실행
  ↓
onboardingCompleted === false → /profile/setup
onboardingCompleted === true → 원래 화면 또는 /sports-hub
```

---

## ✅ 구현된 컴포넌트

### 1️⃣ `useAuthUser` 훅

**파일:** `src/hooks/useAuthUser.ts`

**역할:**
- Firebase Auth 상태 감지
- Firestore `users/{uid}` 문서 실시간 구독
- 로딩 상태 관리

**사용 예시:**
```tsx
const { authUser, profile, loading } = useAuthUser();

if (loading) return <Loading />;
if (!authUser) return <Navigate to="/login" />;
if (!profile?.onboardingCompleted) return <Navigate to="/profile/setup" />;
```

---

### 2️⃣ `ProtectedRoute` (개선)

**파일:** `src/components/ProtectedRoute.tsx`

**역할:**
- 로그인한 사용자만 접근 가능
- 온보딩 미완료 시 자동 리다이렉트 (`/profile/setup`)
- 새로고침/딥링크에도 안전

**사용 예시:**
```tsx
<Route
  path="/sports-hub"
  element={
    <ProtectedRoute>
      <SportsHubPage />
    </ProtectedRoute>
  }
/>
```

---

### 3️⃣ `OnboardingRoute` (신규)

**파일:** `src/routes/OnboardingRoute.tsx`

**역할:**
- 이미 온보딩 완료한 유저가 `/profile/setup` 접근 차단
- 로그인하지 않은 유저는 로그인 페이지로 리다이렉트
- 온보딩 미완료 유저만 접근 허용

**사용 예시:**
```tsx
<Route
  path="/profile/setup"
  element={
    <OnboardingRoute>
      <ProfileSetupPage />
    </OnboardingRoute>
  }
/>
```

---

## 🔄 라우팅 흐름

### 신규 유저

```
로그인 성공
  ↓
upsertUserProfile(user)
  → onboardingCompleted: false
  ↓
PostLoginGate 실행
  ↓
onboardingCompleted === false 감지
  ↓
/profile/setup으로 리다이렉트
  ↓
ProfileSetupPage에서 프로필 완성
  ↓
onboardingCompleted: true 업데이트
  ↓
OnboardingRoute가 감지
  ↓
/sports-hub로 자동 리다이렉트
```

---

### 기존 유저

```
로그인 성공
  ↓
upsertUserProfile(user)
  → onboardingCompleted: true (기존 값 유지)
  ↓
PostLoginGate 실행
  ↓
onboardingCompleted === true 감지
  ↓
원래 화면 또는 /sports-hub로 이동
```

---

## 📊 온보딩 완료 처리

**파일:** `src/pages/profile/ProfileSetupPage.tsx`**

```typescript
await setDoc(
  userRef,
  {
    // ... 프로필 필드 ...
    isProfileComplete: true,
    onboardingCompleted: true, // 🔥 온보딩 완료 플래그
    updatedAt: serverTimestamp(),
  },
  { merge: true }
);
```

**결과:**
- `OnboardingRoute`가 `onboardingCompleted: true` 감지
- 자동으로 `/sports-hub`로 리다이렉트

---

## ✅ 체크리스트

### 개발 환경
- [ ] `useAuthUser` 훅 정상 작동 확인
- [ ] `ProtectedRoute` 온보딩 체크 확인
- [ ] `OnboardingRoute` 역방향 차단 확인
- [ ] 신규 유저 → `/profile/setup` 자동 리다이렉트 확인
- [ ] 온보딩 완료 → `/sports-hub` 자동 리다이렉트 확인

### 운영 환경
- [ ] 새로고침 후에도 온보딩 분기 정상 작동
- [ ] 딥링크 복귀 시 온보딩 분기 정상 작동
- [ ] 기존 유저는 온보딩 스킵 확인

---

## 🚨 주의사항

1. **중복 리다이렉트 방지**
   - `PostLoginGate`와 `ProtectedRoute`가 동시에 작동
   - `PostLoginGate`가 먼저 실행되므로 중복 방지됨

2. **로딩 상태 처리**
   - `useAuthUser`의 `loading` 상태 확인 필수
   - 로딩 중에는 리다이렉트하지 않음

3. **딥링크 복귀**
   - `sessionStorage`에 `afterOnboarding` 저장
   - 온보딩 완료 후 복귀 경로로 이동

---

## 📞 문제 해결

### 문제: 온보딩 완료 후에도 `/profile/setup`으로 리다이렉트됨

**원인:**
- `onboardingCompleted` 필드가 업데이트되지 않음
- Firestore Rules에서 쓰기 권한 없음

**해결:**
1. Firestore Rules 확인
2. `ProfileSetupPage`에서 `onboardingCompleted: true` 설정 확인
3. 브라우저 콘솔에서 Firestore 업데이트 확인

---

### 문제: 새로고침 시 온보딩 분기가 깨짐

**원인:**
- `useAuthUser` 훅이 제대로 작동하지 않음
- Firestore 구독이 실패함

**해결:**
1. 브라우저 콘솔에서 에러 확인
2. Firestore Rules 확인
3. 네트워크 탭에서 Firestore 요청 확인

---

## 🎯 성공 기준

### 신규 유저
- ✅ 로그인 성공 → `/profile/setup` 자동 리다이렉트
- ✅ 프로필 완성 → `onboardingCompleted: true` 업데이트
- ✅ `/sports-hub`로 자동 리다이렉트

### 기존 유저
- ✅ 로그인 성공 → 원래 화면 또는 `/sports-hub`로 이동
- ✅ `/profile/setup` 접근 시 자동 차단

### 새로고침/딥링크
- ✅ 새로고침 후에도 온보딩 분기 정상 작동
- ✅ 딥링크 복귀 시 온보딩 분기 정상 작동
