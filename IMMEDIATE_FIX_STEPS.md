# 🚨 즉시 해결 단계

## 현재 상황

스크린샷에서 확인된 정보:
- **API 키**: `AlzaSyCNxoZLo5s...` (일부만 표시됨)
- **오류**: `auth/requests-to-this-api-identitytoolkit-method-google.cloud.identitytoolkit.v1.projectconfigservice.getprojectconfig-are-blocked`

## ✅ 즉시 확인해야 할 사항

### Step 1: 브라우저 콘솔에서 전체 API 키 확인

1. **개발자 도구 (F12) → Console 탭**
2. **다음 로그 찾기:**
   ```
   🔍 [firebase.ts] ⚠️ 실제 사용되는 Firebase API 키 (전체): AIzaSy...
   ```
3. **전체 API 키를 복사하세요!** (39자 길이)

### Step 2: Google Cloud Console에서 정확한 Browser key 찾기

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials**

3. **"API keys" 섹션에서 키 찾기**
   - 브라우저 콘솔에 출력된 **전체 API 키**와 **정확히 일치**하는 키 찾기
   - ⚠️ **중요**: 키 이름이 아니라 **키 값 자체**를 비교하세요!

4. **키를 찾았는지 확인**
   - ✅ 찾았으면 → Step 3으로
   - ❌ 못 찾았으면 → 다른 프로젝트에 있을 수 있음!

### Step 3: Browser key의 HTTP 리퍼러 제한 확인 및 수정

**Browser key를 클릭**하여 편집:

1. **"Application restrictions"** 섹션
   - **"HTTP referrers (web sites)"** 선택되어 있는지 확인
   - 다른 옵션 선택되어 있으면 → **"HTTP referrers (web sites)"**로 변경

2. **"Website restrictions"** 섹션
   - 다음 도메인 **모두 있는지 확인** (각각 별도 줄):
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```
   - ❌ 없으면 → **추가**
   - ✅ 있으면 → 다음 확인

3. **"API restrictions"** 섹션
   - **"Don't restrict key"** 선택 (권장)
   - 또는 **"Restrict key"** 선택 시:
     - ✅ Identity Toolkit API 포함 확인
     - ✅ Firebase Authentication API 포함 확인

4. **"Save"** 클릭

### Step 4: 변경사항 적용 대기

- Google Cloud Console 변경사항은 **최대 5분** 걸릴 수 있습니다
- **5분 이상 기다린 후** 테스트하세요

### Step 5: 브라우저 캐시 완전 삭제

1. **개발자 도구 (F12) → Application 탭**
2. **Storage** → **Clear site data**
3. **모든 항목 선택:**
   - ✅ Cache storage
   - ✅ Local storage
   - ✅ Session storage
   - ✅ IndexedDB
4. **"Clear site data"** 클릭

### Step 6: 시크릿 모드에서 테스트

1. **시크릿 모드 열기** (Ctrl + Shift + N)
2. **`http://localhost:5173/login`** 접속
3. **Google 로그인 버튼 클릭**
4. **개발자 도구 (F12) → Console 탭에서 오류 확인**

## 🔍 추가 확인 사항

### Firebase Console의 Authorized domains 확인

1. **Firebase Console → Authentication → Settings → Authorized domains**
2. 다음 도메인 **모두 있어야 함:**
   - ✅ `localhost`
   - ✅ `127.0.0.1`
   - ✅ `yago-vibe-spt.web.app`
   - ✅ `yago-vibe-spt.firebaseapp.com`
   - ✅ `yagovibe.com`
   - ✅ `www.yagovibe.com`

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

### 3. 네트워크 문제

- VPN 사용 중이면 VPN 끄기
- 프록시 사용 중이면 프록시 끄기
- 다른 네트워크에서 테스트

## 📝 체크리스트

- [ ] 브라우저 콘솔에서 실제 사용되는 API 키 확인 (전체 키, 39자)
- [ ] Firebase Console의 API Key와 일치하는지 확인
- [ ] Google Cloud Console에서 해당 Browser key 찾기 (키 값으로 비교)
- [ ] Browser key의 HTTP 리퍼러 제한에 `http://localhost:5173/*` 추가 확인
- [ ] Browser key의 API 제한사항에서 "키 제한 안함" 또는 Identity Toolkit API 포함 확인
- [ ] 변경사항 저장 후 5분 이상 대기
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] `.env.local` 파일의 `VITE_FIREBASE_API_KEY` 값 확인
- [ ] Firebase Console의 Authorized domains에 `localhost` 추가 확인
- [ ] 개발 서버 재시작

