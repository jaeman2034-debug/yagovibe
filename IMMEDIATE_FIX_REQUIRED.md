# 🚨 즉시 해결 필요 - 프로덕션 오류

## ❌ 현재 오류

**URL**: `https://yago-vibe-spt.firebaseapp.com/login`
**오류**: `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked`

## 🎯 핵심 문제

이 오류는 **Google Cloud Console의 OAuth 설정**에서 `yago-vibe-spt.firebaseapp.com`이 "승인된 JavaScript 원본"에 없어서 발생합니다.

## ✅ 즉시 해결 방법

### Step 1: Google Cloud Console 접속

1. https://console.cloud.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. **APIs & Services** → **Credentials** 클릭

### Step 2: OAuth 2.0 클라이언트 ID 확인

1. **OAuth 2.0 클라이언트 ID** 목록에서 **웹 클라이언트** 클릭
2. 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

### Step 3: 승인된 JavaScript 원본 추가 (가장 중요!)

**"승인된 JavaScript 원본"** 섹션에서 다음을 확인:

**필수 도메인** (반드시 포함되어 있어야 함):
- ✅ `https://yago-vibe-spt.firebaseapp.com` ← **현재 오류 발생 도메인 (필수!)**
- ✅ `https://yago-vibe-spt.web.app`
- ✅ `https://www.yagovibe.com`
- ✅ `https://yagovibe.com`
- ✅ `https://yagovibe.vercel.app`
- ✅ `http://localhost:5173` (개발 환경용)

**없으면 추가**:
1. "URI 추가" 버튼 클릭
2. `https://yago-vibe-spt.firebaseapp.com` 입력
3. "저장" 클릭

### Step 4: 승인된 리디렉션 URI 확인

**"승인된 리디렉션 URI"** 섹션에서 다음을 확인:

**필수 URI** (반드시 포함되어 있어야 함):
- ✅ `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` ← **현재 오류 발생 도메인 (필수!)**
- ✅ `https://yago-vibe-spt.web.app/_/auth/handler`
- ✅ `https://www.yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.vercel.app/_/auth/handler`
- ✅ `http://localhost:5173/_/auth/handler` (개발 환경용)

**없으면 추가**:
1. "URI 추가" 버튼 클릭
2. `https://yago-vibe-spt.firebaseapp.com/_/auth/handler` 입력
3. "저장" 클릭

### Step 5: Firebase Console - Authorized Domains 확인

1. https://console.firebase.google.com 접속
2. 프로젝트 선택: `yago-vibe-spt`
3. **Authentication** → **Settings** 탭
4. **Authorized domains** 섹션 확인

**필수 도메인**:
- ✅ `yago-vibe-spt.firebaseapp.com` ← **현재 오류 발생 도메인 (필수!)**
- ✅ `yago-vibe-spt.web.app`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`
- ✅ `localhost` (개발 환경용)

**없으면 추가**:
1. "Add domain" 버튼 클릭
2. `yago-vibe-spt.firebaseapp.com` 입력
3. "Add" 클릭

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

## 🔍 확인 방법

설정 후 브라우저 콘솔에서 다음을 확인:
- 오류 메시지가 사라졌는지
- Google 로그인 버튼 클릭 시 정상 작동하는지

