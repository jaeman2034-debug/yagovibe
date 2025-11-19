# 🚀 YAGO VIBE 실제 배포 실행 가이드

이 가이드는 실제 서비스를 배포하는 단계별 실행 가이드입니다.

## 📋 현재 구조

- **프론트**: Vite + React (YAGO VIBE UI)
- **백엔드**: Firebase Cloud Functions (AI, 추천, 사기 감지 등)
- **DB**: Firestore
- **파일**: Firebase Storage

**👉 프론트만 Vercel에 올리면 바로 서비스 가능한 구조입니다!**

---

## 1️⃣ GitHub에 코드 올리기

### 이미 GitHub에 있다면

이 단계는 스킵하고 2단계로 이동하세요.

### 처음 GitHub에 올리는 경우

프로젝트 루트(`yago-vibe-spt/`)에서 실행:

```bash
# Git 초기화 (이미 되어 있다면 생략)
git init

# 모든 파일 추가
git add .

# 첫 커밋
git commit -m "chore: initial YAGO VIBE production ready"

# main 브랜치로 설정
git branch -M main

# GitHub에 새 repository 생성 후 (https://github.com/new)
# 아래 명령어 실행 (YOUR_USERNAME을 본인 계정으로 변경)
git remote add origin https://github.com/YOUR_USERNAME/yago-vibe-spt.git

# GitHub에 업로드
git push -u origin main
```

### Git이 설치되어 있지 않은 경우

1. **Git 설치**: https://git-scm.com/download/win
2. 또는 **GitHub Desktop** 사용: https://desktop.github.com

---

## 2️⃣ Vercel에서 프로젝트 연결하기

### 2-1. Vercel 접속 및 로그인

1. **https://vercel.com** 접속
2. **"Sign Up"** 또는 **"Log In"** 클릭
3. **GitHub 계정으로 로그인** (권장)

### 2-2. 프로젝트 생성

1. **"Add New..."** → **"Project"** 클릭
2. 방금 올린 `yago-vibe-spt` 레포지토리 선택
3. Vercel이 자동으로 **Vite**를 감지합니다

### 2-3. 빌드 설정 확인

기본값이면 거의 OK이지만, 한 번 체크:

- **Framework Preset**: Vite (자동 감지됨)
- **Root Directory**: `./` (기본값)
- **Build Command**: `npm run build` (자동)
- **Output Directory**: `dist` (자동)
- **Install Command**: `npm install` (자동)

**✅ 기본값 그대로 사용하면 됩니다!**

### 2-4. 환경 변수 추가 (중요!)

**Project Settings** → **Environment Variables** 탭에서:

다음 변수들을 추가하세요 (로컬 `.env.local` 파일에서 복사):

```bash
# Firebase 설정 (필수)
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdefghijklmnop

# Firebase Functions URL (필수)
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net

# 카카오 맵 API 키 (선택 - 사용 중이면)
VITE_KAKAO_MAP_KEY=your_kakao_map_key_here

# Sentry DSN (선택 - 모니터링용)
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# 앱 버전 (선택)
VITE_APP_VERSION=1.0.0

# 환경 구분
NODE_ENV=production
```

**⚠️ 중요**: 
- Vite는 반드시 `VITE_`로 시작해야 프론트에서 읽을 수 있습니다
- 각 변수를 추가할 때 **Production, Preview, Development** 모두 선택하는 것을 권장합니다

### 2-5. 배포 실행

**"Deploy"** 버튼 클릭!

Vercel이 자동으로:
1. `npm install` 실행
2. `npm run build` 실행
3. `dist` 폴더를 CDN에 업로드

**배포 완료까지 약 2-3분 소요됩니다.**

---

## 3️⃣ 배포 URL 확인 및 테스트

### 3-1. 배포 완료 후

Vercel이 다음과 같은 주소를 제공합니다:

```
https://yago-vibe-spt.vercel.app
```

또는

```
https://yago-vibe-spt-YOUR_USERNAME.vercel.app
```

### 3-2. 기능 테스트

배포된 URL에서 다음을 확인하세요:

- [ ] ✅ **메인 페이지** 열리는지
- [ ] ✅ **마켓 리스트** 나오는지
- [ ] ✅ **상품 상세 페이지** 진입되는지
- [ ] ✅ **로그인/회원가입** 가능한지
- [ ] ✅ **AI 기능** (태그 생성, 추천, 검색 등) 버튼 클릭 시 오류 없이 동작하는지
- [ ] ✅ **거리 기반 정렬**, 행정동 표시 정상 작동하는지
- [ ] ✅ **채팅 + AI 흥정 도우미** 동작하는지
- [ ] ✅ **관리자 페이지** (`/admin`) 접근 가능한지 (관리자만)

---

## 4️⃣ Firebase Functions 최종 배포

### 4-1. Functions 배포 확인

프론트에서 호출하는 모든 Cloud Functions가 최신 버전인지 확인:

```bash
# 프로젝트 루트에서
cd functions

# 의존성 설치 (안 되어 있으면)
npm install

# 모든 Functions 배포
firebase deploy --only functions
```

### 4-2. 주요 Functions 확인

다음 Functions들이 정상 배포되었는지 확인:

```bash
# Functions 목록 확인
firebase functions:list

# 특정 Function 로그 확인
firebase functions:log --only searchProducts
```

### 4-3. Functions URL 확인

프론트엔드 코드에서 Functions URL이 올바른지 확인:

```typescript
// src/lib/firebase.ts 또는 각 컴포넌트에서
const functionsOrigin = import.meta.env.VITE_FUNCTIONS_ORIGIN || 
  "https://asia-northeast3-yago-vibe-spt.cloudfunctions.net";
```

