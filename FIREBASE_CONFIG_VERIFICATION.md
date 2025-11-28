# 🔍 Firebase 설정 값 확인 결과

## 📸 Firebase Console에서 확인한 값

스크린샷에서 보이는 Firebase 설정:
```javascript
apiKey: "AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY"
authDomain: "yago-vibe-spt.firebaseapp.com"
projectId: "yago-vibe-spt"
storageBucket: "yago-vibe-spt.firebasestorage.app"  // ⚠️ 중요!
messagingSenderId: "126699415285"
appId: "1:126699415285:web:1ea23395fa0e238dafc7bc"
```

## 📝 .env.local 파일의 값

```env
VITE_FIREBASE_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY ✅
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com ✅
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt ✅
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com ❌ 불일치!
VITE_FIREBASE_MESSAGING_SENDER_ID=126699415285 ✅
VITE_FIREBASE_APP_ID=1:126699415285:web:1ea23395fa0e238dafc7bc ✅
```

## 💻 코드에서 사용하는 값

**src/lib/firebase.ts**:
```typescript
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  authDomain: "yago-vibe-spt.firebaseapp.com",  // 하드코딩
  projectId: "yago-vibe-spt",  // 하드코딩
  storageBucket: "yago-vibe-spt.firebasestorage.app",  // 하드코딩 ✅
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

## ✅ 확인 결과

### 일치하는 항목:
- ✅ apiKey: 일치
- ✅ authDomain: 일치
- ✅ projectId: 일치
- ✅ storageBucket: 코드는 올바름 (하드코딩되어 있음)
- ✅ messagingSenderId: 일치
- ✅ appId: 일치

### ⚠️ 주의사항:
- `.env.local`의 `VITE_FIREBASE_STORAGE_BUCKET`는 `appspot.com`이지만, 코드에서는 하드코딩으로 `firebasestorage.app`을 사용하므로 문제 없음
- 모든 필수 값이 올바르게 설정되어 있음

## 🎯 결론

**Firebase 설정 값은 모두 올바릅니다!**

"The requested action is invalid" 오류는 Firebase 설정 값 문제가 아니라, **Firebase Console의 Google 제공자 설정** 문제일 가능성이 높습니다.

다음 단계:
1. Firebase Console → Authentication → Sign-in method → Google 클릭
2. 웹 클라이언트 ID와 Secret 확인

