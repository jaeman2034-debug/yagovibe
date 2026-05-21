# 🔧 커스텀 도메인 Auth 핸들러 오류 해결

## 📋 발견된 문제

### 문제 1: Firebase Auth 핸들러 경로 오류
**증상:**
- `yagovibe.com/login` 접속 시 Google 로그인 버튼 클릭
- 팝업에서 `https://yago-vibe-spt.firebaseapp.com/_/auth/handler?apiKey=...` 접근 시도
- "페이지를 찾을 수 없습니다" 오류 발생

**원인:**
- Firebase Auth 핸들러 경로가 `/_/auth/handler` (단일 언더스코어)로 생성됨
- 올바른 경로는 `/__/auth/handler` (이중 언더스코어)
- 커스텀 도메인에서 `authDomain` 설정 문제로 인한 경로 생성 오류

### 문제 2: DNS 해석 실패
**증상:**
- `app.yagovibe.com` 접속 시 `DNS_PROBE_FINISHED_NXDOMAIN` 오류
- DNS 레코드가 설정되지 않았거나 Firebase Hosting에 연결되지 않음

---

## ✅ 해결 방법

### Step 1: Firebase Console - 커스텀 도메인 확인

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/hosting
   ```

2. **커스텀 도메인 연결 상태 확인**
   - `yagovibe.com` 연결 상태 확인
   - `www.yagovibe.com` 연결 상태 확인
   - `app.yagovibe.com` 연결 상태 확인 (없다면 연결 필요)

3. **SSL 인증서 상태 확인**
   - 각 도메인의 SSL 인증서가 "활성" 상태인지 확인
   - "인증서 발급 중"이면 완료까지 대기 (최대 15분)

### Step 2: Firebase Console - Authorized Domains 확인

1. **Authentication → Settings → Authorized domains**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/authentication/settings
   ```

2. **다음 도메인들이 모두 포함되어 있는지 확인:**
   ```
   localhost
   yago-vibe-spt.firebaseapp.com
   yago-vibe-spt.web.app
   yagovibe.com
   www.yagovibe.com
   app.yagovibe.com (연결되어 있다면)
   ```

3. **없는 도메인이 있다면 추가:**
   - "도메인 추가" 버튼 클릭
   - 도메인 입력 후 저장

### Step 3: Google Cloud Console - API 키 제한 확인

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **API 키 편집**
   - Firebase API 키 클릭 (편집)

3. **애플리케이션 제한사항**
   - "HTTP 리퍼러(웹사이트)" 선택 확인

4. **웹사이트 제한사항에 다음 항목들이 모두 포함되어 있는지 확인:**
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   https://app.yagovibe.com/* (연결되어 있다면)
   ```

5. **없는 도메인이 있다면 추가 후 저장**

### Step 4: app.yagovibe.com DNS 설정 (필요 시)

만약 `app.yagovibe.com`을 사용하려면:

1. **Cloudflare DNS 설정**
   ```
   타입: CNAME
   이름: app
   값: ghs.googlehosted.com
   TTL: Auto
   Proxy 상태: 회색 (DNS only) ⚠️ 노란색 아님!
   ```

2. **Firebase Console에 도메인 추가**
   - Hosting → 커스텀 도메인 추가
   - `app.yagovibe.com` 입력
   - TXT 레코드 인증 완료
   - SSL 인증서 발급 대기 (최대 15분)

---

## 🔍 추가 확인 사항

### Firebase Auth 핸들러 경로 문제

Firebase SDK는 `authDomain`을 기반으로 Auth 핸들러 URL을 생성합니다. 커스텀 도메인에서도 올바르게 작동하려면:

1. **`authDomain`은 항상 `yago-vibe-spt.firebaseapp.com` 사용**
   - 커스텀 도메인에서도 Firebase 기본 도메인을 `authDomain`으로 사용
   - 이렇게 하면 Auth 핸들러가 올바른 경로(`/__/auth/handler`)로 생성됨

2. **현재 설정 확인**
   - `.env.production` 또는 `.env.local`에서 `VITE_FIREBASE_AUTH_DOMAIN` 확인
   - 값이 `yago-vibe-spt.firebaseapp.com`인지 확인

---

## 🧪 테스트 방법

### 각 도메인별 테스트

1. **yagovibe.com**
   - `https://yagovibe.com/login` 접속
   - Google 로그인 버튼 클릭
   - 팝업 URL 확인: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler?apiKey=...` (이중 언더스코어)
   - 로그인 성공 확인

2. **www.yagovibe.com**
   - `https://www.yagovibe.com/login` 접속
   - Google 로그인 버튼 클릭
   - 팝업 URL 확인: 올바른 경로인지 확인
   - 로그인 성공 확인

3. **app.yagovibe.com** (DNS 설정 후)
   - `https://app.yagovibe.com/login` 접속
   - 페이지가 로드되는지 확인
   - Google 로그인 테스트

---

## 📋 체크리스트

### Firebase Console 설정
- [ ] 커스텀 도메인 연결 상태 확인
- [ ] SSL 인증서 발급 상태 확인
- [ ] Authorized domains에 모든 도메인 포함 확인

### Google Cloud Console 설정
- [ ] API 키의 HTTP referrer 제한 설정 확인
- [ ] 웹사이트 제한사항에 모든 도메인 포함 확인

### DNS 설정 (app.yagovibe.com)
- [ ] Cloudflare에 CNAME 레코드 추가
- [ ] Firebase Console에 도메인 추가
- [ ] SSL 인증서 발급 대기

---

## ✅ 완료

위 설정을 모두 확인하고 수정한 후, 각 도메인에서 다시 테스트해주세요.

문제가 계속 발생하면:
1. 브라우저 캐시 삭제 (`Ctrl + Shift + R`)
2. 시크릿 모드에서 테스트
3. 개발자 콘솔 (F12)에서 오류 메시지 확인

