# 🔍 OAuth 설정 - 다른 문제 확인 체크리스트

## ✅ 확인 완료 (정상)
- ✅ 승인된 JavaScript 원본: 정상
- ✅ 승인된 리디렉션 URI: `/__/auth/handler` (언더스코어 2개) 정상

## ❌ 확인 필요한 다른 문제들

### 🔥 1순위: Firebase Console - Google Provider 웹 클라이언트 ID 불일치

**문제**: Google Cloud Console의 OAuth 클라이언트 ID와 Firebase Console의 Google Provider 설정이 일치하지 않을 수 있습니다.

**확인 방법**:
1. **Google Cloud Console**에서 현재 편집 중인 OAuth 클라이언트 ID 확인
   - 스크린샷에서 보이는 클라이언트: "Web client (auto created by Google Service)"
   - 클라이언트 ID 복사 (예: `123456789-abc...xyz.apps.googleusercontent.com`)

2. **Firebase Console**에서 Google Provider 설정 확인
   ```
   Firebase Console → Authentication → Sign-in method
   → Google 클릭
   → "웹 클라이언트 ID" 확인
   ```

3. **일치 여부 확인**
   - Google Cloud Console의 클라이언트 ID와 Firebase Console의 "웹 클라이언트 ID"가 **정확히 일치**해야 함
   - 한 글자라도 다르면 인증 실패

**해결 방법**:
- Firebase Console의 "웹 클라이언트 ID"를 Google Cloud Console의 클라이언트 ID로 업데이트
- 저장 후 1-2분 대기

---

### 🔥 2순위: Firebase Console - Request Restrictions 활성화

**문제**: Firebase Console의 Request Restrictions가 활성화되어 있어서, Authorized domains에 있어도 요청을 차단할 수 있습니다.

**확인 방법**:
1. **Firebase Console 접속**
   ```
   https://console.firebase.google.com
   → 프로젝트: yago-vibe-spt
   → Authentication → Settings 탭
   ```

2. **Request Restrictions 섹션 확인**
   - "Authorized domains" 섹션 아래에 "Request Restrictions" 섹션이 있음
   - "Block all requests from unauthorized domains" 체크박스 확인

**해결 방법**:
- "Block all requests from unauthorized domains" **체크 해제**
- 또는 "Allow all domains" 선택
- 저장 후 1-2분 대기

---

### 🔥 3순위: Firebase Console - Authorized Domains 누락

**문제**: Firebase Console의 Authorized domains에 필요한 도메인이 누락되어 있을 수 있습니다.

**확인 방법**:
1. **Firebase Console 접속**
   ```
   Firebase Console → Authentication → Settings
   → "Authorized domains" 섹션 확인
   ```

2. **필수 도메인 확인**
   - `yago-vibe-spt.firebaseapp.com` ✅
   - `yago-vibe-spt.web.app` ✅
   - `localhost` (개발용) ✅
   - `yagovibe.com` (커스텀 도메인) ✅
   - `www.yagovibe.com` (커스텀 도메인) ✅
   - `yagovibe.vercel.app` (Vercel 배포) ✅

**해결 방법**:
- 누락된 도메인 추가
- "Add domain" 버튼 클릭 → 도메인 입력 → "Add" 클릭
- 저장 후 1-2분 대기

---

### 🔥 4순위: OAuth Consent Screen 설정 문제

**문제**: OAuth 동의 화면이 테스트 상태이고, 테스트 사용자 목록에 이메일이 없을 수 있습니다.

**확인 방법**:
1. **Google Cloud Console 접속**
   ```
   https://console.cloud.google.com
   → APIs & Services → OAuth consent screen
   ```

2. **앱 상태 확인**
   - "테스트" 상태인지 확인
   - 테스트 상태라면 "테스트 사용자" 목록 확인

**해결 방법**:
- 테스트 상태라면 로그인할 이메일을 "테스트 사용자" 목록에 추가
- 또는 "프로덕션"으로 변경 (검토 필요)

---

### 🔥 5순위: 브라우저 캐시/쿠키 문제

**문제**: 브라우저 캐시나 쿠키가 오래된 설정을 유지하고 있을 수 있습니다.

**해결 방법**:
1. **하드 새로고침**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **브라우저 캐시 삭제**
   - Chrome: 설정 → 개인정보 및 보안 → 인터넷 사용 기록 삭제
   - "캐시된 이미지 및 파일" 선택
   - 삭제

3. **쿠키 삭제**
   - Chrome: 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트 데이터
   - 해당 사이트의 쿠키 삭제

4. **시크릿 모드에서 테스트**
   - Chrome: `Ctrl + Shift + N` (Windows) / `Cmd + Shift + N` (Mac)
   - 시크릿 창에서 로그인 테스트

---

## 📋 우선순위별 확인 체크리스트

### 1순위 (가장 가능성 높음)
- [ ] Firebase Console → Authentication → Sign-in method → Google
- [ ] "웹 클라이언트 ID" 확인
- [ ] Google Cloud Console의 OAuth 클라이언트 ID와 일치하는지 확인
- [ ] 불일치 시 Firebase Console의 "웹 클라이언트 ID" 업데이트
- [ ] 저장 후 1-2분 대기

### 2순위
- [ ] Firebase Console → Authentication → Settings
- [ ] Request Restrictions 섹션 확인
- [ ] "Block all requests from unauthorized domains" 체크 해제
- [ ] 저장 후 1-2분 대기

### 3순위
- [ ] Firebase Console → Authentication → Settings
- [ ] Authorized domains 섹션 확인
- [ ] 필수 도메인 모두 포함 확인
- [ ] 누락된 도메인 추가
- [ ] 저장 후 1-2분 대기

### 4순위
- [ ] Google Cloud Console → OAuth consent screen
- [ ] 앱 상태 확인 (테스트/프로덕션)
- [ ] 테스트 상태라면 테스트 사용자 목록에 이메일 추가

### 5순위
- [ ] 브라우저 하드 새로고침 (Ctrl + Shift + R)
- [ ] 브라우저 캐시 삭제
- [ ] 쿠키 삭제
- [ ] 시크릿 모드에서 테스트

---

## ✅ 완료

이 체크리스트를 순서대로 확인하면 `auth/requests-from-referer-are-blocked` 오류를 해결할 수 있습니다!

