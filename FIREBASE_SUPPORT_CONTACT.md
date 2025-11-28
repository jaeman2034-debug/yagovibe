# 🔥 Firebase 지원팀 연락처 및 문의 방법

## 📞 Firebase 지원팀 연락 방법

### 1️⃣ Firebase 공식 지원 포럼
**가장 빠르고 효과적인 방법**

- **URL**: https://firebase.google.com/support
- **Firebase 커뮤니티 포럼**: https://firebase.googleblog.com/
- **Stack Overflow**: `firebase` 태그 사용
  - https://stackoverflow.com/questions/tagged/firebase

### 2️⃣ Firebase 공식 문서 및 문제 해결
- **Firebase 문서**: https://firebase.google.com/docs
- **Firebase 문제 해결 가이드**: https://firebase.google.com/support/troubleshooting
- **Firebase 상태 대시보드**: https://status.firebase.google.com/

### 3️⃣ Firebase GitHub 이슈
- **Firebase JS SDK**: https://github.com/firebase/firebase-js-sdk/issues
- **Firebase Admin SDK**: https://github.com/firebase/firebase-admin-node/issues

### 4️⃣ Firebase 공식 이메일 지원 (유료 플랜)
- **Blaze 플랜 (종량제) 이상**: 이메일 지원 제공
- Firebase Console → 프로젝트 설정 → 지원
- 또는: support@firebase.google.com

### 5️⃣ Firebase 공식 Discord 커뮤니티
- **Discord 서버**: Firebase 커뮤니티 Discord
- 실시간 채팅 지원 가능

### 6️⃣ Firebase 공식 블로그 및 소셜 미디어
- **Twitter**: @Firebase
- **YouTube**: Firebase 채널

## 🎯 권장 문의 방법 (우선순위)

### 1순위: Stack Overflow
- **URL**: https://stackoverflow.com/questions/ask
- **태그**: `firebase`, `firebase-authentication`, `google-cloud-platform`
- **제목 예시**: "Firebase auth/requests-from-referer-are-blocked error even with correct authorized domains"
- **내용 포함**:
  - 오류 메시지 전체
  - 설정 확인 결과 (스크린샷)
  - 시도한 해결 방법
  - 코드 스니펫 (필요시)

### 2순위: Firebase GitHub 이슈
- **URL**: https://github.com/firebase/firebase-js-sdk/issues/new
- **이슈 제목**: "auth/requests-from-referer-are-blocked error with correct configuration"
- **템플릿 사용**: Bug report 템플릿 선택

### 3순위: Firebase 커뮤니티 포럼
- **URL**: https://firebase.google.com/support
- 커뮤니티에서 유사한 문제 해결 사례 확인

## 📝 문의 시 포함할 정보

### 필수 정보
1. **오류 메시지**:
   ```
   auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked.
   ```

2. **Firebase 프로젝트 ID**: `yago-vibe-spt`

3. **확인된 설정**:
   - Firebase Console - Authorized domains: `yago-vibe-spt.firebaseapp.com` ✅
   - Google Cloud Console - OAuth 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com` ✅
   - 승인된 JavaScript 원본: `https://yago-vibe-spt.firebaseapp.com` ✅
   - 승인된 리디렉션 URI: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` ✅

4. **시도한 해결 방법**:
   - Firebase Console의 Authorized domains 확인
   - Google Cloud Console의 OAuth 클라이언트 ID 설정 확인
   - 브라우저 캐시/쿠키 삭제
   - 시크릿 모드에서 테스트

5. **환경 정보**:
   - 브라우저: Edge (또는 사용 중인 브라우저)
   - Firebase SDK 버전: (package.json에서 확인)
   - 운영 체제: Windows 10

### 선택적 정보
- 스크린샷 (Firebase Console, Google Cloud Console 설정)
- 네트워크 탭 로그 (개발자 도구)
- 콘솔 로그 (개발자 도구)

## 🔗 유용한 링크

- **Firebase 공식 문서**: https://firebase.google.com/docs
- **Firebase 인증 문서**: https://firebase.google.com/docs/auth
- **Firebase 문제 해결**: https://firebase.google.com/support/troubleshooting
- **Firebase 상태**: https://status.firebase.google.com/
- **Stack Overflow Firebase 태그**: https://stackoverflow.com/questions/tagged/firebase

## 💡 팁

1. **Stack Overflow에 질문할 때**:
   - 명확한 제목 사용
   - 코드 스니펫 포함
   - 오류 메시지 전체 포함
   - 재현 가능한 예제 제공

2. **GitHub 이슈 작성 시**:
   - 버그 리포트 템플릿 사용
   - 재현 단계 명확히 작성
   - 예상 동작 vs 실제 동작 설명

3. **커뮤니티 포럼**:
   - 유사한 문제 해결 사례 먼저 검색
   - 명확하고 정중한 질문 작성

