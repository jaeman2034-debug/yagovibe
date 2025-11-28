# 🔥 Firebase 중복 초기화 문제 해결

## 🚨 발견된 문제

**중복 Firebase 초기화**가 발생하고 있습니다:

1. **`src/lib/firebase.ts`**: 실제 사용되는 파일
   - `authDomain: "yago-vibe-spt.firebaseapp.com"` (하드코딩)
   - `LoginPage.tsx`가 여기서 import

2. **`src/core/firebase.ts`**: 별도로 초기화하는 파일
   - `authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN` (환경 변수)
   - `logVoiceEvent.ts`, `VoiceMapDashboard.tsx`가 여기서 import
   - 환경 변수가 없으면 `undefined`가 될 수 있음

**문제**: 두 개의 다른 Firebase 앱이 초기화되면 설정이 충돌하여 "The requested action is invalid" 오류 발생 가능!

## ✅ 해결 방법

### `src/core/firebase.ts` 수정

중복 초기화를 방지하고 `src/lib/firebase.ts`를 re-export하도록 변경:

```typescript
// 🔥 중복 초기화 방지: src/lib/firebase.ts에서 이미 초기화했으므로 re-export만 수행
export { auth, db, storage, app } from "@/lib/firebase";
```

이렇게 하면:
- ✅ Firebase 앱이 한 번만 초기화됨
- ✅ `authDomain`이 일관되게 유지됨
- ✅ 설정 충돌 방지

## 📝 수정 완료

`src/core/firebase.ts`를 수정하여 중복 초기화를 제거했습니다.

