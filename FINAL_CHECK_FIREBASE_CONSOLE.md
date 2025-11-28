# 🔍 최종 확인: Firebase Console의 Google 제공자 설정

## ✅ 이미 확인된 설정 (모두 정상)

### Firebase Console - Authorized domains
- ✅ `yago-vibe-spt.firebaseapp.com` 포함됨

### Google Cloud Console - OAuth 클라이언트 ID
- ✅ 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- ✅ "승인된 JavaScript 원본"에 `https://yago-vibe-spt.firebaseapp.com` 포함됨
- ✅ "승인된 리디렉션 URI"에 `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨

## 🎯 가장 중요한 확인 사항

### Firebase Console - Google 제공자 설정

**확인 위치:**
- Firebase Console → Authentication → Sign-in method → Google

**확인 사항:**
1. "웹 클라이언트 ID" 필드에 어떤 값이 설정되어 있는지 확인
2. Google Cloud Console의 클라이언트 ID와 **완전히 일치**하는지 확인:
   - Google Cloud Console: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - Firebase Console의 "웹 클라이언트 ID"도 동일해야 함

**만약 다르다면:**
1. Firebase Console → Authentication → Sign-in method → Google
2. "웹 클라이언트 ID" 필드에 다음 값 입력:
   - `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
3. "저장" 클릭
4. 브라우저 새로고침 (Ctrl+Shift+R)
5. 구글 로그인 재시도

## 🔍 다른 가능한 원인들

### 1️⃣ OAuth 동의 화면 설정
- Google Cloud Console → APIs & Services → OAuth consent screen
- "승인된 도메인"에 `yago-vibe-spt.firebaseapp.com` 포함 여부 확인
- 앱 상태가 "테스트"라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가

### 2️⃣ 설정 적용 시간
- Google Cloud Console에서 "설정이 적용되는 데 5분에서 몇 시간이 걸릴 수 있습니다"라고 명시됨
- 방금 설정을 변경했다면 시간이 필요할 수 있음

### 3️⃣ 브라우저 캐시/쿠키
- 브라우저 캐시 삭제 (Ctrl+Shift+Delete)
- Google 관련 쿠키 삭제
- 브라우저 완전히 닫았다가 다시 열기
- 시크릿 모드에서 테스트

## 📝 확인 체크리스트

- [ ] Firebase Console → Authentication → Sign-in method → Google
- [ ] "웹 클라이언트 ID"가 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 **완전히 일치**
- [ ] Google Cloud Console → OAuth consent screen → "승인된 도메인" 확인
- [ ] 브라우저 캐시/쿠키 삭제 후 재시도

