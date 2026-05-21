# 🎯 최종 해결 방법 (단계별 가이드)

## ❌ 현재 오류

```
auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.projectconfigservice.getprojectconfig-are-blocked
```

## ✅ 해결 방법 (단계별)

### Step 1: 브라우저 콘솔에서 실제 API 키 확인

1. **개발 서버 재시작** (필수!)
   ```bash
   # 서버 중지 (Ctrl + C)
   npm run dev
   ```

2. **브라우저에서 `http://localhost:5173/login` 접속**

3. **개발자 도구 (F12) → Console 탭**

4. **다음 로그 찾기:**
   ```
   ================================================================================
   🔍 [firebase.ts] ⚠️⚠️⚠️ 실제 사용되는 Firebase API 키 (전체) ⚠️⚠️⚠️
   🔍 [firebase.ts] API Key: AIzaSy...
   🔍 [firebase.ts] API Key 길이: 39 자
   ================================================================================
   ```

5. **전체 API 키를 복사하세요!** (39자, `AIzaSy`로 시작)

### Step 2: Google Cloud Console 접속

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 로그인 (필요시)

2. **프로젝트 선택**
   - 상단 프로젝트 선택 드롭다운 클릭
   - `yago-vibe-spt` 선택

### Step 3: Browser key 찾기

1. **왼쪽 메뉴 → "APIs & Services" → "Credentials"**

2. **"API keys" 섹션 찾기**
   - 페이지 중간에 "API keys" 섹션이 있습니다

3. **Browser key 찾기**
   - 브라우저 콘솔에 출력된 **전체 API 키**와 **정확히 일치**하는 키 찾기
   - ⚠️ **중요**: 키 이름이 아니라 **키 값 자체**를 비교하세요!
   - 키 이름: 보통 `Browser key (auto created by Google Service)` 또는 `Firebase Web App API Key`

4. **키를 찾았는지 확인**
   - ✅ 찾았으면 → Step 4로
   - ❌ 못 찾았으면 → 다른 프로젝트에 있을 수 있음! 다른 프로젝트 확인 필요

### Step 4: Browser key의 HTTP 리퍼러 제한 수정

**Browser key를 클릭**하여 편집:

1. **"Application restrictions"** 섹션
   - **"HTTP referrers (web sites)"** 선택되어 있는지 확인
   - 다른 옵션 선택되어 있으면 → **"HTTP referrers (web sites)"**로 변경

2. **"Website restrictions"** 섹션
   - 다음 도메인 **모두 추가** (각각 별도 줄):
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```
   - ⚠️ **중요**: 각 도메인은 **별도 줄**에 입력해야 합니다!
   - ⚠️ **중요**: `http://localhost:5174/*`는 **제거**하세요 (사용하지 않는 포트)

3. **"API restrictions"** 섹션
   - **"Don't restrict key"** 선택 (권장)
   - 또는 **"Restrict key"** 선택 시:
     - ✅ Identity Toolkit API 포함 확인
     - ✅ Firebase Authentication API 포함 확인

4. **"Save"** 클릭 (페이지 하단)

### Step 5: 변경사항 적용 대기

- Google Cloud Console 변경사항은 **최대 5분** 걸릴 수 있습니다
- **5분 이상 기다린 후** 테스트하세요
- ⚠️ **중요**: 변경사항이 적용되기 전에 테스트하면 여전히 오류가 발생합니다!

### Step 6: 브라우저 캐시 완전 삭제

1. **개발자 도구 (F12) → Application 탭**

2. **Storage** → **Clear site data**

3. **모든 항목 선택:**
   - ✅ Cache storage
   - ✅ Local storage
   - ✅ Session storage
   - ✅ IndexedDB

4. **"Clear site data"** 클릭

### Step 7: 시크릿 모드에서 테스트

1. **시크릿 모드 열기** (Ctrl + Shift + N)

2. **`http://localhost:5173/login`** 접속

3. **Google 로그인 버튼 클릭**

4. **개발자 도구 (F12) → Console 탭에서 오류 확인**

## 🔍 추가 확인 사항

### Firebase Console의 Authorized domains 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **Authentication → Settings → Authorized domains**

3. 다음 도메인 **모두 있어야 함:**
   - ✅ `localhost`
   - ✅ `127.0.0.1`
   - ✅ `yago-vibe-spt.web.app`
   - ✅ `yago-vibe-spt.firebaseapp.com`
   - ✅ `yagovibe.com`
   - ✅ `www.yagovibe.com`

4. **없으면 추가:**
   - "Add domain" 버튼 클릭
   - 도메인 입력 후 "Add" 클릭

### .env.local 파일 확인

프로젝트 루트의 `.env.local` 파일 확인:

```env
VITE_FIREBASE_API_KEY=AIzaSy실제_키
```

이 값이:
- ✅ Firebase Console의 API Key와 일치하는지
- ✅ 브라우저 콘솔에 출력된 키와 일치하는지
- ✅ Google Cloud Console의 Browser key와 일치하는지

**모두 일치해야 합니다!**

## 🚨 여전히 오류가 발생하는 경우

### 1. 다른 프로젝트의 API 키를 사용하고 있을 수 있음

브라우저 콘솔에 출력된 API 키가:
- 다른 Firebase 프로젝트의 키인지 확인
- Google Cloud Console에서 다른 프로젝트로 전환하여 확인

### 2. API 키가 여러 개인 경우

Google Cloud Console에 **여러 개의 Browser key**가 있다면:
- Firebase Console의 API Key와 일치하는 키만 수정
- 다른 키는 수정하지 않음

### 3. 변경사항이 아직 적용되지 않았을 수 있음

- Google Cloud Console 변경사항은 **최대 5분** 걸릴 수 있습니다
- **10분 이상 기다린 후** 다시 테스트하세요

### 4. 네트워크 문제

- VPN 사용 중이면 VPN 끄기
- 프록시 사용 중이면 프록시 끄기
- 다른 네트워크에서 테스트

## 📝 체크리스트

- [ ] 개발 서버 재시작
- [ ] 브라우저 콘솔에서 실제 사용되는 API 키 확인 (전체 키, 39자)
- [ ] Firebase Console의 API Key와 일치하는지 확인
- [ ] Google Cloud Console에서 해당 Browser key 찾기 (키 값으로 비교)
- [ ] Browser key의 HTTP 리퍼러 제한에 `http://localhost:5173/*` 추가 확인
- [ ] Browser key의 API 제한사항에서 "키 제한 안함" 또는 Identity Toolkit API 포함 확인
- [ ] 변경사항 저장 후 5-10분 이상 대기
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] `.env.local` 파일의 `VITE_FIREBASE_API_KEY` 값 확인
- [ ] Firebase Console의 Authorized domains에 `localhost` 추가 확인

## 💡 핵심 포인트

1. **브라우저 콘솔에서 전체 API 키 확인** (39자, `AIzaSy`로 시작)
2. **Google Cloud Console에서 해당 Browser key 찾기** (키 값으로 비교)
3. **HTTP 리퍼러 제한에 `http://localhost:5173/*` 추가**
4. **변경사항 저장 후 5-10분 대기**
5. **브라우저 캐시 완전 삭제 후 테스트**

이 단계를 정확히 따르면 오류가 해결됩니다!

