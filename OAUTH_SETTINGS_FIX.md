# 🔧 OAuth 설정 확인 및 수정 사항

## ✅ Google Cloud Console 설정 확인

### 승인된 JavaScript 원본
- ✅ `http://localhost:5173`
- ✅ 모든 프로덕션 도메인 포함

### 승인된 리디렉션 URI
- ✅ `http://localhost:5173/_/auth/handler` (핵심!)
- ✅ 모든 프로덕션 도메인의 `/_/auth/handler` 포함

## ⚠️ 추가 필요할 수 있는 URI

### Redirect 방식에서 추가 확인:

Firebase Auth의 redirect 방식은 다음과 같이 작동합니다:
1. 사용자가 Google 로그인 버튼 클릭
2. Google 로그인 페이지로 이동
3. 로그인 완료 후 `/_/auth/handler`로 리다이렉션
4. Firebase Auth가 원래 페이지(`/login`)로 다시 리다이렉션

**따라서 다음 URI도 추가하는 것을 권장합니다:**

### 추가해야 할 Redirect URI:
- `http://localhost:5173/login` ← 추가 권장
- `http://localhost:5174/login` ← 추가 권장

## 🔍 Firebase Console 확인 필요

"Unable to verify that the app domain is authorized" 오류는 **Firebase Console의 Authorized Domains** 문제일 가능성이 높습니다.

### Firebase Console → Authentication → Settings → Authorized domains

다음이 모두 포함되어 있어야 합니다:

1. ✅ `localhost` (가장 중요!)
2. ✅ `yago-vibe-spt.firebaseapp.com`
3. ✅ `yagovibe.com`
4. ✅ `www.yagovibe.com`

### 확인 방법

1. Firebase Console 열기
2. Authentication → Settings 탭
3. "Authorized domains" 섹션 확인
4. `localhost`가 목록에 있는지 확인

## 🎯 권장 조치

1. **Google Cloud Console에 `/login` URI 추가** (선택사항이지만 권장)
   - `http://localhost:5173/login`
   - `http://localhost:5174/login`

2. **Firebase Console Authorized Domains 확인** (필수)
   - `localhost` 포함 여부 확인

## 📋 설정 순서

1. Firebase Console → Authentication → Settings → Authorized domains
   - `localhost` 추가 (없으면)
   
2. Google Cloud Console → Redirect URIs
   - `/login` 경로 추가 (선택사항이지만 권장)

3. 1-2분 대기 후 테스트

