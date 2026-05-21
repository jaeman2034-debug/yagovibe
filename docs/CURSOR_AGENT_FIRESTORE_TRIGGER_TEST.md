# Cursor Agent 지시문 — Firestore Trigger 테스트

아래 블록 **그대로 복사해서 Cursor Agent 채팅에 붙여넣기** 하면 됩니다.

**주의:** 야고 프로젝트 실제 경로에 맞춰 수정해 두었습니다.
- `onEventAttendScore`: `teams/{teamId}/events/{eventId}` **onUpdate**
- `onNoticeScore`: `teams/{teamId}/notices/{noticeId}` **onCreate**

---

## 지시문 (복붙용)

```
Firebase Functions emulator is running correctly.

Current status:
✔ TypeScript build succeeded
✔ firebase emulators:start succeeded
✔ Functions loaded successfully
✔ Firestore emulator connected

Firestore trigger functions to verify:
- onEventAttendScore (teams/{teamId}/events/{eventId} onUpdate)
- onNoticeScore (teams/{teamId}/notices/{noticeId} onCreate)

If trigger execution is not appearing in logs, perform the following.

1️⃣ Verify Firestore trigger paths (do NOT change to wrong path)

onEventAttendScore must be:
  .document("teams/{teamId}/events/{eventId}")
  .onUpdate(...)

onNoticeScore must be:
  .document("teams/{teamId}/notices/{noticeId}")
  .onCreate(...)

Open functions/src/team/onEventAttendScore.ts and functions/src/team/onNoticeScore.ts.
Confirm paths and trigger type (onUpdate vs onCreate) match above. Fix only if they differ.

2️⃣ Add or confirm debug logging

In onEventAttendScore (onUpdate handler), ensure a log runs, e.g.:
  logger.info("🎟️ [onEventAttendScore] 이벤트 업데이트 감지:", { teamId, eventId });

In onNoticeScore (onCreate handler), ensure a log runs, e.g.:
  logger.info("📌 [onNoticeScore] 공지 생성 감지:", { teamId, noticeId, authorId: noticeData?.authorId });

If logger is not visible in emulator logs, add console.log as fallback for debugging.

3️⃣ Verify exports in index.ts

Open functions/src/index.ts. Confirm:
  export { onEventAttendScore } from "./team/onEventAttendScore";
  export { onNoticeScore } from "./team/onNoticeScore";

If missing, add them.

4️⃣ Rebuild and restart

Run:
  cd functions && npm run build

Fix any TypeScript errors. Then:
  firebase emulators:start --only functions,firestore

5️⃣ Trigger test steps

Test onNoticeScore (onCreate):
- In Firestore Emulator UI, create document:
  Collection: teams → document team_test_1 → subcollection notices → document notice_1
- Fields e.g.: authorId "user1", title "Test notice"
- Save. Check Functions logs for "[onNoticeScore] 공지 생성 감지".

Test onEventAttendScore (onUpdate):
- Create document: teams → team_test_1 → subcollection events → document event_1
- Fields e.g.: attendees [] (array)
- Then UPDATE the document: set attendees to ["user1"]
- Check Functions logs for "[onEventAttendScore] 이벤트 업데이트 감지".

6️⃣ Final goal

✔ Firestore trigger executes (onCreate for notices, onUpdate for events)
✔ Log output appears in Functions logs
✔ No runtime errors
```

---

## 요약

| 트리거 | 경로 | 트리거 타입 | 테스트 방법 |
|--------|------|-------------|-------------|
| onNoticeScore | `teams/{teamId}/notices/{noticeId}` | **onCreate** | notices 서브컬렉션에 새 문서 생성 |
| onEventAttendScore | `teams/{teamId}/events/{eventId}` | **onUpdate** | events 문서 생성 후 attendees 등 필드 **수정** |

Cursor Agent가 경로를 잘못 바꾸지 않도록 지시문에 **정확한 경로와 onUpdate/onCreate**를 명시해 두었습니다.
