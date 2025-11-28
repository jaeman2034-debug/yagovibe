# 🔥 Firebase Google 인증 "Invalid Action" 심층 해결

## 🚨 추가 수정 사항

### 1️⃣ GoogleAuthProvider를 매번 새로 생성

**문제**: Provider를 한 번만 생성하고 재사용하면 캐싱 문제나 설정 불일치가 발생할 수 있음

**해결**: 매번 새로운 Provider 생성

```typescript
// ❌ 이전 (한 번만 생성)
export const googleProvider = new GoogleAuthProvider();

// ✅ 수정 (매번 새로 생성)
const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);
```

### 2️⃣ 디버깅 로그 강화

auth 설정을 확인하여 실제 사용되는 값 확인:

```typescript
console.log("🔍 [LoginPage] Google 로그인 시작:", {
  authDomain: auth.app.options.authDomain,
  projectId: auth.app.options.projectId,
  currentUrl: window.location.href,
});
```

### 3️⃣ 수정된 파일

1. **`src/lib/firebase.ts`**
   - `getGoogleProvider()` 함수 추가 (하위 호환성)
   - Auth 초기화 시 authDomain, projectId 로깅 추가

2. **`src/pages/LoginPage.tsx`**
   - 매번 새로운 GoogleAuthProvider 생성
   - 디버깅 로그 추가
   - GoogleAuthProvider를 직접 import

3. **`src/pages/SignupPage.tsx`**
   - 매번 새로운 GoogleAuthProvider 생성
   - 디버깅 로그 추가

## 🎯 여전히 오류가 발생한다면

이제 콘솔에서 다음 정보를 확인할 수 있습니다:
- 실제 사용되는 `authDomain`
- 실제 사용되는 `projectId`
- 현재 URL

**이 정보를 확인한 후**:
1. Firebase Console → Authentication → Sign-in method → Google
2. 웹 클라이언트 ID가 올바른지 확인
3. Google Cloud Console의 OAuth 클라이언트 ID와 일치하는지 확인

## 📝 다음 단계

1. 브라우저 새로고침 (Ctrl+Shift+R)
2. Google 로그인 시도
3. 콘솔에서 로그 확인
4. 로그에 표시된 `authDomain`과 `projectId`가 Firebase Console 설정과 일치하는지 확인

