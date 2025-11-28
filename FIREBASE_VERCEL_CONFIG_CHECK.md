# 🔍 Firebase 설정 및 Vercel 환경변수 확인 가이드

## 📋 현재 코드에서 사용하는 Firebase 설정

### src/lib/firebase.ts에서 사용하는 설정

```typescript
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",  // 환경변수에서 가져옴
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt",  // 하드코딩됨
  storageBucket: "yago-vibe-spt.firebasestorage.app",  // 하드코딩됨
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

### 필요한 환경변수

다음 환경변수들이 설정되어 있어야 합니다:

1. `VITE_FIREBASE_API_KEY` - Firebase API 키
2. `VITE_FIREBASE_AUTH_DOMAIN` - 인증 도메인 (기본값: `yago-vibe-spt.firebaseapp.com`)
3. `VITE_FIREBASE_PROJECT_ID` - 프로젝트 ID (하드코딩: `yago-vibe-spt`)
4. `VITE_FIREBASE_STORAGE_BUCKET` - 스토리지 버킷 (하드코딩: `yago-vibe-spt.firebasestorage.app`)
5. `VITE_FIREBASE_MESSAGING_SENDER_ID` - 메시징 발신자 ID
6. `VITE_FIREBASE_APP_ID` - 앱 ID

## 🔍 Firebase Console에서 설정 확인 방법

### Step 1: Firebase Console 접속

1. https://console.firebase.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`

### Step 2: 웹 앱 구성 코드 확인

1. ⚙️ **Project Settings** (왼쪽 상단) 클릭
2. **General** 탭
3. **Your apps** 섹션에서 웹 앱 선택 (또는 새로 추가)
4. **SDK setup and configuration** 섹션에서 **Config** 선택
5. 다음 값들을 확인:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",           // ← 이 값
  authDomain: "yago-vibe-spt.firebaseapp.com",  // ← 이 값
  projectId: "yago-vibe-spt",    // ← 이 값
  storageBucket: "yago-vibe-spt.firebasestorage.app",  // ← 이 값
  messagingSenderId: "123456789012",  // ← 이 값
  appId: "1:123456789012:web:abcdefghijklmnop",  // ← 이 값
  measurementId: "G-XXXXXXXXXX"  // ← 이 값 (선택사항)
};
```

### Step 3: 스크린샷 찍기

Firebase Console에서 다음을 스크린샷으로 찍어주세요:
- **Project Settings → General → Your apps → 웹 앱 → Config** 화면
- 또는 **SDK setup and configuration** 섹션

## 🔍 Vercel 환경변수 확인 방법

### Step 1: Vercel Dashboard 접속

1. https://vercel.com/dashboard 접속
2. 로그인 (필요 시)
3. 프로젝트 선택: `yago-vibe-spt` (또는 해당 프로젝트)

### Step 2: 환경변수 페이지 이동

1. **Settings** 탭 클릭
2. **Environment Variables** 섹션 클릭

### Step 3: 환경변수 확인

다음 환경변수들이 있는지 확인:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_FIREBASE_MEASUREMENT_ID (선택사항)
```

### Step 4: 스크린샷 찍기

Vercel Dashboard에서 다음을 스크린샷으로 찍어주세요:
- **Settings → Environment Variables** 화면
- 각 환경변수의 값이 보이도록 (민감한 정보는 마스킹 가능)

## 📋 비교 체크리스트

### Firebase Console vs Vercel 환경변수

| Firebase Console 필드 | Vercel 환경변수 | 확인 사항 |
|---------------------|---------------|---------|
| `apiKey` | `VITE_FIREBASE_API_KEY` | ✅ 일치하는지 확인 |
| `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` | ✅ 일치하는지 확인 |
| `projectId` | `VITE_FIREBASE_PROJECT_ID` | ✅ 일치하는지 확인 |
| `storageBucket` | `VITE_FIREBASE_STORAGE_BUCKET` | ✅ 일치하는지 확인 |
| `messagingSenderId` | `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ 일치하는지 확인 |
| `appId` | `VITE_FIREBASE_APP_ID` | ✅ 일치하는지 확인 |
| `measurementId` | `VITE_FIREBASE_MEASUREMENT_ID` | ✅ 일치하는지 확인 (선택사항) |

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

Firebase Console의 `storageBucket` 값이 다를 수 있으므로 확인이 필요합니다:
- Firebase Console: `yago-vibe-spt.firebasestorage.app` 또는 `yago-vibe-spt.appspot.com`
- 코드: `yago-vibe-spt.firebasestorage.app` (하드코딩)

## 💡 스크린샷 요청

다음 스크린샷을 공유해주시면 정확한 비교가 가능합니다:

1. **Firebase Console 스크린샷**
   - Project Settings → General → Your apps → 웹 앱 → Config 화면

2. **Vercel 환경변수 스크린샷**
   - Settings → Environment Variables 화면
   - 각 환경변수의 값 (민감한 정보는 마스킹 가능)

스크린샷을 공유해주시면 불일치하는 부분을 정확히 확인하고 수정 방법을 안내해드리겠습니다!

