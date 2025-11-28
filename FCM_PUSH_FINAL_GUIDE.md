# 🔥 FCM 푸시 알림 시스템 최종 완성 가이드

## ✅ 전체 플로우 요약

1. **앱에서 로그인된 유저의 FCM 토큰을 Firestore에 저장**
2. **서버(또는 로컬 Node 스크립트)에서 특정 uid 대상 푸시 발송**
3. **기기에서 알림 수신 + 알림 클릭 시 특정 페이지로 이동**

---

## 📱 1. 앱에서 FCM 토큰 저장 (최종 버전)

### 1-1. saveDeviceToken.ts

```typescript
// src/lib/saveDeviceToken.ts
import { doc, setDoc } from "firebase/firestore";
import { db, auth } from "./firebase";
import { v4 as uuidv4 } from "uuid";

export async function saveDeviceToken(token: string, platform: string) {
  const user = auth.currentUser;
  if (!user) {
    console.log("❌ 로그인한 사용자 없음 → FCM 토큰 저장 스킵");
    return;
  }

  // 기기 고유 ID (앱 재실행/재로그인 시에도 동일 디바이스로 인식)
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem("device_id", deviceId);
  }

  const ref = doc(db, `users/${user.uid}/devices/${deviceId}`);

  await setDoc(
    ref,
    {
      token,
      platform,
      updatedAt: new Date(),
    },
    { merge: true }
  );

  console.log(`🔥 FCM token saved: uid=${user.uid}, deviceId=${deviceId}`);
}
```

### 1-2. pushNotifications.ts (Capacitor용 최종)

```typescript
// src/lib/pushNotifications.ts
import { PushNotifications } from "@capacitor/push-notifications";
import { Device } from "@capacitor/device";
import { saveDeviceToken } from "./saveDeviceToken";

export async function registerPushNotifications() {
  const info = await Device.getInfo();

  // 웹에서는 스킵
  if (info.platform === "web") {
    console.log("🌐 Web platform → push registration skipped");
    return;
  }

  // 권한 확인 및 요청
  let permStatus = await PushNotifications.checkPermissions();
  if (permStatus.receive === "prompt") {
    permStatus = await PushNotifications.requestPermissions();
  }

  if (permStatus.receive !== "granted") {
    console.warn("❌ Push permission not granted");
    return;
  }

  // 푸시 등록
  await PushNotifications.register();

  // 토큰 수신
  PushNotifications.addListener("registration", async (token) => {
    console.log("🔥 Device FCM Token:", token.value);
    await saveDeviceToken(token.value, info.platform);
  });

  PushNotifications.addListener("registrationError", (err) => {
    console.error("❌ Push registration error:", err);
  });

  // 알림 수신 로그
  PushNotifications.addListener("pushNotificationReceived", (notification) => {
    console.log("📩 Push received:", notification);
  });

  // 알림 클릭 시 라우팅
  PushNotifications.addListener(
    "pushNotificationActionPerformed",
    (action) => {
      console.log("🖱 Push clicked:", action);
      const route = action.notification.data?.route;
      if (route) {
        window.location.href = route;
      } else {
        window.location.href = "/sports-hub";
      }
    }
  );
}
```

### 1-3. 로그인 이후 자동으로 푸시 등록

**AuthProvider.tsx**에서 이미 구현됨:

```typescript
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (u) => {
    if (u) {
      // 로그인 감지 → FCM 등록
      registerPushNotifications().catch(console.error);
    }
  });
  return () => unsub();
}, []);
```

✅ **여기까지 하면:**
- 로그인 후 기기에서 FCM 토큰 생성 → Firestore `users/{uid}/devices/{deviceId}`에 저장

---

## 🔍 2. Firestore에서 토큰 제대로 저장됐는지 확인

### 확인 방법:

1. **Firebase Console → Firestore Database**
2. `users` 컬렉션 → 특정 `uid` 문서 클릭
3. `devices` 서브컬렉션 존재 확인
4. 그 안에 문서(랜덤 `deviceId`) 열면:

```json
{
  "token": "fcm_aaaaaaaaaaa",
  "platform": "android",
  "updatedAt": "2025-01-20T12:33:01Z"
}
```

이렇게 보이면 절반은 이미 성공한 것이다! 🎉

---

## 🚀 3. 서버(또는 로컬)에서 특정 유저에게 푸시 보내는 Node 스크립트

### 3-1. 준비: 서비스 계정 키(JSON) 발급

1. **Google Cloud Console → IAM & Admin → 서비스 계정**
2. Firebase Admin용 서비스 계정 선택(또는 새로 만듦)
3. **키 → 키 추가 → JSON → 다운로드**
4. 파일 이름: `serviceAccountKey.json`
5. **⚠️ 절대로 Git에 올리면 안 됨!** (`.gitignore`에 추가)

