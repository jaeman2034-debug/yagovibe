# 🔧 Redirect 도메인 인증 오류 해결

## ❌ 현재 오류
- "Unable to verify that the app domain is authorized"
- "The requested action is invalid"
- Redirect 방식은 작동하지만 도메인 인증 실패

## 🔍 원인 분석

URL에서 확인된 정보:
- Redirect URL: `http://localhost:5173/login`
- Auth Handler: `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`
- Auth Type: `signInViaRedirect`

**문제**: Firebase Console의 Authorized Domains에 `localhost`가 제대로 설정되지 않았거나, redirect URL이 인증되지 않았습니다.

## ✅ 해결 방법

### 1. Firebase Console - Authorized Domains 확인

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**확인할 도메인**:
- ✅ `localhost`
- ✅ `127.0.0.1` (선택사항)
- ✅ `yago-vibe-spt.firebaseapp.com`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`

**중요**: `localhost`가 반드시 포함되어 있어야 합니다!

### 2. Google Cloud Console - Redirect URIs 확인

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 클라이언트 ID

**확인할 Redirect URI**:
- ✅ `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
- ✅ `http://localhost:5173/__/auth/handler` (추가 필요!)
- ✅ `http://localhost:5173/login` (추가 필요!)

**중요**: Redirect 방식에서는 `__/auth/handler` 경로가 필요합니다!

### 3. Firebase Console - Sign-in method 확인

**경로**: Firebase Console → Authentication → Sign-in method → Google

**확인할 항목**:
- ✅ Google 제공자 활성화됨
- ✅ "웹 클라이언트 ID" 올바르게 설정됨
- ✅ 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

## 🎯 즉시 확인할 사항

### Firebase Console Authorized Domains
1. Firebase Console 열기
2. Authentication → Settings → Authorized domains
3. `localhost`가 목록에 있는지 확인
4. 없으면 "Add domain" 클릭 → `localhost` 입력 → "Add" 클릭

### Google Cloud Console Redirect URIs
1. Google Cloud Console 열기
2. APIs & Services → Credentials
3. OAuth 2.0 클라이언트 ID 클릭 (웹 클라이언트)
4. "승인된 리디렉션 URI" 섹션 확인
5. 다음 URI가 모두 포함되어 있는지 확인:
   - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
   - `http://localhost:5173/__/auth/handler`
   - `http://localhost:5173/login`

## ⚠️ 주의사항

Redirect 방식에서는 `__/auth/handler` 경로가 반드시 필요합니다!
- Firebase Auth는 내부적으로 이 경로를 사용합니다.
- 이 경로가 Redirect URIs에 없으면 "Unable to verify that the app domain is authorized" 오류가 발생합니다.

## 🔄 변경 후 확인

1. 설정 변경 후 1-2분 대기 (적용 시간)
2. 브라우저 캐시 삭제
3. Google 로그인 다시 시도

