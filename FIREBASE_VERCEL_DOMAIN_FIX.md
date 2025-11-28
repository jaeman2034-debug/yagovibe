# 🔥 Firebase Vercel 도메인 인증 오류 해결

## ❌ 오류 메시지
```
FirebaseError: auth/requests-from-referer-https://yagovibe.vercel.app
```

## 📋 원인
Vercel에 배포된 도메인(`https://yagovibe.vercel.app`)이 Firebase Console의 **승인된 도메인** 목록에 추가되지 않아서 발생합니다.

## ✅ 해결 방법

### 1️⃣ Firebase Console에서 승인된 도메인 추가

1. **Firebase Console 접속**
   - https://console.firebase.google.com 접속
   - 프로젝트: **yago-vibe-spt** 선택

2. **Authentication 설정 열기**
   - 왼쪽 메뉴에서 **"Authentication"** 클릭
   - 상단 탭에서 **"Settings"** (설정) 클릭

3. **승인된 도메인 추가**
   - **"승인된 도메인"** (Authorized domains) 섹션 찾기
   - **"도메인 추가"** (Add domain) 버튼 클릭
   - 다음 도메인들을 추가:
     ```
     yagovibe.vercel.app
     www.yagovibe.com
     yagovibe.com
     ```

4. **저장**
   - 각 도메인 추가 후 **"완료"** 클릭

### 2️⃣ 확인할 도메인 목록

다음 도메인들이 모두 승인된 도메인 목록에 있어야 합니다:

- ✅ `localhost` (기본값)
- ✅ `yago-vibe-spt.web.app` (Firebase 기본 도메인)
- ✅ `yago-vibe-spt.firebaseapp.com` (Firebase 기본 도메인)
- ✅ `yagovibe.vercel.app` (Vercel 기본 도메인) ⚠️ **추가 필요**
- ✅ `www.yagovibe.com` (커스텀 도메인) ⚠️ **추가 필요**
- ✅ `yagovibe.com` (커스텀 도메인) ⚠️ **추가 필요**

### 3️⃣ 변경 사항 적용

- Firebase Console에서 도메인을 추가하면 **즉시 적용**됩니다
- 브라우저를 새로고침하거나 다시 로그인 시도

### 4️⃣ 테스트

1. `https://yagovibe.vercel.app/login` 접속
2. 구글 로그인 버튼 클릭
3. 오류 없이 로그인 화면이 표시되는지 확인

## 🔍 참고

- Firebase Console에서 승인된 도메인은 **최대 50개**까지 추가 가능
- 도메인은 **정확히 일치**해야 합니다 (예: `yagovibe.vercel.app` ≠ `www.yagovibe.vercel.app`)
- 프로토콜(`https://`)은 포함하지 않습니다

