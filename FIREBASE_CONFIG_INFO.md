# 🔥 Firebase 설정 정보

## ✔ 1) 프론트엔드에서 실제로 사용 중인 firebaseConfig

**파일 위치**: `src/lib/firebase.ts` (실제 사용되는 파일)

```typescript
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};
```

### 실제 값 (이전 대화에서 확인한 값):

```typescript
const firebaseConfig = {
  apiKey: "AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY",
  authDomain: "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt",
  storageBucket: "yago-vibe-spt.firebasestorage.app",
  messagingSenderId: "126699415285",
  appId: "1:126699415285:web:1ea23395fa0e238dafc7bc",
};
```

## ✔ 2) Google Cloud OAuth 클라이언트 ID

**확인 필요**: Google Cloud Console에서 직접 확인해야 합니다.

### 확인 방법:
1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택: `yago-vibe-spt`

2. **OAuth 클라이언트 ID 페이지로 이동**
   - **API 및 서비스** > **사용자 인증 정보**
   - **OAuth 2.0 클라이언트 ID** 섹션 찾기
   - 웹 애플리케이션 타입의 클라이언트 ID 클릭

3. **클라이언트 ID 확인**
   - 형식: `126699415285-xxxxx.apps.googleusercontent.com`
   - 이 값을 복사하여 보내주세요

### 참고:
- Firebase 프로젝트와 Google Cloud 프로젝트가 연결되어 있으면
- Firebase Console > 프로젝트 설정 > 일반 > 내 앱 > 웹 앱
- 에서도 확인할 수 있습니다

## 📝 다음 단계

위의 2가지 정보를 확인한 후:
1. Firebase Console의 설정과 비교
2. Google Cloud Console의 OAuth 설정과 비교
3. 불일치하는 부분 수정

