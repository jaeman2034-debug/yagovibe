# 🔥 Firebase 설정 가이드

## 📋 문제: Firebase API 키 오류 해결

`auth/api-key-not-valid` 오류는 `.env.local` 파일의 Firebase 설정이 플레이스홀더 값이거나 누락되어 있을 때 발생합니다.

## ✅ 해결 방법

### 1️⃣ Firebase Console에서 설정 값 가져오기

1. **Firebase Console 접속**
   - https://console.firebase.google.com 접속
   - 프로젝트 선택

2. **프로젝트 설정 열기**
   - 왼쪽 상단 ⚙️ 아이콘 클릭
   - **"프로젝트 설정"** 클릭

3. **웹 앱 설정 확인**
   - 아래로 스크롤하여 **"내 앱"** 섹션 확인
   - 웹 앱(🌐) 아이콘 클릭
   - 또는 **"Firebase SDK snippet"** 탭 선택

4. **설정 값 복사**
   ```javascript
   // Firebase SDK snippet에서 다음과 같은 값들을 찾을 수 있습니다:
   apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
   authDomain: "your-project.firebaseapp.com",
   projectId: "your-project-id",
   storageBucket: "your-project.appspot.com",
   messagingSenderId: "123456789012",
   appId: "1:123456789012:web:abcdef1234567890",
   measurementId: "G-XXXXXXXXXX"
   ```

### 2️⃣ .env.local 파일 업데이트

프로젝트 루트의 `.env.local` 파일을 열고 아래와 같이 실제 값으로 교체하세요:

```env
# 🔥 Firebase 구성
VITE_FIREBASE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef1234567890
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# 📬 Firebase Cloud Messaging VAPID 키
# Firebase Console > Cloud Messaging > Web Push 인증서에서 확인
VITE_FIREBASE_VAPID_KEY=<YOUR_VAPID_PUBLIC_KEY>
```

**⚠️ 중요:**
- `=` 뒤에 공백이 없어야 합니다
- 값 주변에 따옴표가 없어야 합니다
- 모든 값이 실제 Firebase Console의 값과 일치해야 합니다

### 3️⃣ 자동 복원 스크립트 사용

`.env.local` 파일이 손상되었거나 삭제된 경우:

```bash
npm run generate-env
```

이 명령어는 템플릿 파일을 생성합니다. 이후 Firebase Console에서 가져온 실제 값으로 교체해야 합니다.

### 4️⃣ 개발 서버 재시작

`.env.local` 파일을 수정한 후 **반드시** 개발 서버를 재시작해야 합니다:

```bash
# 서버 중지 (Ctrl + C)
# 서버 재시작
npm run dev
```

### 5️⃣ 브라우저 콘솔에서 확인

서버 재시작 후 브라우저 콘솔에서 다음 명령어로 확인:

```javascript
console.log(import.meta.env.VITE_FIREBASE_API_KEY);
```

- `undefined`가 출력되면 → 환경 변수가 인식되지 않음 (서버 재시작 필요)
- 플레이스홀더 값이 출력되면 → `.env.local` 파일에 실제 값으로 교체 필요
- 실제 API 키가 출력되면 → 정상 설정됨 ✅

## 🔍 설정 검증

코드에 Firebase 설정 검증 로직이 포함되어 있습니다. 브라우저 콘솔에서 다음을 확인하세요:

- ✅ **"✅ Firebase 설정 검증 완료"** → 정상
- ❌ **"❌ Firebase 설정 오류"** → `.env.local` 파일 확인 필요

## 🐛 문제 해결

### 오류: "auth/api-key-not-valid"

**원인:**
- `.env.local` 파일에 Firebase API 키가 없거나 잘못됨
- 플레이스홀더 값(`your-firebase-api-key`)이 그대로 사용됨

**해결:**
1. Firebase Console에서 실제 API 키 확인
2. `.env.local` 파일 업데이트
3. 개발 서버 재시작

### 오류: "Firebase 설정이 올바르지 않습니다"

**원인:**
- 환경 변수 중 하나 이상이 누락되거나 플레이스홀더 값

**해결:**
1. 브라우저 콘솔의 오류 메시지 확인
2. 누락된 변수 또는 플레이스홀더 값 확인
3. Firebase Console에서 실제 값 가져와서 `.env.local` 업데이트
4. 개발 서버 재시작

### 환경 변수가 인식되지 않음

**원인:**
- `.env.local` 파일 수정 후 서버를 재시작하지 않음
- 파일이 잘못된 위치에 있음 (프로젝트 루트에 있어야 함)

**해결:**
1. `.env.local` 파일이 프로젝트 루트에 있는지 확인
2. 개발 서버 완전히 중지 후 재시작
3. 브라우저 캐시 클리어

## 📝 체크리스트

설정 완료 확인:

- [ ] Firebase Console에서 프로젝트 설정 확인
- [ ] `.env.local` 파일에 실제 Firebase 설정 값 입력
- [ ] VAPID 키 설정 확인 (이미 설정됨)
- [ ] 개발 서버 재시작
- [ ] 브라우저 콘솔에서 `import.meta.env.VITE_FIREBASE_API_KEY` 확인
- [ ] 콘솔에 "✅ Firebase 설정 검증 완료" 메시지 확인
- [ ] 게스트 로그인 테스트 성공

## 🔗 관련 문서

- `GUEST_LOGIN_FIX.md`: 게스트 로그인 문제 해결 가이드
- `README_ENV_SETUP.md`: 환경 변수 설정 가이드
- `FCM_PUSH_SETUP.md`: FCM 푸시 알림 설정 가이드

---

**Firebase 설정이 완료되면 게스트 로그인이 정상적으로 작동합니다!** 🔥

