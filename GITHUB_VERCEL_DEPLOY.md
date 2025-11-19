# 🚀 GitHub + Vercel 배포 완전 가이드

## ✅ Step 1: GitHub에 소스 올리기

### 방법 A: Git CLI 사용 (터미널)

#### 1-1. Git 설치 확인

**Windows:**
```bash
git --version
```

**Git이 없으면:**
- https://git-scm.com/download/win 다운로드
- 설치 후 터미널 재시작

#### 1-2. GitHub 저장소 초기화

```bash
# 현재 디렉토리에서
git init

# 모든 파일 추가
git add .

# 커밋
git commit -m "deploy: yago vibe prod with yagovibe.com domain"

# main 브랜치로 변경
git branch -M main

# GitHub 저장소 연결 (아이디 변경 필요)
git remote add origin https://github.com/너GitHub아이디/yago-vibe.git

# 푸시
git push -u origin main
```

---

### 방법 B: GitHub Desktop 사용 (GUI, 추천 ⭐)

#### 1-1. GitHub Desktop 설치
- https://desktop.github.com 다운로드
- 설치 및 로그인

#### 1-2. 저장소 생성
1. GitHub Desktop → File → New Repository
2. Name: `yago-vibe`
3. Local Path: 현재 프로젝트 폴더 선택
4. "Create repository" 클릭

#### 1-3. 커밋 및 푸시
1. 변경사항 확인
2. Summary: `deploy: yago vibe prod with yagovibe.com domain`
3. "Commit to main" 클릭
4. "Publish repository" 클릭

---

### 방법 C: GitHub 웹에서 직접 업로드

1. **GitHub 접속**
   - https://github.com
   - 로그인

2. **새 저장소 생성**
   - "New repository" 클릭
   - Name: `yago-vibe`
   - Public 또는 Private 선택
   - "Create repository" 클릭

3. **파일 업로드**
   - "uploading an existing file" 클릭
   - 프로젝트 폴더의 모든 파일 드래그 앤 드롭
   - "Commit changes" 클릭

---

## ✅ Step 2: Vercel에서 프로젝트 연결

### 2-1. Vercel 접속 및 로그인

1. **Vercel 접속**
   - https://vercel.com
   - GitHub 계정으로 로그인

2. **프로젝트 추가**
   - "Add New..." → "Project" 클릭
   - GitHub 저장소 목록에서 `yago-vibe` 선택

### 2-2. 프로젝트 설정

**Vercel이 자동으로 인식:**
- ✅ Framework: Vite
- ✅ Build Command: `npm run build`
- ✅ Output Directory: `dist`
- ✅ Install Command: `npm install`

**환경 변수 추가 (Settings → Environment Variables):**
```
VITE_FIREBASE_API_KEY=xxx
VITE_FIREBASE_AUTH_DOMAIN=xxx
VITE_FIREBASE_PROJECT_ID=xxx
VITE_FIREBASE_STORAGE_BUCKET=xxx
VITE_FIREBASE_MESSAGING_SENDER_ID=xxx
VITE_FIREBASE_APP_ID=xxx
VITE_OPENAI_API_KEY=xxx
VITE_KAKAO_MAP_KEY=xxx
NODE_ENV=production
```

### 2-3. 배포 시작

1. "Deploy" 버튼 클릭
2. 빌드 진행 상황 확인
3. 배포 완료 대기 (약 2-3분)

---

## ✅ Step 3: 배포 성공 확인

### 3-1. 배포 URL 확인

**배포 성공 시:**
- 자동 생성 URL: `https://yago-vibe.vercel.app`
- 또는 `https://yago-vibe-{랜덤}.vercel.app`

### 3-2. 접속 확인

1. **웹 브라우저에서 접속**
   - 배포 URL 클릭
   - 정상 로드 확인

2. **기능 테스트**
   - 로그인 테스트
   - 상품 목록 확인
   - AI 검색 테스트

### 3-3. 로그 확인

**문제 발생 시:**
- Vercel Dashboard → Deployments
- 실패한 배포 클릭
- Build Logs 확인

---

## ✅ Step 4: 커스텀 도메인 연결 (yagovibe.com)

### 4-1. Vercel에 도메인 추가

1. **Vercel Dashboard**
   - Project → Settings → Domains

2. **도메인 추가**
   - "Add Domain" 클릭
   - `yagovibe.com` 입력
   - `www.yagovibe.com` 추가

3. **DNS 설정 확인**
   - Vercel이 DNS 레코드 제공
   - 또는 네임서버 정보 제공

### 4-2. 가비아 DNS 설정

**옵션 A: Vercel 네임서버 사용 (권장)**

1. Vercel에서 네임서버 확인:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```

2. 가비아에서 네임서버 변경:
   - 도메인 관리 → DNS 관리
   - 네임서버 설정
   - Vercel 네임서버 입력

**옵션 B: DNS 레코드 직접 설정**

1. Vercel에서 DNS 레코드 확인
2. 가비아에서 레코드 추가:
   - A 레코드 또는 CNAME 레코드
   - Vercel이 제공한 값 입력

### 4-3. DNS 전파 확인

1. https://dnschecker.org 접속
2. `yagovibe.com` 입력
3. 전파 확인 (1-2시간 소요)

### 4-4. SSL 인증서 확인

- Vercel이 자동으로 SSL 발급
- 상태: "Valid" 확인

---

## 📋 배포 체크리스트

### GitHub 업로드
- [ ] Git 설치 또는 GitHub Desktop 설치
- [ ] GitHub 저장소 생성
- [ ] 소스 코드 업로드
- [ ] 커밋 및 푸시 완료

### Vercel 배포
- [ ] Vercel 계정 생성/로그인
- [ ] GitHub 저장소 연결
- [ ] 프로젝트 설정 확인
- [ ] 환경 변수 추가
- [ ] 배포 시작
- [ ] 배포 성공 확인

### 도메인 연결
- [ ] 가비아에서 도메인 구매
- [ ] Vercel에 도메인 추가
- [ ] 가비아 DNS 설정
- [ ] DNS 전파 확인
- [ ] SSL 인증서 확인
- [ ] `https://yagovibe.com` 접속 확인

---

## 🎯 빠른 배포 명령어 (Git CLI)

```bash
# 1. Git 초기화
git init
git add .
git commit -m "deploy: yago vibe prod with yagovibe.com domain"
git branch -M main

# 2. GitHub 저장소 연결 (아이디 변경 필요)
git remote add origin https://github.com/너GitHub아이디/yago-vibe.git
git push -u origin main

# 3. Vercel에서 프로젝트 연결
# → Vercel Dashboard → Add New → Project
# → yago-vibe 선택 → Deploy
```

---

## ⚠️ 주의사항

1. **환경 변수 필수**
   - Firebase 설정
   - OpenAI API Key
   - 카카오 맵 Key

2. **.gitignore 확인**
   - `node_modules` 제외
   - `.env` 제외 (환경 변수는 Vercel에 직접 추가)

3. **빌드 오류 시**
   - Vercel Build Logs 확인
   - 로컬에서 `npm run build` 테스트

---

## 🎉 완료!

배포가 완료되면:
- ✅ 웹 서비스 접속 가능
- ✅ PWA 설치 가능
- ✅ 커스텀 도메인 연결 가능
- ✅ 앱에서 도메인 기반 모드 사용 가능

**다음 단계: GitHub에 소스를 올리고 Vercel에 배포하세요!**

