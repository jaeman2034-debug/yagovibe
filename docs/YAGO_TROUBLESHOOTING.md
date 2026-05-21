# YAGO VIBE 운영 매뉴얼 (Troubleshooting)

> 서비스 운영 중 발생하는 문제 해결 가이드

---

## 1. Cloud Functions 오류

### 1.1 "User code failed to load"

**증상:** `firebase emulators:start` 시 Functions 로드 실패

**해결:**
```bash
cd functions
npm run build
# TypeScript 에러 확인 후 수정
```

- `initializeApp()` 중복 호출: `index.ts`에서만 초기화, 다른 파일 제거
- import 경로 오류: `firebase-functions/v1` vs `firebase-functions/v2` 확인

### 1.2 Functions 타임아웃

**증상:** 배포 후 함수 실행 60초 이상 시 타임아웃

**해결:**
- 함수 내부에서 불필요한 반복/대기 제거
- `region: "asia-northeast3"` 설정 확인
- 일부 함수만 선별 배포: `firebase deploy --only functions:함수명`

### 1.3 트리거 미실행

**증상:** Firestore 문서 생성/수정해도 트리거 로그 없음

**확인:**
- 경로 일치: `teams/{teamId}`, `teams/{teamId}/events/{eventId}` 등
- 에뮬레이터 사용 중이면 `FIRESTORE_EMULATOR_HOST` 설정
- Firebase Console → Functions → 로그에서 에러 확인

---

## 2. Firestore 오류

### 2.1 permission-denied

**증상:** 클라이언트에서 Firestore 읽기/쓰기 시 `FirebaseError: Missing or insufficient permissions`

**확인:**
- 로그인 여부: `request.auth != null`
- 팀 멤버 여부: `isTeamMember(teamId)` (teams/.../members)
- 작성자 여부: `resource.data.authorId == request.auth.uid`

**참고:** [YAGO_FIRESTORE_RULES.md](./YAGO_FIRESTORE_RULES.md)

### 2.2 인덱스 누락

**증상:** `The query requires an index` 에러

**해결:**
1. 에러 메시지의 링크 클릭 → Firebase Console에서 인덱스 생성
2. 또는 `firebase deploy --only firestore:indexes`

### 2.3 문서 크기 초과

**증상:** `Document size is greater than 1MB`

**해결:** 대용량 데이터는 서브컬렉션이나 Storage 사용으로 분리

---

## 3. Authentication / 로그인 오류

### 3.1 구글 로그인 후 튕김

**증상:** 구글 계정 선택 후 다시 로그인 페이지로 이동

**원인:** `signInWithRedirect` 사용 시 `getRedirectResult` 미호출

**해결:** `signInWithPopup` 사용 (현재 적용됨)

### 3.2 auth/argument-error

**증상:** `auth/argument-error` 또는 도메인 관련 에러

**확인:**
- `authDomain`: `yago-vibe-spt.firebaseapp.com` 사용
- Firebase Console → Authentication → Authorized domains에 현재 도메인 추가
- API Key HTTP 리퍼러 제한: `localhost`, `firebaseapp.com`, `web.app` 포함

### 3.3 팝업 차단

**증상:** "팝업이 차단되었습니다" 메시지

**해결:** 브라우저 주소창 우측 팝업 차단 아이콘에서 해당 사이트 허용

---

## 4. 채팅 지연 / 실패

### 4.1 메시지 전송 실패

**확인:**
- `chatRooms` 문서의 `members` 배열에 전송자 포함 여부
- Firestore Rules: `isChatRoomMember(roomId)` 만족 여부
- `senderId == request.auth.uid` 검증

### 4.2 실시간 구독 끊김

**증상:** 메시지가 실시간으로 안 보임

**확인:**
- `onSnapshot` unsubscribe 타이밍
- 네트워크 불안정 시 재연결 로직
- Firestore 오프라인 영속성 설정

---

## 5. Push 알림 실패

### 5.1 FCM 토큰 미등록

**확인:**
- `users/{uid}/devices/{deviceId}` 문서 생성 여부
- Service Worker 등록: `/firebase-messaging-sw.js`
- `VITE_FCM_VAPID_KEY` 환경 변수 설정

### 5.2 알림 미수신

**확인:**
- 브라우저 알림 권한
- 백그라운드 시 FCM 수신 설정
- Cloud Function `onMessageCreated` 로그 확인

---

## 6. Hosting / 빌드 오류

### 6.1 "허브를 불러올 수 없습니다"

**증상:** 배포 후 특정 페이지 로드 실패

**해결:**
1. `Ctrl + Shift + R` 강력 새로고침
2. `dist/index.html`의 스크립트 경로 확인 (상대 경로 `./`)
3. `firebase.json` rewrites: `"**" → "/index.html"` 확인

### 6.2 빌드 에러

```bash
npm run build
# vite.config.ts base 경로 확인
# 환경 변수 누락 확인
```

---

## 7. 에뮬레이터 이슈

### 7.1 포트 충돌

**증상:** `firebase emulators:start` 실패

**확인:** `firebase.json`의 emulators 포트 (functions: 5001, firestore: 8086 등)

### 7.2 Functions 미로드

**확인:**
```bash
cd functions
npm run build
firebase emulators:start --only functions,firestore
```

---

## 8. "heartbeats undefined" 반복 (무한 루프 느낌)

**증상:** 콘솔에 `heartbeats undefined heartbeatService.ts:93` 메시지가 반복 출력

**원인:** Firebase Analytics 내부 로그. 정상 동작이며, 서비스에는 영향 없음.

**해결:**
- **콘솔 필터:** DevTools Console에서 `heartbeats` 검색 후 필터로 제외
- **localStorage 확인:** `firebase_analytics_debug` 키가 있으면 제거 후 새로고침
- **조용히 두기:** POST_DEPLOYMENT_SETUP.md 기준으로 무시해도 됨 (실제 무한 루프 아님)

---

## 9. 긴급 조치

| 상황 | 조치 |
|------|------|
| Functions 대량 실패 | 해당 함수 비활성화 또는 이전 버전 재배포 |
| Firestore Rules 오류 | `firebase deploy --only firestore:rules` 롤백 |
| Hosting 장애 | Firebase Console → Hosting → 이전 릴리스 복원 |

---

## 10. 관련 문서

| 문서 | 용도 |
|------|------|
| [DEPLOYMENT_TROUBLESHOOTING.md](./DEPLOYMENT_TROUBLESHOOTING.md) | 배포 관련 상세 트러블슈팅 |
| [YAGO_FIRESTORE_RULES.md](./YAGO_FIRESTORE_RULES.md) | Rules 및 권한 |
| [YAGO_PRODUCTION_DEPLOYMENT.md](./YAGO_PRODUCTION_DEPLOYMENT.md) | 배포 가이드 |

---

*운영 담당자 참고용 문서*
