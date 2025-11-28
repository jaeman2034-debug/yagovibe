# 🔍 Fallback Handler URL 캡처 가이드

## 🎯 목적

팝업 로그인 실패 시 fallback handler 창에서 발생하는 오류를 분석하기 위해 전체 URL을 캡처합니다.

## 📋 캡처 방법

### 방법 1: 개발자 도구 사용 (권장)

1. **로그인 페이지 접속**
   - `https://yago-vibe-spt.firebaseapp.com/login` 접속
   - 또는 `https://yago-vibe-spt.vercel.app/login` (배포된 경우)

2. **개발자 도구 열기**
   - `F12` 또는 `Ctrl + Shift + I`
   - **Network** 탭 선택
   - **Preserve log** 체크 (중요!)

3. **Google 로그인 시도**
   - "G 구글로 로그인" 버튼 클릭
   - 팝업이 열렸다가 닫히거나 실패하는 순간을 관찰

4. **Network 탭에서 URL 확인**
   - Network 탭에서 `/__/auth/handler` 또는 `firebaseapp.com` 관련 요청 찾기
   - 요청을 클릭하면 **Headers** 탭에서 전체 URL 확인 가능
   - **Request URL** 필드에 전체 URL이 표시됨

5. **전체 URL 복사**
   - Request URL을 전체 복사
   - 또는 **Response** 탭에서 오류 메시지 확인

### 방법 2: 주소창에서 직접 확인

1. **팝업이 열렸다가 닫힌 후**
2. **새 탭이 열렸다면** 그 탭의 주소창 URL 확인
3. **또는** 팝업 창이 열려있는 동안 주소창 URL 확인

### 방법 3: 콘솔 로그 확인

1. **개발자 도구 → Console 탭**
2. **Google 로그인 시도**
3. 콘솔에 출력되는 오류 메시지나 URL 확인
4. 특히 `auth/requests-from-referer` 관련 오류 메시지 확인

## 📸 캡처해야 할 정보

### 필수 정보
- ✅ 전체 URL (예: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler?apiKey=...&authType=...`)
- ✅ 오류 메시지 (Network 탭의 Response)
- ✅ 콘솔 오류 (Console 탭)

### 추가 정보 (있으면 좋음)
- ✅ Network 탭의 Request Headers
- ✅ Network 탭의 Response Headers
- ✅ 콘솔의 전체 로그 (특히 Firebase 관련)

## 🔍 예상되는 URL 패턴

### 정상적인 경우
```
https://yago-vibe-spt.firebaseapp.com/__/auth/handler?apiKey=AIzaSy...&authType=signInViaRedirect&providerId=google.com&scopes=...
```

### 오류가 있는 경우
```
https://yago-vibe-spt.firebaseapp.com/__/auth/handler?apiKey=AIzaSy...&error=...
```

또는

```
https://yago-vibe-spt.firebaseapp.com/__/auth/handler?apiKey=AIzaSy...&errorCode=auth/requests-from-referer-are-blocked
```

## 📋 캡처 후 전달 방법

1. **전체 URL 복사**
   - Network 탭 → Request 클릭 → Headers → Request URL 전체 복사
   - 또는 주소창에서 전체 URL 복사

2. **스크린샷**
   - Network 탭 스크린샷
   - Console 탭 스크린샷
   - 오류 메시지 스크린샷

3. **전달**
   - URL을 텍스트로 전달
   - 또는 스크린샷 전달

## ⚠️ 주의사항

- URL에 포함된 `apiKey`는 민감한 정보이므로, 공유 시 주의하세요
- 분석 후에는 URL을 삭제하는 것을 권장합니다
- 스크린샷에도 API 키가 포함될 수 있으므로 주의하세요

