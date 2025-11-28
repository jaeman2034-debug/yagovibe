# 🔥 Firebase "auth/popup-closed-by-user" 오류 해결

## 🚨 현재 오류

콘솔에 다음 오류가 표시됩니다:
```
FirebaseError: Firebase: Error (auth/popup-closed-by-user).
```

이것은 "The requested action is invalid"와는 다른 오류입니다.

## 📊 오류 원인

`auth/popup-closed-by-user` 오류는 다음과 같은 경우에 발생합니다:

### 1순위: 사용자가 팝업 창을 닫음 (정상적인 경우)

**원인**: Google 로그인 팝업 창이 열렸지만 사용자가 팝업을 닫았을 때 발생

**해결**: 
- 이는 정상적인 동작입니다
- 사용자가 다시 "G 구글" 버튼을 클릭하면 됩니다
- 코드에서 이미 처리되어 있음: "로그인 창이 닫혔습니다. 다시 시도해주세요."

### 2순위: 팝업이 브라우저에 의해 차단됨

**원인**: 브라우저의 팝업 차단 기능이 활성화되어 있음

**해결 방법**:
1. **브라우저 주소창 확인**
   - 주소창 오른쪽에 팝업 차단 아이콘(🚫)이 있는지 확인
   - 클릭하여 팝업 허용

2. **브라우저 설정에서 팝업 허용**
   - Chrome: 설정 > 개인정보 및 보안 > 사이트 설정 > 팝업 및 리디렉션
   - `localhost:5173`에 대해 팝업 허용

### 3순위: OAuth 리디렉션 URI 설정 문제

**원인**: Google Cloud Console에서 승인된 리디렉션 URI가 설정되지 않음

**해결 방법**:
1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **OAuth 동의 화면 설정**
   - **API 및 서비스** > **OAuth 동의 화면**
   - **승인된 리디렉션 URI** 섹션 확인
   - 다음 URI가 추가되어 있는지 확인:
     ```
     http://localhost:5173/__/auth/handler
     https://yago-vibe-spt.firebaseapp.com/__/auth/handler
     https://www.yagovibe.com/__/auth/handler
     ```
   - 없으면 추가

### 4순위: Firebase Console에서 Google 로그인 미활성화

**원인**: Firebase Console에서 Google 로그인이 활성화되지 않음

**해결 방법**:
1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **Authentication 설정**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - **"Sign-in method"** 탭 선택

3. **Google 로그인 활성화**
   - **"Google"** 옵션 클릭
   - **"Enable"** 토글 활성화
   - **"Project support email"** 설정 (필수!)
   - **"Save"** 클릭

## ✅ 즉시 확인할 사항

### 1. 브라우저 팝업 차단 확인
- 주소창에 팝업 차단 아이콘 확인
- 팝업 허용 클릭

### 2. Firebase Console 확인
- Authentication > Sign-in method > Google 활성화 여부
- Project support email 설정 여부

### 3. Google Cloud Console 확인
- OAuth 동의 화면 > 승인된 리디렉션 URI 설정 여부

### 4. 브라우저 캐시 삭제
- F12 > Application > Clear site data
- 하드 리프레시 (Ctrl + Shift + R)

## 🔍 디버깅

브라우저 콘솔에서 확인:

```javascript
// Firebase 설정 확인
console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...');
console.log('Firebase Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
```

## 📝 체크리스트

- [ ] 브라우저 팝업 차단 해제
- [ ] Firebase Console에서 Google 로그인 활성화 확인
- [ ] Project support email 설정 확인
- [ ] Google Cloud Console에서 OAuth 동의 화면 설정 확인
- [ ] 승인된 리디렉션 URI 추가 확인
- [ ] 브라우저 캐시 삭제
- [ ] 하드 리프레시 후 다시 테스트

## ⚠️ 참고

`auth/popup-closed-by-user` 오류는 사용자가 팝업을 닫았을 때 발생하는 정상적인 오류입니다. 하지만 계속 발생한다면 위의 설정을 확인하세요.

