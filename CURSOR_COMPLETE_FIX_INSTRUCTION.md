# ✅ Cursor Debug Instruction — Firebase Google Login Fix

You are debugging the Firebase Google OAuth login failure.

## Primary symptoms:

• OAuth popup works, but redirects to:
  `https://yago-vibe-spt.firebaseapp.com/__/auth/handler?`
  → Shows 404 "Page Not Found"

• Firebase throws: `"auth/requests-from-referer-are-blocked"`

• Local app runs on `localhost:5173` but redirect goes to `firebaseapp.com`

## Your tasks:

### 1. Search the whole project for:

- `"signInWithPopup"`
- `"GoogleAuthProvider"`
- `"firebaseConfig"`
- Any custom OAuth redirect handling
- Any hardcoded `action`, `redirect`, or `domain`
- `"authDomain"` configuration
- `"redirectUri"` or `"redirect_uri"`
- `"__/auth/handler"`

### 2. Confirm what domain the app THINKS the OAuth redirect domain is.

It should be `localhost:5173` during development.

Check:
- `src/lib/firebase.ts` - `firebaseConfig.authDomain` (현재 하드코딩: `"yago-vibe-spt.firebaseapp.com"`)
- `src/pages/LoginPage.tsx` - `signInWithPopup` usage
- Any environment variables that set `AUTH_DOMAIN` or `VITE_FIREBASE_AUTH_DOMAIN`
- `.env.local` or `.env` files

**⚠️ 발견된 문제**: `src/lib/firebase.ts` 라인 61에서 `authDomain`이 하드코딩되어 있음:
```typescript
authDomain: "yago-vibe-spt.firebaseapp.com",
```

이것이 개발 환경에서 `firebaseapp.com`으로 리디렉션하는 원인일 수 있습니다.

### 3. Check if the project uses:

- `auth.useDeviceLanguage()`
- Any custom auth settings that override redirect
- `setPersistence` or other auth configuration
- Custom `GoogleAuthProvider` settings like `setCustomParameters` or `addScope`

### 4. Verify OAuth redirect handling:

Firebase should NOT redirect through `firebaseapp.com` during local development.

That only happens when:
- Authorized Domains are not set properly, OR
- Web Client ID mismatches Google Cloud Console, OR
- `authDomain` in `firebaseConfig` is set to `firebaseapp.com` instead of `localhost` for dev

**Check `src/lib/firebase.ts`**:
- Is `authDomain` hardcoded to `firebaseapp.com`? ✅ YES (라인 61)
- Should it be dynamic based on environment (dev vs prod)?

**해결 방법**: 개발 환경에서는 `authDomain`을 `window.location.hostname`으로 설정하거나, 환경 변수로 분기 처리해야 합니다.

### 5. Confirm that current Firebase Web Client ID used by Firebase SDK

matches:
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

Check:
- Firebase Console → Authentication → Sign-in method → Google → "웹 클라이언트 ID"
- Does it match the above value exactly?
- Is there any code that sets a different client ID?

### 6. Once mismatch is found:

Provide the exact file, line number, and wrong value.

**발견된 문제**:
- **파일**: `src/lib/firebase.ts`
- **라인**: 61
- **현재 값**: `authDomain: "yago-vibe-spt.firebaseapp.com"` (하드코딩)
- **문제**: 개발 환경에서도 `firebaseapp.com`을 사용하여 로컬 개발 시 리디렉션 문제 발생

**수정 제안**:
```typescript
// src/lib/firebase.ts
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  // 🔥 개발 환경에서는 현재 호스트 사용, 프로덕션에서는 firebaseapp.com 사용
  authDomain: import.meta.env.DEV 
    ? window.location.hostname 
    : (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com"),
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

### 7. Also list what must be configured in Firebase Console:

**Required:**

• **Authentication → Settings → Authorized Domains:**
  - `localhost`
  - `localhost:5173`
  - `yago-vibe-spt.web.app`
  - `yago-vibe-spt.firebaseapp.com`

• **Authentication → Sign-in method → Google:**
  - Web Client ID must match:
    `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

### 8. Show me:

