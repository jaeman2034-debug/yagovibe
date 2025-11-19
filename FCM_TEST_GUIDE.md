# 🔔 FCM 웹 푸시 알림 테스트 가이드

## 📋 개요

Firebase Cloud Messaging (FCM)을 사용하여 브라우저 웹 푸시 알림을 테스트하는 방법입니다.

## 🚀 빠른 시작

### 1. 테스트 페이지 접속

브라우저에서 다음 URL로 접속:
```
http://localhost:5178/fcm-test
```

또는

```
https://localhost:5178/fcm-test
```

### 2. 알림 권한 요청

1. 페이지에서 **"🔔 알림 권한 요청 및 FCM 토큰 획득"** 버튼 클릭
2. 브라우저 알림 권한 팝업이 나타나면 **"허용"** 클릭
3. 콘솔에 FCM 토큰이 출력됩니다

### 3. FCM 토큰 복사

- 페이지에 표시된 FCM 토큰을 **"📋 토큰 복사"** 버튼으로 클립보드에 복사
- 또는 수동으로 토큰을 선택하여 복사

## 🔥 Firebase Console에서 테스트 메시지 보내기

### 단계별 가이드

1. **Firebase Console 접속**
   - https://console.firebase.google.com 접속
   - 프로젝트 선택

2. **Cloud Messaging 메뉴**
   - 왼쪽 메뉴 > **"Engage"** > **"Cloud Messaging"** 클릭

3. **새 알림 보내기**
   - **"새 알림 보내기"** (또는 **"Send test message"**) 버튼 클릭

4. **대상 선택**
   - **"웹 앱"** 또는 **"Single device"** 선택
   - **"FCM 등록 토큰"** 항목에 복사한 토큰 붙여넣기

5. **알림 내용 입력**
   - **제목**: 예) "FCM 테스트 알림"
   - **텍스트**: 예) "이 메시지는 FCM 테스트 메시지입니다."

6. **전송**
   - **"테스트 메시지 보내기"** 또는 **"보내기"** 버튼 클릭

7. **확인**
   - 브라우저 오른쪽 하단에 푸시 알림이 표시되면 성공! 🎉

## 🔧 설정 확인 사항

### Service Worker 등록 확인

1. 브라우저 개발자 도구 열기 (F12)
2. **Application** 탭 선택
3. 왼쪽 메뉴에서 **"Service Workers"** 클릭
4. `/firebase-messaging-sw.js`가 등록되어 있는지 확인

### Firebase 설정 확인

`public/firebase-messaging-sw.js` 파일에서 Firebase 설정 값이 올바른지 확인:

```javascript
firebase.initializeApp({
    apiKey: "실제_API_KEY",
    authDomain: "실제_AUTH_DOMAIN",
    projectId: "실제_PROJECT_ID",
    storageBucket: "실제_STORAGE_BUCKET",
    messagingSenderId: "실제_SENDER_ID",
    appId: "실제_APP_ID",
});
```

### VAPID 키 확인

`.env.local` 파일에 VAPID 키가 설정되어 있는지 확인:

```env
VITE_FIREBASE_VAPID_KEY=<YOUR_VAPID_PUBLIC_KEY>
```

## 🐛 문제 해결

### 알림이 오지 않을 때

1. **브라우저 알림 권한 확인**
   - Chrome: 주소창 왼쪽 자물쇠 아이콘 > 사이트 설정 > 알림
   - Safari: Safari > 환경설정 > 웹사이트 > 알림

2. **Service Worker 확인**
   - 개발자 도구 > Application > Service Workers
   - Service Worker가 등록되어 있는지 확인
   - 등록되지 않았으면 페이지 새로고침

3. **VAPID 키 확인**
   - `.env.local` 파일에 VAPID 키가 올바르게 설정되어 있는지 확인
   - 개발 서버를 재시작했는지 확인

4. **Firebase 설정 확인**
   - `public/firebase-messaging-sw.js`의 Firebase 설정 값이 올바른지 확인
   - Firebase Console의 프로젝트 설정과 일치하는지 확인

5. **브라우저 콘솔 확인**
   - 개발자 도구 > Console 탭
   - 에러 메시지가 있는지 확인

### 토큰을 가져올 수 없을 때

1. **VAPID 키 확인**
   - `.env.local`에 VAPID 키가 설정되어 있는지 확인
   - 개발 서버 재시작

2. **Service Worker 등록 확인**
   - `/firebase-messaging-sw.js` 파일이 `public/` 폴더에 있는지 확인
   - 브라우저에서 직접 접속: `http://localhost:5178/firebase-messaging-sw.js`

3. **HTTPS 사용**
   - 로컬 개발 시 HTTPS가 필요할 수 있음
   - `vite.config.ts`에서 HTTPS 설정 확인

## 📝 테스트 시나리오

### 시나리오 1: 포그라운드 메시지 수신
1. FCM 테스트 페이지를 열어둔 상태에서
2. Firebase Console에서 테스트 메시지 전송
3. 브라우저 알림과 alert 창이 표시되어야 함

### 시나리오 2: 백그라운드 메시지 수신
1. FCM 테스트 페이지를 닫거나 다른 탭으로 전환
2. Firebase Console에서 테스트 메시지 전송
3. 브라우저 오른쪽 하단에 알림이 표시되어야 함

### 시나리오 3: 알림 클릭 시 동작
1. 백그라운드 알림 수신
2. 알림 클릭
3. 앱이 열리거나 지정된 페이지로 이동해야 함

## ✅ 성공 확인

다음과 같은 상황이면 테스트 성공입니다:

- ✅ 브라우저 알림 권한이 "허용" 상태
- ✅ FCM 토큰이 정상적으로 획득됨
- ✅ Firebase Console에서 테스트 메시지 전송 시 알림이 표시됨
- ✅ 포그라운드/백그라운드 모두에서 알림이 정상 작동
- ✅ 알림 클릭 시 의도한 동작이 수행됨

## 📚 관련 파일

- `src/lib/fcm.ts`: FCM 유틸리티 함수
- `src/pages/FcmTestPage.tsx`: FCM 테스트 페이지
- `public/firebase-messaging-sw.js`: Service Worker (백그라운드 알림 처리)
- `src/lib/firebase.ts`: Firebase 초기화 및 FCM 통합
- `src/context/AuthProvider.tsx`: 로그인 시 자동 토큰 획득

## 🎉 다음 단계

테스트가 성공하면:
1. 관리자 대시보드에 FCM 통합 완료
2. 리포트 생성 시 자동 푸시 알림 발송
3. 실시간 대시보드 자동 갱신

---

**이제 FCM 웹 푸시 알림을 완전히 테스트할 수 있습니다!** 🚀

