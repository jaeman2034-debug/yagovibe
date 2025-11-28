# 🔥 Firebase Google 로그인 오류 최종 해결 (설정 기준)

## ❌ 현재 오류

- `auth/requests-from-referer-are-blocked`
- `The requested action is invalid`

## 🎯 문제 원인

**이 문제는 코드 문제가 아니라 Firebase Console 설정 문제입니다.**

Firebase Auth Callback URL이 Google Cloud OAuth에 제대로 등록되지 않았거나, Authorized domains에 localhost가 없어서 발생합니다.

## ✅ 필수 점검 사항

### [필수 점검 1] Firebase Console → Authentication → Sign-in method → Google

**경로**: Firebase Console → Authentication → Sign-in method → Google

**작업**:
1. "웹 클라이언트 ID" 필드 확인
2. 다음 값으로 **정확히 동일하게** 설정:
   ```
   126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
   ```
3. **저장** 클릭

**⚠️ 중요**: 한 글자라도 다르면 안 됨!

**캐시 초기화**:
1. Google 제공자 **비활성화** 클릭
2. **5초 대기**
3. Google 제공자 **다시 활성화** 클릭
4. "웹 클라이언트 ID"가 올바르게 유지되는지 다시 확인
5. **저장** 클릭

### [필수 점검 2] Firebase Console → Authentication → Settings → Authorized domains

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**작업**: 다음 도메인들이 **모두** 포함되어야 함:

- `localhost:5173` ⚠️ **필수!**
- `yago-vibe-spt.firebaseapp.com`
- `yago-vibe-spt.web.app`

**⚠️ 중요**: 이 중 하나라도 없으면 `auth/requests-from-referer-are-blocked` 오류가 발생합니다!

**추가 방법**:
1. "Add domain" 버튼 클릭
2. 도메인 입력 (예: `localhost:5173`)
3. "Add" 클릭
4. 각 도메인을 하나씩 추가

### [필수 점검 3] Google Cloud Console → OAuth 2.0 클라이언트 ID 설정

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**작업**:
1. Web application 타입 클라이언트 ID 찾기
2. 클라이언트 ID 클릭하여 편집
3. 다음 항목들이 **정확히** 포함되어야 함:

**승인된 JavaScript 원본**:
- `http://localhost:5173` ⚠️ **필수!**
- `https://yago-vibe-spt.firebaseapp.com`
- `https://yago-vibe-spt.web.app`

**승인된 리디렉션 URI**:
- `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` ⚠️ **필수!**
- `https://yago-vibe-spt.web.app/__/auth/handler` (선택사항)

**⚠️ 중요**: 
- `http://localhost:5173`이 없으면 개발 환경에서 요청이 차단됩니다
- `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`가 없으면 callback이 실패합니다

### [필수 점검 4] 브라우저 캐시 삭제 및 시크릿 모드 테스트

**작업**:
1. 브라우저 **완전히 닫기** (모든 창)
2. 브라우저 캐시/쿠키 삭제:
   - Windows: Ctrl+Shift+Delete
   - Mac: Cmd+Shift+Delete
   - 캐시 및 쿠키 선택
   - 삭제
3. Google 관련 쿠키 모두 삭제
4. **시크릿 모드**에서 `http://localhost:5173` 접속
5. Google 로그인 시도

**⚠️ 중요**: Firebase Auth는 설정을 즉시 반영하지 않으므로, 캐시가 남아 있으면 항상 실패합니다!

### [필수 점검 5] 코드 확인 (수정 불필요)

**확인 사항**:
- `signInWithPopup(auth, provider)`는 코드상 문제가 없음 ✅
- Firebase SDK가 Firebase Console 설정을 자동으로 사용 ✅
- 코드 수정은 하지 말고 설정만 교정하는 방향으로 진행 ✅

## 🔍 왜 이게 100% 해결인가?

### 1. Firebase Auth Callback URL은 고정
```
https://<project>.firebaseapp.com/__/auth/handler
```
- 이 URL이 Google Cloud OAuth에 등록되어 있어야 함
- 안 되어 있으면 referer 차단

### 2. localhost:5173이 Authorized domains에 등록되어야 함
- 안 되어 있으면 referer 차단

### 3. Firebase Console의 "웹 클라이언트 ID"가 Google OAuth 클라이언트 ID와 일치해야 함
- 다르면 팝업 뜨지만 callback 실패

### 4. 현재 증상 분석
- `firebaseapp.com` 팝업이 뜸 ✅
- Callback URL이 뜨지만 바로 차단됨 ❌
- referer mismatch → callback 무효 → "requested action invalid" ❌

**결론**: Firebase Console 설정 오류 100%

## 📋 최종 체크리스트

### Firebase Console
- [ ] Authentication → Sign-in method → Google
- [ ] "웹 클라이언트 ID" = `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] Google 제공자 비활성화 → 5초 대기 → 재활성화
- [ ] 클라이언트 ID가 올바르게 유지되는지 확인
- [ ] Authentication → Settings → Authorized domains
- [ ] `localhost:5173` 포함됨
- [ ] `yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] `yago-vibe-spt.web.app` 포함됨

### Google Cloud Console
- [ ] APIs & Services → Credentials → OAuth 2.0 Client IDs
- [ ] 클라이언트 ID = `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] "승인된 JavaScript 원본"에 `http://localhost:5173` 포함됨
- [ ] "승인된 JavaScript 원본"에 `https://yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨

### 테스트
- [ ] 브라우저 완전히 닫기
- [ ] 브라우저 캐시/쿠키 삭제
- [ ] 시크릿 모드에서 `http://localhost:5173` 접속
- [ ] Google 로그인 시도
- [ ] 로그인 성공 확인

## 🎯 핵심 요약

1. **코드는 정상**: 수정 불필요 ✅
2. **Firebase Console 설정만 수정**: 
   - "웹 클라이언트 ID" 확인 및 수정
   - Authorized domains에 `localhost:5173` 추가
3. **Google 제공자 재설정**: 캐시 초기화를 위해 비활성화 → 재활성화
4. **브라우저 캐시 삭제**: 설정 변경 후 반드시 필요

