# 🔍 환경 설정 불일치 자동 탐지 결과

## 📋 프로젝트 스캔 결과

### 1. 환경 변수 파일 검색

**발견된 파일**:
- ✅ `env.example` (예제 파일)
- ❌ `.env.local` (코드베이스에 없음 - 로컬 개발 시 필요)
- ❌ `.env.development` (없음)
- ❌ `.env.production` (없음)

**주의**: `.env.local` 파일은 `.gitignore`에 포함되어 있어 코드베이스에 없을 수 있습니다.

### 2. Firebase 설정 분석

**파일**: `src/lib/firebase.ts`

**현재 firebaseConfig**:
```typescript
const firebaseConfig = {
  apiKey: envVars.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com",
  projectId: "yago-vibe-spt", // 하드코딩됨
  storageBucket: "yago-vibe-spt.firebasestorage.app", // 하드코딩됨
  messagingSenderId: envVars.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: envVars.VITE_FIREBASE_APP_ID || "",
};
```

**환경 변수 사용 현황**:
- ✅ `VITE_FIREBASE_API_KEY` - 환경 변수 사용
- ✅ `VITE_FIREBASE_AUTH_DOMAIN` - 환경 변수 또는 기본값
- ❌ `VITE_FIREBASE_PROJECT_ID` - 하드코딩됨 (환경 변수 미사용)
- ❌ `VITE_FIREBASE_STORAGE_BUCKET` - 하드코딩됨 (환경 변수 미사용)
- ✅ `VITE_FIREBASE_MESSAGING_SENDER_ID` - 환경 변수 사용
- ✅ `VITE_FIREBASE_APP_ID` - 환경 변수 사용

### 3. 환경별 설정 요약

#### 로컬 개발 환경 (localhost:5173)

**사용되는 .env 파일**: `.env.local` (존재 여부 확인 필요)

**firebaseConfig 값**:
- `apiKey`: `VITE_FIREBASE_API_KEY` (환경 변수)
- `authDomain`: `VITE_FIREBASE_AUTH_DOMAIN` 또는 `"yago-vibe-spt.firebaseapp.com"` (기본값)
- `projectId`: `"yago-vibe-spt"` (하드코딩)
- `storageBucket`: `"yago-vibe-spt.firebasestorage.app"` (하드코딩)
- `messagingSenderId`: `VITE_FIREBASE_MESSAGING_SENDER_ID` (환경 변수)
- `appId`: `VITE_FIREBASE_APP_ID` (환경 변수)

**예상 Redirect URL**:
- `https://yago-vibe-spt.firebaseapp.com/_/auth/handler?apiKey=...&redirectUrl=http://localhost:5173/login`

#### 프로덕션 환경 (Firebase Hosting)

**사용되는 설정**: Firebase Hosting 환경 변수 또는 빌드 시점의 환경 변수

**firebaseConfig 값**:
- `apiKey`: Firebase Hosting 환경 변수 또는 빌드 시점 값
- `authDomain`: `"yago-vibe-spt.firebaseapp.com"` (기본값)
- `projectId`: `"yago-vibe-spt"` (하드코딩)
- `storageBucket`: `"yago-vibe-spt.firebasestorage.app"` (하드코딩)
- `messagingSenderId`: Firebase Hosting 환경 변수 또는 빌드 시점 값
- `appId`: Firebase Hosting 환경 변수 또는 빌드 시점 값

**예상 Redirect URL**:
- `https://yago-vibe-spt.firebaseapp.com/_/auth/handler?apiKey=...&redirectUrl={원래_페이지}`

#### Vercel 배포 환경

**사용되는 설정**: Vercel Dashboard의 Environment Variables

**firebaseConfig 값**: 프로덕션과 동일하지만 Vercel 환경 변수 사용

**예상 Redirect URL**:
- `https://yago-vibe-spt.firebaseapp.com/_/auth/handler?apiKey=...&redirectUrl={원래_페이지}`

## ⚠️ 발견된 불일치 사항

### 1. authDomain 설정 불일치 가능성

**문제**:
- 코드에서 `VITE_FIREBASE_AUTH_DOMAIN` 환경 변수를 사용하지만, 기본값은 `"yago-vibe-spt.firebaseapp.com"`
- 만약 `.env.local`에 다른 값이 설정되어 있으면 불일치 발생 가능

