# 🔥 Firebase Console Google 제공자 설정 확인 가이드

## 🚨 현재 상황

콘솔 로그에서 확인된 값:
- ✅ `authDomain: 'yago-vibe-spt.firebaseapp.com'`
- ✅ `projectId: 'yago-vibe-spt'`
- ✅ 코드는 정상적으로 작동 중

하지만 여전히 **"The requested action is invalid"** 오류 발생

## 🎯 원인: Firebase Console 설정 불일치

이 오류는 **99% Firebase Console의 Google 제공자 설정 문제**입니다.

## 📝 확인 절차

### 1️⃣ Firebase Console 접속

1. https://console.firebase.google.com 접속
2. 프로젝트 **`yago-vibe-spt`** 선택

### 2️⃣ Authentication → Sign-in method → Google

1. 왼쪽 메뉴에서 **Authentication** 클릭
2. 상단 탭에서 **Sign-in method** 클릭
3. **Google** 제공자 클릭 (또는 + 버튼으로 추가)

### 3️⃣ 확인해야 할 항목

#### ✅ 웹 클라이언트 ID
- 값: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
- 이 값이 정확히 일치해야 함

#### ✅ 웹 클라이언트 Secret
- Google Cloud Console의 Secret과 일치해야 함

#### ✅ 프로젝트 지원 이메일
- 올바른 이메일 주소가 설정되어 있어야 함

### 4️⃣ Google Cloud Console 확인

1. https://console.cloud.google.com 접속
2. 프로젝트 **`yago-vibe-spt`** 선택
3. **APIs & Services** → **Credentials** 이동
4. OAuth 2.0 클라이언트 ID 확인:
   - 클라이언트 ID: `126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com`
   - 승인된 리디렉션 URI에 다음이 포함되어 있어야 함:
     - `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
     - `http://localhost:5173` (개발용)

## 🔧 해결 방법

### 방법 1: Google 제공자 재설정

1. Firebase Console → Authentication → Sign-in method → Google
2. **비활성화** 클릭
3. 잠시 후 다시 **활성화** 클릭
4. Google Cloud Console의 OAuth 클라이언트 ID를 다시 입력
5. 저장

### 방법 2: OAuth 클라이언트 ID 재생성

1. Google Cloud Console → APIs & Services → Credentials
2. 기존 OAuth 2.0 클라이언트 ID 삭제
3. 새로 생성
4. Firebase Console에 새 클라이언트 ID 입력

### 방법 3: 리디렉션 URI 확인

Google Cloud Console에서 다음 URI가 승인되어 있는지 확인:
- `https://yago-vibe-spt.firebaseapp.com/__/auth/handler`
- `http://localhost:5173`
- `https://yago-vibe-spt.web.app/__/auth/handler`

## ⚠️ 중요 사항

1. **웹 클라이언트 ID**는 Firebase Console과 Google Cloud Console에서 **완전히 동일**해야 함
2. **리디렉션 URI**는 정확히 일치해야 함 (슬래시, 프로토콜 포함)
3. **프로젝트 지원 이메일**이 설정되어 있어야 함

## 📸 확인 필요

Firebase Console → Authentication → Sign-in method → Google 화면을 캡처해주시면 정확히 확인해드리겠습니다.

특히 다음 항목이 보이도록 캡처:
- 웹 클라이언트 ID
- 웹 클라이언트 Secret (마스킹되어 있어도 됨)
- 프로젝트 지원 이메일

