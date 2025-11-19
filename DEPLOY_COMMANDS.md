# 🚀 YAGO VIBE 배포 명령어 모음

실제 배포 시 사용하는 모든 명령어를 정리했습니다.

## 📋 빠른 참조

```bash
# 1. GitHub 초기화 및 업로드
git init
git add .
git commit -m "chore: initial YAGO VIBE production ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/yago-vibe-spt.git
git push -u origin main

# 2. Firebase Functions 배포
cd functions
npm install
firebase deploy --only functions

# 3. Firestore 보안 규칙 배포
cd ..
cp firestore.rules.production firestore.rules
firebase deploy --only firestore:rules

# 4. Storage 보안 규칙 배포
firebase deploy --only storage

# 5. 전체 Production 배포 (규칙 + Functions)
npm run deploy:production
```

---

## 📝 상세 명령어

### 1. Git 초기화 (처음만)

```bash
# 현재 디렉토리 확인
pwd  # 또는 Windows: cd

# Git 초기화
git init

# .gitignore 확인 (이미 설정되어 있음)
cat .gitignore

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "chore: initial YAGO VIBE production ready"

# main 브랜치로 설정
git branch -M main

# GitHub repository 생성 후 (https://github.com/new)
# 원격 저장소 연결
git remote add origin https://github.com/YOUR_USERNAME/yago-vibe-spt.git

# GitHub에 업로드
git push -u origin main
```

### 2. Firebase Functions 배포

```bash
# Functions 디렉토리로 이동
cd functions

# 의존성 설치 (처음만)
npm install

# 모든 Functions 배포
firebase deploy --only functions

# 특정 Function만 배포
firebase deploy --only functions:searchProducts
firebase deploy --only functions:recommendSimilar
firebase deploy --only functions:getSellerTrustScore
firebase deploy --only functions:askAdminAI

# Functions 목록 확인
firebase functions:list

# Functions 로그 확인
firebase functions:log

# 특정 Function 로그만 확인
firebase functions:log --only searchProducts
```

### 3. Firestore 보안 규칙 배포

```bash
# 프로젝트 루트로 이동
cd ..

# Production 규칙 적용
cp firestore.rules.production firestore.rules

# Firestore 규칙 배포
firebase deploy --only firestore:rules

# 규칙 테스트 (에뮬레이터 사용)
firebase emulators:start --only firestore
```

### 4. Storage 보안 규칙 배포

```bash
# Storage 규칙 배포
firebase deploy --only storage

# Storage 규칙 확인
cat storage.rules
```

### 5. 전체 Production 배포

```bash
# 빌드 + 규칙 + Functions 모두 배포
npm run deploy:production
```

---

## 🔧 Vercel 배포

### Vercel CLI 사용 (선택)

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포 (첫 배포)
vercel

# Production 배포
vercel --prod

# 환경 변수 설정
vercel env add VITE_FIREBASE_API_KEY production
```

### Vercel Dashboard 사용 (권장)

1. **https://vercel.com** 접속
2. **"Add New..."** → **"Project"**
3. GitHub 레포지토리 선택
4. 환경 변수 설정
5. **"Deploy"** 클릭

**✅ Dashboard 사용을 권장합니다 (더 쉽고 안전함)**

---

## 📊 배포 상태 확인

### Firebase Functions 상태

```bash
# Functions 목록 및 상태 확인
firebase functions:list

# 최근 배포 내역 확인
firebase functions:log --limit 50

# 특정 함수의 최근 에러 확인
firebase functions:log --only searchProducts | grep ERROR
```

### Vercel 배포 상태

1. **Vercel Dashboard** → **Deployments**
2. 최신 배포 상태 확인
3. **Build Logs** 클릭하여 빌드 로그 확인

---

## 🚨 문제 해결 명령어

### 빌드 실패 시

```bash
# 로컬에서 빌드 테스트
npm run build

# 빌드 에러 확인
npm run build 2>&1 | tee build.log

# TypeScript 타입 체크
npx tsc --noEmit
```

### Functions 배포 실패 시

```bash
# Functions 디렉토리에서
cd functions

# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 빌드 테스트
npm run build

# Functions 재배포
firebase deploy --only functions
```

### Git 문제 해결

```bash
# Git 상태 확인
git status

# 변경사항 확인
git diff

# 최근 커밋 확인
git log --oneline -5

# 원격 저장소 확인
git remote -v

# 강제 푸시 (주의!)
# git push -f origin main
```

---

## 📝 배포 후 확인 체크리스트

```bash
# 1. Functions 정상 작동 확인
curl https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/searchProducts

# 2. Vercel 배포 URL 확인
# 브라우저에서 https://yago-vibe-spt.vercel.app 접속

# 3. 환경 변수 확인
# Vercel Dashboard → Settings → Environment Variables

# 4. Firestore 규칙 확인
# Firebase Console → Firestore → Rules
```

---

## 🎉 완료!

모든 명령어를 실행하면 YAGO VIBE가 Production으로 배포됩니다!

