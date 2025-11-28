# 🔧 코드 레벨 문제 해결

## 📋 현재 상황

- ✅ 환경 설정: 문제 없음 (사용자 확인)
- ❌ 오류: `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked`
- ❌ 프로덕션 환경에서도 동일한 오류 발생

## 🔍 코드 레벨 가능한 원인

### 1. GoogleAuthProvider 설정 문제

**현재 코드**:
```typescript
const provider = new GoogleAuthProvider();
```

**가능한 문제**:
- Provider에 추가 설정이 필요할 수 있음
- `setCustomParameters` 또는 `addScope` 설정 누락

### 2. signInWithRedirect 호출 방식

**현재 코드**:
```typescript
await signInWithRedirect(auth, provider);
```

**가능한 문제**:
- Redirect URL이 명시적으로 설정되지 않음
- Firebase Auth가 자동으로 설정하지만, 특정 경우 문제 발생 가능

### 3. Firebase Auth 설정 문제

**현재 코드**:
```typescript
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com"
```

**가능한 문제**:
- 환경 변수와 기본값 불일치
- 프로덕션 환경에서 다른 값 사용 가능

## ✅ 해결 방법

### Option 1: Provider에 명시적 설정 추가

```typescript
const provider = new GoogleAuthProvider();
provider.setCustomParameters({
  prompt: 'select_account'
});
```

### Option 2: signInWithRedirect 전에 명시적 확인

```typescript
// 현재 URL 확인
const currentUrl = window.location.href;
console.log("현재 URL:", currentUrl);

// Firebase Auth 설정 확인
console.log("Auth Domain:", auth.app.options.authDomain);

await signInWithRedirect(auth, provider);
```

### Option 3: 환경별 다른 처리

```typescript
// 프로덕션 환경에서는 다른 설정 사용
const isProduction = window.location.hostname !== 'localhost';
if (isProduction) {
  // 프로덕션 환경 특별 처리
}
```

## 🎯 다음 단계

1. **콘솔 로그 확인**
   - 현재 URL이 무엇인지
   - Firebase Auth 설정이 무엇인지
   - Redirect URL이 어떻게 설정되는지

2. **Network 탭 확인**
   - 실제로 어떤 요청이 발생하는지
   - 요청 헤더에 무엇이 포함되는지

3. **코드 수정**
   - Provider 설정 추가
   - 명시적 확인 로직 추가

