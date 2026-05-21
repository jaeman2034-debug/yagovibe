# Cloud Functions 최종 5가지 체크 결과

## 1️⃣ Trigger 타입 확인 — ✅ 정상

**파일:** `functions/src/team/onEventAttendScore.ts`

- **트리거:** `onUpdate` (onCreate 아님)
- **경로:** `teams/{teamId}/events/{eventId}`
- **시그니처:** `(change, context)` 사용
- **내부:** `change.before.data()`, `change.after.data()` 사용

```ts
export const onEventAttendScore = functions.firestore
  .document("teams/{teamId}/events/{eventId}")
  .onUpdate(async (change, context) => {
    const beforeData = change.before.data();
    const afterData = change.after.data();
    // ...
  });
```

→ **조정 없음.**

---

## 2️⃣ Update 조건 (테스트 방법)

onUpdate는 **필드 값이 바뀔 때만** 실행됩니다.

**에뮬레이터 테스트 순서:**

1. 문서 생성: `teams/team_test_1/events/event_1`  
   - 필드 예: `attendees: []`
2. 수정 1: `attendees: ["user1"]` 저장
3. 수정 2: `attendees: ["user1", "user2"]` 저장  
   → **이때** onEventAttendScore 실행됨.

첫 생성만 하고 수정하지 않으면 trigger는 실행되지 않습니다.

---

## 3️⃣ Logger 사용 — ✅ 정상

**onEventAttendScore.ts / onNoticeScore.ts**

- `import * as functions from "firebase-functions/v1"`
- `const logger = functions.logger`
- `logger.info("🎟️ [onEventAttendScore] 이벤트 업데이트 감지:", ...)`

v1에서 `functions.logger` 사용은 정상이며, 에뮬레이터/배포 환경 모두에서 로그에 출력됩니다.  
별도 `firebase-functions/logger` import는 필요 없음.

→ **조정 없음.**

---

## 4️⃣ index.ts 단일 initializeApp — ✅ 정상

**확인 결과:**

- `functions/src/index.ts`: `admin.initializeApp()` **1회만** 호출 (상단, `if (!admin.apps.length)`)
- `functions/src/team/onEventAttendScore.ts`: `initializeApp` 없음
- `functions/src/team/onNoticeScore.ts`: `initializeApp` 없음

→ **중복 초기화 없음.**

---

## 5️⃣ Emulator region — ✅ 문제 없음

함수에 `functions.region("asia-northeast3")` 등이 있어도 에뮬레이터에서는 그대로 동작합니다.  
별도 수정 불필요.

---

## 최종 요약

| # | 항목 | 상태 |
|---|------|------|
| 1 | Trigger 타입 (onUpdate + change/context) | ✅ 정상 |
| 2 | Update 테스트 방법 | 문서 수정 시 실행 확인 |
| 3 | Logger (functions.logger) | ✅ 정상 |
| 4 | index.ts 단일 initializeApp | ✅ 정상 |
| 5 | Emulator region | ✅ 문제 없음 |

**코드 변경 없이 현재 구조로 유지해도 됩니다.**

---

## 로그로 완전 성공 확인하는 방법

1. Firestore 에뮬레이터에서 `teams/team_test_1/events/event_1` 생성
2. `attendees`를 `["user1"]` → `["user1", "user2"]` 로 **수정**
3. Functions 로그에서 다음 메시지 확인:

   ```
   [onEventAttendScore] 이벤트 업데이트 감지
   ```

이 한 번만 확인되면 Cloud Functions 리팩토링은 **완전 성공**으로 봐도 됩니다.
