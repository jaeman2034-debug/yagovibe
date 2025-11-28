# 🔍 Google OAuth 클라이언트 ID 확인 절차

## 📋 확인해야 할 값

### 예상되는 클라이언트 ID
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

## 🔍 확인 절차

### 1️⃣ Firebase Console에서 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **Authentication → Sign-in method → Google 클릭**
   - 현재 화면에서 **"G Google"** 제공자를 **클릭**하세요
   - (현재는 목록만 보이고 상세 설정이 안 보임)

3. **확인해야 할 항목**:
   - **웹 클라이언트 ID**: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - **웹 클라이언트 Secret**: (마스킹되어 표시됨)
   - **프로젝트 지원 이메일**: 올바른 이메일 주소

### 2️⃣ Google Cloud Console에서 확인

1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트: `yago-vibe-spt` 선택

2. **APIs & Services → Credentials**
   - 왼쪽 메뉴에서 **APIs & Services** → **Credentials** 클릭

3. **OAuth 2.0 클라이언트 ID 확인**
   - **OAuth 2.0 클라이언트 ID** 섹션에서 웹 애플리케이션 클라이언트 찾기
   - 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - 클릭하여 상세 정보 확인

4. **승인된 리디렉션 URI 확인**
   - 다음 URI들이 **반드시** 포함되어 있어야 함:
     ```
     https://yago-vibe-spt.firebaseapp.com/__/auth/handler
     http://localhost:5173
     https://yago-vibe-spt.web.app/__/auth/handler
     ```

## ⚠️ 중요 체크리스트

### Firebase Console (Authentication → Sign-in method → Google)
- [ ] 웹 클라이언트 ID가 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 **완전히 일치**
- [ ] 웹 클라이언트 Secret이 Google Cloud Console의 Secret과 일치
- [ ] 프로젝트 지원 이메일이 올바르게 설정됨

### Google Cloud Console (APIs & Services → Credentials)
- [ ] OAuth 2.0 클라이언트 ID가 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- [ ] 승인된 리디렉션 URI에 다음이 포함:
  - [ ] `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
  - [ ] `http://localhost:5173`
  - [ ] `https://yago-vibe-spt.web.app/__/auth/handler`

## 🎯 다음 단계

**Firebase Console → Authentication → Sign-in method → Google을 클릭**하여 상세 설정 화면을 보여주세요.

특히 다음 항목이 보이도록 캡처:
1. **웹 클라이언트 ID** 필드
2. **웹 클라이언트 Secret** 필드 (마스킹되어 있어도 됨)
3. **프로젝트 지원 이메일** 필드

그러면 Google Cloud Console의 값과 비교하여 정확히 확인해드리겠습니다!

