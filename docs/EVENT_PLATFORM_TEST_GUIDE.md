# 🔥 Event Platform 데이터 흐름 테스트 가이드

## 목표

Event Platform의 전체 자동 파이프라인이 정상 동작하는지 검증합니다.

```
Event 생성 → Entry 승인 → Match 생성 → Match 완료
     ↓              ↓            ↓            ↓
Division 생성  Summary 생성  (대기)    team_games 생성
                                        teams.stats 업데이트
                                        rankings 업데이트
                                        summaries 업데이트
```

---

## 테스트 시나리오

### 1️⃣ Event 생성 테스트

**Firestore Console에서 실행:**

1. `events` 컬렉션에 새 문서 생성

```json
{
  "name": "2026 노원구 협회장기 테스트",
  "type": "tournament",
  "sportType": "football",
  "regionCode": "KR_SEOUL_NOWON",
  "seasonId": "2026",
  "organizerName": "노원구축구협회",
  "sponsorName": null,
  "startDate": "2026-05-01T00:00:00Z",
  "endDate": "2026-05-10T23:59:59Z",
  "status": "scheduled",
  "isPublic": true,
  "description": "테스트 이벤트",
  "createdBy": "test_user_123",
  "createdAt": "2026-01-15T00:00:00Z"
}
```

**확인 사항:**

- ✅ `event_divisions` 컬렉션에 자동으로 "일반부" Division 생성됨
- ✅ Cloud Function 로그에서 `onEventPlatformCreated` 실행 확인

**확인 쿼리:**

```javascript
// Firestore Console에서 실행
db.collection("event_divisions")
  .where("eventId", "==", "YOUR_EVENT_ID")
  .get()
  .then(snap => {
    console.log("생성된 Division:", snap.docs.map(d => d.data()));
  });
```

---

### 2️⃣ Event Entry 생성 및 승인 테스트

**2-1. Entry 생성 (참가 신청)**

`event_entries` 컬렉션에 새 문서 생성:

```json
{
  "eventId": "YOUR_EVENT_ID",
  "divisionId": "YOUR_DIVISION_ID",
  "teamId": "test_team_a",
  "teamName": "야고FC",
  "seasonId": "2026",
  "applicationStatus": "pending",
  "message": "참가 신청합니다",
  "appliedBy": "test_user_123",
  "appliedAt": "2026-01-15T00:00:00Z"
}
```

**2-2. Entry 승인**

동일 문서에서 `applicationStatus` 필드를 `"approved"`로 변경:

```json
{
  "applicationStatus": "approved",
  "approvedBy": "admin_user",
  "approvedAt": "2026-01-15T01:00:00Z"
}
```

**확인 사항:**

- ✅ `team_event_summaries` 컬렉션에 자동으로 Summary 생성됨
- ✅ Cloud Function 로그에서 `onEventEntryApproved` 실행 확인

**확인 쿼리:**

```javascript
db.collection("team_event_summaries")
  .where("eventId", "==", "YOUR_EVENT_ID")
  .where("teamId", "==", "test_team_a")
  .get()
  .then(snap => {
    console.log("생성된 Summary:", snap.docs.map(d => d.data()));
  });
```

---

### 3️⃣ Event Match 생성 테스트

**두 번째 팀 Entry도 생성 및 승인:**

```json
// event_entries
{
  "eventId": "YOUR_EVENT_ID",
  "divisionId": "YOUR_DIVISION_ID",
  "teamId": "test_team_b",
  "teamName": "노원FC",
  "seasonId": "2026",
  "applicationStatus": "approved",
  "appliedBy": "test_user_456",
  "appliedAt": "2026-01-15T00:00:00Z",
  "approvedBy": "admin_user",
  "approvedAt": "2026-01-15T01:00:00Z"
}
```

**Match 생성:**

`event_matches` 컬렉션에 새 문서 생성:

