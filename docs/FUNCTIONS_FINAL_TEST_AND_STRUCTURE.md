# Cloud Functions 최종 테스트 + 구조 정리

## 1. 완전 성공 기준 (4가지)

| # | 항목 | 확인 방법 |
|---|------|-----------|
| 1 | `npm run build` 성공 | `cd functions && npm run build` → exit 0 |
| 2 | `firebase emulators:start` 정상 | 에뮬레이터 프로세스 기동, 포트 리스닝 |
| 3 | **functions loaded** 로그 | 콘솔에 "User code failed to load" 없음, Functions 로드 완료 메시지 |
| 4 | Firestore trigger 정상 실행 | 아래 테스트 1·2 실행 후 Functions 로그에 해당 로그 출력 |

**4개 모두 만족 시 리팩토링 100% 성공으로 봅니다.**

---

## 2. Emulator에서 실제 trigger 테스트

### 테스트 1: onEventAttendScore

**트리거:** `teams/{teamId}/events/{eventId}` 문서 **업데이트** 시 실행 (onUpdate).

**방법 A — Emulator UI**

1. Firestore Emulator UI: `http://127.0.0.1:4000` (또는 설정한 포트)
2. 컬렉션 추가:
   - `teams` → 문서 ID `team_test_1` (또는 기존 teamId)
   - 서브컬렉션 `events` → 문서 ID `event_1`
3. `events/event_1` 문서에 필드 예시:
   - `attendees`: `[]` (배열)
   - 기타 필요한 필드
4. **업데이트**: `attendees`를 `["user_uid_1"]` 등으로 수정 후 저장
5. Functions 로그에서 다음 로그 확인:
   - `[onEventAttendScore] 이벤트 업데이트 감지`

**방법 B — 스크립트 (Node 또는 curl로 Firestore REST)**

- 팀 문서가 있어야 하므로, 먼저 `teams/team_test_1` 생성 후 `teams/team_test_1/events/event_1` 생성/업데이트.

---

### 테스트 2: onNoticeScore

**트리거:** `teams/{teamId}/notices/{noticeId}` 문서 **생성** 시 실행 (onCreate).

**방법 A — Emulator UI**

1. Firestore Emulator UI에서:
   - `teams` → `team_test_1` (또는 기존 teamId)
   - 서브컬렉션 `notices` → 새 문서 ID `notice_1`
2. 필드 예시:
   - `authorId`: `"some_uid"`
   - `title`: `"테스트 공지"`
   - 기타 팀 공지에 필요한 필드
3. 저장(생성) 후 Functions 로그에서:
   - `[onNoticeScore] 공지 생성 감지`

---

### 로그 확인

- 터미널: `firebase emulators:start --only functions` 실행 시 같은 터미널에 Functions 로그 출력
- 또는 Emulator UI → **Functions** 탭 → 로그

**기대 로그 예시**

- 테스트 1: `🎟️ [onEventAttendScore] 이벤트 업데이트 감지: { teamId, eventId }`
- 테스트 2: `📌 [onNoticeScore] 공지 생성 감지: { teamId, noticeId, authorId }`

---

## 3. Cloud Functions 최종 구조 (유지보수용)

규모가 커질 때 자주 생기는 문제 3가지와 대응입니다.

### 3.1 admin.initializeApp() 중복

**원칙:** **한 곳에서만** 호출.

- **권장:** `functions/src/index.ts` 맨 위에서 한 번만 호출 (현재 적용됨).
- **나머지 파일:** `initializeApp()` 호출 제거. 대신 `getFirestore()`, `admin.firestore()` 등만 사용 (이미 앱이 index에서 초기화됨).

**현재 상태:** `index.ts`에서만 초기화함. 다른 파일(createTeam, firebase.ts, integratedPostProcessor가 쓰는 firebase.ts 등)에도 `initializeApp()`이 있으면, **index가 가장 먼저 로드되므로** 중복 호출은 `if (!admin.apps.length)` 로 막을 수는 있으나, 장기적으로는 **공통 모듈 한 곳(firebase.ts 또는 index)** 에만 두고 나머지는 제거하는 것이 안전합니다.

