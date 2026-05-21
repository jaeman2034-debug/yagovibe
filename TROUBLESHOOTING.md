# 데스크톱 로그인 문제 해결 가이드

## 🔍 문제 진단 체크리스트

### 1. 브라우저 콘솔 확인 (가장 중요!)
1. **F12** 키를 눌러 개발자 도구 열기
2. **Console** 탭 선택
3. Google 로그인 버튼 클릭
4. 다음 로그들을 확인:
   - `🚀 [LoginPage] signInWithPopup() 사용 (popup 방식)`
   - `🔍 [LoginPage] 현재 환경 정보:`
   - `❌ [LoginPage] 오류 코드:` (오류 발생 시)
   - `❌ [LoginPage] 오류 메시지:` (오류 발생 시)

### 2. 환경 문제 해결 방법

#### A. 브라우저 HSTS 캐싱 문제
**증상:** 이전에 HTTP로 접속했던 기록이 있어 HTTPS 전환 후 문제 발생

**해결 방법:**
1. **Chrome/Edge:**
   - 주소창에 `chrome://net-internals/#hsts` 입력
   - "Delete domain security policies" 섹션에서
   - `localhost` 입력 후 "Delete" 클릭
   - `127.0.0.1` 입력 후 "Delete" 클릭
   - 브라우저 완전 종료 후 재시작

2. **Firefox:**
   - 주소창에 `about:preferences#privacy` 입력
   - "쿠키 및 사이트 데이터" → "데이터 삭제"
   - "캐시된 웹 콘텐츠" 선택 후 삭제

#### B. 방화벽/안티바이러스 문제
**증상:** `ERR_CONNECTION_REFUSED` 또는 팝업이 열리지 않음

**해결 방법:**
1. **Windows Defender 방화벽:**
   - Windows 설정 → 개인 정보 보호 및 보안 → Windows 보안
   - 방화벽 및 네트워크 보호
   - "방화벽을 통해 앱 허용" 클릭
   - Node.js 또는 Vite 관련 항목 찾아서 허용

2. **안티바이러스 일시 중단:**
   - Windows Defender 또는 다른 안티바이러스 프로그램 일시 중단
   - 테스트 후 다시 활성화

3. **포트 확인:**
   ```powershell
   netstat -ano | findstr :5173
   ```
   - 포트가 사용 중이면 해당 프로세스 종료

#### C. 브라우저 팝업 차단
**증상:** 팝업이 열리지 않고 `auth/popup-blocked` 오류 발생

**해결 방법:**
1. **Chrome/Edge:**
   - 주소창 오른쪽의 팝업 차단 아이콘 클릭
   - "항상 localhost의 팝업 및 리디렉션 허용" 선택

2. **설정에서 허용:**
   - Chrome: 설정 → 개인 정보 및 보안 → 사이트 설정 → 팝업 및 리디렉션
   - `https://localhost:5173` 추가

#### D. SSL 인증서 경고
**증상:** `https://localhost:5173` 접속 시 "안전하지 않음" 경고

**해결 방법:**
1. 경고 화면에서 **"고급"** 클릭
2. **"localhost(안전하지 않음)로 이동"** 또는 **"계속 진행"** 클릭
3. mkcert가 생성한 자체 서명 인증서이므로 개발 환경에서는 안전합니다

### 3. Google OAuth 설정 확인

#### A. 승인된 JavaScript 원본 확인
1. Google Cloud Console 접속
2. APIs & Services → Credentials
3. OAuth 2.0 클라이언트 ID 클릭
4. "승인된 JavaScript 원본" 섹션 확인:
   - ✅ `https://localhost:5173` (필수!)
   - ✅ `https://127.0.0.1:5173` (필수!)
   - ❌ `http://localhost:5173` 제거 (HTTPS로 전환했으므로)

#### B. 설정 적용 대기
- Google OAuth 설정 변경 후 **5분~몇 시간** 소요될 수 있음
- 설정 저장 후 잠시 대기 후 재시도

### 4. 개발 서버 재시작

```bash
# 기존 프로세스 종료
taskkill /F /PID [프로세스ID]

# 또는 포트 사용 중인 프로세스 찾기
netstat -ano | findstr :5173

# 개발 서버 재시작
npm run dev
```

### 5. 다른 브라우저 테스트

동일한 오류가 발생하는지 확인:
- Chrome
- Edge
- Firefox

## 🚨 자주 발생하는 오류 코드

### `auth/popup-blocked`
**원인:** 브라우저가 팝업을 차단
**해결:** 브라우저 팝업 허용 설정

### `auth/popup-closed-by-user`
**원인:** 사용자가 팝업을 수동으로 닫음 또는 IAB 환경
**해결:** 다시 시도 또는 외부 브라우저 사용

### `auth/argument-error` 또는 `auth/unauthorized-domain`
**원인:** Google OAuth 설정에 현재 origin이 등록되지 않음
**해결:** Google Cloud Console에서 `https://localhost:5173` 추가

### `ERR_CONNECTION_REFUSED`
**원인:** 방화벽, 네트워크 문제, 또는 서버가 실행되지 않음
**해결:** 방화벽 설정 확인, 서버 재시작

## 📝 디버깅 정보 수집

문제가 계속되면 다음 정보를 수집하세요:

1. **브라우저 콘솔 로그 전체** (F12 → Console)
2. **네트워크 탭** (F12 → Network) - 실패한 요청 확인
3. **현재 origin:** `window.location.origin`
4. **오류 코드:** `popupErr.code`
5. **오류 메시지:** `popupErr.message`

## 🔗 유용한 링크

- Google Cloud Console: https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
- Firebase Console: https://console.firebase.google.com/project/yago-vibe-spt

