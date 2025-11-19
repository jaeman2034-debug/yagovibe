# 🚀 YAGO VIBE 자동 배포 가이드

GitHub → Vercel 자동 배포 완전 자동화 가이드입니다.

## 📋 목차

1. [환경 변수 자동화](#1-환경-변수-자동화)
2. [Vercel 빌드 오류 방지](#2-vercel-빌드-오류-방지)
3. [GitHub Actions 자동 배포](#3-github-actions-자동-배포)
4. [브랜치 전략](#4-브랜치-전략)

---

## 1️⃣ 환경 변수 자동화

### 🔧 1-1. 환경 변수 Vercel 포맷 변환

로컬 `.env.local` 파일을 Vercel 환경 변수 포맷으로 자동 변환:

```bash
# 환경 변수 변환
npm run export:env
```

**출력 예시**:
```
🎉 변환 완료! 아래 내용을 'Vercel → Environment Variables'에 복사하세요:

VITE_FIREBASE_API_KEY=xxxx
VITE_FIREBASE_AUTH_DOMAIN=xxxx
VITE_FIREBASE_PROJECT_ID=xxxx
...
```

이 내용을 그대로 Vercel Dashboard에 복사하면 됩니다!

### 🔍 1-2. 환경 변수 누락 검사

필수 환경 변수가 누락되었는지 자동 검사:

```bash
# 환경 변수 검사
npm run check:env
```

**출력 예시**:
```
✅ 필수 환경 변수 (OK):
   ✔ VITE_FIREBASE_API_KEY        = AIzaSy...Wcw
   ✔ VITE_FIREBASE_AUTH_DOMAIN    = yago-...com

⚠️  선택적 환경 변수 (미설정):
   ⚠️  VITE_KAKAO_MAP_KEY
   ⚠️  VITE_SENTRY_DSN
```

---

## 2️⃣ Vercel 빌드 오류 방지

### 🔧 2-1. 빌드 전 체크리스트

배포 전에 자동으로 모든 항목을 검사:

```bash
# 빌드 검사
npm run check:build
```

**검사 항목**:
- ✅ 환경 변수 파일 확인
- ✅ 필수 환경 변수 확인
- ✅ Vite 설정 확인
- ✅ TypeScript 설정 확인
- ✅ vercel.json 확인
- ✅ package.json 빌드 스크립트 확인
- ✅ 환경 변수 VITE_ 접두사 확인
- ✅ .gitignore 환경 변수 제외 확인

### 📝 2-2. 배포 전 전체 검사

```bash
# 배포 전 검사 (환경 변수 + 빌드)
npm run pre-deploy
```

---

## 3️⃣ GitHub Actions 자동 배포

### 🔧 3-1. GitHub Actions 설정

이미 `.github/workflows/deploy.yml`과 `.github/workflows/firebase-deploy.yml`이 생성되어 있습니다!

### 📋 3-2. GitHub Secrets 설정

**GitHub Repository** → **Settings** → **Secrets and variables** → **Actions**에서:

#### Vercel Secrets (필수)

1. **VERCEL_TOKEN**:
   - Vercel Dashboard → Settings → Tokens
   - "Create Token" 클릭
   - 토큰 복사

2. **VERCEL_ORG_ID**:
   - Vercel Dashboard → Settings → General
   - "Organization ID" 복사

3. **VERCEL_PROJECT_ID**:
   - Vercel Dashboard → Project → Settings → General
   - "Project ID" 복사

#### Firebase Secrets (선택 - Functions 자동 배포용)

1. **FIREBASE_SERVICE_ACCOUNT**:
   - Firebase Console → Project Settings → Service Accounts
   - "Generate New Private Key" 클릭
   - JSON 파일 내용 전체 복사

2. **FIREBASE_TOKEN**:
   ```bash
   # 로컬에서 실행
   firebase login:ci
   # 토큰 복사
   ```

#### 환경 변수 Secrets (선택 - 빌드 테스트용)

실제 값은 Vercel에서 관리하고, GitHub Actions는 빌드 테스트만 수행합니다.

### 🚀 3-3. 자동 배포 트리거

#### Production 배포 (`main` 브랜치)

```bash
# main 브랜치에 push하면 자동으로 Production 배포
git checkout main
git push origin main
```

#### Preview 배포 (`dev` 브랜치 또는 PR)

```bash
# dev 브랜치에 push하면 자동으로 Preview 배포
git checkout dev
git push origin dev

# 또는 PR 생성 시 자동으로 Preview 배포
git checkout -b feature/new-feature
git push origin feature/new-feature
# GitHub에서 PR 생성
```

### 📊 3-4. 배포 상태 확인

**GitHub Repository** → **Actions** 탭에서 배포 상태 확인 가능:

- ✅ 성공: 녹색 체크마크
- ❌ 실패: 빨간색 X
- 🟡 진행 중: 노란색 원

---

## 4️⃣ 브랜치 전략

### 📋 4-1. 권장 브랜치 구조

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

### 🔧 4-2. 브랜치 생성 및 전환

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

## 🎯 빠른 시작

### 1️⃣ 환경 변수 설정

```bash
# 1. 환경 변수 변환
npm run export:env

# 2. Vercel Dashboard에 복사/붙여넣기
# Vercel → Project Settings → Environment Variables
```

### 2️⃣ GitHub Secrets 설정

```bash
# GitHub Repository → Settings → Secrets and variables → Actions
# 위에서 설명한 Secrets 추가
```

### 3️⃣ 자동 배포 활성화

```bash
# main 브랜치에 push하면 자동 배포!
git push origin main
```

### 4️⃣ 배포 확인

```bash
# GitHub Actions 탭에서 배포 상태 확인
# 또는 Vercel Dashboard에서 확인
```

---

## ✅ 체크리스트

### 환경 변수

- [ ] `npm run export:env` 실행
- [ ] Vercel Dashboard에 환경 변수 추가
- [ ] `npm run check:env` 통과

### 빌드 검사

- [ ] `npm run check:build` 통과
- [ ] 로컬에서 `npm run build` 성공

### GitHub Actions

- [ ] Vercel Secrets 설정 (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] Firebase Secrets 설정 (선택, FIREBASE_SERVICE_ACCOUNT, FIREBASE_TOKEN)
- [ ] `.github/workflows/deploy.yml` 확인
- [ ] `.github/workflows/firebase-deploy.yml` 확인 (선택)

### 배포 테스트

- [ ] `main` 브랜치 push → Production 배포 확인
- [ ] `dev` 브랜치 push → Preview 배포 확인
- [ ] PR 생성 → Preview 배포 확인

---

## 🚨 문제 해결

### 문제: GitHub Actions 배포 실패

1. **Secrets 확인**:
   - GitHub Repository → Settings → Secrets and variables → Actions
   - 모든 필수 Secrets가 설정되어 있는지 확인

2. **빌드 로그 확인**:
   - GitHub Repository → Actions → 실패한 워크플로우 → 로그 확인

3. **로컬 빌드 테스트**:
   ```bash
   npm run build
   ```

### 문제: 환경 변수 적용 안됨

1. **Vercel Dashboard 확인**:
   - Project Settings → Environment Variables
   - 모든 변수가 설정되어 있는지 확인

2. **재배포**:
   - Vercel Dashboard → Deployments → "Redeploy" 클릭

### 문제: Preview 배포가 안됨

1. **브랜치 확인**:
   - `dev` 브랜치가 존재하는지 확인
   - PR이 생성되었는지 확인

2. **Vercel Dashboard 확인**:
   - Project Settings → Git
   - 브랜치 연결 확인

---

## 🎉 완료!

이제 다음이 모두 자동화되었습니다:

✅ **환경 변수 변환**: `npm run export:env`
✅ **환경 변수 검사**: `npm run check:env`
✅ **빌드 검사**: `npm run check:build`
✅ **자동 배포**: `main` 브랜치 push 시 Production 자동 배포
✅ **Preview 배포**: `dev` 브랜치 또는 PR 시 Preview 자동 배포
✅ **Functions 자동 배포**: `main` 브랜치 push 시 Functions 자동 배포 (선택)

**이제 `git push`만 하면 자동으로 배포됩니다! 🚀**

