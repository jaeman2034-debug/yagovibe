# 🔥 Firebase Google 로그인 오류 완전 해결 (최종 정답)

## ❌ 현재 오류

- `auth/requests-from-referer-are-blocked`
- `The requested action is invalid`

## 🎯 문제 원인

**Google Cloud Console의 OAuth 클라이언트 ID 설정에 `yagovibe.com`과 `www.yagovibe.com`의 redirect URI가 누락되어 있습니다.**

### 오류 발생 흐름

1. 구글 로그인 성공 ✅
2. Firebase Auth가 callback 실행
3. 하지만 OAuth 클라이언트에 `yagovibe.com` 관련 redirect URL 없음 ❌
4. Firebase가 해당 요청을 차단
5. 앱이 fallback 에러 페이지를 띄움
6. → `The requested action is invalid`

**결론**: 구글은 문제가 없고, Firebase OAuth 설정이 100% 문제입니다.

## ✅ 완전한 정답 주소 목록

### [필수 점검 1] Firebase Console → Authorized domains

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**✅ 승인된 도메인 (정답)**

다음 도메인들이 **모두** 포함되어야 합니다:

```
localhost
127.0.0.1
yago-vibe-spt.firebaseapp.com
yago-vibe-spt.web.app
yagovibe.com
www.yagovibe.com
yagovibe.vercel.app
```

**⚠️ 중요**: 이 중 하나라도 없으면 `auth/requests-from-referer-are-blocked` 오류가 발생합니다!

### [필수 점검 2] Google Cloud Console → OAuth 2.0 클라이언트 ID

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs

**클라이언트 ID**: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

#### ✅ 승인된 JavaScript 원본 (Authorized JavaScript origins)

**아래 목록을 그대로 복사해서 사용하세요:**

```
http://localhost:5173
http://localhost:5174
https://yagovibe.com
https://www.yagovibe.com
https://yagovibe.vercel.app
https://yago-vibe-spt.firebaseapp.com
https://yago-vibe-spt.web.app
```

#### ✅ 승인된 리디렉션 URI (Authorized redirect URIs)

**Firebase Auth는 redirect URL이 100% 고정입니다. 아래 목록을 그대로 복사해서 사용하세요:**

```
http://localhost:5173/__/auth/handler
http://localhost:5174/__/auth/handler
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
https://yago-vibe-spt.web.app/__/auth/handler
https://yagovibe.vercel.app/__/auth/handler
https://yagovibe.com/__/auth/handler
https://www.yagovibe.com/__/auth/handler
```

**⚠️ 중요**: 
- `https://yagovibe.com/__/auth/handler` ⚠️ **누락됨!**
- `https://www.yagovibe.com/__/auth/handler` ⚠️ **누락됨!**

이 2개가 없어서 `auth/requests-from-referer-are-blocked` 오류가 발생합니다!

### [필수 점검 3] Firebase Console → Google 제공자 설정

**경로**: Firebase Console → Authentication → Sign-in method → Google

**작업**:
1. "웹 클라이언트 ID" 필드 확인
2. 다음 값으로 **정확히 동일하게** 설정:
   ```
   126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
   ```
3. **저장** 클릭
4. Google 제공자 **비활성화** 클릭
5. **5초 대기**
6. Google 제공자 **다시 활성화** 클릭
7. 클라이언트 ID가 올바르게 유지되는지 다시 확인
8. **저장** 클릭

### [필수 점검 4] 브라우저 캐시 삭제 및 시크릿 모드 테스트

**작업**:
1. 브라우저 **완전히 닫기** (모든 창)
2. 브라우저 캐시/쿠키 삭제 (Ctrl+Shift+Delete 또는 Cmd+Shift+Delete)
3. Google 관련 쿠키 모두 삭제
4. **시크릿 모드**에서 `http://localhost:5173` 접속
5. 개발자 도구 열기 (F12)
6. Google 로그인 시도
7. 로그인 성공 확인

**⚠️ 중요**: Firebase Auth는 설정을 즉시 반영하지 않으므로, 캐시가 남아 있으면 항상 실패합니다!

## 🔍 코드 확인 (수정 불필요)

### 현재 코드 상태

