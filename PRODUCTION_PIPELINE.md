# 🚀 YAGO VIBE 프로덕션 자동 배포 파이프라인

**당근·쿠팡·배민 수준의 실서비스 운영 방식 완성!**

GitHub Push → 자동 Preview 배포  
Pull Request → 자동 Preview URL 생성  
main 브랜치 merge → Production 자동 배포  
환경 변수 브랜치별 자동 분리  
CLI 없이 완전 자동화

---

## 📋 목차

1. [브랜치 전략](#1-브랜치-전략)
2. [Vercel 설정 최적화](#2-vercel-설정-최적화)
3. [환경 변수 브랜치별 분리](#3-환경-변수-브랜치별-분리)
4. [Deploy Hook 설정](#4-deploy-hook-설정)
5. [GitHub Actions 완전 자동화](#5-github-actions-완전-자동화)
6. [Firebase Functions 자동 배포](#6-firebase-functions-자동-배포)
7. [사용자 플로우](#7-사용자-플로우)

---

## 1️⃣ 브랜치 전략

### 📋 기본 구조

```
main (Production)
  └─ Production 자동 배포
  └─ https://yago-vibe-spt.vercel.app

dev (Preview)
  └─ Preview 자동 배포
  └─ https://yago-vibe-spt-git-dev.vercel.app

feature/* (Feature Branch)
  └─ PR 생성 시 Preview 자동 배포
  └─ https://yago-vibe-spt-git-feature-xxx.vercel.app
```

### 🔧 브랜치 생성

```bash
# Production 브랜치 (기본)
git checkout main

# Preview 브랜치 생성
git checkout -b dev
git push -u origin dev

# Feature 브랜치 생성
git checkout -b feature/new-feature
git push -u origin feature/new-feature
```

---

## 2️⃣ Vercel 설정 최적화

### 🔧 2-1. Git Integration 설정

**Vercel Dashboard** → **Project** → **Settings** → **Git**:

1. **Auto-Assign Branch Deployments**: `On`
   - `main` → Production
   - `dev` → Preview
   - `feature/*` → Preview

2. **Git Integration**: `On`
   - GitHub push 이벤트 자동 감지
   - 자동 빌드 및 배포

3. **Production Branch**: `main`
   - Production 배포는 `main` 브랜치만

### 🔧 2-2. 빌드 설정 확인

**Vercel Dashboard** → **Project** → **Settings** → **General**:

- **Framework Preset**: Vite (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (자동)
- **Output Directory**: `dist` (자동)
- **Install Command**: `npm install` (자동)

---

## 3️⃣ 환경 변수 브랜치별 분리

### 🔧 3-1. Production 환경 변수 (main 브랜치)

**Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**:

#### Production (main 브랜치용)

```bash
# Firebase 설정
VITE_FIREBASE_API_KEY=AIzaSy...ProductionKey
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:production

# Functions URL
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net

# 환경 구분
ENVIRONMENT=production
NODE_ENV=production

# 선택적
VITE_KAKAO_MAP_KEY=production_key_here
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx
VITE_APP_VERSION=1.0.0
```

**⚠️ 중요**: Environment에서 **"Production"**만 선택

### 🔧 3-2. Preview 환경 변수 (dev/feature 브랜치)

#### Preview (dev/feature 브랜치용)

```bash
# Firebase 설정 (Preview용 프로젝트 또는 동일 프로젝트)
VITE_FIREBASE_API_KEY=AIzaSy...PreviewKey
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-dev
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321098
VITE_FIREBASE_APP_ID=1:987654321098:web:preview

# Functions URL (Preview용 또는 동일)
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-dev.cloudfunctions.net

# 환경 구분
ENVIRONMENT=development
NODE_ENV=development

# 선택적
VITE_KAKAO_MAP_KEY=preview_key_here
VITE_SENTRY_DSN=https://yyyyy@yyyyy.ingest.sentry.io/yyyyy
VITE_APP_VERSION=1.0.0-dev
```

**⚠️ 중요**: Environment에서 **"Preview"**만 선택

### 🔧 3-3. Development 환경 변수 (로컬 개발용)

#### Development (로컬 개발용)

```bash
# 로컬 개발 환경 변수 (선택)
VITE_FIREBASE_API_KEY=AIzaSy...DevKey
...
ENVIRONMENT=development
NODE_ENV=development
```

**⚠️ 중요**: Environment에서 **"Development"**만 선택

### 📝 3-4. 환경 변수 설정 팁

1. **같은 Firebase 프로젝트 사용하는 경우**:
   - Production과 Preview에서 동일한 값 사용 가능
   - 하지만 `ENVIRONMENT` 변수로 구분 추천

2. **별도 Firebase 프로젝트 사용하는 경우**:
   - Production: `yago-vibe-spt`
   - Preview: `yago-vibe-dev`
   - 각각 다른 환경 변수 설정

3. **환경 변수 우선순위**:
   - Production > Preview > Development
   - 같은 변수가 여러 환경에 설정되어 있으면 우선순위 높은 것 사용

---

## 4️⃣ Deploy Hook 설정

### 🔧 4-1. Production Deploy Hook 생성

**Vercel Dashboard** → **Project** → **Settings** → **Deploy Hooks**:

1. **"Create Hook"** 클릭
2. **Name**: `Deploy-Main`
3. **Branch**: `main`
4. **"Create Hook"** 클릭

**Hook URL 예시**:
```
https://api.vercel.com/v1/integrations/deploy/QmXXXXX
```

### 🔧 4-2. Preview Deploy Hook 생성 (선택)

1. **"Create Hook"** 클릭
2. **Name**: `Deploy-Dev`
3. **Branch**: `dev`
4. **"Create Hook"** 클릭

**Hook URL 예시**:
```
https://api.vercel.com/v1/integrations/deploy/QmYYYYY
```

### 🔧 4-3. Deploy Hook 사용법

```bash
# Production 배포 트리거
curl -X POST "https://api.vercel.com/v1/integrations/deploy/QmXXXXX"

# Preview 배포 트리거
curl -X POST "https://api.vercel.com/v1/integrations/deploy/QmYYYYY"
```

---

## 5️⃣ GitHub Actions 완전 자동화

### 🔧 5-1. GitHub Secrets 설정

**GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**:

#### 필수 Secrets

1. **VERCEL_PRODUCTION_HOOK** (선택):
   - Value: `https://api.vercel.com/v1/integrations/deploy/QmXXXXX`
   - Production Deploy Hook URL

2. **VERCEL_PREVIEW_HOOK** (선택):
   - Value: `https://api.vercel.com/v1/integrations/deploy/QmYYYYY`
   - Preview Deploy Hook URL

**⚠️ 참고**: Deploy Hook은 선택 사항입니다. Vercel Git Integration이 자동으로 처리하므로 설정하지 않아도 됩니다.

#### Firebase Secrets (Functions 자동 배포용)

1. **FIREBASE_SERVICE_ACCOUNT** (선택):
   - Firebase Console → Project Settings → Service Accounts
   - "Generate New Private Key" → JSON 전체 복사

2. **FIREBASE_TOKEN** (선택):
   ```bash
   firebase login:ci
   # 토큰 복사
   ```

### 🔧 5-2. GitHub Actions 워크플로우

이미 `.github/workflows/ci-cd.yml`이 생성되어 있습니다!

**기능**:
- ✅ `main` 브랜치 push → Production 자동 배포
- ✅ `dev` 브랜치 push → Preview 자동 배포
- ✅ `feature/*` 브랜치 push → Preview 자동 배포
- ✅ Pull Request 생성 → Preview 자동 배포
- ✅ Lint & Test 자동 실행
- ✅ Firebase Functions 자동 배포 (Production만)

---

## 6️⃣ Firebase Functions 자동 배포

### 🔧 6-1. Functions 자동 배포 설정

이미 `.github/workflows/ci-cd.yml`에 통합되어 있습니다!

**동작**:
- `main` 브랜치에 push 시 자동으로 Functions 배포
- `dev` 또는 `feature/*` 브랜치에서는 Functions 배포하지 않음

### 🔧 6-2. Functions 배포 확인

```bash
# Functions 목록 확인
firebase functions:list

# Functions 로그 확인
firebase functions:log
```

---

## 7️⃣ 사용자 플로우

### 🚀 7-1. 개발 플로우

```bash
# 1. dev 브랜치에서 작업
git checkout dev
git pull origin dev

# 2. 기능 개발
# ... 코드 작성 ...

# 3. 커밋 및 푸시
git add .
git commit -m "✨ AI 추천 최적화"
git push origin dev
```

**결과**:
- ✅ 자동 Preview 배포 시작
- ✅ https://yago-vibe-spt-git-dev.vercel.app 생성
- ✅ Pull Request 생성 가능

### 🚀 7-2. Feature 브랜치 플로우

```bash
# 1. Feature 브랜치 생성
git checkout -b feature/new-ai-search
git push -u origin feature/new-ai-search

# 2. 기능 개발
# ... 코드 작성 ...

# 3. 커밋 및 푸시
git add .
git commit -m "✨ 새로운 AI 검색 기능 추가"
git push origin feature/new-ai-search

# 4. GitHub에서 Pull Request 생성
# https://github.com/YOUR_USERNAME/yago-vibe-spt/compare/dev...feature/new-ai-search
```

**결과**:
- ✅ 자동 Preview 배포 시작
- ✅ PR에 Preview URL 자동 추가
- ✅ https://yago-vibe-spt-git-feature-new-ai-search.vercel.app 생성

### 🚀 7-3. Production 배포 플로우

```bash
# 1. dev 브랜치를 main으로 머지
git checkout main
git pull origin main
git merge dev

# 2. Production 배포
git push origin main
```

**결과**:
- ✅ 자동 Production 배포 시작
- ✅ https://yago-vibe-spt.vercel.app 업데이트
- ✅ Firebase Functions 자동 배포 (선택)

---

## ✅ 체크리스트

### Vercel 설정

- [ ] Git Integration 활성화
- [ ] Auto-Assign Branch Deployments 설정
- [ ] Production 환경 변수 설정 (main 브랜치용)
- [ ] Preview 환경 변수 설정 (dev/feature 브랜치용)
- [ ] Development 환경 변수 설정 (로컬용, 선택)

### Deploy Hook (선택)

- [ ] Production Deploy Hook 생성
- [ ] Preview Deploy Hook 생성 (선택)

### GitHub Actions

- [ ] VERCEL_PRODUCTION_HOOK Secret 설정 (선택)
- [ ] VERCEL_PREVIEW_HOOK Secret 설정 (선택)
- [ ] FIREBASE_SERVICE_ACCOUNT Secret 설정 (선택)
- [ ] FIREBASE_TOKEN Secret 설정 (선택)

### 테스트

- [ ] `dev` 브랜치 push → Preview 배포 확인
- [ ] `feature/*` 브랜치 push → Preview 배포 확인
- [ ] Pull Request 생성 → Preview URL 생성 확인
- [ ] `main` 브랜치 push → Production 배포 확인
- [ ] `main` 브랜치 push → Functions 배포 확인 (선택)

---

## 🎉 완료!

이제 YAGO VIBE는 **실서비스 수준의 자동 배포 파이프라인**이 완성되었습니다!

### ✨ 주요 기능

✅ **GitHub Push → 자동 배포**: 브랜치별 자동 Preview/Production 배포  
✅ **Pull Request → 자동 Preview URL**: PR 생성 시 자동 Preview 환경 제공  
✅ **환경 변수 자동 분리**: 브랜치별 다른 환경 변수 자동 적용  
✅ **Firebase Functions 자동 배포**: Production 배포 시 Functions 자동 배포  
✅ **Lint & Test 자동 실행**: 배포 전 자동 검사  
✅ **CLI 없이 완전 자동화**: `git push`만으로 모든 배포 자동화

### 🚀 다음 단계

1. **Vercel 설정 완료**: Git Integration 활성화 및 환경 변수 설정
2. **GitHub Secrets 설정**: Deploy Hook 및 Firebase Secrets 설정 (선택)
3. **테스트**: 각 브랜치에서 push하여 자동 배포 확인
4. **Production 배포**: `main` 브랜치에 머지하여 Production 배포

**이제 `git push`만 하면 모든 배포가 자동으로 처리됩니다! 🎉**