### 3-2. Node 스크립트: sendToUser.js

**파일 위치:** `scripts/sendToUser.js`

```javascript
// scripts/sendToUser.js
const admin = require("firebase-admin");
const path = require("path");

const serviceAccount = require(path.join(__dirname, "..", "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function sendNotificationToUser(uid, payload) {
  const devicesRef = db.collection(`users/${uid}/devices`);
  const snapshot = await devicesRef.get();

  if (snapshot.empty) {
    console.log("❌ 이 유저에 대한 등록된 디바이스 없음:", uid);
    return;
  }

  const tokens = [];
  snapshot.forEach((doc) => {
    const data = doc.data();
    if (data.token) {
      tokens.push(data.token);
    }
  });

  console.log("📲 발송 대상 토큰:", tokens);

  const message = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data || {},
  };

  const response = await admin.messaging().sendMulticast(message);
  console.log("✅ 발송 결과:", response.successCount, "성공 /", response.failureCount, "실패");

  if (response.failureCount > 0) {
    console.log("⚠ 실패 상세:", response.responses.filter(r => !r.success));
  }
}

// === 실제 호출 부분 ===
const TEST_UID = "여기에_테스트_사용자_uid_입력";

sendNotificationToUser(TEST_UID, {
  title: "YAGO VIBE 테스트 알림",
  body: "지금 클릭하면 시설 상세 페이지로 이동합니다.",
  data: {
    route: "/facility/123",
  },
})
  .then(() => {
    console.log("🎉 알림 전송 시도 완료");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 알림 전송 오류:", err);
    process.exit(1);
  });
```

### 3-3. 실행 방법

```bash
# 1. 패키지 설치 (한 번만)
npm install firebase-admin

# 2. serviceAccountKey.json을 프로젝트 루트에 배치

# 3. scripts/sendToUser.js에서 TEST_UID를 실제 UID로 변경

# 4. 실행
node scripts/sendToUser.js
```

핸드폰에 푸시가 오면 여기까지 성공! 🎉

---

## 🎯 4. 알림 클릭 시 특정 페이지로 이동 (라우팅 최종 버전)

이미 `pushNotifications.ts`에 구현되어 있습니다:

```typescript
PushNotifications.addListener(
  "pushNotificationActionPerformed",
  (action) => {
    const route = action.notification.data?.route;
    if (route) {
      window.location.href = route;
    } else {
      window.location.href = "/sports-hub";
    }
  }
);
```

**Node 스크립트에서:**
```javascript
data: {
  route: "/facility/123",
}
```

이렇게 넣어 보내면, 알림 클릭 → 앱 열림 → `/facility/123`으로 이동.

**React Router에 해당 라우트가 있어야 함:**
```typescript
// App.tsx
<Route path="/facility/:id" element={<FacilityDetailPage />} />
```

---

## ✅ 5. 실제 기기에서 "완성 테스트" 체크리스트

### A. 준비

```bash
npm run build
npx cap sync
npx cap open android  # 또는 ios
```

실제 기기에 앱 설치 (USB 연결 or TestFlight 등)

### B. 앱에서 테스트

1. 앱 실행
2. `https://yagovibe.com/login` 이 뜨는지 확인
3. 이메일 또는 구글 로그인으로 로그인
4. 로그인 후 `/sports-hub` 화면이 보이면 OK
5. **Firestore에서 확인:**
   - `users/{uid}/devices` 컬렉션에 FCM 토큰 저장됐는지 확인

### C. 푸시 알림 테스트

1. 로컬에서 `node scripts/sendToUser.js` 실행
2. 핸드폰에 푸시 도착하는지 확인
3. 알림 탭
4. 앱이 열리면서 `/facility/123`으로 이동하면 성공 ✅

### D. 오류가 난다면?

#### 푸시가 아예 안 오면:
- FCM 키, `google-services.json` 설정, 토큰 값 확인
- Firebase Console > Cloud Messaging에서 직접 발송 테스트

#### 푸시는 오는데 클릭해도 안 이동하면:
- `pushNotificationActionPerformed` 로그 확인
- `notification.data.route` 값 콘솔 찍어서 확인
- 라우터에 해당 경로 있는지 확인

---

## 🎉 마무리

이제 여기까지 구현/적용하면:

✅ 앱에서 로그인  
✅ 자동 로그인  
✅ FCM 토큰 Firestore 저장  
✅ 특정 유저에게만 푸시 발송  
✅ 알림 클릭 시 원하는 페이지로 이동  

까지 **실제 서비스 수준으로 완성된 상태**입니다! 🚀

