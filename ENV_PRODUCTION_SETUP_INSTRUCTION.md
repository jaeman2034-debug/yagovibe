# 📋 .env.production 파일 설정 가이드

## ✅ .env.production 파일 생성 완료

`.env.production` 파일이 생성되었습니다. 이제 Firebase Console의 최신 값으로 수정해야 합니다.

## 🔍 Firebase Console에서 최신 값 확인

### Step 1: Firebase Console 접속

1. https://console.firebase.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`

### Step 2: 웹 앱 구성 코드 확인

1. ⚙️ **Project Settings** (왼쪽 상단) 클릭
2. **General** 탭
3. **Your apps** 섹션에서 웹 앱 선택 (또는 새로 추가)
4. **SDK setup and configuration** 섹션에서 **Config** 선택
5. 다음 값들을 복사:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← 이 값 복사
  authDomain: "yago-vibe-spt.firebaseapp.com",  // ← 이 값 복사
  projectId: "yago-vibe-spt",    // ← 이 값 복사
  storageBucket: "yago-vibe-spt.firebasestorage.app",  // ← 이 값 복사
  messagingSenderId: "123456789012",  // ← 이 값 복사
  appId: "1:123456789012:web:abcdefghijklmnop",  // ← 이 값 복사
  measurementId: "G-XXXXXXXXXX"  // ← 이 값 복사 (선택사항)
};
```

## ✏️ .env.production 파일 수정

### Step 3: 파일 열기

프로젝트 루트의 `.env.production` 파일을 열어주세요.

### Step 4: 값 교체

다음 환경변수들을 Firebase Console에서 복사한 값으로 교체하세요:

```env
# ⚠️ 아래 값들을 Firebase Console에서 복사한 실제 값으로 교체하세요!

VITE_FIREBASE_API_KEY=AIzaSy... (Firebase Console의 apiKey 값으로 교체)
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com (Firebase Console의 authDomain 값으로 교체)
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt (Firebase Console의 projectId 값으로 교체)
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.firebasestorage.app (Firebase Console의 storageBucket 값으로 교체)
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012 (Firebase Console의 messagingSenderId 값으로 교체)
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop (Firebase Console의 appId 값으로 교체)
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX (Firebase Console의 measurementId 값으로 교체, 선택사항)
```

### Step 5: 저장

파일을 저장하세요.

## ⚠️ 주의사항

### 값 형식

**올바른 형식**:
```
VITE_FIREBASE_API_KEY=AIzaSyCJ0ahD8gJDG1GM3GWoob3tsaVS4D93Wcw
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
```

**잘못된 형식**:
```
VITE_FIREBASE_API_KEY="AIzaSy..."  ❌ 따옴표 포함
VITE_FIREBASE_API_KEY= AIzaSy...   ❌ 공백 포함
VITE_FIREBASE_AUTH_DOMAIN = yago-vibe-spt.firebaseapp.com  ❌ 공백 포함
```

### storageBucket 값 확인

코드에서 `storageBucket`이 `"yago-vibe-spt.firebasestorage.app"`로 하드코딩되어 있습니다.

`.env.production` 파일의 `VITE_FIREBASE_STORAGE_BUCKET` 값이 이와 일치해야 합니다.

만약 Firebase Console의 `storageBucket` 값이 다르다면:
1. Firebase Console의 실제 값을 확인
2. `.env.production` 파일에 그 값 입력
3. `src/lib/firebase.ts` 파일의 하드코딩된 값도 확인 필요

## ✅ 확인 체크리스트

- [ ] Firebase Console에서 최신 설정 값 확인 완료
- [ ] `.env.production` 파일 열기 완료
- [ ] `VITE_FIREBASE_API_KEY` 값 교체 완료
- [ ] `VITE_FIREBASE_AUTH_DOMAIN` 값 교체 완료
- [ ] `VITE_FIREBASE_PROJECT_ID` 값 교체 완료
- [ ] `VITE_FIREBASE_STORAGE_BUCKET` 값 교체 완료
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID` 값 교체 완료
- [ ] `VITE_FIREBASE_APP_ID` 값 교체 완료
- [ ] `VITE_FIREBASE_MEASUREMENT_ID` 값 교체 완료 (선택사항)
- [ ] 모든 값에 오타/공백/따옴표 없음 확인
- [ ] 파일 저장 완료

## 🚀 다음 단계

`.env.production` 파일 수정이 완료되면:

1. **Vercel 환경변수도 동일한 값으로 업데이트** (VERCEL_ENV_CHECKLIST.md 참고)
2. **Vercel 재배포** (환경변수 변경 후 필수)
3. **브라우저 캐시 삭제**
4. **테스트**

## 💡 참고

- `.env.production` 파일은 Firebase Hosting 배포 시 사용됩니다
- Vercel 배포 시에는 Vercel Dashboard의 Environment Variables가 사용됩니다
- 두 곳 모두 Firebase Console의 최신 값과 일치해야 합니다

