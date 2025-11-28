# 🔧 "Unable to verify that the app domain is authorized" 오류 해결

## ❌ 오류 메시지
```
Unable to verify that the app domain is authorized
```

## 🎯 즉시 해결 방법

### 1️⃣ Firebase Console - Authorized Domains 확인 및 추가

**경로**: Firebase Console → Authentication → Settings → Authorized domains

**필수 도메인 목록**:
1. ✅ `localhost` ← **가장 중요!**
2. ✅ `yago-vibe-spt.firebaseapp.com`
3. ✅ `yago-vibe-spt.web.app`
4. ✅ `yagovibe.com`
5. ✅ `www.yagovibe.com`
6. ✅ `yagovibe.vercel.app`

**추가 방법**:
1. Firebase Console 접속
2. Authentication → Settings 탭
3. "Authorized domains" 섹션 확인
4. `localhost`가 없으면 "Add domain" 클릭
5. `localhost` 입력 → "Add" 클릭
6. 저장

### 2️⃣ Google Cloud Console - OAuth 설정 재확인

**경로**: Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 클라이언트 ID

#### 승인된 JavaScript 원본
다음이 모두 포함되어 있어야 합니다:
- ✅ `http://localhost:5173`
- ✅ `http://localhost:5174`
- ✅ `https://yago-vibe-spt.firebaseapp.com`
- ✅ `https://yago-vibe-spt.web.app`
- ✅ `https://www.yagovibe.com`
- ✅ `https://yagovibe.com`
- ✅ `https://yagovibe.vercel.app`

#### 승인된 리디렉션 URI
다음이 모두 포함되어 있어야 합니다:
- ✅ `http://localhost:5173/_/auth/handler`
- ✅ `http://localhost:5174/_/auth/handler`
- ✅ `https://yago-vibe-spt.firebaseapp.com/_/auth/handler`
- ✅ `https://yago-vibe-spt.web.app/_/auth/handler`
- ✅ `https://www.yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.com/_/auth/handler`
- ✅ `https://yagovibe.vercel.app/_/auth/handler`

**중요**: `/_/auth/handler` 경로가 정확해야 합니다 (언더스코어 + 슬래시 + auth)

### 3️⃣ Firebase Console - Google Sign-in Method 확인

**경로**: Firebase Console → Authentication → Sign-in method → Google

**확인 사항**:
- ✅ Google 제공자 활성화됨
- ✅ "웹 클라이언트 ID" 설정됨
- ✅ 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

### 4️⃣ 브라우저 캐시 및 Service Worker 삭제

**방법**:
1. **Ctrl + Shift + Delete**
2. "지난 4주" 또는 "전체 기간" 선택
3. "쿠키 및 기타 사이트 데이터" 체크
4. "캐시된 이미지 및 파일" 체크
5. "데이터 삭제" 클릭
6. Chrome 완전 종료 후 재시작

**Service Worker 제거**:
1. 주소창에 입력: `chrome://serviceworker-internals`
2. `yago-vibe-spt.firebaseapp.com` 관련 Service Worker 찾기
3. "Unregister" 클릭
4. Chrome 완전 종료 후 재시작

### 5️⃣ 설정 적용 대기

**중요**: 설정 변경 후 1-2분 대기 (적용 시간)

## 🔍 확인 체크리스트

### Firebase Console
- [ ] Authentication → Settings → Authorized domains
  - [ ] `localhost` 포함 확인
  - [ ] 모든 프로덕션 도메인 포함 확인

### Google Cloud Console
- [ ] OAuth 2.0 클라이언트 ID → 승인된 JavaScript 원본
  - [ ] `http://localhost:5173` 포함 확인
  - [ ] 모든 프로덕션 도메인 포함 확인
- [ ] OAuth 2.0 클라이언트 ID → 승인된 리디렉션 URI
  - [ ] `http://localhost:5173/_/auth/handler` 포함 확인
  - [ ] 모든 프로덕션 도메인의 `/_/auth/handler` 포함 확인

### 브라우저
- [ ] 캐시 완전 삭제
- [ ] Service Worker 제거
- [ ] Chrome 재시작

## 🎯 우선순위

1. **Firebase Console Authorized Domains에 `localhost` 추가** (가장 중요!)
2. **Google Cloud Console Redirect URIs 확인**
3. **브라우저 캐시 및 Service Worker 삭제**
4. **1-2분 대기 후 테스트**

## ✅ 테스트

설정 변경 후:
1. 브라우저 캐시 삭제
2. Chrome 재시작
3. `http://localhost:5173/login` 접속
4. Google 로그인 버튼 클릭
5. 오류가 사라졌는지 확인

## 💡 참고

이 오류는 주로 **Firebase Console의 Authorized Domains에 `localhost`가 없을 때** 발생합니다.

특히 Redirect 방식(`signInWithRedirect`)을 사용할 때는 Firebase Auth handler가 `yago-vibe-spt.firebaseapp.com`에서 실행되므로, 원래 요청이 `localhost`에서 왔는지 확인할 수 있어야 합니다.

