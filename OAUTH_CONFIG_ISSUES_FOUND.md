# 🚨 OAuth 설정 문제 발견!

## ❌ 발견된 문제들

### 1️⃣ 클라이언트 ID 불일치 (가능성)

**Google Cloud Console:**
```
126699415285-4v86c8e10426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

**Firebase Console (예상):**
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

**차이점:**
- Google Cloud: `4v86c8e10426on56f2q8ruqo7rssrclh` (숫자 `10426`)
- Firebase: `4v86c8e1o426on56f2q8ruqo7rssrclh` (문자 `1o426`)

⚠️ **이것이 "The requested action is invalid" 오류의 원인일 가능성이 높습니다!**

### 2️⃣ 리디렉션 URI 슬래시 불일치 ⚠️⚠️⚠️

**Google Cloud Console에 설정된 URI:**
```
https://yago-vibe-spt.firebaseapp.com/_/auth/handler  ❌ (슬래시 1개)
http://localhost:5173/_/auth/handler                 ❌ (슬래시 1개)
```

**필요한 URI:**
```
https://yago-vibe-spt.firebaseapp.com/__/auth/handler  ✅ (슬래시 2개)
http://localhost:5173/__/auth/handler                  ✅ (슬래시 2개)
```

**차이점:**
- 현재: `_/auth/handler` (언더스코어 1개)
- 필요: `__/auth/handler` (언더스코어 2개)

## ✅ 해결 방법

### 1️⃣ 클라이언트 ID 확인 및 수정

1. **Firebase Console → Authentication → Sign-in method → Google**
2. **웹 클라이언트 ID** 확인
3. Google Cloud Console의 클라이언트 ID와 **완전히 일치**하는지 확인
4. 일치하지 않으면 Firebase Console에 Google Cloud Console의 클라이언트 ID 입력
5. 저장

### 2️⃣ 리디렉션 URI 수정 (중요!)

1. **Google Cloud Console → APIs & Services → Credentials**
2. OAuth 2.0 클라이언트 ID 클릭
3. **"승인된 리디렉션 URI"** 섹션에서 다음 URI 수정:

   **기존 (잘못된):**
   ```
   https://yago-vibe-spt.firebaseapp.com/_/auth/handler
   http://localhost:5173/_/auth/handler
   ```

   **수정 (올바른):**
   ```
   https://yago-vibe-spt.firebaseapp.com/__/auth/handler
   http://localhost:5173/__/auth/handler
   ```

4. **저장** 클릭

### 3️⃣ 추가로 확인할 URI

다음 URI도 있는지 확인하고, 없으면 추가:

```
https://yago-vibe-spt.web.app/__/auth/handler
```

## 🎯 우선순위

1. **리디렉션 URI 슬래시 수정** (가장 중요!)
2. **클라이언트 ID 일치 확인**
3. **브라우저 캐시 삭제 후 재시도**

## 📝 수정 후 확인

1. Google Cloud Console에서 리디렉션 URI 수정
2. Firebase Console에서 클라이언트 ID 확인
3. 브라우저 새로고침 (Ctrl+Shift+R)
4. Google 로그인 재시도

