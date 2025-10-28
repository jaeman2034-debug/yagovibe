# 🔔 FCM 푸시 알림 + 실시간 대시보드 설정 가이드

## 📋 개요

이 가이드는 YAGO VIBE의 FCM(Firebase Cloud Messaging) 푸시 알림과 실시간 대시보드 자동 갱신 기능을 설정하는 방법을 설명합니다.

## 🎯 주요 기능

1. **푸시 알림**: 리포트 생성 시 관리자에게 즉시 푸시 알림 발송
2. **실시간 대시보드**: Firestore 실시간 구독으로 대시보드 자동 갱신
3. **토픽 구독**: 관리자만 "admins" 토픽에 구독하여 리포트 알림 수신

## 📝 사전 준비 (한 번만)

### 1. VAPID 키 생성

1. Firebase Console 접속: https://console.firebase.google.com
2. 프로젝트 선택
3. 왼쪽 메뉴 > **"Cloud Messaging"** 클릭
4. **"Web Push 인증서"** 섹션에서 **"키 생성"** 클릭
5. 생성된 VAPID 키 복사

### 2. 환경 변수 설정

`.env` 또는 `.env.local` 파일에 추가:

```env
VITE_FIREBASE_VAPID_KEY=생성한_VAPID_키_붙여넣기
```

### 3. Service Worker 설정

`public/firebase-messaging-sw.js` 파일의 Firebase 설정을 실제 프로젝트 값으로 교체:

```javascript
firebase.initializeApp({
    apiKey: "실제_API_KEY",
    authDomain: "실제_AUTH_DOMAIN",
    projectId: "실제_PROJECT_ID",
    storageBucket: "실제_STORAGE_BUCKET",
    messagingSenderId: "실제_MESSAGING_SENDER_ID",
    appId: "실제_APP_ID",
});
```

## 🔧 구현된 기능

### 1. 클라이언트: FCM 초기화 및 토큰 저장

**파일**: `src/lib/firebase.ts`

- `messagingPromise`: FCM 초기화
- `ensureFcmToken(userId)`: 토큰 확보 및 Firestore 저장
- `attachOnMessage(handler)`: 포그라운드 메시지 수신

**파일**: `src/context/AuthProvider.tsx`

- 로그인 시 자동으로 FCM 토큰 확보
- 관리자 계정인 경우 "admins" 토픽에 자동 구독

### 2. Functions: 요약 스냅샷 저장 + 푸시 발송

**파일**: `functions/src/insightChartReportJob.ts`

리포트 생성 후 자동으로:

1. **요약 스냅샷 저장** (`reportSummaries/latest`)
   ```typescript
   await db.collection("reportSummaries").doc("latest").set({ ... });
   ```

2. **FCM 푸시 발송** (`admins` 토픽)
   ```typescript
   await messaging.send({ topic: "admins", ... });
   ```

### 3. 관리자 토픽 구독 함수

**파일**: `functions/src/topicSubscribe.ts`

- HTTPS Callable 함수: `subscribeAdminTopic`
- 관리자 권한 확인 후 토픽 구독

### 4. 대시보드: 실시간 구독

**파일**: `src/pages/AdminTeamTrends.tsx`

- `onSnapshot`으로 `reportSummaries/latest` 실시간 구독
- 최신 리포트가 생성되면 자동으로 배너 업데이트

## ✅ 체크리스트

### 환경 설정

- [ ] VAPID 키 생성 및 `.env`에 추가
- [ ] `public/firebase-messaging-sw.js` Firebase 설정 교체
- [ ] Functions 배포 (`firebase deploy --only functions`)

### 테스트

- [ ] 로그인 후 브라우저 콘솔에서 "✅ FCM 토큰 확보 완료" 확인
- [ ] 브라우저 알림 권한 허용 확인
- [ ] 관리자 계정에서 토픽 구독 확인 (콘솔: "✅ 관리자 토픽 구독 완료")
- [ ] `reportSummaries/latest` 문서에 데이터 저장 확인
- [ ] 리포트 생성 후 푸시 알림 수신 확인
- [ ] 대시보드 실시간 배너 갱신 확인

### 문제 해결

#### 푸시 알림이 오지 않을 때

1. **브라우저 알림 권한 확인**
   - Chrome: 설정 > 개인정보 및 보안 > 사이트 설정 > 알림
   - Safari: Safari > 환경설정 > 웹사이트 > 알림

2. **VAPID 키 확인**
   - `.env`의 `VITE_FIREBASE_VAPID_KEY`가 올바른지 확인
   - Firebase Console의 VAPID 키와 일치하는지 확인

3. **Service Worker 확인**
   - `http://localhost:5178/firebase-messaging-sw.js` 접속하여 파일이 로드되는지 확인
   - 브라우저 개발자 도구 > Application > Service Workers에서 등록 여부 확인

4. **토픽 구독 확인**
   - Firebase Console > Cloud Messaging > "admins" 토픽에 토큰이 등록되었는지 확인
   - 또는 Functions 로그에서 "관리자 토픽 구독 완료" 메시지 확인

#### 실시간 대시보드가 갱신되지 않을 때

1. **Firestore 규칙 확인**
   ```javascript
   match /reportSummaries/{document} {
     allow read: if request.auth != null && 
       (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
        || get(/databases/$(database)/documents/users/$(request.auth.uid)).data.email in ['admin@yagovibe.com']);
   }
   ```

2. **브라우저 콘솔 확인**
   - "📊 최신 리포트 요약 업데이트:" 메시지 확인
   - Firestore 구독 오류 메시지 확인

3. **Functions 로그 확인**
   - `firebase functions:log`에서 "✅ 리포트 요약 스냅샷 저장 완료" 메시지 확인

## 🚀 배포

1. **Functions 배포**
   ```bash
   cd functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions:generateInsightChartReport,functions:subscribeAdminTopic
   ```

2. **클라이언트 빌드 및 배포**
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

## 📱 사용 방법

### 관리자 사용자

1. 관리자 계정으로 로그인
2. 브라우저 알림 권한 허용
3. 자동으로 FCM 토큰 확보 및 토픽 구독 완료
4. 매월 1일 오전 9시 리포트 생성 시 자동으로 푸시 알림 수신
5. 대시보드(`/admin/team-trends`)에서 실시간으로 최신 리포트 확인

### 개발자

1. Functions에서 리포트 생성 함수 수동 실행 테스트:
   ```bash
   firebase functions:shell
   generateInsightChartReport()
   ```

2. Firestore에서 `reportSummaries/latest` 문서 확인

3. FCM 푸시 테스트:
   ```bash
   # Firebase Console > Cloud Messaging > 테스트 메시지 전송
   # 토픽: "admins"
   ```

## 🔍 모니터링

- **Functions 로그**: `firebase functions:log`
- **Firestore 데이터**: Firebase Console > Firestore Database
- **FCM 토픽**: Firebase Console > Cloud Messaging > 토픽
- **브라우저 콘솔**: FCM 토큰 및 메시지 수신 로그

## 📚 참고 자료

- [Firebase Cloud Messaging 문서](https://firebase.google.com/docs/cloud-messaging)
- [Web Push 알림 가이드](https://web.dev/push-notifications-overview/)
- [Service Worker 가이드](https://developers.google.com/web/fundamentals/primers/service-workers)

---

**완료! 이제 리포트 생성 시 관리자에게 즉시 푸시 알림이 발송되고, 대시보드가 실시간으로 갱신됩니다.** 🎉

