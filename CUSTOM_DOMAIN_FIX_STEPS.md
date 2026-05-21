# 🔧 커스텀 도메인 오류 해결 단계별 가이드

## 📋 발견된 문제 요약

### 문제 1: Firebase Auth 핸들러 경로 오류
- **yagovibe.com**: `/_/auth/handler` (단일 언더스코어) → 404 오류
- **www.yagovibe.com**: `//auth/handler` (이중 슬래시) → 404 오류
- **올바른 경로**: `/__/auth/handler` (이중 언더스코어)

### 문제 2: DNS 해석 실패
- **app.yagovibe.com**: `DNS_PROBE_FINISHED_NXDOMAIN` → DNS 레코드 없음

---

## ✅ 해결 단계

### Step 1: Firebase Console - Authorized Domains 확인 및 추가

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/authentication/settings
   ```

2. **Authorized domains 섹션 확인**
   - 현재 포함된 도메인 목록 확인

3. **누락된 도메인 추가**
   다음 도메인들이 **모두** 포함되어 있어야 합니다:
   ```
   localhost
   yago-vibe-spt.firebaseapp.com
   yago-vibe-spt.web.app
   yagovibe.com          ← 추가 필요
   www.yagovibe.com      ← 추가 필요
   ```

4. **도메인 추가 방법**
   - "도메인 추가" 버튼 클릭
   - 도메인 입력 (예: `yagovibe.com`)
   - 저장
   - 각 도메인을 개별적으로 추가

---

### Step 2: Google Cloud Console - API 키 제한 확인 및 수정

1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com/apis/credentials?project=yago-vibe-spt
   ```

2. **API 키 선택**
   - Firebase API 키 클릭 (편집)

3. **애플리케이션 제한사항 확인**
   - "HTTP 리퍼러(웹사이트)" 선택되어 있는지 확인
   - 다른 옵션이 선택되어 있다면 "HTTP 리퍼러(웹사이트)"로 변경

4. **웹사이트 제한사항 확인 및 추가**
   
   현재 포함된 항목 확인:
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```

   **누락된 항목이 있다면 추가:**
   - "항목 추가" 클릭
   - 도메인 입력 (예: `https://yagovibe.com/*`)
   - 저장

5. **저장 버튼 클릭**
   - 변경사항 저장
   - 적용까지 1-2분 소요될 수 있음

---

### Step 3: Firebase Console - 커스텀 도메인 연결 확인

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/hosting
   ```

2. **커스텀 도메인 섹션 확인**
   - 연결된 도메인 목록 확인:
     - `yagovibe.com`
     - `www.yagovibe.com`

3. **SSL 인증서 상태 확인**
   - 각 도메인의 SSL 인증서가 "활성" 상태인지 확인
   - "인증서 발급 중"이면 완료까지 대기 (최대 15분)

4. **도메인이 연결되어 있지 않다면:**
   - "도메인 추가" 버튼 클릭
   - 도메인 입력
   - TXT 레코드 인증 완료
   - SSL 인증서 발급 대기

---

### Step 4: app.yagovibe.com DNS 설정 (선택사항)

만약 `app.yagovibe.com`을 사용하려면:

#### 4-1. Cloudflare DNS 설정

1. **Cloudflare 로그인**
   - https://dash.cloudflare.com
   - `yagovibe.com` 도메인 선택

2. **DNS 레코드 추가**
   ```
   타입: CNAME
   이름: app
   값: ghs.googlehosted.com
   TTL: Auto
   Proxy 상태: 회색 (DNS only) ⚠️ 노란색 아님!
   ```

3. **저장**

#### 4-2. Firebase Console에 도메인 추가

1. **Firebase Console → Hosting**
   - "도메인 추가" 버튼 클릭
   - `app.yagovibe.com` 입력

2. **TXT 레코드 인증**
   - Firebase가 TXT 레코드 제공
   - Cloudflare에 TXT 레코드 추가
   - Firebase Console에서 "인증 확인" 클릭

3. **SSL 인증서 발급 대기**
   - 최대 15분 소요
   - "활성" 상태가 되면 사용 가능

---

## 🔍 추가 확인 사항

### Firebase Auth 핸들러 경로 문제

Firebase SDK가 `/_/auth/handler` (단일 언더스코어) 또는 `//auth/handler` (이중 슬래시)로 경로를 생성하는 것은:

1. **Firebase SDK 버전 문제일 수 있음**
   - 최신 Firebase SDK 사용 확인
   - `package.json`에서 Firebase 버전 확인

2. **브라우저 캐시 문제일 수 있음**
   - 하드 새로고침: `Ctrl + Shift + R`
   - 브라우저 캐시 삭제
   - 시크릿 모드에서 테스트

3. **Firebase Console 설정 문제일 수 있음**
   - Authorized domains에 모든 도메인 포함 확인
   - Google Cloud Console API 키 제한 확인

---

## 🧪 테스트 방법

### 각 도메인별 테스트

1. **브라우저 캐시 삭제**
   - `Ctrl + Shift + R` (하드 새로고침)
   - 또는 브라우저 설정 → 캐시 삭제

2. **yagovibe.com 테스트**
   - `https://yagovibe.com/login` 접속
   - Google 로그인 버튼 클릭
   - 팝업 URL 확인: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler?apiKey=...`
   - 로그인 성공 확인

3. **www.yagovibe.com 테스트**
   - `https://www.yagovibe.com/login` 접속
   - Google 로그인 버튼 클릭
   - 로그인 성공 확인

4. **app.yagovibe.com 테스트** (DNS 설정 후)
   - `https://app.yagovibe.com/login` 접속
   - 페이지 로드 확인
   - Google 로그인 테스트

---

## 📋 최종 체크리스트

### Firebase Console
- [ ] Authorized domains에 `yagovibe.com` 포함
- [ ] Authorized domains에 `www.yagovibe.com` 포함
- [ ] 커스텀 도메인 연결 상태 확인
- [ ] SSL 인증서 발급 상태 확인

### Google Cloud Console
- [ ] API 키의 HTTP referrer 제한 설정 확인
- [ ] 웹사이트 제한사항에 `https://yagovibe.com/*` 포함
- [ ] 웹사이트 제한사항에 `https://www.yagovibe.com/*` 포함

### DNS 설정 (app.yagovibe.com - 선택사항)
- [ ] Cloudflare에 CNAME 레코드 추가
- [ ] Firebase Console에 도메인 추가
- [ ] SSL 인증서 발급 대기

---

## ✅ 완료

위 단계를 모두 완료한 후:
1. 브라우저 캐시 삭제
2. 하드 새로고침 (`Ctrl + Shift + R`)
3. 각 도메인에서 다시 테스트

문제가 계속 발생하면:
- 개발자 콘솔 (F12)에서 오류 메시지 확인
- Network 탭에서 요청 URL 확인
- 오류 메시지와 콘솔 로그를 공유해주세요

