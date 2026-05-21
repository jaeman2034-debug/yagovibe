# 🔥 전화번호 로그인 성공 → Firestore 유저 자동 생성(업서트) 가이드

## 📋 개요

SMS 인증 성공 시 Firestore에 `users/{uid}` 문서를 자동으로 생성/업데이트합니다.
- **신규 유저**: 문서 생성
- **기존 유저**: 문서 업데이트 (merge)
- **온보딩 분기용 필드** 포함

---

## ✅ 구현된 함수

### 1️⃣ `upsertUserProfile` (기본 버전)

**파일:** `src/utils/userProfile.ts`

```typescript
await upsertUserProfile(user, {
  displayName: "사용자 이름", // 선택
  marketingOptIn: false, // 선택
});
```

**특징:**
- `merge:true`로 여러 번 호출해도 안전 (idempotent)
- `createdAt`은 기존 값 유지 (없을 때만 생성)
- 간단하고 빠름

---

### 2️⃣ `upsertUserProfileStrict` (고급 버전)

**파일:** `src/utils/userProfile.ts`

```typescript
await upsertUserProfileStrict(user, {
  displayName: "사용자 이름", // 선택
  marketingOptIn: false, // 선택
});
```

**특징:**
- Transaction 사용으로 `createdAt` 완전 고정
- 신규/기존 유저 명확히 분리
- 더 안전하지만 약간 느림

---

## 🔄 현재 코드 흐름

```
사용자 전화번호 입력
  ↓
SMS 전송 (sendSMSCode)
  ↓
인증번호 입력
  ↓
인증 성공 (confirmSMSCode)
  ↓
upsertUserProfile(user) ← 🔥 자동 프로필 생성/업데이트
  ↓
PostLoginGate 실행 ← 🔥 온보딩 자동 분기
  ↓
신규 유저 → /profile/setup
기존 유저 → 원래 화면 또는 /sports-hub
```

---

## 📊 생성되는 필드

### 기본 필드
- `uid`: 사용자 UID
- `phone`: 전화번호
- `phoneNumber`: 전화번호 (호환성)
- `displayName`: 표시 이름
- `photoURL`: 프로필 사진 URL
- `provider`: "phone"
- `role`: "user"
- `status`: "active"

### 온보딩/상태 필드
- `isProfileComplete`: false (기본값)
- `onboardingCompleted`: false (기본값)

### 신뢰도 시스템 필드
- `trustScore`: 20 (기본값)
- `trustTier`: "basic" (기본값)
- `penalties`: 0 (기본값)

### 타임스탬프
- `createdAt`: 서버 타임스탬프 (최초 1회만)
- `updatedAt`: 서버 타임스탬프 (매번 업데이트)

---

## 🎯 사용 예시

### PhoneLoginPage에서 호출

```typescript
import { ensureUserProfile } from "@/utils/userProfile";

const handleVerify = async () => {
  try {
    const result = await confirmSMSCode(code);
    const user = result.user;
    
    // 🔥 자동 프로필 생성/업데이트
    await ensureUserProfile(user);
    
    // 다음 단계: PostLoginGate가 자동으로 온보딩 분기 처리
  } catch (error) {
    // 에러 처리
  }
};
```

---

## 🔍 온보딩 분기 로직

**파일:** `src/components/onboarding/PostLoginGate.tsx`

```typescript
// 온보딩 분기 조건
if (!userSnap.exists() || !isProfileComplete || !onboardingCompleted) {
  // 신규 유저 또는 온보딩 미완료 → /profile/setup
  navigate("/profile/setup");
} else {
  // 기존 유저 → 원래 화면 또는 /sports-hub
  navigate("/sports-hub");
}
```

---

## ✅ 체크리스트

### 개발 환경
- [ ] Phone Auth 테스트 번호로 로그인
- [ ] Firestore `users/{uid}` 문서 생성 확인
- [ ] `onboardingCompleted: false` 확인
- [ ] `/profile/setup`으로 자동 리다이렉트 확인

### 운영 환경
- [ ] 실제 번호로 로그인
- [ ] Firestore `users/{uid}` 문서 생성 확인
- [ ] 온보딩 완료 후 `onboardingCompleted: true` 업데이트 확인
- [ ] 다음 로그인 시 `/sports-hub`로 이동 확인

---

## 🚨 주의사항

1. **중복 호출 안전**
   - `merge:true`로 여러 번 호출해도 안전
   - 기존 데이터는 유지되고 새 필드만 추가

2. **createdAt 고정**
   - 기본 버전: 기존 값 유지 (없을 때만 생성)
   - Strict 버전: Transaction으로 완전 고정

3. **온보딩 분기**
   - `onboardingCompleted: false` → `/profile/setup`
   - `onboardingCompleted: true` → 원래 화면 또는 홈

---

## 📞 문제 해결

### 문제: 프로필이 생성되지 않음

**원인:**
- Firestore Rules에서 쓰기 권한 없음
- 네트워크 오류

**해결:**
1. Firestore Rules 확인
2. 브라우저 콘솔에서 에러 확인
3. 네트워크 탭에서 요청 확인

---

### 문제: createdAt이 매번 업데이트됨

**원인:**
- 기본 버전 사용 시 merge 로직 문제

**해결:**
- `upsertUserProfileStrict` 사용 (Transaction 버전)

---

## 🎯 성공 기준

### 신규 유저
- ✅ Firestore `users/{uid}` 문서 생성
- ✅ `onboardingCompleted: false` 설정
- ✅ `/profile/setup`으로 자동 리다이렉트

### 기존 유저
- ✅ Firestore `users/{uid}` 문서 업데이트
- ✅ `createdAt` 유지
- ✅ `updatedAt` 업데이트
- ✅ 원래 화면 또는 `/sports-hub`로 이동
