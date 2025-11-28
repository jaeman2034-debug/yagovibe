# 🔍 Firebase API 키 확인 가이드

## ⚠️ 중요 발견!

현재 `.env.local` 파일의 `VITE_FIREBASE_API_KEY`가 Google Maps API 키와 동일합니다:
- `VITE_FIREBASE_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`
- `VITE_GOOGLE_MAPS_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY`

**이것이 문제입니다!** Firebase API 키와 Google Maps API 키는 **서로 다른 키**여야 합니다.

## 🔑 Firebase API 키 vs Google Maps API 키

### Firebase API 키
- **용도**: Firebase Authentication, Firestore, Storage 등 Firebase 서비스 사용
- **위치**: Firebase Console > 프로젝트 설정 > 일반 > 내 앱 > 웹 앱
- **형식**: `AIzaSy...` (Google Maps API 키와 비슷하지만 다른 키)

### Google Maps API 키
- **용도**: Google Maps JavaScript API 사용
- **위치**: Google Cloud Console > API 및 서비스 > 사용자 인증 정보
- **형식**: `AIzaSy...` (Firebase API 키와 비슷하지만 다른 키)

## ✅ 해결 방법

### Step 1: Firebase Console에서 실제 Firebase API 키 확인

1. **Firebase Console 접속**
   - https://console.firebase.google.com
   - 프로젝트 선택 (`yago-vibe-spt`)

2. **프로젝트 설정 열기**
   - 왼쪽 상단 ⚙️ 아이콘 클릭
   - **"프로젝트 설정"** 클릭

3. **웹 앱 설정 확인**
   - 아래로 스크롤하여 **"내 앱"** 섹션 확인
   - 웹 앱(🌐) 아이콘 클릭
   - 또는 **"Firebase SDK snippet"** 탭 선택

4. **Firebase API 키 복사**
   ```javascript
   // Firebase SDK snippet에서 다음과 같은 값을 찾을 수 있습니다:
   const firebaseConfig = {
     apiKey: "AIzaSy실제_Firebase_API_키",  // ← 이 값!
     authDomain: "yago-vibe-spt.firebaseapp.com",
     projectId: "yago-vibe-spt",
     storageBucket: "yago-vibe-spt.appspot.com",
     messagingSenderId: "126699415285",
     appId: "1:126699415285:web:1ea23395fa0e238dafc7bc",
     measurementId: "G-E0X8G1HTTQ"
   };
   ```

### Step 2: .env.local 파일 업데이트

`.env.local` 파일을 열고 `VITE_FIREBASE_API_KEY`를 Firebase Console에서 복사한 **실제 Firebase API 키**로 변경:

```env
# 🔥 Firebase 기본 설정
VITE_FIREBASE_API_KEY=AIzaSy실제_Firebase_API_키_여기에_붙여넣기
VITE_FIREBASE_AUTH_DOMAIN=yago-vibe-spt.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=yago-vibe-spt
VITE_FIREBASE_STORAGE_BUCKET=yago-vibe-spt.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=126699415285
VITE_FIREBASE_APP_ID=1:126699415285:web:1ea23395fa0e238dafc7bc
VITE_FIREBASE_MEASUREMENT_ID=G-E0X8G1HTTQ
VITE_FIREBASE_VAPID_KEY=BBq4syaG4toS6RjeBlb4SW9sGTDxBsJILjvSiSBHAiFAhspsFHKU

# 🗺️ Google Maps API 키 (별도 키!)
VITE_GOOGLE_MAPS_API_KEY=AIzaSyCNxoZLo5si4EvLqw1eLIUgjf3MzMHyxDY
```

### Step 3: 개발 서버 재시작

`.env.local` 파일을 수정한 후 **반드시** 개발 서버를 재시작하세요:

```bash
# 서버 중지 (Ctrl + C)
npm run dev
```

### Step 4: 브라우저 캐시 삭제

1. **개발자 도구 열기** (F12)
2. **Application 탭** 선택
3. **Storage** > **Clear site data** 클릭
4. **Service Workers** > **Unregister** 클릭
5. **하드 리프레시** (Ctrl + Shift + R)

## 🔍 확인 방법

브라우저 콘솔에서 다음 명령어로 확인:

```javascript
// Firebase API 키 확인 (일부만 표시)
console.log('Firebase API Key:', import.meta.env.VITE_FIREBASE_API_KEY?.substring(0, 10) + '...');
console.log('Google Maps API Key:', import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.substring(0, 10) + '...');

// 두 키가 다르면 정상!
```

## 📝 체크리스트

- [ ] Firebase Console에서 실제 Firebase API 키 확인
- [ ] `.env.local` 파일의 `VITE_FIREBASE_API_KEY` 업데이트
- [ ] `VITE_GOOGLE_MAPS_API_KEY`는 그대로 유지 (별도 키)
- [ ] 개발 서버 재시작
- [ ] 브라우저 캐시 삭제
- [ ] 로그인 테스트

## ⚠️ 주의사항

- Firebase API 키와 Google Maps API 키는 **서로 다른 키**입니다
- 같은 키를 사용하면 Firebase 인증이 실패할 수 있습니다
- Firebase Console에서 가져온 키를 사용해야 합니다

