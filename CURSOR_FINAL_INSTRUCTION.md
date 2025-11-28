# ✅ Cursor Debug Instruction — Firebase Google Login Fix (최종)

You are debugging the Firebase Google OAuth login failure.

## Primary symptoms:

• OAuth popup works, but redirects to:
  `https://yago-vibe-spt.firebaseapp.com/__/auth/handler?`
  → Shows 404 "Page Not Found"

• Firebase throws: `"auth/requests-from-referer-are-blocked"`

• Local app runs on `localhost:5173` but redirect goes to `firebaseapp.com`

## 🔍 핵심 발견 사항

### 문제의 원인
Firebase Auth는 **항상** `firebaseapp.com/__/auth/handler`로 리디렉션합니다. 이것은 정상 동작입니다.

**실제 문제는**:
1. Firebase Console의 **Authorized domains**에 `localhost`가 없어서
2. `localhost:5173`에서 오는 요청이 차단되고
3. Firebase가 `auth/requests-from-referer-are-blocked` 오류를 발생시킴

### authDomain 설정
- `authDomain`은 **개발/프로덕션 모두** `firebaseapp.com`을 사용해야 함
- 개발 환경에서 `localhost`를 사용하면 Firebase Auth가 제대로 작동하지 않음
- 대신 **Firebase Console의 Authorized domains에 `localhost`를 추가**해야 함

## Your tasks:

### 1. Search the whole project for:

- `"signInWithPopup"` → `src/pages/LoginPage.tsx` (라인 339)
- `"GoogleAuthProvider"` → `src/pages/LoginPage.tsx`, `src/lib/firebase.ts`
- `"firebaseConfig"` → `src/lib/firebase.ts` (라인 59-67)
- `"authDomain"` → `src/lib/firebase.ts` (라인 61)
- Any custom OAuth redirect handling → 없음 (Firebase SDK가 자동 처리)

### 2. Confirm what domain the app THINKS the OAuth redirect domain is.

**현재 설정**: `src/lib/firebase.ts` 라인 61
```typescript
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
```

**결과**: 항상 `yago-vibe-spt.firebaseapp.com` 사용 (정상)

**중요**: Firebase Auth는 개발 환경에서도 `firebaseapp.com`을 사용합니다. 이것은 정상입니다.

### 3. Check if the project uses:

- `auth.useDeviceLanguage()` → 없음
- Custom auth settings → 없음
- `setPersistence` → `src/lib/firebase.ts`에서 사용 (라인 170-177)
- Custom `GoogleAuthProvider` settings → 없음

### 4. Verify OAuth redirect handling:

**Firebase Auth의 정상 동작**:
- 개발 환경에서도 `firebaseapp.com/__/auth/handler`로 리디렉션 (정상)
- 문제는 Authorized domains에 `localhost`가 없어서 요청이 차단되는 것

**확인 사항**:
- `src/lib/firebase.ts`의 `authDomain` 설정 → ✅ 정상 (`firebaseapp.com` 사용)
- Firebase Console의 Authorized domains → ❌ `localhost` 누락 가능성

### 5. Confirm that current Firebase Web Client ID used by Firebase SDK

matches:
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

**확인 필요**:
- Firebase Console → Authentication → Sign-in method → Google → "웹 클라이언트 ID"
- Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

### 6. Once mismatch is found:

**발견된 문제**: 없음 (코드는 정상)

**실제 문제**: Firebase Console 설정 문제
- Authorized domains에 `localhost` 누락
- 또는 Google Provider의 Web Client ID 불일치

### 7. Also list what must be configured in Firebase Console:

**Required:**

• **Authentication → Settings → Authorized Domains:**
  - `localhost` ⚠️ **필수!**
  - `localhost:5173` (선택사항, 하지만 권장)
  - `yago-vibe-spt.web.app`
  - `yago-vibe-spt.firebaseapp.com`

• **Authentication → Sign-in method → Google:**
  - Web Client ID must match:
    `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

### 8. Show me:

- What file triggers the redirect?
  - **답**: `src/lib/firebase.ts`의 `firebaseConfig`가 Firebase SDK에 전달됨
  - Firebase SDK가 `signInWithPopup` 호출 시 자동으로 OAuth 리디렉션 처리

- Why it ends up on `firebaseapp.com` instead of `localhost`?
  - **답**: 이것은 **정상 동작**입니다. Firebase Auth는 항상 `firebaseapp.com/__/auth/handler`로 리디렉션합니다.
  - 문제는 Authorized domains에 `localhost`가 없어서 `localhost:5173`에서 오는 요청이 차단되는 것입니다.

- The exact patch needed to fix it.
  - **답**: 코드 수정 불필요. Firebase Console 설정만 수정하면 됨 (아래 참조)

### 9. Check for environment-based configuration:

- Is `authDomain` set correctly for development vs production?
  - **답**: ✅ 정상. 개발/프로덕션 모두 `firebaseapp.com` 사용 (올바름)

- Should `authDomain` be `localhost` or `localhost:5173` for dev?
  - **답**: ❌ 아니요. `authDomain`은 항상 `firebaseapp.com`을 사용해야 합니다.
  - 대신 Firebase Console의 Authorized domains에 `localhost`를 추가해야 합니다.

### 10. Verify Google Cloud Console OAuth settings:

- APIs & Services → Credentials → OAuth 2.0 Client IDs
- "승인된 JavaScript 원본" should include:
  - `http://localhost:5173` ⚠️ **필수!**
  - `https://yago-vibe-spt.firebaseapp.com`
- "승인된 리디렉션 URI" should include:
  - `http://localhost:5173/__/auth/handler` (선택사항, Firebase가 자동 처리)
  - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`

## Begin analysis now.

---

## 📌 지금 바로 해야 하는 실제 해결 절차 (요약)

### ✔ 1) Firebase Console → 승인된 도메인 등록 (가장 중요!)

다음 네 개 반드시 필요:
- `localhost` ⚠️ **필수!** (이게 없으면 localhost에서 요청이 차단됨)
- `localhost:5173` (선택사항, 하지만 권장)
- `yago-vibe-spt.firebaseapp.com`
- `yago-vibe-spt.web.app`

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**⚠️ 중요**: `localhost`가 없으면 `auth/requests-from-referer-are-blocked` 오류 발생!

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
- **"승인된 JavaScript 원본"**에 `http://localhost:5173` 포함 확인 ⚠️ **필수!**
- "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함 확인

### ✔ 4) 브라우저 캐시 삭제 후 다시 테스트

- 브라우저 완전히 닫기
- 캐시/쿠키 삭제 (Ctrl+Shift+Delete)
- 시크릿 모드에서 `http://localhost:5173` 접속
- Google 로그인 시도

---

## 🎯 핵심 요약

1. **코드는 정상**: `authDomain`이 `firebaseapp.com`을 사용하는 것은 올바름
2. **문제는 설정**: Firebase Console의 Authorized domains에 `localhost`가 없음
3. **해결 방법**: Firebase Console에서 `localhost` 추가 (코드 수정 불필요)

