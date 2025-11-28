# 🔥 "The requested action is invalid" 원인 분석

## ✅ 코드 확인 결과

### 1️⃣ Google 로그인 함수 코드

**파일**: `src/pages/LoginPage.tsx`

```typescript
<button
    onClick={async () => {
        try {
            // 여기서는 provider 설정 따로 안 건드리고 바로 popup 호출
            const result = await signInWithPopup(auth, googleProvider);
            console.log("✅ 구글 로그인 성공:", result.user.email);
            navigate("/sports-hub");
        } catch (error: any) {
            console.error("❌ 구글 로그인 실패:", error);
            // ... 에러 처리
        }
    }}
>
```

**✅ 확인 결과**:
- `signInWithPopup`만 사용 ✅
- `signInWithRedirect` 없음 ✅
- `getRedirectResult` 없음 ✅
- `useDeviceLanguage` 없음 ✅

### 2️⃣ GoogleAuthProvider 설정

**파일**: `src/lib/firebase.ts`

```typescript
// 🔥 Google Auth Provider 설정
export const googleProvider = new GoogleAuthProvider();

// 필요하면 계정 선택만 강제 (선택 사항)
googleProvider.setCustomParameters({
  prompt: "select_account",
});

// ❌ client_id 강제 세팅은 제거! (Firebase가 내부적으로 이미 알고 있음)
```

**✅ 확인 결과**:
- `client_id` 강제 설정 없음 ✅
- `setCustomParameters`만 사용 (정상) ✅

### 3️⃣ firebaseConfig.authDomain 확인

**파일**: `src/lib/firebase.ts`

```typescript
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  authDomain: "yago-vibe-spt.firebaseapp.com",  // 하드코딩됨
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

**✅ 확인 결과**:
- `authDomain`이 하드코딩되어 있음 ✅
- `vite.config.ts`에서 덮어쓰는 설정 없음 ✅
- 초기화는 한 번만 발생 ✅

## 🎯 결론

**코드는 문제없습니다!**

가능한 원인은 **Firebase Console에서 Google 제공자 설정 불일치**입니다.

## 🔍 확인 필요 사항

### Firebase Console에서 확인:

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택: `yago-vibe-spt`

2. **Authentication > Sign-in method > Google 클릭**

3. **다음 항목 확인**:
   - **웹 클라이언트 ID**: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 일치하는지
   - **웹 클라이언트 Secret**: Google Cloud Console의 Secret과 일치하는지
   - **리디렉션 설정**: 올바르게 설정되어 있는지

4. **스크린샷 캡처**:
   - 위 항목들이 보이도록 캡처
   - 특히 "웹 클라이언트 ID"와 "웹 클라이언트 Secret" 부분

## 📝 요약

- ✅ 코드: `signInWithPopup`만 사용, redirect 관련 코드 없음
- ✅ `authDomain`: 하드코딩되어 일관성 유지
- ⚠️ **확인 필요**: Firebase Console의 Google 제공자 설정

**Firebase Console에서 Google 제공자 설정 화면을 캡처해주시면 정확히 확인해드리겠습니다!**