---

### 3.2 functions export 누락

**원칙:** 배포할 함수는 반드시 `index.ts`에서 export.

- 새 함수 추가 시: `index.ts`에 `export { 함수명 } from "./경로";` 추가
- 주석 처리된 export: 배포하지 않으려면 주석 유지, 배포하려면 주석 해제 후 빌드·배포

**현재 활성 export 예시 (일부)**

- team: onTeamCreated, onNoticeCreated, onEventCreated, eventReminder, onMessageScore, onEventAttendScore, onNoticeScore, dailyChatSummary, monthlyReport, startAttendanceCheck, checkInAttendance
- chat: onMessageCreated
- market: onMarketJoinStatusChanged, onChatRoomCreated, onMarketPostCreated, onMarketPostUpdated
- 기타: createTeam, geocodeLocation, syncTeamChatMembers, migrateActivityLogsToActivities

---

### 3.3 index.ts export 구조

**권장 구조 (폴더별 블록)**

```text
// 1. Admin 초기화 (맨 위, 한 번만)
import * as admin from "firebase-admin";
if (!admin.apps.length) admin.initializeApp();

// 2. 팀 / 채팅 / 마켓 등 도메인별로 묶어서 export
// ---- team ----
export { createTeam } from "./createTeam";
export { onTeamCreated } from "./team/onTeamCreated";
export { syncTeamChatMembers } from "./team/syncTeamChatMembers";
export { onNoticeCreated } from "./team/onNoticeCreated";
export { onEventCreated } from "./team/onEventCreated";
export { eventReminder } from "./team/eventReminder";
export { onMessageScore } from "./team/onMessageScore";
export { onEventAttendScore } from "./team/onEventAttendScore";
export { onNoticeScore } from "./team/onNoticeScore";
export { dailyChatSummary } from "./team/dailyChatSummary";
export { monthlyReport } from "./team/monthlyReport";
export { startAttendanceCheck, checkInAttendance } from "./team/onAttendanceCheck";

// ---- chat ----
export { onMessageCreated } from "./chat/onMessageCreated";

// ---- market ----
export { onMarketJoinStatusChanged } from "./market/onMarketJoinStatusChanged";
export { onChatRoomCreated } from "./market/ranking";
export { onMarketPostCreated, onMarketPostUpdated } from "./market/integratedPostProcessor";

// ---- 기타 (callable, migrate 등) ----
export { geocodeLocation } from "./geocodeLocation";
export { migrateActivityLogsToActivities } from "./migrate/activityLogsToActivities";
```

- 새 함수는 해당 도메인 블록에 한 줄 추가하면 **export 누락**을 줄일 수 있습니다.

---

### 3.4 폴더별 역할 (참고)

| 폴더 | 역할 |
|------|------|
| `team/` | 팀 생성, 채팅방, 공지, 이벤트, 출석, 점수, 요약·리포트 |
| `chat/` | 채팅 메시지 푸시 (onMessageCreated) |
| `market/` | 마켓 조인, 랭킹, 게시물 통합 처리 |
| `notifications/` | 알림 (팀 가입, 대회 등) |
| `migrate/` | 일회성 마이그레이션 (activityLogs → activities 등) |
| `api/` | Callable/HTTP API (권한, 예약 등) |

---

## 4. 지금 단계 평가

- **리팩토링 성공률:** 약 90–95%
- **남은 작업:** 위 1~2번처럼 Emulator에서 trigger 런타임 테스트 1~2회 수행 후, 4가지 성공 기준 모두 충족 여부 확인.

이 문서와 [CURSOR_AGENT_FIREBASE_FUNCTIONS_CHECK.md](./CURSOR_AGENT_FIREBASE_FUNCTIONS_CHECK.md) 를 함께 쓰면, Cursor Agent로 **빌드·로드·trigger·구조**까지 한 번에 점검·정리할 수 있습니다.
