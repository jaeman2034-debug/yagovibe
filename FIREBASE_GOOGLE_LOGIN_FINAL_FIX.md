# 🔥 Firebase Google 로그인 오류 최종 해결

## ❌ 현재 오류

- `auth/requests-from-referer-are-blocked`
- `The requested action is invalid` (팝업에서 발생)

## 🎯 오류 원인

1. **Firebase Console의 Google 제공자에 설정된 "웹 클라이언트 ID"가 Google Cloud Console의 OAuth 클라이언트 ID와 일치하지 않음**
2. **승인된 도메인 누락** (특히 `localhost:5173`)

## ✅ 해결 작업

### 1️⃣ Firebase Console → Google 제공자 설정

**경로**: Firebase Console → Authentication → Sign-in method → Google

**작업**:
1. "웹 클라이언트 ID" 필드 확인
2. 다음 값으로 정확히 설정:
   ```
   126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
   ```
3. 저장

**⚠️ 중요**: 한 글자라도 다르면 안 됨!

### 2️⃣ Google 제공자 재설정 (캐시 초기화)

**작업**:
1. Google 제공자 **비활성화** 클릭
2. 잠시 대기 (5-10초)
3. Google 제공자 **다시 활성화** 클릭
4. "웹 클라이언트 ID" 다시 확인 및 입력
5. 저장

**목적**: Firebase의 OAuth 설정 캐시를 초기화하여 새 설정이 즉시 적용되도록 함

### 3️⃣ Firebase Console → Authorized domains 추가

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**작업**: 다음 도메인을 반드시 추가:
- `localhost` (기본값으로 있을 수 있음)
- `localhost:5173` ⚠️ **필수!**
- `yago-vibe-spt.firebaseapp.com`
- `yago-vibe-spt.web.app`

**⚠️ 중요**: `localhost:5173`이 없으면 개발 환경에서 요청이 차단됩니다!

### 4️⃣ Google Cloud Console 확인

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**확인 사항**:
1. 클라이언트 ID가 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`인지 확인
2. "승인된 JavaScript 원본"에 다음 포함 여부:
   - `http://localhost:5173`
   - `https://yago-vibe-spt.firebaseapp.com`
3. "승인된 리디렉션 URI"에 다음 포함 여부:
   - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`

### 5️⃣ 브라우저 캐시/쿠키 삭제 및 테스트

**작업**:
1. 브라우저 완전히 닫기
2. 브라우저 캐시/쿠키 삭제 (Ctrl+Shift+Delete)
3. Google 관련 쿠키 모두 삭제
4. 시크릿 모드에서 `http://localhost:5173` 접속
5. Google 로그인 시도

## 🔍 코드 점검 결과

### ✅ 코드는 정상

**확인 사항**:
- ✅ 코드에서 클라이언트 ID를 직접 설정하지 않음
- ✅ Firebase SDK가 Firebase Console 설정을 자동으로 사용
- ✅ `GoogleAuthProvider`를 올바르게 사용
- ✅ `signInWithPopup`을 올바르게 사용

**파일 확인**:
- `src/lib/firebase.ts`: Firebase 설정 정상
- `src/pages/LoginPage.tsx`: Google 로그인 구현 정상
- `src/pages/SignupPage.tsx`: Google 로그인 구현 정상

### 📝 코드 개선 제안 (선택사항)

현재 코드는 정상이지만, 더 나은 오류 처리를 위해 다음을 추가할 수 있습니다:

1. **오류 로깅 강화**: 이미 `LoginPage.tsx`에 상세 로깅 추가됨 ✅
2. **사용자 안내 메시지 개선**: 이미 개선됨 ✅

## 📋 최종 체크리스트

### Firebase Console
- [ ] Authentication → Sign-in method → Google
- [ ] "웹 클라이언트 ID" = `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] Google 제공자 비활성화 → 재활성화 (캐시 초기화)
- [ ] Authentication → Settings → Authorized domains
- [ ] `localhost:5173` 추가됨
- [ ] `yago-vibe-spt.firebaseapp.com` 포함됨

### Google Cloud Console
- [ ] APIs & Services → Credentials → OAuth 2.0 Client IDs
- [ ] 클라이언트 ID = `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] "승인된 JavaScript 원본"에 `http://localhost:5173` 포함됨
- [ ] "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨

### 테스트
- [ ] 브라우저 캐시/쿠키 삭제
- [ ] 시크릿 모드에서 `http://localhost:5173` 접속
- [ ] Google 로그인 성공 확인

## 🎯 핵심 요약

1. **코드는 정상**: 수정 불필요
2. **Firebase Console 설정만 수정**: "웹 클라이언트 ID" 확인 및 Authorized domains에 `localhost:5173` 추가
3. **Google 제공자 재설정**: 캐시 초기화를 위해 비활성화 → 재활성화
4. **브라우저 캐시 삭제**: 설정 변경 후 반드시 필요

