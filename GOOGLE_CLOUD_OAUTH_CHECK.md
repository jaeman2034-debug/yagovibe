# 🔍 Google Cloud Console OAuth 클라이언트 ID 확인 가이드

## 📋 확인 절차

### 1️⃣ Google Cloud Console 접속

1. https://console.cloud.google.com 접속
2. 프로젝트 선택: **`yago-vibe-spt`**
3. 왼쪽 메뉴에서 **APIs & Services** → **Credentials** 클릭

### 2️⃣ OAuth 2.0 클라이언트 ID 확인

**확인해야 할 값:**
- 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- 클라이언트 유형: **웹 애플리케이션**

### 3️⃣ 승인된 리디렉션 URI 확인

다음 URI들이 **반드시** 포함되어 있어야 함:

```
https://yago-vibe-spt.firebaseapp.com/__/auth/handler
http://localhost:5173
https://yago-vibe-spt.web.app/__/auth/handler
```

### 4️⃣ Firebase Console에서 확인

1. Firebase Console → Authentication → Sign-in method → **Google** 클릭
2. **웹 클라이언트 ID** 확인
3. 값이 `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`와 **완전히 일치**해야 함

## ⚠️ 중요 사항

1. **클라이언트 ID는 완전히 동일해야 함**
   - Google Cloud Console의 OAuth 클라이언트 ID
   - Firebase Console의 웹 클라이언트 ID
   - 위 두 값이 **1자도 틀리면 안 됨**

2. **리디렉션 URI는 정확히 일치해야 함**
   - 슬래시(`/`) 포함
   - 프로토콜(`http://` 또는 `https://`) 포함
   - 도메인 정확히 일치

3. **프로젝트 지원 이메일 설정**
   - Firebase Console → Authentication → Settings
   - "프로젝트 지원 이메일"이 올바르게 설정되어 있어야 함

## 🔧 문제 해결

### 만약 클라이언트 ID가 다르다면:

1. **Google Cloud Console에서 새 OAuth 클라이언트 생성**
   - APIs & Services → Credentials → + CREATE CREDENTIALS → OAuth client ID
   - 애플리케이션 유형: 웹 애플리케이션
   - 승인된 리디렉션 URI 추가:
     - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
     - `http://localhost:5173`

2. **Firebase Console에 새 클라이언트 ID 입력**
   - Authentication → Sign-in method → Google
   - 웹 클라이언트 ID에 새로 생성한 클라이언트 ID 입력
   - 저장

### 만약 리디렉션 URI가 없다면:

1. Google Cloud Console → APIs & Services → Credentials
2. OAuth 2.0 클라이언트 ID 클릭
3. "승인된 리디렉션 URI"에 위 URI들 추가
4. 저장

## 📸 확인 필요

다음 화면들을 캡처해주시면 정확히 확인해드리겠습니다:

1. **Firebase Console → Authentication → Sign-in method → Google** 화면
   - 웹 클라이언트 ID
   - 웹 클라이언트 Secret (마스킹되어 있어도 됨)

2. **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 클라이언트 ID** 화면
   - 클라이언트 ID
   - 승인된 리디렉션 URI 목록

