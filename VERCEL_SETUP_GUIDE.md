# 🔧 Vercel 설정 최적화 가이드

프로덕션 수준의 자동 배포를 위한 Vercel 설정 가이드입니다.

## 📋 목차

1. [Git Integration 설정](#1-git-integration-설정)
2. [환경 변수 브랜치별 분리](#2-환경-변수-브랜치별-분리)
3. [Deploy Hook 설정](#3-deploy-hook-설정)
4. [빌드 설정 확인](#4-빌드-설정-확인)

---

## 1️⃣ Git Integration 설정

### 🔧 1-1. Vercel 프로젝트에 GitHub 연결

1. **Vercel Dashboard** → **Add New...** → **Project**
2. GitHub 레포지토리 선택
3. **"Import"** 클릭

### 🔧 1-2. Auto-Assign Branch Deployments 설정

**Vercel Dashboard** → **Project** → **Settings** → **Git**:

1. **Auto-Assign Branch Deployments**: `On` ✅
2. **Production Branch**: `main`
3. **Preview Branches**: 자동 감지됨 (`dev`, `feature/*`)

**설정 결과**:
- `main` 브랜치 → Production 배포
- `dev` 브랜치 → Preview 배포
- `feature/*` 브랜치 → Preview 배포

### 🔧 1-3. Git Integration 활성화

**Vercel Dashboard** → **Project** → **Settings** → **Git**:

1. **Git Integration**: `On` ✅
2. **Build and Development Settings**: 자동 감지됨
3. **Pull Request Comments**: `On` (PR에 Preview URL 자동 추가)

---

## 2️⃣ 환경 변수 브랜치별 분리

### 🔧 2-1. Production 환경 변수 설정

**Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**:

#### 1. "Add New" 클릭

#### 2. 변수 입력

```bash
# Key
VITE_FIREBASE_API_KEY

# Value
AIzaSy...ProductionKey
```

#### 3. Environment 선택

**⚠️ 중요**: **"Production"**만 선택 ✅

#### 4. 반복

다음 변수들을 각각 추가 (모두 Production만 선택):

```bash
VITE_FIREBASE_API_KEY=AIzaSy...ProductionKey
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:production
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net
ENVIRONMENT=production
NODE_ENV=production
```

### 🔧 2-2. Preview 환경 변수 설정

#### 1. "Add New" 클릭

#### 2. 변수 입력

```bash
# Key (Production과 동일)
VITE_FIREBASE_API_KEY

# Value (Preview용 값)
AIzaSy...PreviewKey
```

#### 3. Environment 선택

**⚠️ 중요**: **"Preview"**만 선택 ✅

#### 4. 반복

다음 변수들을 각각 추가 (모두 Preview만 선택):

```bash
VITE_FIREBASE_API_KEY=AIzaSy...PreviewKey
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-dev.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-dev
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-dev.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321098
VITE_FIREBASE_APP_ID=1:987654321098:web:preview
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-dev.cloudfunctions.net
ENVIRONMENT=development
NODE_ENV=development
```

### 🔧 2-3. Development 환경 변수 설정 (선택)

로컬 개발용 환경 변수는 Vercel에 설정하지 않고 로컬 `.env.local` 파일에만 저장하면 됩니다.

---

## 3️⃣ Deploy Hook 설정

### 🔧 3-1. Production Deploy Hook 생성

**Vercel Dashboard** → **Project** → **Settings** → **Deploy Hooks**:

1. **"Create Hook"** 클릭
2. **Name**: `Deploy-Main`
3. **Branch**: `main`
4. **"Create Hook"** 클릭

**결과**: Hook URL이 생성됩니다
```
https://api.vercel.com/v1/integrations/deploy/QmXXXXX
```

### 🔧 3-2. Preview Deploy Hook 생성 (선택)

1. **"Create Hook"** 클릭
2. **Name**: `Deploy-Dev`
3. **Branch**: `dev`
4. **"Create Hook"** 클릭

**결과**: Hook URL이 생성됩니다
```
https://api.vercel.com/v1/integrations/deploy/QmYYYYY
```

### 🔧 3-3. Deploy Hook 사용법

```bash
# Production 배포 트리거
curl -X POST "https://api.vercel.com/v1/integrations/deploy/QmXXXXX"

# Preview 배포 트리거
curl -X POST "https://api.vercel.com/v1/integrations/deploy/QmYYYYY"
```

**⚠️ 참고**: Deploy Hook은 선택 사항입니다. Vercel Git Integration이 자동으로 처리하므로 설정하지 않아도 됩니다.

---

## 4️⃣ 빌드 설정 확인

### 🔧 4-1. 빌드 설정

**Vercel Dashboard** → **Project** → **Settings** → **General**:

- **Framework Preset**: Vite (자동 감지됨) ✅
- **Root Directory**: `./` (기본값) ✅
- **Build Command**: `npm run build` (자동) ✅
- **Output Directory**: `dist` (자동) ✅
- **Install Command**: `npm install` (자동) ✅

### 🔧 4-2. 환경 변수 확인

**Vercel Dashboard** → **Project** → **Settings** → **Environment Variables**:

- Production 환경 변수 설정 확인 ✅
- Preview 환경 변수 설정 확인 ✅

---

## ✅ 체크리스트

### Git Integration

- [ ] GitHub 레포지토리 연결
- [ ] Auto-Assign Branch Deployments 활성화
- [ ] Production Branch: `main` 설정
- [ ] Pull Request Comments 활성화

### 환경 변수

- [ ] Production 환경 변수 설정 (모두 Production만 선택)
- [ ] Preview 환경 변수 설정 (모두 Preview만 선택)
- [ ] `ENVIRONMENT` 변수로 구분 설정

### Deploy Hook (선택)

- [ ] Production Deploy Hook 생성
- [ ] Preview Deploy Hook 생성 (선택)

### 빌드 설정

- [ ] Framework Preset: Vite 확인
- [ ] Build Command 확인
- [ ] Output Directory 확인

---

## 🎉 완료!

이제 Vercel 설정이 완료되었습니다!

### ✨ 다음 단계

1. **GitHub Secrets 설정**: `.github/workflows/ci-cd.yml` 워크플로우에 필요한 Secrets 설정
2. **테스트**: `dev` 브랜치에 push하여 Preview 배포 확인
3. **Production 배포**: `main` 브랜치에 push하여 Production 배포 확인

**자세한 내용은 `PRODUCTION_PIPELINE.md`를 참고하세요!**

