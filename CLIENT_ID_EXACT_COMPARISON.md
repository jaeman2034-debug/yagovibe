# 🔍 클라이언트 ID 정확한 비교

## ❌ 클라이언트 ID 불일치 확인

### Firebase Console의 웹 클라이언트 ID
```
126699415285-4v86c8e1o426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

### Google Cloud Console의 OAuth 클라이언트 ID
```
126699415285-4v86c8e10426on56f2q8ruqo7rssrclh.apps.googleusercontent.com
```

## 🔍 정확한 차이점

**중간 부분 비교:**

Firebase: `4v86c8e1o426on56f2q8ruqo7rssrclh`
```
4v86c8e 1o426 on56f2q8ruqo7rssrclh
        ↑↑↑↑↑
        문자1, 문자o, 숫자426
```

Google Cloud: `4v86c8e10426on56f2q8ruqo7rssrclh`
```
4v86c8e 10426 on56f2q8ruqo7rssrclh
        ↑↑↑↑↑
        숫자1, 숫자0, 숫자426
```

**차이점:**
- Firebase: `1o426` (문자 `1`, 문자 `o`, 숫자 `426`)
- Google Cloud: `10426` (숫자 `1`, 숫자 `0`, 숫자 `426`)

## ❌ 결론: 동일하지 않습니다!

이것이 "The requested action is invalid" 오류의 원인입니다.

## ✅ 해결 방법

Firebase Console의 "웹 클라이언트 ID"를 Google Cloud Console의 클라이언트 ID로 수정해야 합니다.

