# 🔍 OAuth 클라이언트 ID 비교 결과

## ✅ Firebase Console에서 확인된 값

### 웹 클라이언트 ID
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercc
```
(화면에서 끝이 잘려 보이지만, 전체 값은 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`일 것으로 예상)

### 웹 클라이언트 보안 비밀번호
- 마스킹되어 있음 (정상)

### 사용 설정
- ✅ 활성화됨

## 🎯 Google Cloud Console 확인 필요

이제 Google Cloud Console에서 다음을 확인해야 합니다:

### 1️⃣ Google Cloud Console 접속

1. https://console.cloud.google.com 접속
2. 프로젝트: **`yago-vibe-spt`** 선택
3. 왼쪽 메뉴: **APIs & Services** → **Credentials**

### 2️⃣ OAuth 2.0 클라이언트 ID 확인

**확인해야 할 항목:**

1. **클라이언트 ID**
   - Firebase Console의 값: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - Google Cloud Console의 값과 **완전히 일치**해야 함

2. **클라이언트 유형**
   - **웹 애플리케이션**이어야 함

3. **승인된 리디렉션 URI**
   - 다음 URI들이 **반드시** 포함되어 있어야 함:
     ```
     https://yago-vibe-spt.firebaseapp.com/__/auth/handler
     http://localhost:5173
     https://yago-vibe-spt.web.app/__/auth/handler
     ```

### 3️⃣ 클라이언트 Secret 확인

- Google Cloud Console의 클라이언트 Secret
- Firebase Console의 "웹 클라이언트 보안 비밀번호"와 **일치**해야 함

## ⚠️ 문제 해결 체크리스트

### 클라이언트 ID 불일치 시:
- [ ] Google Cloud Console에서 OAuth 클라이언트 ID 확인
- [ ] Firebase Console의 웹 클라이언트 ID와 비교
- [ ] 일치하지 않으면 Firebase Console에 올바른 클라이언트 ID 입력
- [ ] 저장

### 리디렉션 URI 누락 시:
- [ ] Google Cloud Console → APIs & Services → Credentials
- [ ] OAuth 2.0 클라이언트 ID 클릭
- [ ] "승인된 리디렉션 URI"에 다음 추가:
  - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
  - `http://localhost:5173`
  - `https://yago-vibe-spt.web.app/__/auth/handler`
- [ ] 저장

### 클라이언트 Secret 불일치 시:
- [ ] Google Cloud Console에서 클라이언트 Secret 확인
- [ ] Firebase Console의 "웹 클라이언트 보안 비밀번호"와 비교
- [ ] 일치하지 않으면 Firebase Console에 올바른 Secret 입력
- [ ] 저장

## 📸 다음 단계

**Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 클라이언트 ID** 화면을 캡처해주세요.

특히 다음 항목이 보이도록 캡처:
- 클라이언트 ID
- 승인된 리디렉션 URI 목록
- 클라이언트 Secret (마스킹되어 있어도 됨)

그러면 두 값을 비교하여 정확히 확인해드리겠습니다!