```json
{
  "eventId": "YOUR_EVENT_ID",
  "divisionId": "YOUR_DIVISION_ID",
  "seasonId": "2026",
  "homeTeamId": "test_team_a",
  "homeTeamName": "야고FC",
  "awayTeamId": "test_team_b",
  "awayTeamName": "노원FC",
  "scheduledAt": "2026-05-05T14:00:00Z",
  "venueName": "노원구민체육센터",
  "venueAddress": "서울시 노원구",
  "roundCode": "R16",
  "roundName": "16강",
  "stageType": "knockout",
  "status": "scheduled",
  "homeScore": null,
  "awayScore": null,
  "winnerTeamId": null,
  "createdBy": "admin_user",
  "createdAt": "2026-01-15T02:00:00Z"
}
```

**확인 사항:**

- ✅ Match 문서가 정상 생성됨
- ✅ `status`가 `"scheduled"`로 설정됨

---

### 4️⃣ Match 완료 테스트 (핵심)

**Match 문서 업데이트:**

동일 문서에서 다음 필드들을 업데이트:

```json
{
  "status": "completed",
  "homeScore": 2,
  "awayScore": 1,
  "winnerTeamId": "test_team_a",
  "recordedBy": "admin_user",
  "recordedAt": "2026-01-15T03:00:00Z",
  "playedAt": "2026-05-05T14:00:00Z",
  "updatedAt": "2026-01-15T03:00:00Z"
}
```

**확인 사항 (중요!):**

#### 4-1. team_games 생성 확인

```javascript
db.collection("team_games")
  .where("sourceType", "==", "event")
  .where("sourceId", "==", "YOUR_MATCH_ID")
  .get()
  .then(snap => {
    console.log("생성된 team_games:", snap.docs.length, "개");
    snap.docs.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  });
```

**예상 결과:**
- ✅ 2개의 `team_games` 문서 생성 (홈팀, 어웨이팀 각각)
- ✅ `eventId`, `divisionId`, `seasonId` 필드 포함
- ✅ `status: "completed"`
- ✅ `homeScore: 2`, `awayScore: 1`
- ✅ `winnerTeamId: "test_team_a"`

#### 4-2. teams.stats 업데이트 확인

```javascript
// 홈팀 통계 확인
db.doc("teams/test_team_a").get().then(doc => {
  const stats = doc.data()?.stats;
  console.log("야고FC 통계:", stats);
  // 예상: { games: 1, wins: 1, draws: 0, losses: 0, goalsFor: 2, goalsAgainst: 1, ... }
});

// 어웨이팀 통계 확인
db.doc("teams/test_team_b").get().then(doc => {
  const stats = doc.data()?.stats;
  console.log("노원FC 통계:", stats);
  // 예상: { games: 1, wins: 0, draws: 0, losses: 1, goalsFor: 1, goalsAgainst: 2, ... }
});
```

#### 4-3. rankings 업데이트 확인 (리그 이벤트인 경우)

```javascript
// 토너먼트는 rankings가 생성되지 않음
// 리그 이벤트인 경우만 확인
db.collection("rankings")
  .where("eventId", "==", "YOUR_EVENT_ID")
  .where("divisionId", "==", "YOUR_DIVISION_ID")
  .get()
  .then(snap => {
    console.log("생성된 rankings:", snap.docs.length, "개");
    snap.docs.forEach(doc => {
      console.log(doc.id, doc.data());
    });
  });
```

#### 4-4. team_event_summary 업데이트 확인

```javascript
db.collection("team_event_summaries")
  .where("eventId", "==", "YOUR_EVENT_ID")
  .get()
  .then(snap => {
    console.log("업데이트된 summaries:", snap.docs.length, "개");
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(doc.id, {
        teamId: data.teamId,
        played: data.played,
        won: data.won,
        drawn: data.drawn,
        lost: data.lost,
        goalsFor: data.goalsFor,
        goalsAgainst: data.goalsAgainst,
      });
    });
  });
```

**예상 결과:**
- ✅ `test_team_a`: `{ played: 1, won: 1, drawn: 0, lost: 0, goalsFor: 2, goalsAgainst: 1 }`
- ✅ `test_team_b`: `{ played: 1, won: 0, drawn: 0, lost: 1, goalsFor: 1, goalsAgainst: 2 }`

#### 4-5. team_season_summary 업데이트 확인