**✅ 이미 잘 설정되어 있습니다!**

---

## 5️⃣ CORS 설정 확인

### 현재 상태

모든 Cloud Functions에서 CORS가 다음과 같이 설정되어 있습니다:

```typescript
// 모든 Functions에서
res.set("Access-Control-Allow-Origin", "*");
```

또는

```typescript
{
  cors: true,  // 모든 origin 허용
}
```

**✅ 이미 모든 도메인에서 접근 가능하도록 설정되어 있습니다!**

### 커스텀 도메인 사용 시

나중에 커스텀 도메인을 추가해도 자동으로 작동합니다.

---

## 6️⃣ 커스텀 도메인 연결 (선택)

### 6-1. 도메인 구매

추천 도메인 구매 사이트:
- **Cloudflare** (가장 추천 🔥): https://www.cloudflare.com/products/registrar/
- **가비아**: https://www.gabia.com
- **Namecheap**: https://www.namecheap.com

### 6-2. Vercel에 도메인 추가

1. **Vercel Dashboard** → **Project** → **Settings** → **Domains**
2. **"Add Domain"** 클릭
3. 도메인 입력 (예: `yagovibe.com` 또는 `app.yagovibe.com`)
4. **"Add"** 클릭

### 6-3. DNS 설정

Vercel이 제공하는 DNS 레코드를 도메인 관리자 페이지에 추가:

**예시 (Cloudflare)**:
```
Type: CNAME
Name: @ 또는 www
Target: cname.vercel-dns.com
Proxy: Off (처음에는)
```

**예시 (가비아)**:
- 호스트: `@` 또는 `www`
- 레코드 타입: `CNAME`
- 레코드 값: `cname.vercel-dns.com`

### 6-4. SSL 자동 적용

도메인 연결 완료 후 **24시간 이내**에 Vercel이 자동으로 **SSL(HTTPS)**을 적용합니다.

이후에는:

```
https://yagovibe.com
```

로 접속 가능합니다!

---

## 7️⃣ 최종 점검 체크리스트

배포 후 한 번만 전체적으로 확인하세요:

### 인증
- [ ] 로그인 성공
- [ ] 회원가입 성공
- [ ] 로그아웃 성공

### 마켓 기능
- [ ] 상품 리스트 로드 정상
- [ ] 상품 상세 페이지 정상
- [ ] 상품 등록/수정/삭제 정상
- [ ] 이미지 업로드 정상

### AI 기능
- [ ] AI 태그 생성 버튼 작동
- [ ] AI 제목 생성 버튼 작동
- [ ] AI 요약 생성 버튼 작동
- [ ] AI 검색 엔진 정상 작동
- [ ] AI 추천 피드 정상 작동
- [ ] AI 유사상품 추천 정상 작동
- [ ] AI 판매자 신뢰도 평가 정상 작동
- [ ] AI 채팅 흥정 도우미 정상 작동

### 위치 기능
- [ ] 거리 기반 정렬 정상 작동
- [ ] 행정동 표시 정상 작동
- [ ] 지도 표시 정상 작동

### 채팅
- [ ] 채팅방 생성 정상
- [ ] 메시지 전송/수신 정상
- [ ] AI 흥정 도우미 정상 작동

### 관리자
- [ ] 관리자 페이지 (`/admin`) 접근 가능 (관리자만)
- [ ] 운영자 AI 도우미 정상 작동

### 모바일 반응형
- [ ] 모바일 화면에서 정상 작동
- [ ] 태블릿 화면에서 정상 작동

---

## 🎉 배포 완료!

이제 YAGO VIBE는 **실제 서비스**로 운영 가능합니다!

### 최종 URL

- **프론트엔드**: `https://yago-vibe-spt.vercel.app` (또는 커스텀 도메인)
- **Functions**: `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net`

### 유용한 링크

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Firebase Console**: https://console.firebase.google.com/project/yago-vibe-spt
- **Functions Logs**: https://console.firebase.google.com/project/yago-vibe-spt/functions/logs

---

## 🚨 문제 해결

### 문제: 빌드 실패

1. **Vercel Dashboard** → **Deployments** → **Build Logs** 확인
2. 에러 메시지 확인
3. 로컬에서 빌드 테스트:
   ```bash
   npm run build
   ```

### 문제: 환경 변수 적용 안됨

1. **Vercel Dashboard** → **Settings** → **Environment Variables** 확인
2. 모든 변수가 **Production, Preview, Development** 모두 체크되어 있는지 확인
3. **"Redeploy"** 실행

### 문제: Functions 호출 실패

1. **Firebase Console** → **Functions** → **Logs** 확인
2. 에러 메시지 확인
3. Functions 재배포:
   ```bash
   cd functions
   firebase deploy --only functions
   ```

### 문제: CORS 에러

- 이미 모든 Functions에서 `*` origin 허용되어 있음
- 브라우저 콘솔에서 정확한 에러 메시지 확인
- Functions 로그 확인

---

## 📝 추가 설정 (선택)

### 자동 배포 설정

이미 설정되어 있습니다:
- GitHub에 push하면 자동으로 Vercel이 배포합니다
- `main` 브랜치에 push하면 Production 배포
- 다른 브랜치에 push하면 Preview 배포

### 알림 설정

**Vercel**:
- **Project Settings** → **Notifications**
- 배포 성공/실패 시 이메일 알림 설정

**Sentry** (모니터링):
- Sentry Dashboard → Alerts
- 에러 발생 시 알림 설정

---

**✅ 모든 단계를 완료하면 YAGO VIBE Production 서비스 오픈 완료! 🎉**

