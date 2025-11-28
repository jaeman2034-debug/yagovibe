# 🧪 테스트 모드 설정 완벽 가이드

## ✅ 테스트 모드란?

테스트 모드 = 실서비스 배포가 아니라, 개발용 앱을 실제 기기에 설치해서 테스트하는 모드

### 포함된 기능

| 기능 | 상태 |
|------|------|
| 🔥 Firebase Auth → 테스트 가능 | ✅ |
| 🔥 FCM 푸시 알림 → 실제 기기에서 테스트 | ✅ |
| 🔥 Capacitor 앱 → Android / iOS 기기에 설치 | ✅ |
| ❌ 스토어 배포 | ❌ |
| ❌ 실사용자 유입 | ❌ |

즉 테스트용 앱을 기기에 설치해서 푸시 / 로그인 / 네비게이션을 바로 확인할 수 있는 모드입니다.

---

## 🚀 1단계 — Firebase Auth를 "개발 모드"로 사용하도록 설정

이미 배포 URL + 도메인 SSL 완료된 상태이므로 테스트 환경은 다음 설정만 필요합니다.

### Firebase Console → Authentication → Settings → Authorized domains

다음 4개가 반드시 있어야 합니다:

- ✅ `localhost`
- ✅ `localhost:5173`
- ✅ `yagovibe.com`
- ✅ `www.yagovibe.com`

👉 이미 설정되어 있으므로 따로 수정할 필요 없습니다.

---

## 🚀 2단계 — Firebase Firestore 보안 규칙을 테스트 모드로 전환

### 테스트 모드 규칙 파일

`firestore.rules.test` 파일이 생성되었습니다. 이 파일을 사용하려면:

```bash
# 테스트 모드 규칙 배포
firebase deploy --only firestore:rules --project your-project-id
```

또는 Firebase Console에서 직접 수정:

**Firebase Console → Firestore → Rules**

```javascript
// TEST MODE — Development only
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 로그인 한 사용자만 데이터 읽고/쓰기 허용
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### ⚠️ 중요

- ✔ 개발 테스트에서 사용
- ✘ 이 상태로 실서비스는 절대 X
- 나중에 프로덕션용 규칙으로 변경 필요

---

## 🚀 3단계 — Capacitor 앱을 테스트 모드로 빌드

### A. 웹 빌드

```bash
npm run build
```

빌드 결과가 `dist/` 폴더에 생성됨

### B. Capacitor sync

```bash
npx cap sync
```

이걸 하면:
- 새 build 파일을 네이티브 앱(Android, iOS)에 적용
- `capacitor.config.ts` 기반으로 WebView 로딩

---

## 🚀 4단계 — Android 테스트 모드 실행

```bash
npx cap open android
```

열리면:
1. 상단 메뉴: **Run → "Run app"**
2. USB 연결된 스마트폰 선택
3. 앱이 설치되면서 바로 실행됨

👉 이 상태가 바로 **테스트 모드**입니다.
👉 스토어에 배포되지 않은 "개발 전용 앱" 상태

---

## 🚀 5단계 — iOS 테스트 모드 실행

```bash
npx cap open ios
```

Xcode 열리면:
1. 상단 타겟: 실제 연결된 iPhone 선택
2. **▶ Run** 실행

iOS 앱도 동일하게 개발 테스트 상태로 실행됩니다.

---

## 🚀 6단계 — 테스트 모드에서 테스트할 기능 체크리스트

### ✔ 로그인 테스트

- [ ] 구글 로그인 성공 여부
- [ ] 이메일 로그인 성공 여부
- [ ] 전화번호 로그인 성공 여부

### ✔ 자동 로그인 유지

- [ ] 앱 재실행해도 세션 유지되는지
- [ ] `auth.currentUser` 정상 유지되는지

### ✔ FCM 푸시 토큰 저장

- [ ] Firestore → `users/{uid}/devices/{deviceId}` 확인
- [ ] 토큰이 제대로 저장되었는지 확인

### ✔ 푸시 알림 테스트

1. Node에서:
   ```bash
   node scripts/sendToUser.js
   ```

2. 핸드폰에서:
   - [ ] 알림이 바로 오는지
   - [ ] 클릭하면 원하는 페이지로 이동하는지

---

## 🚀 7단계 — 테스트 모드에서만 사용하는 옵션 (선택사항)

앱에서 자동 로그인/로그아웃/토큰 삭제 등 디버그 버튼을 넣고 싶으면:

- `/debug`
- `/test-panel`
- `/dev-tools`
- `/dev-settings`

이런 페이지 따로 만들어서:

- FCM 토큰 강제 갱신
- 쿠키 초기화
- Auth 강제 로그아웃
- 라우터 이동 테스트
- API 테스트

가능하게 만들 수 있습니다.

---

## 📋 실행 순서 요약

```bash
# 1. 웹 빌드
npm run build

# 2. Capacitor sync
npx cap sync

# 3. Android 테스트
npx cap open android
# → Run → Run app

# 또는 iOS 테스트
npx cap open ios
# → Run 버튼 클릭
```

---

## 🎯 테스트 체크리스트

### 앱 실행 후 확인

- [ ] 로그인 화면 정상 표시
- [ ] 로그인 성공
- [ ] `/sports-hub` 화면 이동
- [ ] Firestore에 FCM 토큰 저장 확인

### 푸시 알림 테스트

- [ ] `node scripts/sendToUser.js` 실행
- [ ] 핸드폰에 알림 도착
- [ ] 알림 클릭 시 원하는 페이지로 이동

---

## 🧠 천재 결론

이제 네 앱은:

✅ Firebase 로그인  
✅ Push 알림 등록/저장  
✅ Firestore에서 유저별 기기관리  
✅ 알림 클릭 라우팅  
✅ Android/iOS에서 앱 테스트 가능  

상태로 완전히 **테스트 모드 전환**이 완료되었습니다! 🎉

---

## 🔥 지금 바로 해야 할 것

```bash
# 1. 빌드 (완료 ✅)
npm run build

# 2. Capacitor sync (완료 ✅)
npx cap sync

# 3. Android 또는 iOS 실행
npx cap open android  # 또는 ios

# 4. 스마트폰에서 실행해보기
```

---

## ⚠️ 주의사항

1. **Firestore 규칙**: 테스트 모드 규칙은 개발용입니다. 실서비스 배포 전에 프로덕션 규칙으로 변경하세요.

2. **서비스 계정 키**: `serviceAccountKey.json`은 절대 Git에 올리지 마세요. (이미 `.gitignore`에 추가됨)

3. **테스트 UID**: `scripts/sendToUser.js`에서 `TEST_UID`를 실제 사용자 UID로 변경해야 합니다.

---

## 🎉 완료!

이제 실제 기기에서 모든 기능을 테스트할 수 있습니다!

