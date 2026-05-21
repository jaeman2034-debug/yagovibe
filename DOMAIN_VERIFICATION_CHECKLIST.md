# 🔍 도메인별 검토 체크리스트

## ✅ 확인된 성공 도메인
- **https://yago-vibe-spt.web.app** ✅ 로그인 성공 확인됨

---

## 🔍 검토 필요 도메인 목록

### 1. Firebase 기본 도메인
- [ ] **https://yago-vibe-spt.firebaseapp.com**
  - 상태: 확인 필요
  - 테스트: `/login` 접속 → Google 로그인 버튼 클릭 → 정상 작동 확인

### 2. 커스텀 도메인 (Firebase Hosting)
- [ ] **https://yagovibe.com**
  - 상태: 확인 필요
  - 테스트: `/login` 접속 → Google 로그인 버튼 클릭 → 정상 작동 확인
  
- [ ] **https://www.yagovibe.com**
  - 상태: 확인 필요
  - 테스트: `/login` 접속 → Google 로그인 버튼 클릭 → 정상 작동 확인

- [ ] **https://app.yagovibe.com** (DEPLOYMENT_GUIDE.md에서 언급)
  - 상태: 확인 필요
  - 테스트: `/login` 접속 → Google 로그인 버튼 클릭 → 정상 작동 확인

---

## 📋 각 도메인별 확인 사항

### ✅ 정상 작동 시 확인 사항
1. **로그인 페이지 로드**
   - `/login` 페이지가 정상적으로 표시되는지
   - 무한 루프가 발생하지 않는지
   - 페이지가 계속 새로고침되지 않는지

2. **Google 로그인 버튼**
   - "G 구글로 로그인" 버튼이 정상적으로 표시되는지
   - 버튼 클릭 시 팝업이 열리는지
   - `auth/api-key-not-valid` 오류가 발생하지 않는지

3. **로그인 성공 후**
   - `/sports-hub` 페이지로 정상 리다이렉트되는지
   - 사용자 정보가 정상적으로 표시되는지
   - 무한 루프가 발생하지 않는지

### ❌ 오류 발생 시 확인 사항

#### 오류 1: `auth/api-key-not-valid`
**확인할 사항:**
- Google Cloud Console → API 및 서비스 → 사용자 인증 정보
- API 키의 "애플리케이션 제한사항" → "HTTP 리퍼러(웹사이트)" 선택 확인
- "웹사이트 제한사항"에 해당 도메인이 포함되어 있는지 확인:
  - `https://yago-vibe-spt.firebaseapp.com/*`
  - `https://yagovibe.com/*`
  - `https://www.yagovibe.com/*`
  - `https://app.yagovibe.com/*`

#### 오류 2: 무한 루프
**확인할 사항:**
- 브라우저 개발자 콘솔 (F12) 확인
- `🟨 [AuthProvider] 사용자 상태 변경 없음 - 리다이렉트 스킵` 로그 확인
- Network 탭에서 반복적인 요청이 없는지 확인

#### 오류 3: 페이지 로드 실패 / Site Not Found
**확인할 사항:**
- Firebase Console → Hosting → 커스텀 도메인 연결 상태
- DNS 설정 확인 (Cloudflare 등)
- SSL 인증서 발급 상태 확인

---

## 🔧 Google Cloud Console 설정 확인

### 필수 확인 사항

1. **API 키 제한 설정**
   ```
   Google Cloud Console
   → API 및 서비스 → 사용자 인증 정보
   → API 키 클릭 (편집)
   → 애플리케이션 제한사항: "HTTP 리퍼러(웹사이트)" 선택
   ```

2. **웹사이트 제한사항 목록**
   다음 도메인들이 모두 포함되어 있어야 합니다:
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   https://app.yagovibe.com/*
   ```

3. **API 제한**
   ```
   API 제한 → 키 제한 선택
   → Firebase Authentication API 허용 확인
   ```

---

## 📊 Firebase Console 확인

### 커스텀 도메인 연결 상태

1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com/project/yago-vibe-spt/hosting
   ```

2. **커스텀 도메인 확인**
   - 연결된 커스텀 도메인 목록 확인
   - SSL 인증서 발급 상태 확인
   - 각 도메인의 연결 상태 확인

3. **Authorized Domains 확인**
   ```
   Firebase Console
   → Authentication → Settings → Authorized domains
   ```
   다음 도메인들이 모두 포함되어 있어야 합니다:
   - `yago-vibe-spt.firebaseapp.com`
   - `yago-vibe-spt.web.app`
   - `yagovibe.com`
   - `www.yagovibe.com`
   - `app.yagovibe.com`
   - `localhost` (개발용)

---

## 🧪 테스트 순서

### Step 1: Firebase 기본 도메인
1. `https://yago-vibe-spt.firebaseapp.com/login` 접속
2. Google 로그인 버튼 클릭
3. 결과 확인

### Step 2: 커스텀 도메인 (yagovibe.com)
1. `https://yagovibe.com/login` 접속
2. Google 로그인 버튼 클릭
3. 결과 확인

### Step 3: 커스텀 도메인 (www.yagovibe.com)
1. `https://www.yagovibe.com/login` 접속
2. Google 로그인 버튼 클릭
3. 결과 확인

### Step 4: 커스텀 도메인 (app.yagovibe.com)
1. `https://app.yagovibe.com/login` 접속
2. Google 로그인 버튼 클릭
3. 결과 확인

---

## 📋 체크리스트

### 도메인별 로그인 테스트
- [ ] `https://yago-vibe-spt.firebaseapp.com/login`
- [ ] `https://yagovibe.com/login`
- [ ] `https://www.yagovibe.com/login`
- [ ] `https://app.yagovibe.com/login`

### Google Cloud Console 설정
- [ ] API 키의 HTTP referrer 제한 설정 확인
- [ ] 모든 도메인이 웹사이트 제한사항에 포함되어 있는지 확인
- [ ] Firebase Authentication API가 허용되어 있는지 확인

### Firebase Console 설정
- [ ] 커스텀 도메인 연결 상태 확인
- [ ] SSL 인증서 발급 상태 확인
- [ ] Authorized domains에 모든 도메인 포함 확인

---

## ✅ 완료

각 도메인별로 테스트를 완료하고, 문제가 발생하는 도메인이 있으면 해당 도메인의 오류 메시지를 공유해주세요.

