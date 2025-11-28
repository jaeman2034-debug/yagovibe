# 🔍 구글 로그인 오류 심층 디버깅

## ❌ 오류 메시지
```
auth/requests-from-referer-https://yago-vibe-spt.firebaseapp.com-are-blocked.
```

## ✅ 확인된 설정 (모두 정상)
- Firebase Console - Authorized domains: `yago-vibe-spt.firebaseapp.com` 포함됨 ✅
- Google Cloud Console - OAuth 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com` ✅
- 승인된 JavaScript 원본: `https://yago-vibe-spt.firebaseapp.com` 포함됨 ✅
- 승인된 리디렉션 URI: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler` 포함됨 ✅

## 🤔 그런데도 오류가 발생하는 이유

### 가능한 원인 1: Firebase Console의 Google 제공자 설정
**가장 가능성 높음!**

Firebase Console → Authentication → Sign-in method → Google에서:
- "웹 클라이언트 ID" 필드에 **다른 클라이언트 ID**가 설정되어 있을 수 있음
- 또는 **빈 값**일 수 있음
- 또는 **잘못된 클라이언트 ID**가 설정되어 있을 수 있음

**확인 방법:**
1. Firebase Console → Authentication → Sign-in method → Google
2. "웹 클라이언트 ID" 필드 확인
3. 값이 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 **완전히 일치**하는지 확인
4. 다르거나 비어있다면 수정:
   - `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com` 입력
   - 저장

### 가능한 원인 2: OAuth 동의 화면 설정
Google Cloud Console → APIs & Services → OAuth consent screen:
- "승인된 도메인"에 `yago-vibe-spt.firebaseapp.com` 포함 여부 확인
- 앱 상태가 "테스트"라면 → "테스트 사용자" 목록에 현재 사용자 이메일 추가

### 가능한 원인 3: 여러 OAuth 클라이언트 ID 존재
Google Cloud Console에 여러 OAuth 클라이언트 ID가 있을 수 있음:
- Firebase가 잘못된 클라이언트 ID를 사용하고 있을 수 있음
- 올바른 클라이언트 ID를 확인하고 Firebase Console에 설정

### 가능한 원인 4: 설정 적용 시간
- Google Cloud Console에서 "설정이 적용되는 데 5분에서 몇 시간이 걸릴 수 있습니다"라고 명시됨
- 방금 설정을 변경했다면 시간이 필요할 수 있음

### 가능한 원인 5: 브라우저 캐시/쿠키
- 브라우저가 이전 설정을 캐시하고 있을 수 있음
- Google 관련 쿠키가 문제를 일으킬 수 있음

## 🎯 즉시 시도할 해결 방법

### 방법 1: Firebase Console의 Google 제공자 재설정
1. Firebase Console → Authentication → Sign-in method → Google
2. **비활성화** 클릭
3. 잠시 후 다시 **활성화** 클릭
4. "웹 클라이언트 ID" 필드에 다음 값 입력:
   - `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
5. "저장" 클릭
6. 브라우저 완전히 닫았다가 다시 열기
7. 시크릿 모드에서 테스트

### 방법 2: OAuth 클라이언트 ID 재생성
1. Google Cloud Console → APIs & Services → Credentials
2. 기존 OAuth 클라이언트 ID 삭제 (또는 새로 생성)
3. 새 OAuth 클라이언트 ID 생성:
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 JavaScript 원본: `https://yago-vibe-spt.firebaseapp.com`
   - 승인된 리디렉션 URI: `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
4. 생성된 클라이언트 ID를 Firebase Console에 설정

### 방법 3: 브라우저 완전 초기화
1. 브라우저 완전히 닫기
2. 브라우저 캐시/쿠키 삭제 (Ctrl+Shift+Delete)
3. Google 관련 쿠키 모두 삭제
4. 브라우저 다시 열기
5. 시크릿 모드에서 테스트

## 📝 최종 확인 체크리스트

- [ ] Firebase Console → Authentication → Sign-in method → Google
- [ ] "웹 클라이언트 ID"가 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 **완전히 일치**
- [ ] Google Cloud Console → OAuth consent screen → "승인된 도메인" 확인
- [ ] 브라우저 캐시/쿠키 삭제 후 재시도
- [ ] 시크릿 모드에서 테스트

## 🆘 여전히 안 된다면

1. **Firebase Console의 Google 제공자를 비활성화했다가 다시 활성화**
2. **OAuth 클라이언트 ID를 새로 생성**
3. **Firebase 지원팀에 문의**

