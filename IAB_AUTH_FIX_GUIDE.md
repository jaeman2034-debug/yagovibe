# 🔧 IAB 로그인 튕김 문제 해결 가이드

## 📋 문제 요약

카카오톡 인앱 브라우저(IAB)에서 Google 로그인 시도 시:
1. 외부 브라우저로 전환됨
2. Google 로그인은 성공하지만
3. 외부 브라우저에서 로그인 상태가 유지되지 않음 (로그인 튕김)

## 🔍 근본 원인

1. **Firebase `getRedirectResult` 미호출**: `signInWithRedirect` 사용 시 반드시 `getRedirectResult`를 호출해야 Firebase가 인증 상태를 설정합니다.
2. **IAB 감지 로직이 Firebase 리다이렉트 플로우 방해**: `/__/auth/handler` 경로에서 IAB 탈출 로직이 실행되어 Firebase 인증 처리를 방해합니다.

## ✅ 해결 방법 (이미 적용됨)

### 1. `AuthRedirectHandler.tsx` 수정

`getRedirectResult`를 호출하여 Firebase 인증 결과를 처리합니다:

```typescript
// src/pages/AuthRedirectHandler.tsx
import { getRedirectResult } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function AuthRedirectHandler() {
    useEffect(() => {
        const handleRedirect = async () => {
            // 🔥 핵심: getRedirectResult를 호출하여 Firebase 인증 결과 처리
            const result = await getRedirectResult(auth);
            
            if (result) {
                // 인증 성공 → Firestore 프로필 생성/업데이트 → /sports-hub로 이동
                navigate("/sports-hub", { replace: true });
            } else {
                // 인증 실패 또는 취소 → /login으로 이동
                navigate("/login", { replace: true });
            }
        };
        
        handleRedirect();
    }, []);
}
```

### 2. `index.html` 수정

Firebase 리다이렉트 핸들러 경로(`/__/auth/handler`)에서 IAB 탈출 로직을 스킵합니다:

```javascript
// index.html
(function() {
    // 🔥 Firebase 리다이렉트 핸들러 경로는 제외
    var currentPath = window.location.pathname;
    if (currentPath.indexOf('/__/auth/handler') > -1) {
        return; // IAB 탈출 로직 스킵
    }
    
    // ... 나머지 IAB 감지 로직 ...
})();
```

## ⚠️ 제안된 방식의 문제점

사용자가 제안한 "ID Token을 URL 파라미터로 전달" 방식은 **보안상 위험**하고 **기술적으로 올바르지 않습니다**:

### 1. 보안 문제
- ID Token을 URL에 노출하면 브라우저 히스토리, 서버 로그, Referer 헤더 등에 남을 수 있습니다.
- 토큰이 탈취되면 악의적인 사용자가 해당 계정에 접근할 수 있습니다.

### 2. 기술적 문제
- `signInWithCustomToken`은 **Custom Token**이 필요합니다 (Firebase Admin SDK에서 생성).
- ID Token은 Custom Token이 아니므로 `signInWithCustomToken`에 사용할 수 없습니다.
- Firebase는 이미 `signInWithRedirect`의 리다이렉트 URL에 인증 정보를 포함시킵니다.

### 3. 불필요한 복잡성
- Firebase의 기본 메커니즘(`getRedirectResult`)을 사용하면 자동으로 세션이 복원됩니다.
- 추가적인 토큰 전달 로직은 불필요하고 오히려 문제를 복잡하게 만듭니다.

## 🎯 올바른 해결 방법

현재 적용된 해결책이 올바른 방법입니다:

1. ✅ `getRedirectResult` 호출로 Firebase 인증 결과 처리
2. ✅ IAB 감지 로직이 Firebase 리다이렉트 플로우를 방해하지 않도록 수정
3. ✅ Firebase의 기본 인증 메커니즘 활용

## 📝 테스트 확인 사항

1. 카카오톡에서 Google 로그인 시도
2. 외부 브라우저로 자동 전환
3. Google 로그인 완료
4. `/sports-hub`로 정상 이동
5. 로그인 상태 유지 (튕김 없음)

## 🔄 추가 개선 사항 (필요 시)

만약 여전히 문제가 발생한다면:

1. **Firebase Persistence 설정 확인**: `src/lib/firebase.ts`에서 `browserLocalPersistence` 또는 `browserSessionPersistence`가 올바르게 설정되었는지 확인
2. **브라우저 콘솔 로그 확인**: `AuthRedirectHandler`의 로그를 확인하여 `getRedirectResult`가 올바르게 호출되는지 확인
3. **Firebase Console 설정 확인**: OAuth 리다이렉트 URL이 올바르게 설정되었는지 확인

---

**현재 적용된 해결책이 올바른 방법이며, 추가적인 토큰 전달 로직은 필요하지 않습니다.**

