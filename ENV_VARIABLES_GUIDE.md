# 🔐 YAGO VIBE 환경 변수 설정 가이드

Production 배포 시 필요한 모든 환경 변수를 설명합니다.

## 📋 필수 환경 변수

### Firebase 설정 (필수)

다음 변수들은 Firebase Console에서 확인할 수 있습니다:
**Firebase Console** → **Project Settings** → **General** → **Your apps**

```bash
# Firebase Web App 설정
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop

# Firebase Functions URL (필수)
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
```

### 카카오 맵 API 키 (선택)

```bash
# 카카오 맵 API 키 (있는 경우)
VITE_KAKAO_MAP_KEY=your_kakao_map_key_here
```

### Firebase VAPID 키 (선택 - FCM 푸시 알림용)

```bash
# Firebase Cloud Messaging (FCM) VAPID 키
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
```

### Sentry DSN (선택 - 에러 추적용)

```bash
# Sentry DSN (에러 추적 및 모니터링)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# 앱 버전 (선택 - 배포 버전 추적)
VITE_APP_VERSION=1.0.0
```

### 환경 구분 (선택)

```bash
# 환경 구분 (production/development)
NODE_ENV=production
```

---

## 🔧 환경 변수 설정 방법

### 1. 로컬 개발 환경 (.env.local)

프로젝트 루트에 `.env.local` 파일 생성:

```bash
# .env.local
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
VITE_KAKAO_MAP_KEY=your_kakao_map_key_here
VITE_FIREBASE_VAPID_KEY=your_vapid_key_here
NODE_ENV=development
```

**⚠️ 주의**: `.env.local`은 Git에 커밋하지 마세요! (`.gitignore`에 추가되어 있어야 함)

### 2. Vercel 배포 환경

**Vercel Dashboard** → **Project Settings** → **Environment Variables**

1. **환경 변수 추가**:
   - Name: `VITE_FIREBASE_API_KEY`
   - Value: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX`
   - Environment: `Production`, `Preview`, `Development` (모두 선택 권장)

2. **모든 필수 변수 추가**:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
   - `VITE_FUNCTIONS_ORIGIN`

3. **선택 변수 추가** (있는 경우):
   - `VITE_KAKAO_MAP_KEY`
   - `VITE_FIREBASE_VAPID_KEY`

### 3. Firebase Hosting 배포 환경

**Firebase Console** → **Hosting** → **Environment Variables** (Firebase Hosting에서는 지원하지 않음)

대신 `.env.production` 파일을 사용하거나 빌드 시 환경 변수를 설정해야 합니다.

---

## 🔍 환경 변수 확인 방법

### 로컬에서 확인

```bash
# .env.local 파일 확인
cat .env.local

# 환경 변수 로드 확인 (Vite는 빌드 시 자동 로드)
npm run dev
# 브라우저 콘솔에서 확인:
# console.log(import.meta.env.VITE_FIREBASE_API_KEY)
```

### Vercel에서 확인

1. **Vercel Dashboard** → **Project Settings** → **Environment Variables**
2. 등록된 모든 변수 확인
3. **Deployments** → 특정 배포 → **Build Logs**에서 확인

### 런타임 확인 (개발자 도구)

브라우저 개발자 도구 콘솔에서:

```javascript
// 환경 변수 확인 (주의: 일부 변수는 보안상 숨겨질 수 있음)
console.log(import.meta.env);
```

---

## 🔐 보안 주의사항

### ✅ 안전한 환경 변수

다음 환경 변수는 클라이언트에 노출되어도 상대적으로 안전합니다:
- `VITE_FIREBASE_API_KEY` - Firebase Web App API Key (공개되어도 됨)
- `VITE_FIREBASE_AUTH_DOMAIN` - 공개 도메인
- `VITE_FIREBASE_PROJECT_ID` - 공개 프로젝트 ID
- `VITE_FIREBASE_STORAGE_BUCKET` - 공개 버킷 이름
- `VITE_FUNCTIONS_ORIGIN` - 공개 Functions URL

### ⚠️ 주의해야 할 환경 변수

다음 환경 변수는 클라이언트에 노출되면 안 됩니다 (Functions에서만 사용):
- `OPENAI_API_KEY` - OpenAI API 키 (Functions에서만 사용)
- `FIREBASE_ADMIN_SDK_KEY` - Firebase Admin SDK 키 (Functions에서만 사용)

**👉 이런 변수들은 Functions의 `.env` 파일에서만 관리하세요!**

---

## 📋 환경 변수 체크리스트

배포 전 확인:

- [ ] Firebase Web App 설정 6개 모두 설정됨
- [ ] `VITE_FUNCTIONS_ORIGIN` 설정됨
- [ ] Vercel 환경 변수 모두 등록됨
- [ ] `.env.local` 파일 Git에 커밋 안됨 (`.gitignore` 확인)
- [ ] 로컬 개발 환경 정상 동작 확인
- [ ] Vercel 빌드 성공 확인

---

## 🚨 문제 해결

### 문제: 환경 변수가 적용 안됨

1. **Vercel**:
   - 환경 변수 추가 후 "Redeploy" 실행
   - Build Logs에서 환경 변수 로드 확인

2. **로컬**:
   - `.env.local` 파일 이름 확인 (오타 없음)
   - 개발 서버 재시작 (`npm run dev`)

### 문제: `undefined` 에러

- 환경 변수 이름 확인 (`VITE_` 접두사 필수)
- 빌드 후 확인 (개발 모드와 빌드 모드의 환경 변수 로드 차이)

---

**✅ 환경 변수 설정 완료 후 배포 진행하세요!**

