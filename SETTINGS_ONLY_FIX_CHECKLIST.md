# ✅ Firebase Google 로그인 오류 해결 체크리스트 (설정만)

## 🎯 핵심 원칙

**코드는 수정하지 말고 설정만 교정하는 방향으로 진행**

## 📋 필수 점검 체크리스트

### [필수 점검 1] Firebase Console → Google 제공자 설정

**경로**: https://console.firebase.google.com → 프로젝트 선택 → Authentication → Sign-in method → Google

**체크리스트**:
- [ ] "웹 클라이언트 ID" 필드 확인
- [ ] 값이 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 **완전히 일치**하는지 확인
- [ ] 다르다면 수정 후 저장
- [ ] Google 제공자 **비활성화** 클릭
- [ ] **5초 대기**
- [ ] Google 제공자 **다시 활성화** 클릭
- [ ] "웹 클라이언트 ID"가 올바르게 유지되는지 다시 확인
- [ ] 저장

**⚠️ 중요**: 한 글자라도 다르면 안 됨!

### [필수 점검 2] Firebase Console → Authorized domains

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**체크리스트**:
- [ ] `localhost:5173` 포함 여부 확인 ⚠️ **필수!**
- [ ] `yago-vibe-spt.firebaseapp.com` 포함 여부 확인
- [ ] `yago-vibe-spt.web.app` 포함 여부 확인
- [ ] 없으면 "Add domain"으로 추가

**⚠️ 중요**: 이 중 하나라도 없으면 `auth/requests-from-referer-are-blocked` 오류가 발생합니다!

### [필수 점검 3] Google Cloud Console → OAuth 2.0 클라이언트 ID

**경로**: https://console.cloud.google.com → 프로젝트 선택 → APIs & Services → Credentials → OAuth 2.0 Client IDs

**체크리스트**:
- [ ] Web application 타입 클라이언트 ID 찾기
- [ ] 클라이언트 ID가 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`인지 확인
- [ ] 클라이언트 ID 클릭하여 편집

**승인된 JavaScript 원본**:
- [ ] `http://localhost:5173` 포함 여부 확인 ⚠️ **필수!**
- [ ] `https://yago-vibe-spt.firebaseapp.com` 포함 여부 확인
- [ ] `https://yago-vibe-spt.web.app` 포함 여부 확인
- [ ] 없으면 "URI 추가"로 추가

**승인된 리디렉션 URI**:
- [ ] `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함 여부 확인 ⚠️ **필수!**
- [ ] `https://yago-vibe-spt.web.app/__/auth/handler` 포함 여부 확인 (선택사항)
- [ ] 없으면 "URI 추가"로 추가

**저장** 클릭

### [필수 점검 4] 브라우저 캐시 삭제 및 시크릿 모드 테스트

**체크리스트**:
- [ ] 브라우저 **완전히 닫기** (모든 창)
- [ ] 브라우저 캐시/쿠키 삭제 (Ctrl+Shift+Delete 또는 Cmd+Shift+Delete)
- [ ] Google 관련 쿠키 모두 삭제
- [ ] **시크릿 모드** 열기
- [ ] `http://localhost:5173` 접속
- [ ] 개발자 도구 열기 (F12)
- [ ] Google 로그인 시도
- [ ] 로그인 성공 확인

**⚠️ 중요**: Firebase Auth는 설정을 즉시 반영하지 않으므로, 캐시가 남아 있으면 항상 실패합니다!

### [필수 점검 5] 코드 확인 (수정 불필요)

**확인 사항**:
- [ ] `signInWithPopup(auth, provider)` 사용 확인 ✅
- [ ] `GoogleAuthProvider` 기본 생성자만 사용 확인 ✅
- [ ] 클라이언트 ID를 직접 설정하지 않음 확인 ✅
- [ ] 코드 수정 불필요 확인 ✅

## 🔍 오류 원인 분석

### 현재 증상
1. `firebaseapp.com` 팝업이 뜸 ✅
2. Callback URL이 뜨지만 바로 차단됨 ❌
3. referer mismatch → callback 무효 → "requested action invalid" ❌

### 원인
- Firebase Console 설정 오류 100%
- Authorized domains에 `localhost:5173` 누락
- 또는 "웹 클라이언트 ID" 불일치

## ✅ 해결 방법

위 체크리스트를 순서대로 따라가며 누락된 설정을 찾아 수정하세요.

**코드는 수정하지 마세요. 설정만 교정하면 됩니다.**

