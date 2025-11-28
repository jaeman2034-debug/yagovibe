# 🔥 Firebase Google 인증 "Invalid Action" 오류 해결 완료

## 🚨 발견된 문제들

### 1️⃣ 중복 Firebase 초기화 (해결 완료 ✅)

**문제**:
- `src/lib/firebase.ts`: `authDomain` 하드코딩 (`yago-vibe-spt.firebaseapp.com`)
- `src/core/firebase.ts`: `authDomain` 환경 변수 사용 (없으면 `undefined`)
- 두 파일이 각각 `initializeApp`을 호출하여 충돌 발생

**해결**:
- `src/core/firebase.ts`를 `src/lib/firebase.ts`의 re-export로 변경
- Firebase 앱이 한 번만 초기화되도록 수정

### 2️⃣ Google 로그인 함수 코드 확인 (정상 ✅)

**확인 결과**:
- ✅ `signInWithPopup`만 사용
- ✅ `signInWithRedirect` 없음
- ✅ `getRedirectResult` 없음
- ✅ `useDeviceLanguage` 없음

### 3️⃣ GoogleAuthProvider 설정 개선 (완료 ✅)

**추가된 설정**:
```typescript
googleProvider.addScope('profile');
googleProvider.addScope('email');
```

## 📝 수정된 파일

1. **`src/core/firebase.ts`**
   - 중복 초기화 제거
   - `src/lib/firebase.ts` re-export로 변경

2. **`src/lib/firebase.ts`**
   - GoogleAuthProvider에 scopes 추가

## ⚠️ 추가 확인 필요 사항

### Firebase Console에서 확인해야 할 것:

1. **Firebase Console → Authentication → Sign-in method → Google**
   - **웹 클라이언트 ID**: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 일치하는지
   - **웹 클라이언트 Secret**: Google Cloud Console의 Secret과 일치하는지

2. **Google Cloud Console → APIs & Services → Credentials**
   - OAuth 2.0 클라이언트 ID 확인
   - 승인된 리디렉션 URI에 다음이 포함되어 있는지:
     - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
     - `http://localhost:5173` (개발용)

## 🎯 다음 단계

1. **브라우저 캐시 클리어** 후 다시 테스트
2. **Firebase Console에서 Google 제공자 설정 확인**
3. **Google Cloud Console에서 OAuth 설정 확인**

코드 수정은 완료되었습니다. 이제 Firebase Console 설정을 확인해주세요!

