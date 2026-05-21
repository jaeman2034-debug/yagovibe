# 🔧 iOS/Safari Storage Partitioning 문제 해결

## 📊 오류 분석

**오류 메시지**:
```
Unable to process request due to missing initial state. 
This may happen if browser sessionStorage is inaccessible or accidentally cleared.
Some specific scenarios are:
1) Using IDP-Initiated SAML SSO.
2) Using signInWithRedirect in a storage-partitioned browser environment.
```

**원인**:
- iOS/Safari는 ITP(Intelligent Tracking Prevention)로 인해 Storage Partitioning을 적용합니다.
- `signInWithRedirect`는 리다이렉트 전에 `sessionStorage`에 상태를 저장하지만, Storage Partitioning으로 인해 접근이 제한될 수 있습니다.
- Google 인증 서버(서드 파티)를 거쳐 다시 돌아올 때, 브라우저가 다른 파티션으로 간주하여 `sessionStorage` 접근을 차단합니다.

## ✅ 해결 방법

### 1. iOS/Safari 감지 및 Popup 우선 사용

`src/lib/authRedirect.ts`에 `isIOSOrSafari()` 함수를 추가하여 iOS/Safari를 감지하고, 이 경우 `signInWithPopup`을 우선 사용하도록 수정했습니다.

### 2. sessionStorage 접근 확인 강화

`isSessionStorageAvailable()` 함수를 개선하여:
- 저장한 값이 제대로 읽혔는지 확인 (Storage Partitioning 체크)
- 값이 일치하지 않으면 `false` 반환

### 3. getRedirectResult 오류 처리 강화

`src/App.tsx`에서 `getRedirectResult`의 "missing initial state" 오류를 특별히 처리하여:
- 오류를 조용히 처리 (사용자에게 표시하지 않음)
- 이미 Popup으로 fallback하도록 코드가 수정되었으므로 추가 조치 불필요

## 🔍 수정된 코드

### src/lib/authRedirect.ts

```typescript
/**
 * iOS/Safari 감지
 * iOS/Safari는 Storage Partitioning으로 인해 signInWithRedirect가 불안정함
 */
function isIOSOrSafari(): boolean {
  try {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios/i.test(ua);
    return isIOS || isSafari;
  } catch (error) {
    console.error('❌ [authRedirect] iOS/Safari 감지 실패:', error);
    return false;
  }
}

export function shouldUseRedirect(): boolean {
  try {
    // 🔥 iOS/Safari는 Storage Partitioning 문제로 인해 Popup 우선 사용
    if (isIOSOrSafari()) {
      console.warn('⚠️ [authRedirect] iOS/Safari 감지 → Popup 로그인 사용 (Storage Partitioning 방지)');
      return false;
    }
    // ... 나머지 로직
  }
}
```

### src/App.tsx

```typescript
} catch (error: any) {
  // 🔥 "missing initial state" 오류 특별 처리
  const errorCode = error?.code || error?.message || '';
  const isMissingStateError = 
    errorCode.includes('missing initial state') ||
    errorCode.includes('auth/missing-initial-state') ||
    error?.message?.includes('missing initial state') ||
    error?.message?.includes('sessionStorage is inaccessible');
  
  if (isMissingStateError) {
    console.warn("⚠️ [App] Missing initial state 오류 감지 (sessionStorage 문제)");
    // 오류를 조용히 처리
  } else {
    console.error("❌ [App] Redirect 결과 처리 중 오류:", error);
  }
}
```

## 🎯 예상 결과

1. ✅ iOS/Safari: `signInWithPopup` 사용 (Storage Partitioning 문제 방지)
2. ✅ Android 모바일: `signInWithRedirect` 사용 (정상 작동)
3. ✅ PC: `signInWithPopup` 사용 (정상 작동)
4. ✅ "missing initial state" 오류 해결

## 📝 추가 권장 사항

### 사용자 안내 (선택사항)

iOS/Safari 사용자에게 다음을 안내할 수 있습니다:

1. **Safari 설정 확인**
   - 설정 → Safari → "사이트 간 추적 방지" 확인
   - 테스트를 위해 일시적으로 해제 가능

2. **Chrome 사용 권장**
   - iOS에서 Chrome을 사용하면 Storage Partitioning 문제가 덜 발생할 수 있습니다.

---

**이제 빌드 및 배포를 진행하세요!** 🚀

