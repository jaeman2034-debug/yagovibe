# 🔍 도메인별 테스트 가이드

## ✅ 성공 확인된 도메인
- **https://yago-vibe-spt.web.app** ✅ (로그인 성공 확인)

---

## 🔍 검토 필요 도메인

### 1. Firebase 기본 도메인
**URL**: `https://yago-vibe-spt.firebaseapp.com/login`

**테스트 방법:**
1. 브라우저에서 접속
2. Google 로그인 버튼 클릭
3. 다음 확인:
   - ✅ 무한 루프 없이 정상 로그인 페이지 표시
   - ✅ `auth/api-key-not-valid` 오류 없음
   - ✅ Google 로그인 팝업 정상 열림
   - ✅ 로그인 성공 후 `/sports-hub`로 정상 리다이렉트

---

### 2. 커스텀 도메인 - 루트 도메인
**URL**: `https://yagovibe.com/login`

**테스트 방법:**
1. 브라우저에서 접속
2. Google 로그인 버튼 클릭
3. 다음 확인:
   - ✅ 페이지가 정상적으로 로드됨 (Site Not Found 없음)
   - ✅ 무한 루프 없음
   - ✅ `auth/api-key-not-valid` 오류 없음
   - ✅ Google 로그인 정상 작동

**문제 발생 시:**
- Google Cloud Console → API 키 → 웹사이트 제한사항에 `https://yagovibe.com/*` 포함 확인
- Firebase Console → Authentication → Authorized domains에 `yagovibe.com` 포함 확인

---

### 3. 커스텀 도메인 - www 서브도메인
**URL**: `https://www.yagovibe.com/login`

**테스트 방법:**
1. 브라우저에서 접속
2. Google 로그인 버튼 클릭
3. 다음 확인:
   - ✅ 페이지가 정상적으로 로드됨
   - ✅ 무한 루프 없음
   - ✅ `auth/api-key-not-valid` 오류 없음
   - ✅ Google 로그인 정상 작동

**문제 발생 시:**
- Google Cloud Console → API 키 → 웹사이트 제한사항에 `https://www.yagovibe.com/*` 포함 확인
- Firebase Console → Authentication → Authorized domains에 `www.yagovibe.com` 포함 확인

---

### 4. 커스텀 도메인 - app 서브도메인 (선택사항)
**URL**: `https://app.yagovibe.com/login`

**테스트 방법:**
1. 브라우저에서 접속
2. 페이지가 로드되는지 확인
   - ✅ 로드되면 → Google 로그인 버튼 테스트
   - ❌ 로드 안 되면 → Firebase Console에서 도메인 연결 확인

**참고**: `app.yagovibe.com`은 DEPLOYMENT_GUIDE.md에서 언급되었지만, 실제로 Firebase Hosting에 연결되어 있는지 확인 필요

---

## 📋 Google Cloud Console 설정 확인

### Step 1: API 키 접근
1. https://console.cloud.google.com 접속
2. 프로젝트 `yago-vibe-spt` 선택
3. **API 및 서비스** → **사용자 인증 정보**
4. API 키 목록에서 Firebase API 키 클릭 (편집)

### Step 2: 애플리케이션 제한사항 확인
- **애플리케이션 제한사항**: "HTTP 리퍼러(웹사이트)" 선택되어 있어야 함

### Step 3: 웹사이트 제한사항 확인
다음 항목들이 **모두** 포함되어 있어야 합니다:

```
http://localhost:5173/*
http://127.0.0.1:5173/*
https://yago-vibe-spt.web.app/*
https://yago-vibe-spt.firebaseapp.com/*
https://yagovibe.com/*
https://www.yagovibe.com/*
https://app.yagovibe.com/*
```

**⚠️ 중요**: 
- 각 항목을 한 줄씩 입력
- `*` 와일드카드 필수
- `https://`와 `http://` 구분
- 저장 버튼 클릭 필수!

---

## 📋 Firebase Console 설정 확인

### Step 1: Authorized Domains 확인
1. https://console.firebase.google.com/project/yago-vibe-spt/authentication/settings
2. **Authorized domains** 섹션 확인
3. 다음 도메인들이 포함되어 있어야 합니다:

```
localhost
yago-vibe-spt.firebaseapp.com
yago-vibe-spt.web.app
yagovibe.com
www.yagovibe.com
app.yagovibe.com (연결되어 있다면)
```

### Step 2: 커스텀 도메인 연결 확인
1. https://console.firebase.google.com/project/yago-vibe-spt/hosting
2. **커스텀 도메인** 섹션 확인
3. 연결된 도메인 목록 확인:
   - `yagovibe.com`
   - `www.yagovibe.com`
   - `app.yagovibe.com` (있다면)

---

## 🧪 빠른 테스트 체크리스트

각 도메인에서 다음을 확인하세요:

### 테스트 1: 로그인 페이지 로드
- [ ] 페이지가 정상적으로 표시됨
- [ ] 무한 루프 없음 (콘솔 확인)
- [ ] 로그인 폼이 정상적으로 표시됨

### 테스트 2: Google 로그인 버튼
- [ ] "G 구글로 로그인" 버튼이 표시됨
- [ ] 버튼 클릭 시 팝업이 열림
- [ ] `auth/api-key-not-valid` 오류 없음

### 테스트 3: 로그인 성공
- [ ] Google 계정 선택 후 로그인 성공
- [ ] `/sports-hub` 페이지로 정상 리다이렉트
- [ ] 사용자 정보가 정상적으로 표시됨

---

## 🚨 문제 해결

### 문제 1: `auth/api-key-not-valid` 오류
**원인**: Google Cloud Console의 API 키 제한 설정에 해당 도메인이 포함되지 않음

**해결**:
1. Google Cloud Console → API 및 서비스 → 사용자 인증 정보
2. API 키 편집
3. 웹사이트 제한사항에 해당 도메인 추가
4. 저장

### 문제 2: 무한 루프
**원인**: 이미 해결됨 (AuthProvider 및 InAppBrowserRedirect 수정)

**확인**:
- 브라우저 개발자 콘솔 (F12)에서 `🟨 [AuthProvider] 사용자 상태 변경 없음 - 리다이렉트 스킵` 로그 확인

### 문제 3: 페이지 로드 실패
**원인**: Firebase Hosting에 배포되지 않았거나 커스텀 도메인이 연결되지 않음

**해결**:
1. Firebase Console → Hosting 확인
2. 커스텀 도메인 연결 확인
3. 필요 시 `firebase deploy --only hosting` 재실행

---

## ✅ 완료 후 결과 공유

각 도메인별 테스트 결과를 다음과 같이 공유해주세요:

```
✅ https://yago-vibe-spt.web.app - 정상 작동
✅ https://yago-vibe-spt.firebaseapp.com - 정상 작동
❌ https://yagovibe.com - auth/api-key-not-valid 오류 발생
✅ https://www.yagovibe.com - 정상 작동
```

문제가 발생하는 도메인이 있으면 해당 도메인의 오류 메시지와 콘솔 로그를 공유해주세요!

