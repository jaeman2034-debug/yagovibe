# 🔥 Firebase & OAuth 설정 정보 (확인 완료)

## ✔ 1) 프론트엔드에서 실제로 사용 중인 firebaseConfig 전체

**파일 위치**: `src/lib/firebase.ts` (실제 사용되는 파일)

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

**클라이언트 ID**:
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

### 승인된 JavaScript 원본:
- `http://localhost:5000`
- `https://yago-vibe-spt.firebaseapp.com`
- `https://www.yagovibe.com`
- `http://localhost:5173`
- `http://localhost:5174`

### 승인된 리디렉션 URI:
- `https://yago-vibe-spt.web.app/__/auth/handler`
- `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
- `http://localhost:5174/__/auth/handler`
- `http://localhost:5173/__/auth/handler`

## ✅ Firebase Console 승인된 도메인 확인

다음 도메인들이 승인되어 있습니다:
- `localhost` (Default)
- `yago-vibe-spt.firebaseapp.com` (Default)
- `yago-vibe-spt.web.app` (Default)
- `127.0.0.1` (Custom)
- `www.yagovibe.com` (Custom)
- `yagovibe.com` (Custom)
- `yagovibe.vercel.app` (Custom)

## 🔍 설정 비교 결과

### ✅ 정상 설정:
1. **Firebase Config**: 모든 값이 올바르게 설정됨
2. **OAuth 클라이언트 ID**: 확인됨
3. **승인된 도메인**: 필요한 도메인 모두 포함됨
4. **승인된 리디렉션 URI**: `localhost:5173` 포함됨

### ⚠️ 확인 필요:
1. **Edge 브라우저 팝업 차단**: 차단 목록에서 `localhost:5173` 제거 필요
2. **Firebase Console Google 로그인**: 활성화 여부 확인 필요

## 📝 다음 단계

1. Edge 브라우저 팝업 차단 설정 확인 (이미 안내함)
2. Firebase Console에서 Google 로그인 활성화 확인
3. 브라우저 재시작 후 테스트

