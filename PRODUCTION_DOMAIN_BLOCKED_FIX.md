# 🔥 프로덕션 환경 오류 해결

## ❌ 현재 오류

**URL**: `https://yago-vibe-spt.firebaseapp.com/login`
**오류**: `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked`

## 🎯 핵심 문제

**프로덕션 환경에서도 같은 오류가 발생하고 있습니다!**

이것은 Google Cloud Console의 OAuth 설정 문제입니다.

## ✅ 즉시 해결 방법

### 1️⃣ Google Cloud Console - 승인된 JavaScript 원본 확인

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 클라이언트 ID

**승인된 JavaScript 원본**에 다음이 모두 포함되어 있어야 합니다:
- ✅ `https://yago-vibe-spt.firebaseapp.com` ← **현재 오류 발생 도메인 (필수!)**
- ✅ `https://yago-vibe-spt.web.app`
- ✅ `https://www.yagovibe.com`
- ✅ `https://yagovibe.com`
- ✅ `https://yagovibe.vercel.app`
- ✅ `http://localhost:5173` (개발 환경용)
- ✅ `http://localhost:5174` (개발 환경용)

**확인 방법**:
1. Google Cloud Console 접속: https://console.cloud.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. **APIs & Services** → **Credentials**
4. OAuth 2.0 클라이언트 ID 클릭 (웹 클라이언트)
5. **승인된 JavaScript 원본** 섹션 확인
6. `https://yago-vibe-spt.firebaseapp.com`이 있는지 확인
7. 없으면 "URI 추가" 클릭 → `https://yago-vibe-spt.firebaseapp.com` 입력 → 저장

### 2️⃣ Google Cloud Console - 승인된 리디렉션 URI 확인

**승인된 리디렉션 URI**에 다음이 모두 포함되어 있어야 합니다:
- ✅ `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` ← **현재 오류 발생 도메인 (필수!)**
- ✅ `https://yago-vibe-spt.web.app/_/auth/handler`
- ✅ `https://www.yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.vercel.app/_/auth/handler`
- ✅ `http://localhost:5173/_/auth/handler` (개발 환경용)
- ✅ `http://localhost:5174/_/auth/handler` (개발 환경용)

**확인 방법**:
1. 같은 OAuth 2.0 클라이언트 ID 페이지에서
2. **승인된 리디렉션 URI** 섹션 확인
3. `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`가 있는지 확인
4. 없으면 "URI 추가" 클릭 → `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` 입력 → 저장

### 3️⃣ Firebase Console - Authorized Domains 확인

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**필수 도메인**:
- ✅ `yago-vibe-spt.firebaseapp.com` ← **현재 오류 발생 도메인 (필수!)**
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`
- ✅ `localhost` (개발 환경용)

**확인 방법**:
1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 선택: `yago-vibe-spt`
3. **Authentication** → **Settings** 탭
4. **Authorized domains** 섹션 확인
5. `yago-vibe-spt.firebaseapp.com`이 있는지 확인
6. 없으면 "Add domain" 클릭 → `yago-vibe-spt.firebaseapp.com` 입력 → "Add" 클릭

## 🔍 오류 메시지 분석

**오류**: `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked`

**의미**:
- `yago-vibe-spt.firebaseapp.com`에서 온 요청이 차단되고 있음
- Google Cloud Console의 "승인된 JavaScript 원본"에 이 도메인이 없을 가능성 높음

## 📋 체크리스트

### Google Cloud Console
- [ ] OAuth 2.0 클라이언트 ID → 승인된 JavaScript 원본
  - [ ] `https://yago-vibe-spt.firebaseapp.com` 포함 확인 ← **가장 중요!**
  - [ ] 기타 프로덕션 도메인 포함 확인
- [ ] OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI
  - [ ] `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` 포함 확인 ← **필수!**
  - [ ] 기타 프로덕션 도메인의 `/_/auth/handler` 포함 확인

### Firebase Console
- [ ] Authentication → Settings → Authorized domains
  - [ ] `yago-vibe-spt.firebaseapp.com` 포함 확인 ← **필수!**
  - [ ] 기타 프로덕션 도메인 포함 확인

## ⏱️ 설정 적용 시간

**중요**: 설정 변경 후 **1-2분 대기** 필요

1. Google Cloud Console 설정 변경
2. Firebase Console 설정 변경
3. **1-2분 대기**
4. 브라우저 새로고침 (F5)
5. 다시 테스트

## 🎯 우선순위

1. **Google Cloud Console → 승인된 JavaScript 원본에 `https://yago-vibe-spt.firebaseapp.com` 추가** (가장 중요!)
2. **Google Cloud Console → 승인된 리디렉션 URI에 `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` 추가**
3. **Firebase Console → Authorized domains에 `yago-vibe-spt.firebaseapp.com` 추가**
4. **1-2분 대기**
5. **브라우저 새로고침**
6. **다시 테스트**

## 💡 핵심 포인트

**가장 중요한 것**: Google Cloud Console의 "승인된 JavaScript 원본"에 `https://yago-vibe-spt.firebaseapp.com` 추가!

이것만 해도 문제가 해결됩니다!