**확인 필요**:
- `.env.local` 파일에 `VITE_FIREBASE_AUTH_DOMAIN`이 설정되어 있는지
- 설정되어 있다면 값이 `"yago-vibe-spt.firebaseapp.com"`과 일치하는지

**권장 해결책**:
```typescript
// 현재 코드는 이미 올바름
authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "yago-vibe-spt.firebaseapp.com"
```

### 2. projectId 및 storageBucket 하드코딩

**문제**:
- `projectId`와 `storageBucket`이 하드코딩되어 있음
- 다른 프로젝트로 전환 시 코드 수정 필요

**현재 상태**: 
- ✅ 단일 프로젝트 사용 시 문제 없음
- ⚠️ 다중 프로젝트 사용 시 문제 가능

**권장 해결책** (선택사항):
```typescript
projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "yago-vibe-spt",
storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "yago-vibe-spt.firebasestorage.app",
```

### 3. 환경 변수 누락 가능성

**문제**:
- `.env.local` 파일이 코드베이스에 없음
- 필수 환경 변수가 설정되지 않았을 수 있음

**확인 필요**:
- 로컬 개발 환경에서 다음 환경 변수가 설정되어 있는지:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_AUTH_DOMAIN` (선택사항)

## ✅ 환경별 설정 정렬 체크리스트

### Step 1: .env.local 파일 확인

**로컬 개발 환경**:
```bash
# 프로젝트 루트에 .env.local 파일 생성
VITE_FIREBASE_API_KEY=실제_API_키
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_MESSAGING_SENDER_ID=실제_SENDER_ID
VITE_FIREBASE_APP_ID=실제_APP_ID
```

**확인 방법**:
1. 프로젝트 루트에 `.env.local` 파일이 있는지 확인
2. 위의 환경 변수들이 모두 설정되어 있는지 확인
3. 값이 실제 Firebase Console의 값과 일치하는지 확인

### Step 2: Firebase Console 설정 확인

**Authentication → Settings → Authorized domains**:
- ✅ `localhost`
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`
- ✅ `yagovibe.vercel.app`

**Sign-in method → Google**:
- ✅ Google 제공자 활성화됨
- ✅ 웹 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

### Step 3: Google Cloud Console 설정 확인

**OAuth 2.0 클라이언트 ID → 승인된 JavaScript 원본**:
- ✅ `http://localhost:5173`
- ✅ `http://localhost:5174`
- ✅ `https://yago-vibe-spt.firebaseapp.com`
- ✅ `https://yago-vibe-spt.web.app`
- ✅ `https://www.yagovibe.com`
- ✅ `https://yagovibe.com`
- ✅ `https://yagovibe.vercel.app`

**OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI**:
- ✅ `http://localhost:5173/_/auth/handler`
- ✅ `http://localhost:5174/_/auth/handler`
- ✅ `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`
- ✅ `https://yago-vibe-spt.web.app/_/auth/handler`
- ✅ `https://www.yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.vercel.app/_/auth/handler`

### Step 4: 코드 확인

**src/lib/firebase.ts**:
- ✅ `authDomain`이 환경 변수 또는 기본값 사용
- ✅ 모든 필수 환경 변수 검증 로직 있음
- ✅ 누락 시 명확한 오류 메시지 표시

## 🎯 최종 권장 사항

### 즉시 확인할 사항

1. **.env.local 파일 생성 및 설정**
   ```bash
   # 프로젝트 루트에 .env.local 파일 생성
   cp env.example .env.local
   # 실제 Firebase Console 값으로 수정
   ```

2. **Firebase Console Authorized Domains 확인**
   - `localhost` 포함 여부 확인

3. **Google Cloud Console OAuth 설정 확인**
   - 모든 Origin 및 Redirect URI 포함 확인

4. **브라우저 캐시 및 Service Worker 삭제**
   - 로컬 개발 환경 오류 해결

### 선택적 개선 사항

1. **환경 변수로 projectId 및 storageBucket 관리** (다중 프로젝트 사용 시)
2. **환경별 .env 파일 분리** (개발/스테이징/프로덕션)
3. **환경 변수 검증 강화** (빌드 시점 검증)

