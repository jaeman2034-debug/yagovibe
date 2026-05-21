# 🔥 Event Platform 빠른 테스트 가이드

## 목표

Firestore Console에서 **5분 안에** Event Platform 엔진 검증

---

## 테스트 시나리오 (최소)

### 1️⃣ 기존 event_matches 문서 찾기

**Firestore Console → `event_matches` 컬렉션**

- 기존 match 문서 하나 선택
- 또는 새로 생성 (아래 참고)

**새로 생성하는 경우:**

```json
{
  "eventId": "test_event_123",
  "divisionId": "test_division_123",
  "seasonId": "2026",
  "homeTeamId": "test_team_a",
  "homeTeamName": "야고FC",
  "awayTeamId": "test_team_b",
  "awayTeamName": "노원FC",
  "scheduledAt": "2026-05-05T14:00:00Z",
  "status": "scheduled",
  "homeScore": null,
  "awayScore": null,
  "createdAt": "2026-01-15T00:00:00Z"
}
```

---

### 2️⃣ Match 완료 처리 (핵심)

**선택한 match 문서에서 다음 필드 수정:**

```json
{
  "status": "completed",
  "homeScore": 2,
  "awayScore": 1,
  "winnerTeamId": "test_team_a",
  "recordedBy": "admin_user",
  "recordedAt": "2026-01-15T01:00:00Z",
  "playedAt": "2026-05-05T14:00:00Z",
  "updatedAt": "2026-01-15T01:00:00Z"
}
```

**저장** (Cloud Function 자동 실행)

---

### 3️⃣ 결과 확인 (30초)

#### ✅ team_games 확인

**Firestore Console → `team_games` 컬렉션**

**쿼리:**
```
sourceType == "event"
sourceId == "YOUR_MATCH_ID"
```

**예상 결과:**
- 2개 문서 생성
- `status: "completed"`
- `homeScore: 2`, `awayScore: 1`

---

#### ✅ teams.stats 확인

**Firestore Console → `teams` 컬렉션**

**문서:**
- `teams/test_team_a`
- `teams/test_team_b`

**확인 필드:**
```
stats.games: 1
stats.wins: 1 (또는 0)
stats.losses: 0 (또는 1)
stats.goalsFor: 2 (또는 1)
stats.goalsAgainst: 1 (또는 2)
```

---

#### ✅ team_event_summaries 확인

**Firestore Console → `team_event_summaries` 컬렉션**

**쿼리:**
```
eventId == "test_event_123"
```

**예상 결과:**
- 2개 문서 (홈/어웨이 팀 각각)
- `played: 1`
- `won: 1` 또는 `lost: 1`

---

#### ✅ Cloud Function 로그 확인

**CLI:**
```bash
firebase functions:log --only onEventMatchCompleted
```

**또는 Firebase Console → Functions → Logs**

**확인 로그:**
```
✅ [onEventMatchCompleted] Event Match 완료, 처리 시작
✅ [onEventMatchCompleted] team_games 생성 완료
✅ [onEventMatchCompleted] 처리 완료
```

---

## 테스트 성공 기준

다음 4개가 모두 확인되면 **엔진 검증 완료**:

- [ ] `team_games` 2개 생성
- [ ] `teams.stats` 업데이트
- [ ] `team_event_summaries` 업데이트
- [ ] Cloud Function 로그 정상

---

## 문제 해결

### team_games가 생성되지 않는 경우

1. **Cloud Function 배포 확인:**
   ```bash
   firebase functions:list | grep onEventMatchCompleted
   ```

2. **로그 확인:**
   ```bash
   firebase functions:log --only onEventMatchCompleted
   ```

3. **트리거 조건 확인:**
   - `before.status !== "completed"` && `after.status === "completed"`

### teams.stats가 업데이트되지 않는 경우

1. **onTeamGameWrite 로그 확인:**
   ```bash
   firebase functions:log --only onTeamGameWrite
   ```

2. **team_games 문서 확인:**
   - `status: "completed"` 확인
   - `homeScore`, `awayScore` 숫자 타입 확인

---

## 다음 단계

테스트 통과 후:

1. ✅ **Event Platform 엔진 검증 완료**
2. → **Admin UI 구현** 시작
3. → **Public Event Page** 구현
