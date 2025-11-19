# 🚀 YAGO VIBE - 실제 서비스 배포 가이드 (Production Blueprint)

이 가이드는 YAGO VIBE 플랫폼을 실제 서비스로 배포하는 완전한 프로세스를 제공합니다.

## 📋 목차

1. [전체 인프라 설계 요약](#1-전체-인프라-설계-요약)
2. [프론트엔드 배포 (Vercel)](#2-프론트엔드-배포-vercel)
3. [대안: Firebase Hosting 배포](#3-대안-firebase-hosting-배포)
4. [API (Cloud Functions) 배포](#4-api-cloud-functions-배포)
5. [도메인 연결](#5-도메인-연결)
6. [보안 설정](#6-보안-설정)
7. [성능 최적화](#7-성능-최적화)
8. [배포 체크리스트](#8-배포-체크리스트)

---

## 1. 전체 인프라 설계 요약

YAGO VIBE는 다음 4가지 컴포넌트로 구성됩니다:

| 구성 요소 | 기술 | 상태 |
|---------|------|------|
| 프론트엔드 호스팅 | Vercel 또는 Firebase Hosting | 배포 필요 |
| 백엔드 API/AI | Firebase Cloud Functions | ✅ 이미 구축됨 |
| 데이터베이스 | Firestore | ✅ 이미 구축됨 |
| 이미지 저장 | Firebase Storage | ✅ 이미 구축됨 |

**즉, 프론트엔드만 배포하면 완전한 Production 서비스로 운영 가능합니다.**

---

## 2. 프론트엔드 배포 (Vercel)

### 🟢 왜 Vercel인가?

- ✅ React/Vite 프로젝트와 가장 궁합 좋음
- ✅ 배포 속도 가장 빠름
- ✅ Edge Network (CDN) 자동 적용
- ✅ 이미지 최적화 자동
- ✅ GitHub 연동 → push 하면 자동 배포
- ✅ 무료 플랜 제공 (개인/팀 프로젝트)

### 🔧 준비 단계

#### 2-1. GitHub Repository 준비

```bash
# 로컬에서 Git 초기화 (이미 되어 있다면 생략)
git init

# GitHub에 새 repository 생성 후
git remote add origin https://github.com/YOUR_USERNAME/yago-vibe-spt.git
git branch -M main
git add .
git commit -m "Initial commit: Production ready"
git push -u origin main
```

#### 2-2. Vercel 가입 및 프로젝트 생성

1. **Vercel 가입**: https://vercel.com
   - GitHub 계정으로 로그인 (권장)

2. **New Project 생성**:
   - Dashboard → "Add New..." → "Project"
   - GitHub repository 선택
   - Framework: **Vite** 자동 감지됨
   - Root Directory: `./` (기본값)
   - Build Command: `npm run build` (자동)
   - Output Directory: `dist` (자동)

3. **환경 변수 등록** (중요!):
   - Project Settings → Environment Variables
   - 다음 변수들을 추가:

```bash
# Firebase 설정 (필수)
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc...

# Firebase Functions URL (필수)
VITE_FUNCTIONS_ORIGIN=https://asia-northeast3-yago-vibe-spt.cloudfunctions.net

# 카카오 맵 API 키 (선택)
VITE_KAKAO_MAP_KEY=your_kakao_map_key

# OpenAI API 키 (선택 - Functions에서만 사용)
# VITE_OPENAI_KEY는 클라이언트에서 직접 사용하지 않으므로 생략 가능

# 환경 구분 (선택)
NODE_ENV=production
```

#### 2-3. 배포 실행

1. **자동 배포** (권장):
   - GitHub에 push하면 자동으로 배포됨
   ```bash
   git push origin main
   ```

2. **수동 배포**:
   - Vercel Dashboard → Deployments → "Redeploy"

3. **배포 완료 후**:
   - URL 예시: `https://yago-vibe-spt.vercel.app`
   - 자동으로 HTTPS 적용됨

---

## 3. 대안: Firebase Hosting 배포

Vercel 대신 Firebase Hosting을 사용할 수도 있습니다.

### 🔧 준비 단계

```bash
# Firebase CLI 설치 (이미 되어 있다면 생략)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# Firebase 프로젝트 초기화 (이미 되어 있다면 생략)
firebase init hosting

# 빌드 및 배포
npm run build
firebase deploy --only hosting
```

### ⚠️ Firebase Hosting vs Vercel

| 항목 | Firebase Hosting | Vercel |
|------|-----------------|--------|
| 이미지 최적화 | ❌ 없음 | ✅ 자동 |
| 배포 속도 | ⚠️ 느림 | ✅ 빠름 |
| CDN 속도 | ✅ 좋음 | ✅ 매우 좋음 |
| GitHub 연동 | ⚠️ 수동 | ✅ 자동 |
| 무료 플랜 | ✅ 10GB/월 | ✅ 100GB/월 |

**👉 추천: Vercel이 정답**

---

## 4. API (Cloud Functions) 배포

이미 구축된 Cloud Functions를 Production에 배포합니다.

### 🔧 배포 명령어

```bash
# 모든 Functions 배포
cd functions
npm install
firebase deploy --only functions

# 특정 Function만 배포
firebase deploy --only functions:searchProducts
firebase deploy --only functions:recommendSimilar
firebase deploy --only functions:getSellerTrustScore
firebase deploy --only functions:askAdminAI
```

### ✅ 배포 확인

```bash
# Functions 목록 확인
firebase functions:list

# 로그 확인
firebase functions:log
```

### 📋 주요 Functions 목록

- ✅ `generateTags` - AI 태그 생성
- ✅ `generateCategory` - AI 카테고리 생성
- ✅ `generateOneLineSummary` - AI 한 줄 요약
- ✅ `generateTotalScore` - AI 종합 등급
- ✅ `getRecommendedFeed` - AI 추천 피드
- ✅ `searchProducts` - AI 검색 엔진
- ✅ `recommendSimilar` - AI 유사상품 추천
- ✅ `getSellerTrustScore` - AI 판매자 신뢰도
- ✅ `askAdminAI` - 운영자 AI 도우미
- ✅ `negotiateHelper` - AI 채팅 흥정 도우미

---

## 5. 도메인 연결

### 🔧 도메인 구매

추천 도메인 구매 사이트:
- **Cloudflare** (가장 추천 🔥) - https://cloudflare.com
- **가비아** - https://www.gabia.com
- **Namecheap** - https://www.namecheap.com
- **Google Domains** (현재 Squarespace로 이전됨)

### 🔧 Vercel 도메인 연결

1. **Vercel Dashboard**:
   - Project → Settings → Domains → "Add Domain"

2. **도메인 입력**:
   - 예: `yagovibe.com`
   - 예: `app.yagovibe.com` (서브도메인)

3. **DNS 설정**:
   - Vercel에서 제공하는 DNS 레코드를 도메인 제공업체에 추가:
     ```
     Type: CNAME
     Name: @ 또는 www
     Value: cname.vercel-dns.com
     ```

4. **SSL 자동 적용**:
   - 도메인 연결 완료 후 자동으로 HTTPS 적용됨
   - 24시간 이내 자동 갱신

---

## 6. 보안 설정

### 🔐 Firestore 보안 규칙 (Production)

**중요**: `firestore.rules.production` 파일을 `firestore.rules`로 복사하여 적용합니다.

```bash
# Production 규칙 적용
cp firestore.rules.production firestore.rules

# Firestore 규칙 배포
firebase deploy --only firestore:rules
```

### 🔐 주요 보안 규칙

#### 마켓 상품
- **읽기**: 인증된 사용자 모두 가능
- **생성**: 로그인 사용자만 가능 (본인만 작성 가능)
- **수정/삭제**: 본인만 가능

#### 사용자 프로필
- **읽기**: 인증된 사용자 모두 가능 (공개 프로필)
- **쓰기**: 본인만 가능

#### 채팅
- **읽기/쓰기**: 채팅 참여자만 가능

#### 관리자 페이지
- **접근**: 관리자 이메일(`@yagovibe.com` 또는 `admin`)만 가능

### 🔐 Storage 보안 규칙

```bash
# storage.rules 확인 및 배포
firebase deploy --only storage
```

---

## 7. 성능 최적화

### 🚀 이미지 최적화

#### Vercel 자동 최적화
- Vercel이 자동으로 이미지 최적화 처리
- WebP 포맷 자동 변환
- 반응형 이미지 자동 생성

#### Storage 업로드 시 최적화
- 이미지 업로드 시 1080px 이하로 리사이즈 권장
- 클라이언트에서 처리 또는 Cloud Functions에서 처리

### 🚀 코드 스플리팅

- Vite가 자동으로 코드 스플리팅 처리
- React.lazy() 사용으로 추가 최적화 가능

### 🚀 AI 호출 최적화

1. **중복 요청 방지**:
   - React Query 또는 SWR 사용 권장
   - 캐싱 전략 적용

2. **Debounce**:
   - 검색 입력: 300ms debounce
   - 이미 구현됨 (`MarketPage.tsx`)

3. **Skeleton UI**:
   - 로딩 화면 적용 (AI 분석 중 깜빡임 방지)
   - 이미 구현됨

---

## 8. 배포 체크리스트

### ✅ 프론트엔드 배포

- [ ] GitHub Repository 생성 및 코드 push
- [ ] Vercel 프로젝트 생성
- [ ] 환경 변수 등록 (Firebase, Functions URL 등)
- [ ] 자동 배포 설정 확인
- [ ] 배포 URL 확인 (`https://yago-vibe-spt.vercel.app`)
- [ ] 모바일/PC 테스트 완료

### ✅ 백엔드 (Cloud Functions) 배포

- [ ] 모든 Functions 배포 완료
- [ ] Functions 로그 확인 (에러 없음)
- [ ] API 응답 속도 확인
- [ ] CORS 설정 확인

### ✅ 보안 설정

- [ ] Firestore 보안 규칙 배포 (`firestore.rules.production` 적용)
- [ ] Storage 보안 규칙 배포
- [ ] 환경 변수 보안 확인 (API 키 노출 없음)
- [ ] 관리자 페이지 접근 제한 확인

### ✅ 도메인 연결

- [ ] 도메인 구매 완료
- [ ] Vercel 도메인 연결 완료
- [ ] DNS 설정 완료 (24시간 대기)
- [ ] SSL 자동 적용 확인

### ✅ 테스트

- [ ] 회원가입/로그인 테스트
- [ ] 상품 등록/수정/삭제 테스트
- [ ] AI 검색 엔진 테스트
- [ ] AI 추천 피드 테스트
- [ ] AI 유사상품 추천 테스트
- [ ] 채팅 기능 테스트
- [ ] 관리자 페이지 접근 테스트
- [ ] 모바일 반응형 테스트

### ✅ 모니터링 설정

- [ ] Firebase Console 모니터링 확인
- [ ] Vercel Analytics 설정 (선택)
- [ ] 에러 추적 도구 설정 (선택: Sentry)

---

## 🎉 배포 완료!

이제 YAGO VIBE는 실제 서비스로 운영 가능합니다!

### 📊 최종 URL

- **프론트엔드**: `https://yago-vibe-spt.vercel.app` (또는 커스텀 도메인)
- **Functions**: `https://asia-northeast3-yago-vibe-spt.cloudfunctions.net`

### 🔗 유용한 링크

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Firebase Console**: https://console.firebase.google.com
- **Firebase Functions Log**: https://console.firebase.google.com/project/yago-vibe-spt/functions/logs

---

## 🚨 문제 해결

### 문제: Functions 배포 실패

```bash
# Functions 로그 확인
firebase functions:log

# Functions 디렉토리에서 재배포
cd functions
npm install
firebase deploy --only functions
```

### 문제: 환경 변수 적용 안됨

1. Vercel Dashboard → Project Settings → Environment Variables
2. 모든 환경 변수 확인
3. "Redeploy" 실행

### 문제: Firestore 규칙 적용 안됨

```bash
# 규칙 파일 확인
cat firestore.rules

# 규칙 배포
firebase deploy --only firestore:rules

# 규칙 테스트 (선택)
firebase emulators:start --only firestore
```

---

## 📞 지원

배포 관련 문제가 발생하면:
1. Firebase Console 로그 확인
2. Vercel Dashboard 로그 확인
3. 브라우저 개발자 도구 콘솔 확인

---

**축하합니다! 🎉 YAGO VIBE Production 배포 완료!**

