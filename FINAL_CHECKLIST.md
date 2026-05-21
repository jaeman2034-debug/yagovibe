# ✅ 최종 확인 체크리스트

## 현재 상황
- ✅ API 키가 일치함
- ✅ `http://localhost:5174/*` 제거됨
- ❌ 여전히 같은 오류 발생

## 🔍 추가 확인 사항

### 1. 브라우저 콘솔에서 전체 API 키 확인

1. **개발 서버 재시작** (필수!)
   ```bash
   # 서버 중지 (Ctrl + C)
   npm run dev
   ```

2. **브라우저에서 `http://localhost:5173/login` 접속**

3. **개발자 도구 (F12) → Console 탭**

4. **다음 로그 확인:**
   ```
   ================================================================================
   🔍 [firebase.ts] ⚠️⚠️⚠️ 실제 사용되는 Firebase API 키 (전체) ⚠️⚠️⚠️
   🔍 [firebase.ts] API Key: AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
   🔍 [firebase.ts] API Key 길이: 39 자
   ================================================================================
   ```

5. **전체 API 키를 복사하세요!** (39자, `AIzaSy`로 시작해야 함)

### 2. Google Cloud Console에서 Browser key 최종 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials**

3. **"API keys" 섹션에서 Browser key 찾기**
   - 브라우저 콘솔에 출력된 전체 API 키와 **정확히 일치**하는 키 찾기
   - 키 값: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`

4. **Browser key 클릭 → 편집**

5. **"Application restrictions"** 섹션 확인
   - ✅ **"HTTP referrers (web sites)"** 선택되어 있는지 확인
   - ❌ 다른 옵션 선택되어 있으면 → **"HTTP referrers (web sites)"**로 변경

6. **"Website restrictions"** 섹션 확인
   - 다음 도메인 **모두 정확히 있는지 확인** (각각 별도 줄):
   ```
   http://localhost:5173/*
   http://127.0.0.1:5173/*
   https://yago-vibe-spt.web.app/*
   https://yago-vibe-spt.firebaseapp.com/*
   https://yagovibe.com/*
   https://www.yagovibe.com/*
   ```
   - ⚠️ **중요**: `http://localhost:5174/*`는 **없어야 함**!
   - ⚠️ **중요**: 각 도메인은 **별도 줄**에 있어야 함!
   - ⚠️ **중요**: 앞뒤 공백 없어야 함!

7. **"API restrictions"** 섹션 확인
   - ✅ **"Don't restrict key"** 선택 (권장)
   - 또는 **"Restrict key"** 선택 시:
     - ✅ Identity Toolkit API 포함 확인
     - ✅ Firebase Authentication API 포함 확인

8. **"Save"** 클릭

### 3. 변경사항 적용 대기

- Google Cloud Console 변경사항은 **최대 10분** 걸릴 수 있습니다
- **10분 이상 기다린 후** 테스트하세요
- ⚠️ **중요**: 변경사항이 적용되기 전에 테스트하면 여전히 오류가 발생합니다!

### 4. Firebase Console의 Authorized domains 확인

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

### 5. 브라우저 캐시 완전 삭제

1. **개발자 도구 (F12) → Application 탭**

2. **Storage** → **Clear site data**

3. **모든 항목 선택:**
   - ✅ Cache storage
   - ✅ Local storage
   - ✅ Session storage
   - ✅ IndexedDB

4. **"Clear site data"** 클릭

5. **하드 리프레시**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

### 6. 시크릿 모드에서 테스트

1. **시크릿 모드 열기** (Ctrl + Shift + N)

2. **`http://localhost:5173/login`** 접속

3. **Google 로그인 버튼 클릭**

4. **개발자 도구 (F12) → Console 탭에서 오류 확인**

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

### 4. Google Cloud Console 변경사항이 아직 적용되지 않음

- Google Cloud Console 변경사항은 **최대 10분** 걸릴 수 있습니다
- **15분 이상 기다린 후** 다시 테스트하세요

### 5. Identity Toolkit API가 활성화되지 않음

1. **Google Cloud Console → APIs & Services → Library**

2. **"Identity Toolkit API"** 검색

3. **"사용 설정됨"** 상태인지 확인

4. **활성화되지 않았으면 "사용 설정"** 클릭

## 📝 최종 체크리스트

- [ ] 개발 서버 재시작
- [ ] 브라우저 콘솔에서 실제 사용되는 API 키 확인 (전체 키, 39자)
- [ ] Google Cloud Console에서 해당 Browser key 찾기 (키 값으로 비교)
- [ ] Browser key의 HTTP 리퍼러 제한에 `http://localhost:5173/*` 추가 확인
- [ ] Browser key의 HTTP 리퍼러 제한에서 `http://localhost:5174/*` 제거 확인
- [ ] Browser key의 API 제한사항에서 "키 제한 안함" 또는 Identity Toolkit API 포함 확인
- [ ] 변경사항 저장 후 10-15분 이상 대기
- [ ] Firebase Console의 Authorized domains에 `localhost` 추가 확인
- [ ] 브라우저 캐시 완전 삭제
- [ ] 시크릿 모드에서 테스트
- [ ] Identity Toolkit API 활성화 확인

## 💡 핵심 포인트

1. **변경사항 적용 대기 시간**: Google Cloud Console 변경사항은 최대 10분 걸릴 수 있습니다
2. **브라우저 캐시**: 반드시 완전 삭제해야 합니다
3. **시크릿 모드**: 캐시 없이 테스트하는 가장 확실한 방법입니다
4. **Identity Toolkit API**: 반드시 활성화되어 있어야 합니다

