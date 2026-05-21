# 🔄 Event → team_games 통합 가이드

**생성일**: 2025-01-XX  
**목적**: Event Match 완료 시 team_games 자동 생성  
**전략**: 기존 team_games 시스템 활용

---

## 🎯 핵심 원칙

### Event Match → team_games 자동 생성

```
event_matches/{matchId}
  status: "completed"
  ↓
Cloud Function: onEventMatchCompleted
  ↓
team_games 생성
  {
    sourceType: "event",
    sourceId: eventMatchId,
    eventId: eventId,
    // ... 기존 team_games 필드
  }
  ↓
teams.stats 자동 업데이트 (기존 onTeamGameWrite)
```

---

## 🔧 Cloud Function 구현

### onEventMatchCompleted

**파일**: `functions/src/event/onEventMatchCompleted.ts`

```typescript
import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

const db = getFirestore();
const logger = functions.logger;

/**
 * Event Match 완료 시 team_games 자동 생성
 */
export const onEventMatchCompleted = functions.firestore
  .document("event_matches/{matchId}")
  .onUpdate(async (change, context) => {
    const { matchId } = context.params;
    const before = change.before.data();
    const after = change.after.data();

    logger.info("🔄 [onEventMatchCompleted] Event Match 변경 감지:", {
      matchId,
      beforeStatus: before.status,
      afterStatus: after.status,
    });

    try {
      // completed 상태로 변경된 경우만 처리
      if (before.status !== "completed" && after.status === "completed") {
        const {
          eventId,
          homeTeamId,
          homeTeamName,
          awayTeamId,
          awayTeamName,
          homeScore,
          awayScore,
          scheduledAt,
          location,
          address,
          round,
          division,
        } = after;

        // 점수 검증
        if (
          typeof homeScore !== "number" ||
          typeof awayScore !== "number"
        ) {
          logger.warn("⚠️ [onEventMatchCompleted] 점수 정보 없음:", {
            matchId,
            homeScore,
            awayScore,
          });
          return;
        }

        logger.info("✅ [onEventMatchCompleted] Event Match 완료, team_games 생성:", {
          matchId,
          eventId,
          homeTeamId,
          awayTeamId,
        });

        // Event 정보 조회 (sportType 등)
        const eventDoc = await db.doc(`events/${eventId}`).get();
        if (!eventDoc.exists) {
          logger.warn("⚠️ [onEventMatchCompleted] Event 문서 없음:", { eventId });
          return;
        }

        const eventData = eventDoc.data();
        const sportType = eventData?.sportType || "football";

        // 승자 결정
        let winnerTeamId: string | null = null;
        let resultType: "home-win" | "away-win" | "draw" | null = null;

        if (homeScore > awayScore) {
          winnerTeamId = homeTeamId;
          resultType = "home-win";
        } else if (awayScore > homeScore) {
          winnerTeamId = awayTeamId;
          resultType = "away-win";
        } else {
          resultType = "draw";
        }

        // team_games 생성
        const teamGameData = {
          sportType,
          gameType: "tournament" as const, // Event는 대부분 토너먼트
          sourceType: "event" as const,
          sourceId: matchId,
          eventId,
          seasonId: eventData?.seasonId || null,
          homeTeamId,
          homeTeamName,
          awayTeamId,
          awayTeamName,
          scheduledAt: scheduledAt || admin.firestore.Timestamp.now(),
          playedAt: admin.firestore.Timestamp.now(),
          location: location || null,
          address: address || null,
          status: "completed" as const,
          homeScore,
          awayScore,
          winnerTeamId,
          resultType,
          createdBy: eventData?.createdBy || "system",
          recordedBy: "system",
          recordedAt: admin.firestore.Timestamp.now(),
          notes: `Event: ${eventData?.name || ""}, Round: ${round || ""}`,
          createdAt: admin.firestore.Timestamp.now(),
          updatedAt: admin.firestore.Timestamp.now(),
        };

        await db.collection("team_games").add(teamGameData);

        logger.info("✅ [onEventMatchCompleted] team_games 생성 완료:", {
          matchId,
          eventId,
          homeTeamId,
          awayTeamId,
        });

        // 기존 onTeamGameWrite가 자동으로 teams.stats 업데이트
      }
    } catch (error: any) {
      logger.error("❌ [onEventMatchCompleted] 처리 실패:", {
        matchId,
        error: error.message,
        stack: error.stack,
      });
    }
  });
```

---

## 📊 데이터 흐름

### 1. Event Match 생성

```typescript
// eventService.ts
await createEventMatch({
  eventId: "event123",
  round: "16강",
  homeTeamId: "teamA",
  homeTeamName: "야고FC",
  awayTeamId: "teamB",
  awayTeamName: "노원FC",
  scheduledAt: new Date("2026-05-10"),
  location: "노원구민체육센터",
});
```

---

### 2. Event Match 결과 입력

```typescript
// eventService.ts
await updateEventMatchResult("match123", {
  homeScore: 2,
  awayScore: 1,
  winnerTeamId: "teamA",
});
```

---

### 3. Cloud Function 자동 실행

```
onEventMatchCompleted
  ↓
team_games 생성
  {
    sourceType: "event",
    sourceId: "match123",
    eventId: "event123",
    // ...
  }
  ↓
onTeamGameWrite 트리거
  ↓
teams.stats 업데이트
```

---

## 🔗 기존 시스템과의 연결

### team_games 필드 확장

**기존 필드**:
```typescript
{
  sourceType: "manual" | "match" | "tournament" | "league";
  sourceId?: string;
}
```

**확장 필드**:
```typescript
{
  sourceType: "manual" | "match" | "tournament" | "league" | "event";
  sourceId?: string;
  eventId?: string;  // Event ID 추가
}
```

---

## 📝 구현 체크리스트

### Phase 1: Cloud Function
- [ ] `onEventMatchCompleted` 함수 구현
- [ ] `functions/src/index.ts`에 export 추가
- [ ] Cloud Function 배포

### Phase 2: 타입 업데이트
- [ ] `team_games` 타입에 `eventId` 필드 추가
- [ ] `sourceType`에 `"event"` 추가

### Phase 3: 테스트
- [ ] Event Match 생성 테스트
- [ ] Event Match 결과 입력 테스트
- [ ] team_games 자동 생성 확인
- [ ] teams.stats 업데이트 확인

---

## 🎯 완료 기준

- [ ] Event Match 완료 시 team_games 자동 생성
- [ ] team_games에 eventId 필드 포함
- [ ] teams.stats 자동 업데이트
- [ ] 기존 onTeamGameWrite 정상 작동

---

## 📝 참고 문서

- `docs/EVENT_PLATFORM_ARCHITECTURE.md` - Event Platform 아키텍처
- `src/types/event.ts` - Event 타입 정의
- `src/services/eventService.ts` - Event 서비스
- `src/types/teamGame.ts` - team_games 타입 정의
- `functions/src/team/onTeamGameWrite.ts` - 기존 통계 업데이트 함수

---

## 🎉 평가

**Event → team_games 통합**: ✅ **기존 시스템 활용 가능**

**다음 단계**: Cloud Function 구현 및 배포

이 구조가 완성되면 **Event Platform이 team_games 시스템과 완전히 통합**됩니다. ⚽
