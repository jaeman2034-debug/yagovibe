# ❌ Firebase Console 클라이언트 ID 오류 확인

## 🔍 정확한 비교

### ❌ Firebase Console (현재 - 틀림)
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```
**문제**: `4v86c8e1o426on56f2q8ruqo7rssrclh` (문자 `1o426`)

### ✅ Google Cloud Console (올바른 값)
```
126699415285-4v86c8e10426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```
**올바름**: `4v86c8e10426on56f2q8ruqo7rssrclh` (숫자 `10426`)

## 🔍 차이점 상세

**위치별 비교:**

```
Firebase:    4v86c8e 1o426 on56f2q8ruqo7rssrclh
                      ↑↑↑↑↑
                      문자1, 문자o, 숫자426

Google Cloud: 4v86c8e 10426 on56f2q8ruqo7rssrclh
                      ↑↑↑↑↑
                      숫자1, 숫자0, 숫자426
```

**정확한 차이:**
- Firebase: `1o426` (문자 `1`, 문자 `o`, 숫자 `426`)
- Google Cloud: `10426` (숫자 `1`, 숫자 `0`, 숫자 `426`)

## ❌ 결론

**네, Firebase Console의 값이 틀렸습니다!**

Google Cloud Console의 값이 올바른 값이고, Firebase Console에 그 값을 입력해야 합니다.

## ✅ 해결 방법

1. **Firebase Console → Authentication → Sign-in method → Google** 클릭
2. **"웹 클라이언트 ID"** 필드를 다음 값으로 수정:
   ```
   126699415285-4v86c8e10426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
   ```
   (Google Cloud Console의 클라이언트 ID와 동일하게)
3. **저장** 클릭
4. 브라우저 새로고침 (Ctrl+Shift+R)
5. Google 로그인 재시도

## 🎯 이것이 "The requested action is invalid" 오류의 원인입니다!

Firebase Console의 클라이언트 ID를 Google Cloud Console의 값으로 수정하면 해결됩니다.

