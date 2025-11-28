# 🚨 클라이언트 ID 불일치 발견!

## ❌ 문제 발견

### Firebase Console의 웹 클라이언트 ID
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

### Google Cloud Console의 OAuth 클라이언트 ID
```
126699415285-4v86c8e10426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

## 🔍 차이점 분석

**중간 부분 비교:**
- Firebase: `4v86c8e1o426on56f2q8ruqo7rssrclh` (문자 `1o426`)
- Google Cloud: `4v86c8e10426on56f2q8ruqo7rssrclh` (숫자 `10426`)

**정확한 차이:**
- Firebase: `...e1o426...` (문자 `1`, 문자 `o`, 숫자 `426`)
- Google Cloud: `...e10426...` (숫자 `1`, 숫자 `0`, 숫자 `426`)

## 🎯 이것이 "The requested action is invalid" 오류의 원인입니다!

Firebase Console의 클라이언트 ID와 Google Cloud Console의 클라이언트 ID가 일치하지 않아서 발생하는 오류입니다.

## ✅ 해결 방법

### 1️⃣ Firebase Console에서 클라이언트 ID 수정

1. **Firebase Console → Authentication → Sign-in method → Google** 클릭
2. **"웹 클라이언트 ID"** 필드에 다음 값 입력:
   ```
   126699415285-4v86c8e10426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
   ```
   (Google Cloud Console의 클라이언트 ID와 동일하게)
3. **저장** 클릭

### 2️⃣ 클라이언트 Secret 확인

1. Google Cloud Console에서 클라이언트 Secret 확인
2. Firebase Console의 "웹 클라이언트 보안 비밀번호"와 일치하는지 확인
3. 일치하지 않으면 Firebase Console에 Google Cloud Console의 Secret 입력
4. 저장

### 3️⃣ 수정 후 확인

1. 브라우저 새로고침 (Ctrl+Shift+R)
2. Google 로그인 재시도
3. 오류가 해결되었는지 확인

## ⚠️ 중요

- 클라이언트 ID는 **1자도 틀리면 안 됩니다**
- Google Cloud Console의 클라이언트 ID를 **정확히** 복사하여 Firebase Console에 입력해야 합니다
- 저장 후 변경사항이 적용되는데 몇 분 걸릴 수 있습니다

