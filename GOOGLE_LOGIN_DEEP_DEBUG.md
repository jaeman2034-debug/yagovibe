# 🔍 Google 로그인 심화 디버깅

## 🚨 여전히 작동하지 않는다면

### Step 1: 브라우저 콘솔에서 정확한 오류 확인

1. **개발자 도구 열기**
   - F12 키 누르기
   - 또는 마우스 우클릭 > "검사" 클릭

2. **Console 탭 확인**
   - 개발자 도구 상단의 **"Console"** 탭 클릭
   - Google 로그인 버튼 클릭
   - 빨간색 오류 메시지 확인
   - 오류 메시지 전체를 복사해서 저장

3. **Network 탭 확인**
   - 개발자 도구 상단의 **"Network"** 탭 클릭
   - Google 로그인 버튼 클릭
   - 빨간색으로 표시된 실패한 요청 찾기
   - 실패한 요청 클릭
   - **"Headers"** 탭에서 요청 URL 확인
   - **"Response"** 탭에서 오류 메시지 확인

### Step 2: Firebase Console에서 Google 로그인 설정 재확인

1. **Firebase Console > Authentication > 로그인 방법**
   - Google 클릭
   - **"프로젝트 지원 이메일"** 확인
   - 실제 이메일 주소로 설정되어 있는지 확인
   - 없으면 설정: `jaeman2034@gmail.com`
   - **"저장"** 클릭

### Step 3: Google Cloud Console에서 OAuth 클라이언트 재확인

1. **Google Cloud Console > API 및 서비스 > 사용자 인증 정보**
   - **"OAuth 2.0 클라이언트 ID"** 섹션에서 클라이언트 찾기
   - 클라이언트 클릭 (편집)

2. **승인된 JavaScript 원본 확인**
   - 다음이 포함되어 있는지 확인:
     - `http://localhost:5173`
     - `http://localhost:5174`
     - `https://yago-vibe-spt.firebaseapp.com`
     - `https://yago-vibe-spt.web.app`
   - 없으면 추가

3. **승인된 리디렉션 URI 확인**
   - 다음이 포함되어 있는지 확인 (언더스코어 **2개**):
     - `http://localhost:5173/__/auth/handler`
     - `http://localhost:5174/__/auth/handler`
     - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
     - `https://yago-vibe-spt.web.app/__/auth/handler`
   - 없으면 추가
   - **언더스코어가 1개(`_`)가 아닌 2개(`__`)인지 확인**

### Step 4: OAuth 동의 화면 재확인

1. **Google Cloud Console > API 및 서비스 > OAuth 동의 화면**
   - **"사용자 유형"** 확인
   - **"외부"** 선택되어 있으면:
     - **"테스트 사용자"** 섹션 확인
     - `jaeman2034@gmail.com`이 목록에 있는지 확인
     - 없으면 추가

2. **앱 정보 확인**
   - **"사용자 지원 이메일"**이 실제 이메일로 설정되어 있는지 확인
   - **"앱 이름"**이 입력되어 있는지 확인

### Step 5: Identity Toolkit API 재확인

1. **Google Cloud Console > API 및 서비스 > 라이브러리**
   - **"Identity Toolkit API"** 검색
   - **"사용 설정됨"** 상태인지 확인
   - 비활성화되어 있으면 활성화

### Step 6: Firebase 프로젝트와 Google Cloud 프로젝트 일치 확인

1. **Firebase Console > 프로젝트 설정 > 일반**
   - **"Google Cloud 프로젝트 번호"** 확인 (예: `126699415285`)

2. **Google Cloud Console 상단**
   - 프로젝트 선택 드롭다운에서 프로젝트 번호 확인
   - Firebase와 일치하는지 확인

### Step 7: 브라우저 완전 초기화

1. **모든 Chrome 창 닫기**
   - 모든 Chrome 창 완전히 닫기

2. **시크릿 모드에서 새로 열기**
   - Ctrl + Shift + N
   - `http://localhost:5173/login` 접속

3. **개발자 도구 열기**
   - F12
   - Console 탭에서 오류 확인

### Step 8: 개발 서버 재시작

1. **터미널에서 서버 중지**
   - Ctrl + C

2. **서버 재시작**
   ```bash
   npm run dev
   ```

3. **브라우저에서 새로고침**
   - Ctrl + Shift + R (강력 새로고침)

## 🔥 가장 흔한 오류와 해결 방법

### 오류 1: "The requested action is invalid"
**원인**: OAuth 동의 화면 설정 문제 또는 리디렉션 URI 불일치
**해결**: 
- OAuth 동의 화면 > 테스트 사용자 추가
- 리디렉션 URI에 `__/auth/handler` (언더스코어 2개) 확인

### 오류 2: "auth/popup-closed-by-user"
**원인**: 팝업이 사용자에 의해 닫힘 또는 팝업 차단
**해결**: 
- 팝업 차단 해제
- 시크릿 모드에서 테스트

### 오류 3: "auth/popup-blocked"
**원인**: 브라우저가 팝업을 차단함
**해결**: 
- Chrome 설정 > 사이트 설정 > 팝업 허용
- 주소창 팝업 차단 아이콘 클릭 > 허용

### 오류 4: "Unable to verify that the app domain is authorized"
**원인**: Firebase Authorized domains 또는 OAuth 클라이언트 설정 문제
**해결**: 
- Firebase Console > Authentication > Settings > Authorized domains에 `localhost` 추가
- Google Cloud Console > OAuth 클라이언트 > 승인된 JavaScript 원본에 `http://localhost:5173` 추가

## 📋 디버깅 체크리스트

- [ ] 브라우저 콘솔에서 정확한 오류 메시지 확인
- [ ] Network 탭에서 실패한 요청 확인
- [ ] Firebase Console > Authentication > 로그인 방법 > Google 활성화 확인
- [ ] Firebase Console > Authentication > 로그인 방법 > Google > 프로젝트 지원 이메일 설정 확인
- [ ] Google Cloud Console > OAuth 클라이언트 > 승인된 JavaScript 원본 확인
- [ ] Google Cloud Console > OAuth 클라이언트 > 승인된 리디렉션 URI 확인 (언더스코어 2개)
- [ ] Google Cloud Console > OAuth 동의 화면 > 테스트 사용자 확인
- [ ] Google Cloud Console > API 라이브러리 > Identity Toolkit API 활성화 확인
- [ ] Firebase 프로젝트와 Google Cloud 프로젝트 번호 일치 확인
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] 개발 서버 재시작

## 💡 다음 단계

**브라우저 콘솔의 정확한 오류 메시지를 알려주시면 더 구체적인 해결 방법을 제시할 수 있습니다.**

1. F12 > Console 탭
2. Google 로그인 버튼 클릭
3. 빨간색 오류 메시지 전체 복사
4. 오류 메시지를 알려주세요

