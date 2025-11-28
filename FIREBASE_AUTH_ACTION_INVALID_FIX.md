# 🔥 Firebase 인증 "The requested action is invalid" 오류 해결

## ✅ 확인 완료

Firebase 문서에서 확인한 결과:
- **Firebase API 키**: `AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY` ✅ 올바름
- **프로젝트 ID**: `yago-vibe-spt` ✅ 올바름
- **Auth Domain**: `yago-vibe-spt.firebaseapp.com` ✅ 올바름

**API 키는 올바르게 설정되어 있습니다!**

## 🚨 "The requested action is invalid" 오류 원인

API 키가 올바른데도 이 오류가 발생하는 경우:

### 1순위: Firebase Console에서 Google 로그인 미활성화 (가장 가능성 높음)

**해결 방법**:
1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **Authentication 설정**
   - 왼쪽 메뉴 > **"Authentication"** 클릭
   - **"Sign-in method"** 탭 선택

3. **Google 로그인 활성화**
   - **"Google"** 옵션 찾기
   - 클릭하여 편집
   - **"Enable"** 토글 활성화
   - **"Project support email"** 설정 (필수!)
   - **"Save"** 클릭

### 2순위: OAuth 동의 화면 설정 문제

**해결 방법**:
1. **Google Cloud Console 접속**
   - https://console.cloud.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **OAuth 동의 화면 설정**
   - **API 및 서비스** > **OAuth 동의 화면**
   - 사용자 유형 선택 (외부 또는 내부)
   - 앱 정보 입력:
     - 앱 이름: `YAGO VIBE`
     - 사용자 지원 이메일: 실제 이메일
     - 개발자 연락처 정보: 실제 이메일
   - **저장 후 계속** 클릭

3. **승인된 리디렉션 URI 추가**
   - **승인된 리디렉션 URI** 섹션에서 **"URI 추가"** 클릭
   - 다음 URI 추가:
     ```
     http://localhost:5173/__/auth/handler
     https://yago-vibe-spt.firebaseapp.com/__/auth/handler
     https://www.yagovibe.com/__/auth/handler
     ```
   - **저장** 클릭

### 3순위: 브라우저 캐시 문제

**해결 방법**:
1. **개발자 도구 열기** (F12)
2. **Application 탭** 선택
3. **Storage** > **Clear site data** 클릭
4. **Service Workers** > **Unregister** 클릭
5. **하드 리프레시** (Ctrl + Shift + R)

### 4순위: 개발 서버 재시작

`.env.local` 파일을 확인했으니 개발 서버를 재시작하세요:

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

## 📋 체크리스트

- [ ] Firebase Console에서 Google 로그인 활성화 확인
- [ ] Project support email 설정 확인
- [ ] Google Cloud Console에서 OAuth 동의 화면 설정 확인
- [ ] 승인된 리디렉션 URI 추가 확인
- [ ] 개발 서버 재시작
- [ ] 브라우저 캐시 삭제
- [ ] 하드 리프레시 후 다시 테스트

## 🔍 디버깅

브라우저 콘솔에서 확인:

```javascript
// Firebase 설정 확인
console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...');
console.log('Firebase Auth Domain:', import.meta.env.VITE_FIREBASE_AUTH_DOMAIN);
console.log('Firebase Project ID:', import.meta.env.VITE_FIREBASE_PROJECT_ID);
```

## ⚠️ 가장 가능성 높은 원인

**Firebase Console에서 Google 로그인이 활성화되지 않았거나, Project support email이 설정되지 않았을 가능성이 매우 높습니다!**

Firebase Console > Authentication > Sign-in method > Google에서 확인하세요.

