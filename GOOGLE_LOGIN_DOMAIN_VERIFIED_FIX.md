# 🔍 "Unable to verify that the app domain is authorized" 추가 해결 방법

## ✅ 이미 확인된 사항
- [x] Firebase Console > Authorized domains: `localhost` 포함됨 ✅
- [x] 코드: `signInWithPopup` 사용 중 ✅
- [x] 코드: `googleProvider` 설정 정상 ✅

## 🚨 여전히 오류가 발생한다면

### 원인 1: Google Cloud Console OAuth 클라이언트 설정

**"Unable to verify that the app domain is authorized"** 오류는 Firebase Authorized domains뿐만 아니라 **Google Cloud Console의 OAuth 클라이언트 설정**도 확인해야 합니다.

#### 확인 방법:

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 상단에서 **"yago-vibe-spt"** 프로젝트 선택

2. **OAuth 2.0 클라이언트 ID 확인**
   - 왼쪽 메뉴 > **"API 및 서비스"** > **"사용자 인증 정보"**
   - **"OAuth 2.0 클라이언트 ID"** 섹션에서 클라이언트 찾기
   - 클라이언트 이름이 **"Web client (auto created by Google Service)"** 또는 유사한 이름

3. **승인된 JavaScript 원본 확인**
   - OAuth 클라이언트 클릭 (편집)
   - **"승인된 JavaScript 원본"** 섹션 확인
   - 다음이 포함되어 있는지 확인:
     - `http://localhost:5173`
     - `http://localhost:5174`
     - `http://127.0.0.1:5173`
     - `https://yago-vibe-spt.firebaseapp.com`
     - `https://yago-vibe-spt.web.app`
     - `https://www.yagovibe.com`
     - `https://yagovibe.com`

4. **승인된 리디렉션 URI 확인**
   - **"승인된 리디렉션 URI"** 섹션 확인
   - 다음이 포함되어 있는지 확인 (언더스코어 **2개**):
     - `http://localhost:5173/__/auth/handler`
     - `http://localhost:5174/__/auth/handler`
     - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
     - `https://yago-vibe-spt.web.app/__/auth/handler`
     - `https://www.yagovibe.com/__/auth/handler`
     - `https://yagovibe.com/__/auth/handler`

### 원인 2: OAuth 동의 화면 설정

1. **OAuth 동의 화면 확인**
   - Google Cloud Console > **"API 및 서비스"** > **"OAuth 동의 화면"**
   - **"사용자 유형"** 선택됨 (외부 또는 내부)
   - **"앱 정보"** 입력됨:
     - 앱 이름
     - 사용자 지원 이메일
     - 개발자 연락처 정보
   - **"테스트 사용자"** (외부인 경우):
     - 본인 이메일 추가 (`jaeman2034@gmail.com` 등)

### 원인 3: Identity Toolkit API 활성화

1. **API 라이브러리 확인**
   - Google Cloud Console > **"API 및 서비스"** > **"라이브러리"**
   - **"Identity Toolkit API"** 검색
   - **"사용 설정됨"** 상태인지 확인
   - 비활성화되어 있으면 **"사용 설정"** 클릭

### 원인 4: Firebase 프로젝트와 Google Cloud 프로젝트 연결

1. **Firebase Console에서 확인**
   - Firebase Console > **"프로젝트 설정"** (⚙️ 아이콘)
   - **"일반"** 탭
   - **"Google Cloud 프로젝트 번호"** 확인

2. **Google Cloud Console에서 확인**
   - Google Cloud Console 상단 프로젝트 선택
   - 프로젝트 번호가 Firebase와 일치하는지 확인

### 원인 5: 브라우저 캐시/쿠키 문제

1. **브라우저 캐시 완전 삭제**
   - Chrome: Ctrl + Shift + Delete
   - **"전체 기간"** 선택
   - **"캐시된 이미지 및 파일"** 체크
   - **"쿠키 및 기타 사이트 데이터"** 체크
   - **"데이터 삭제"** 클릭

2. **시크릿 모드에서 테스트**
   - Chrome 시크릿 모드 (Ctrl + Shift + N)
   - http://localhost:5173 접속
   - Google 로그인 테스트

3. **쿠키 허용 확인**
   - Chrome 설정 > **"개인정보 및 보안"** > **"쿠키 및 기타 사이트 데이터"**
   - **"모든 쿠키 허용"** 또는 **"사이트에서 쿠키 저장 및 읽기 허용"** 확인

## 🔥 즉시 테스트할 순서

1. **Google Cloud Console > OAuth 클라이언트 확인**
   - 승인된 JavaScript 원본에 `http://localhost:5173` 포함 여부
   - 승인된 리디렉션 URI에 `http://localhost:5173/__/auth/handler` 포함 여부

2. **OAuth 동의 화면 확인**
   - 테스트 사용자에 본인 이메일 추가

3. **Identity Toolkit API 활성화 확인**

4. **브라우저 캐시 삭제**

5. **시크릿 모드에서 테스트**

## 📋 최종 체크리스트

- [ ] Google Cloud Console > OAuth 클라이언트 > 승인된 JavaScript 원본에 `http://localhost:5173` 포함
- [ ] Google Cloud Console > OAuth 클라이언트 > 승인된 리디렉션 URI에 `http://localhost:5173/__/auth/handler` 포함 (언더스코어 2개)
- [ ] Google Cloud Console > OAuth 동의 화면 > 테스트 사용자에 본인 이메일 추가
- [ ] Google Cloud Console > API 라이브러리 > Identity Toolkit API 활성화됨
- [ ] Firebase Console > 프로젝트 설정 > Google Cloud 프로젝트 번호 일치 확인
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트

## 💡 디버깅 팁

브라우저 콘솔에서 다음을 확인하세요:

```javascript
// 현재 도메인 확인
console.log('Current domain:', window.location.origin);

// Firebase Auth 상태 확인
import { auth } from './src/lib/firebase';
console.log('Auth domain:', auth.config.authDomain);
```

Network 탭에서 실패한 요청을 확인:
- F12 > Network 탭
- Google 로그인 버튼 클릭
- 실패한 요청 (빨간색) 클릭
- Response 탭에서 오류 메시지 확인