- What file triggers the redirect?
  - **답**: `src/lib/firebase.ts`의 `firebaseConfig.authDomain` 설정이 Firebase SDK에 전달됨
  - Firebase SDK가 이 `authDomain`을 기반으로 OAuth 리디렉션 URL을 생성함

- Why it ends up on `firebaseapp.com` instead of `localhost`?
  - **답**: `src/lib/firebase.ts` 라인 61에서 `authDomain`이 `"yago-vibe-spt.firebaseapp.com"`으로 하드코딩되어 있음
  - 개발 환경에서도 이 값을 사용하여 Firebase가 `firebaseapp.com`으로 리디렉션함

- The exact patch needed to fix it.
  - **답**: 아래 "수정 코드" 섹션 참조

### 9. Check for environment-based configuration:

- Is `authDomain` set correctly for development vs production?
  - **현재**: 항상 `"yago-vibe-spt.firebaseapp.com"` 사용 (개발/프로덕션 구분 없음)
  - **필요**: 개발 환경에서는 `window.location.hostname` 사용

- Should `authDomain` be `localhost` or `localhost:5173` for dev?
  - **답**: `localhost` 또는 `window.location.hostname` (포트 번호는 포함하지 않음)

- Check `vite.config.ts` for any proxy or redirect settings
  - **확인됨**: `vite.config.ts`에는 OAuth 관련 proxy 설정 없음

- Check if there's any build configuration that affects auth domain
  - **확인됨**: 빌드 설정에서 authDomain을 변경하는 부분 없음

### 10. Verify Google Cloud Console OAuth settings:

- APIs & Services → Credentials → OAuth 2.0 Client IDs
- "승인된 JavaScript 원본" should include:
  - `http://localhost:5173`
  - `https://yago-vibe-spt.firebaseapp.com`
- "승인된 리디렉션 URI" should include:
  - `http://localhost:5173/__/auth/handler`
  - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`

## 수정 코드

### 파일: `src/lib/firebase.ts`

**현재 코드 (라인 58-67)**:
```typescript
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  authDomain: "yago-vibe-spt.firebaseapp.com",  // ❌ 하드코딩
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

**수정된 코드**:
```typescript
// 🔥 개발 환경에서는 현재 호스트 사용, 프로덕션에서는 firebaseapp.com 사용
const getAuthDomain = () => {
  if (import.meta.env.DEV) {
    // 개발 환경: 현재 호스트 사용 (localhost 또는 실제 호스트)
    return typeof window !== "undefined" ? window.location.hostname : "localhost";
  }
  // 프로덕션 환경: 환경 변수 또는 기본값 사용
  return import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com";
};

const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  authDomain: getAuthDomain(),  // ✅ 환경에 따라 동적 설정
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

## Begin analysis now.

---

## 📌 지금 바로 해야 하는 실제 해결 절차 (요약)

### ✔ 1) Firebase Console → 승인된 도메인 등록

다음 네 개 반드시 필요:
- `localhost`
- `localhost:5173`
- `yago-vibe-spt.firebaseapp.com`
- `yago-vibe-spt.web.app`

**경로**: Firebase Console → Authentication → Settings → Authorized domains

### ✔ 2) Firebase Console → Google 로그인 → Web Client ID 확인

→ 다음 값과 완전히 동일해야 함:

```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

**경로**: Firebase Console → Authentication → Sign-in method → Google

### ✔ 3) Google Cloud Console에서도 같은 Client ID인지 확인

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

- Web application 타입 클라이언트 ID 확인
- Firebase Console의 "웹 클라이언트 ID"와 완전히 일치하는지 확인
- "승인된 JavaScript 원본"에 `http://localhost:5173` 포함 확인
- "승인된 리디렉션 URI"에 `http://localhost:5173/__/auth/handler` 포함 확인

### ✔ 4) 코드 수정: `src/lib/firebase.ts`의 `authDomain` 동적 설정

개발 환경에서는 `localhost`를 사용하도록 수정 (위 "수정 코드" 섹션 참조)

### ✔ 5) 브라우저 캐시 삭제 후 다시 테스트

- 브라우저 완전히 닫기
- 캐시/쿠키 삭제 (Ctrl+Shift+Delete)
- 시크릿 모드에서 `http://localhost:5173` 접속
- Google 로그인 시도

