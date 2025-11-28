# 🔍 구글 로그인 실제 문제 분석

## 💡 사용자 지적 사항

1. **클라이언트 ID가 처음부터 틀렸다면 구글 로그인이 한 번도 성공했을 수 없음**
2. **전화번호 로그인은 성공함**
3. **즉, 클라이언트 ID 불일치가 문제가 아닐 수도 있음**

## 🤔 다른 가능한 원인들

### 1️⃣ OAuth 동의 화면 설정 문제 (가장 가능성 높음)

**증상**: "The requested action is invalid" 오류

**가능한 원인**:
- OAuth 동의 화면이 "테스트" 상태인데, 테스트 사용자 목록에 현재 사용자가 없음
- OAuth 동의 화면의 승인된 도메인이 현재 도메인을 포함하지 않음
- OAuth 동의 화면의 승인된 리디렉션 URI가 Firebase의 리디렉션 URI를 포함하지 않음

**확인 방법**:
1. Google Cloud Console → APIs & Services → OAuth consent screen
2. "앱 상태" 확인:
   - "테스트" 상태라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가
   - 또는 "프로덕션"으로 변경 (검토 필요)
3. "승인된 도메인" 확인:
   - `localhost` 포함 여부
   - `yago-vibe-spt.firebaseapp.com` 포함 여부
   - `www.yagovibe.com` 포함 여부

### 2️⃣ 승인된 JavaScript 원본 문제

**증상**: OAuth 팝업이 열리지만 인증 실패

**확인 방법**:
1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 클라이언트 ID 클릭
3. "승인된 JavaScript 원본" 확인:
   - `http://localhost:5179`
   - `https://yago-vibe-spt.firebaseapp.com`
   - `https://www.yagovibe.com`
4. "승인된 리디렉션 URI" 확인:
   - Firebase의 리디렉션 URI 포함 여부
   - 일반적으로 `https://[프로젝트ID].firebaseapp.com/__/auth/handler` 형식

### 3️⃣ 브라우저 캐시/쿠키 문제

**증상**: 특정 브라우저에서만 실패

**해결 방법**:
1. 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
2. 쿠키 삭제 (특히 Google 관련 쿠키)
3. 시크릿 모드에서 테스트
4. 다른 브라우저에서 테스트

### 4️⃣ 최근 Google Cloud Console 설정 변경

**증상**: 이전에는 작동했는데 갑자기 실패

**가능한 원인**:
- OAuth 동의 화면 설정 변경
- 승인된 JavaScript 원본 제거
- 승인된 리디렉션 URI 제거
- OAuth 클라이언트 ID 삭제/재생성

### 5️⃣ Firebase Console 설정 변경

**증상**: Firebase Console에서 Google 제공자 설정이 변경됨

**확인 방법**:
1. Firebase Console → Authentication → Sign-in method → Google
2. "웹 클라이언트 ID" 확인
3. "Project support email" 확인
4. "Authorized domains" 확인

## ✅ 확인해야 할 사항

### 1️⃣ 실제 오류 코드 확인

브라우저 콘솔에서 실제 오류 코드와 메시지를 확인:

```javascript
// 브라우저 콘솔에서 확인
// 구글 로그인 버튼 클릭 후 콘솔 확인
```

**예상 오류 코드들**:
- `auth/operation-not-allowed`: Google 로그인이 Firebase Console에서 비활성화됨
- `auth/popup-closed-by-user`: 사용자가 팝업을 닫음
- `auth/popup-blocked`: 팝업이 차단됨
- `auth/unauthorized-domain`: 승인된 도메인이 아님
- `auth/invalid-action`: OAuth 동의 화면 설정 문제

### 2️⃣ OAuth 동의 화면 확인

1. **Google Cloud Console → APIs & Services → OAuth consent screen**
2. **앱 상태 확인**:
   - "테스트" 상태라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가
   - 또는 "프로덕션"으로 변경 (검토 필요)
3. **승인된 도메인 확인**:
   - `localhost` 포함 여부
   - `yago-vibe-spt.firebaseapp.com` 포함 여부
   - `www.yagovibe.com` 포함 여부

### 3️⃣ 승인된 JavaScript 원본 확인

1. **Google Cloud Console → APIs & Services → Credentials**
2. **OAuth 2.0 클라이언트 ID 클릭**
3. **"승인된 JavaScript 원본" 확인**:
   - `http://localhost:5179`
   - `https://yago-vibe-spt.firebaseapp.com`
   - `https://www.yagovibe.com`
4. **"승인된 리디렉션 URI" 확인**:
   - Firebase의 리디렉션 URI 포함 여부

## 🎯 다음 단계

1. **브라우저 콘솔에서 실제 오류 코드 확인**
2. **OAuth 동의 화면 설정 확인**
3. **승인된 JavaScript 원본 확인**
4. **브라우저 캐시/쿠키 삭제 후 재시도**

클라이언트 ID 불일치가 문제가 아니라면, 위 항목들을 확인해야 합니다.