- ✅ `signInWithPopup(auth, provider)` 사용 확인
- ✅ `GoogleAuthProvider` 기본 생성자만 사용 확인
- ✅ 클라이언트 ID를 직접 설정하지 않음 확인
- ✅ `authDomain`은 `yago-vibe-spt.firebaseapp.com` 사용 (정상)

**결론**: 코드는 정상입니다. 설정만 수정하면 됩니다.

## 📋 최종 체크리스트

### Firebase Console
- [ ] Authentication → Sign-in method → Google
- [ ] "웹 클라이언트 ID" = `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] Google 제공자 비활성화 → 5초 대기 → 재활성화
- [ ] 클라이언트 ID가 올바르게 유지되는지 확인
- [ ] Authentication → Settings → Authorized domains
- [ ] `localhost` 포함됨
- [ ] `127.0.0.1` 포함됨
- [ ] `yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] `yago-vibe-spt.web.app` 포함됨
- [ ] `yagovibe.com` 포함됨
- [ ] `www.yagovibe.com` 포함됨
- [ ] `yagovibe.vercel.app` 포함됨

### Google Cloud Console
- [ ] APIs & Services → Credentials → OAuth 2.0 Client IDs
- [ ] 클라이언트 ID = `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] "승인된 JavaScript 원본"에 `http://localhost:5173` 포함됨
- [ ] "승인된 JavaScript 원본"에 `http://localhost:5174` 포함됨
- [ ] "승인된 JavaScript 원본"에 `https://yagovibe.com` 포함됨
- [ ] "승인된 JavaScript 원본"에 `https://www.yagovibe.com` 포함됨
- [ ] "승인된 JavaScript 원본"에 `https://yagovibe.vercel.app` 포함됨
- [ ] "승인된 JavaScript 원본"에 `https://yago-vibe-spt.firebaseapp.com` 포함됨
- [ ] "승인된 JavaScript 원본"에 `https://yago-vibe-spt.web.app` 포함됨
- [ ] "승인된 리디렉션 URI"에 `http://localhost:5173/__/auth/handler` 포함됨
- [ ] "승인된 리디렉션 URI"에 `http://localhost:5174/__/auth/handler` 포함됨
- [ ] "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨
- [ ] "승인된 리디렉션 URI"에 `https://yago-vibe-spt.web.app/__/auth/handler` 포함됨
- [ ] "승인된 리디렉션 URI"에 `https://yagovibe.vercel.app/__/auth/handler` 포함됨
- [ ] **"승인된 리디렉션 URI"에 `https://yagovibe.com/__/auth/handler` 포함됨** ⚠️ **누락됨!**
- [ ] **"승인된 리디렉션 URI"에 `https://www.yagovibe.com/__/auth/handler` 포함됨** ⚠️ **누락됨!**

### 테스트
- [ ] 브라우저 완전히 닫기
- [ ] 브라우저 캐시/쿠키 삭제
- [ ] 시크릿 모드에서 `http://localhost:5173` 접속
- [ ] Google 로그인 시도
- [ ] 로그인 성공 확인

## 🎯 핵심 요약

1. **코드는 정상**: 수정 불필요 ✅
2. **Google Cloud Console 설정 수정**: 
   - "승인된 리디렉션 URI"에 `https://yagovibe.com/__/auth/handler` 추가 ⚠️
   - "승인된 리디렉션 URI"에 `https://www.yagovibe.com/__/auth/handler` 추가 ⚠️
3. **Firebase Console 설정 확인**: Authorized domains에 모든 도메인 포함 확인
4. **브라우저 캐시 삭제**: 설정 변경 후 반드시 필요

## 🔥 왜 이게 100% 해결인가?

### 1. Firebase Auth Callback URL은 고정
```
https://<project>.firebaseapp.com/__/auth/handler
또는
https://<custom-domain>/__/auth/handler
```
- 이 URL이 Google Cloud OAuth에 등록되어 있어야 함
- 안 되어 있으면 referer 차단

### 2. 현재 증상 분석
- `firebaseapp.com` 팝업이 뜸 ✅
- Callback URL이 뜨지만 바로 차단됨 ❌
- referer mismatch → callback 무효 → "requested action invalid" ❌

**원인**: `yagovibe.com`과 `www.yagovibe.com`의 redirect URI가 Google Cloud Console에 등록되지 않음

**결론**: Google Cloud Console OAuth 설정 오류 100%

