# 🔍 최종 OAuth 설정 확인 체크리스트

## ✅ 확인 완료

- ✅ 리디렉션 URI: 모두 `__/auth/handler` (언더스코어 2개)로 올바르게 설정됨
- ✅ 환경 변수: 모두 올바르게 설정됨
- ✅ 코드: 정상적으로 작동 중

## 🔍 남은 확인 사항

### 1️⃣ 클라이언트 ID 일치 확인 (가장 중요!)

**Firebase Console:**
1. Authentication → Sign-in method → Google
2. "웹 클라이언트 ID" 필드 확인
3. 값: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com` (예상)

**Google Cloud Console:**
- 클라이언트 ID: `126699415285-4v86c8e10426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`

**⚠️ 차이점 발견 가능성:**
- Google Cloud: `4v86c8e10426on56f2q8ruqo7rssrclh` (숫자 `10426`)
- Firebase: `4v86c8e1o426on56f2q8ruqo7rssrclh` (문자 `1o426`)

**해결 방법:**
- Firebase Console의 "웹 클라이언트 ID"를 Google Cloud Console의 클라이언트 ID와 **완전히 동일**하게 수정
- 저장

### 2️⃣ 클라이언트 Secret 일치 확인

**Firebase Console:**
- "웹 클라이언트 보안 비밀번호" 확인

**Google Cloud Console:**
- 클라이언트 Secret 확인

**해결 방법:**
- 두 값이 일치하지 않으면 Firebase Console에 Google Cloud Console의 Secret 입력
- 저장

### 3️⃣ 프로젝트 지원 이메일 확인

**Firebase Console:**
1. Authentication → Settings
2. "프로젝트 지원 이메일" 확인
3. 올바른 이메일 주소가 설정되어 있는지 확인

### 4️⃣ OAuth 동의 화면 확인

**Google Cloud Console:**
1. APIs & Services → OAuth consent screen
2. 앱 상태 확인:
   - "테스트" 상태인지 "프로덕션" 상태인지
   - 테스트 상태면 승인된 사용자 목록 확인
3. 승인된 도메인 확인:
   - `yago-vibe-spt.firebaseapp.com`
   - `localhost`

## 🎯 우선순위

1. **클라이언트 ID 일치 확인 및 수정** (가장 중요!)
2. **클라이언트 Secret 일치 확인**
3. **프로젝트 지원 이메일 확인**
4. **OAuth 동의 화면 확인**

## 📸 확인 필요

**Firebase Console → Authentication → Sign-in method → Google** 화면에서:
- 웹 클라이언트 ID (전체 값)
- 웹 클라이언트 보안 비밀번호 (마스킹되어 있어도 됨)

이 값들을 Google Cloud Console의 값과 비교해주세요.

## 💡 빠른 해결 방법

만약 클라이언트 ID가 다르다면:

1. **Google Cloud Console에서 클라이언트 ID 복사**
2. **Firebase Console → Authentication → Sign-in method → Google**
3. **"웹 클라이언트 ID" 필드에 붙여넣기**
4. **저장**
5. **브라우저 새로고침 (Ctrl+Shift+R)**
6. **Google 로그인 재시도**

