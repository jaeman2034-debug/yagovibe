# 🔧 sessionStorage 접근 문제 해결

## 📊 오류 분석

**오류 메시지**:
```
Unable to process request due to missing initial state. 
This may happen if browser sessionStorage is inaccessible or accidentally cleared.
```

**원인**:
- Firebase Authentication의 `signInWithRedirect`는 리다이렉트 전에 `sessionStorage`에 상태를 저장합니다.
- 리다이렉트 후 `getRedirectResult`가 `sessionStorage`에서 상태를 읽어야 합니다.
- `sessionStorage`에 접근할 수 없으면 이 오류가 발생합니다.

## ✅ 해결 방법

### 1. sessionStorage 접근 가능 여부 확인

`src/lib/authRedirect.ts`에 `isSessionStorageAvailable()` 함수를 추가하여 `sessionStorage` 접근 가능 여부를 확인합니다.

### 2. shouldUseRedirect() 함수 수정

`sessionStorage` 접근이 불가능하면 무조건 `signInWithPopup`을 사용하도록 수정했습니다.

### 3. LoginPage.tsx에서 이중 확인

`signInWithRedirect` 호출 직전에 `sessionStorage` 접근 가능 여부를 다시 확인하고, 접근 불가능하면 `signInWithPopup`으로 fallback합니다.

## 🔍 수정된 코드

### src/lib/authRedirect.ts

```typescript
/**
 * sessionStorage 접근 가능 여부 확인
 * signInWithRedirect는 sessionStorage에 상태를 저장하므로 접근 가능해야 함
 */
function isSessionStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || typeof sessionStorage === 'undefined') {
      console.warn('⚠️ [authRedirect] sessionStorage를 사용할 수 없습니다.');
      return false;
    }
    
    // 테스트용 키로 접근 시도
    const testKey = '__sessionStorage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch (error) {
    console.error('❌ [authRedirect] sessionStorage 접근 테스트 실패:', error);
    return false;
  }
}

export function shouldUseRedirect(): boolean {
  try {
    // 🔥 sessionStorage 접근 불가능하면 무조건 Popup 사용
    if (!isSessionStorageAvailable()) {
      console.warn('⚠️ [authRedirect] sessionStorage 접근 불가 → Popup 로그인 사용');
      return false;
    }
    // ... 나머지 로직
  }
}
```

### src/pages/LoginPage.tsx

```typescript
if (redirectNeeded) {
  // sessionStorage 접근 가능 여부 최종 확인
  let canUseRedirect = true;
  try {
    if (typeof sessionStorage === 'undefined') {
      canUseRedirect = false;
    } else {
      // 테스트용 키로 접근 시도
      const testKey = '__redirect_test__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
    }
  } catch (error) {
    console.warn('⚠️ [Google Login] sessionStorage 접근 불가 → Popup으로 fallback', error);
    canUseRedirect = false;
  }

  if (canUseRedirect) {
    await signInWithRedirect(auth, provider);
    return;
  } else {
    // Popup으로 fallback
  }
}
```

## 🎯 예상 결과

1. ✅ `sessionStorage` 접근 가능: `signInWithRedirect` 사용 (정상 작동)
2. ✅ `sessionStorage` 접근 불가능: `signInWithPopup`으로 자동 fallback (오류 방지)

## 📝 가능한 원인

1. **Service Worker가 sessionStorage 접근 차단**
   - Service Worker 제거 스크립트가 이미 배포되어 있으므로 해결됨

2. **브라우저 쿠키/스토리지 정책이 너무 엄격**
   - 시크릿 모드에서 테스트하거나 브라우저 설정 확인

3. **인앱 브라우저에서 스토리지 접근 제한**
   - 인앱 브라우저는 이미 차단되어 있음 (`BLOCK_INAPP = true`)

4. **리다이렉트 중 sessionStorage 삭제**
   - 브라우저 확장 프로그램이나 보안 소프트웨어 확인

---

**이제 빌드 및 배포를 진행하세요!** 🚀

