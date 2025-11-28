# ✅ 구글 로그인 오류 해결 체크리스트

## 📋 오류 정보
- **오류 코드**: `auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked`
- **의미**: Firebase Auth가 특정 referer(도메인)에서 오는 OAuth 요청을 차단
- **발생 위치**: `src/pages/LoginPage.tsx` - `signInWithPopup(auth, provider)` 호출 시

---

## ✅ Step 1: Firebase Console 설정 확인

### 1-1. Authorized domains 확인
- [ ] **Firebase Console 접속**
  - URL: https://console.firebase.google.com
  - 프로젝트: `yago-vibe-spt` 선택

- [ ] **Authentication → Settings → Authorized domains**
  - `yago-vibe-spt.firebaseapp.com` 포함 여부 확인
  - `yago-vibe-spt.web.app` 포함 여부 확인
  - `localhost` 포함 여부 확인 (개발 환경용)
  - 실제 서비스 도메인 포함 여부 (예: `www.yagovibe.com`)
  - 없으면 "Add domain"으로 추가

### 1-2. Google Provider 설정 확인
- [ ] **Authentication → Sign-in method → Google**
  - "웹 클라이언트 ID" 필드 확인
  - 값 기록: `___________________________`
  - 이 값이 Google Cloud Console의 OAuth Client ID와 일치하는지 확인 (Step 2에서 확인)

---

## ✅ Step 2: Google Cloud Console 설정 확인

### 2-1. OAuth 2.0 Client ID 확인
- [ ] **Google Cloud Console 접속**
  - URL: https://console.cloud.google.com
  - 프로젝트: `yago-vibe-spt` (또는 연결된 GCP 프로젝트) 선택

- [ ] **APIs & Services → Credentials → OAuth 2.0 Client IDs**
  - Web application 타입 클라이언트 찾기
  - 클라이언트 ID 클릭하여 편집
  - 클라이언트 ID 값 복사: `___________________________`

### 2-2. 클라이언트 ID 일치 확인
- [ ] **Firebase Console의 "웹 클라이언트 ID"와 비교**
  - Step 1-2에서 기록한 값과 Step 2-1에서 복사한 값 비교
  - 완전히 일치하는지 확인 (한 글자라도 다르면 안 됨)
  - 다르다면 Firebase Console에 Google Cloud Console의 값 입력

### 2-3. 승인된 JavaScript 원본 확인
- [ ] **OAuth 클라이언트 편집 화면에서**
  - "승인된 JavaScript 원본" 섹션 확인
  - 다음이 포함되어 있는지 확인:
    - `https://yago-vibe-spt.firebaseapp.com`
    - `https://yago-vibe-spt.web.app`
    - `https://www.yagovibe.com` (커스텀 도메인 사용 시)
    - `http://localhost:5179` (개발 환경용)
  - 없으면 "URI 추가"로 추가

### 2-4. 승인된 리디렉션 URI 확인
- [ ] **"승인된 리디렉션 URI" 섹션 확인**
  - 다음이 포함되어 있는지 확인:
    - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
    - `https://yago-vibe-spt.web.app/__/auth/handler`
  - 없으면 "URI 추가"로 추가

### 2-5. OAuth 동의 화면 확인
- [ ] **APIs & Services → OAuth consent screen**
  - "승인된 도메인" 섹션 확인
  - 다음이 포함되어 있는지 확인:
    - `yago-vibe-spt.firebaseapp.com`
    - `www.yagovibe.com` (커스텀 도메인 사용 시)
  - 없으면 추가
  - 앱 상태가 "테스트"라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가

---

## ✅ Step 3: Firebase Google Provider 재설정 (선택사항, 추천)

- [ ] **Google Provider 비활성화**
  - Firebase Console → Authentication → Sign-in method → Google
  - 비활성화 클릭

- [ ] **잠시 대기** (5-10초)

- [ ] **Google Provider 다시 활성화**
  - 다시 활성화 클릭
  - "웹 클라이언트 ID" 다시 확인 및 입력 (Step 2-1에서 복사한 값)
  - 저장

---

## ✅ Step 4: 브라우저 캐시/세션 초기화 및 테스트

### 4-1. 브라우저 완전 종료
- [ ] 모든 브라우저 창 닫기
- [ ] 브라우저 프로세스 완전 종료 확인

### 4-2. 브라우저 캐시/쿠키 삭제
- [ ] **Windows**: Ctrl+Shift+Delete
- [ ] **Mac**: Cmd+Shift+Delete
- [ ] 캐시 및 쿠키 선택
- [ ] 삭제

### 4-3. 시크릿 모드에서 테스트
- [ ] 브라우저 시크릿 모드 열기
- [ ] `https://yago-vibe-spt.firebaseapp.com` 접속
- [ ] 개발자 도구 열기 (F12)
- [ ] Console 탭 확인
- [ ] Google 로그인 시도

### 4-4. 개발자 도구 확인
- [ ] **Console 탭**
  - "🔍 [Google Login] 사전 검증 시작" 로그 확인
  - "🔍 [Google Login] Firebase Auth 인스턴스 정보" 로그 확인
  - 오류 메시지 확인
- [ ] **Network 탭**
  - OAuth 관련 요청 확인
  - 요청 URL 및 응답 확인

---

## ✅ Step 5: 최종 확인

### 5-1. 로그인 성공 확인
- [ ] Google 로그인 버튼 클릭
- [ ] 팝업 창에서 Google 계정 선택
- [ ] 로그인 성공 확인
- [ ] 페이지 이동 확인 (`/sports-hub`)

### 5-2. 콘솔 로그 확인
- [ ] 개발자 도구 Console에서
- [ ] "✅ [Google Login] 로그인 성공" 메시지 확인
- [ ] 오류 없이 성공했는지 확인

---

## 🎯 핵심 포인트 요약

1. ✅ **Firebase Authorized domains에 도메인 등록 필수**
2. ✅ **Firebase Google Provider의 "웹 클라이언트 ID"와 Google Cloud OAuth Client ID 완전 일치 필수**
3. ✅ **Google Cloud OAuth Client의 "승인된 JavaScript 원본"에 도메인 포함 필수**
4. ✅ **설정 변경 후 브라우저 캐시 삭제 필수**

---

## 📝 추가 참고사항

- ⏰ 설정 변경 후 적용되는 데 **5분~몇 시간**이 걸릴 수 있음
- 🔄 여러 환경(dev/prod)이 있다면 각각 확인 필요
- 🔑 클라이언트 ID는 **한 글자라도 다르면 안 됨**
- 🧪 개발 환경에서는 개발자 도구 Console에서 상세 로그 확인 가능

---

## 🆘 여전히 안 된다면

1. **Firebase Console의 Google 제공자를 비활성화했다가 다시 활성화**
2. **OAuth 클라이언트 ID를 새로 생성**
3. **Firebase 지원팀에 문의**: https://firebase.google.com/support