```javascript
db.collection("team_season_summaries")
  .where("seasonId", "==", "2026")
  .get()
  .then(snap => {
    console.log("업데이트된 season summaries:", snap.docs.length, "개");
    snap.docs.forEach(doc => {
      const data = doc.data();
      console.log(doc.id, {
        teamId: data.teamId,
        played: data.played,
        won: data.won,
        drawn: data.drawn,
        lost: data.lost,
      });
    });
  });
```

---

### 5️⃣ Cloud Function 로그 확인

**Firebase Console → Functions → Logs에서 확인:**

1. `onEventPlatformCreated` 실행 로그
2. `onEventEntryApproved` 실행 로그
3. `onEventMatchCompleted` 실행 로그
4. `onTeamGameWrite` 실행 로그

**정상 로그 예시:**

```
✅ [onEventPlatformCreated] Event 생성 감지: { eventId: "..." }
✅ [onEventPlatformCreated] 기본 Division 생성 완료: { divisionId: "..." }
✅ [onEventEntryApproved] Event Entry 승인, 처리 시작: { entryId: "..." }
✅ [onEventEntryApproved] team_event_summary 초기화 완료
✅ [onEventMatchCompleted] Event Match 완료, 처리 시작: { matchId: "..." }
✅ [onEventMatchCompleted] team_games 생성 완료: { teamGameHomeId: "...", teamGameAwayId: "..." }
✅ [onEventMatchCompleted] 처리 완료
✅ [onTeamGameWrite] 완료 경기 감지, 통계 재계산: { gameId: "...", homeTeamId: "...", awayTeamId: "..." }
✅ [rebuildTeamStats] 통계 재계산 완료: { teamId: "...", games: 1, wins: 1, ... }
```

---

## 테스트 체크리스트

### ✅ Event 생성
- [ ] `events` 문서 생성
- [ ] `event_divisions` 자동 생성 확인
- [ ] `onEventPlatformCreated` 로그 확인

### ✅ Entry 승인
- [ ] `event_entries` 문서 생성
- [ ] `applicationStatus` → `"approved"` 변경
- [ ] `team_event_summaries` 자동 생성 확인
- [ ] `onEventEntryApproved` 로그 확인

### ✅ Match 생성
- [ ] `event_matches` 문서 생성
- [ ] `status: "scheduled"` 확인

### ✅ Match 완료 (핵심)
- [ ] `event_matches.status` → `"completed"` 변경
- [ ] `team_games` 2개 생성 확인 (홈/어웨이)
- [ ] `teams.stats` 업데이트 확인
- [ ] `team_event_summaries` 업데이트 확인
- [ ] `team_season_summaries` 업데이트 확인 (seasonId 있는 경우)
- [ ] `onEventMatchCompleted` 로그 확인
- [ ] `onTeamGameWrite` 로그 확인

---

## 문제 해결

### team_games가 생성되지 않는 경우

1. **Cloud Function 배포 확인:**
   ```bash
   firebase functions:list
   ```
   - `onEventMatchCompleted` 함수가 있는지 확인

2. **로그 확인:**
   ```bash
   firebase functions:log --only onEventMatchCompleted
   ```
   - 에러 메시지 확인

3. **트리거 조건 확인:**
   - `before.status !== "completed"` && `after.status === "completed"` 조건 확인

### teams.stats가 업데이트되지 않는 경우

1. **onTeamGameWrite 함수 확인:**
   ```bash
   firebase functions:log --only onTeamGameWrite
   ```

2. **team_games 문서 확인:**
   - `status: "completed"` 확인
   - `homeScore`, `awayScore` 숫자 타입 확인

### rankings가 생성되지 않는 경우

- **리그 이벤트인 경우만 생성됨:**
  - `event.type === "league"` 확인
  - 토너먼트는 rankings 생성 안 됨 (정상)

---

## 다음 단계

테스트가 모두 통과하면:

1. ✅ **Event Platform 엔진 검증 완료**
2. → **Admin UI 구현** 시작
3. → **Public Event Page** 구현

---

## 참고

- 모든 테스트는 **Firestore Console**에서 수동으로 실행 가능
- 실제 팀 ID를 사용하려면 `teams` 컬렉션에서 실제 팀 ID 확인
- 테스트용 팀이 없으면 먼저 팀 생성 필요
