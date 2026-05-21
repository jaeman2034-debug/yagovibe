# ⚽ YAGO VIBE SPORTS - Game Center (경기 센터) 설계

> **작성일**: 2024년  
> **목적**: Match → Player → Stats → Ranking 흐름을 완전히 살아나게 하는 핵심 UX

---

## 📋 목차

1. [Game Center 개념](#1-game-center-개념)
2. [Game Center UI 구조](#2-game-center-ui-구조)
3. [Firestore 구조](#3-firestore-구조)
4. [실시간 경기 기록](#4-실시간-경기-기록)
5. [선수 기록 입력](#5-선수-기록-입력)
6. [통계 자동 생성](#6-통계-자동-생성)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ Game Center 개념

### Game Center 역할

**경기 하나의 모든 것을 한 곳에서 관리하는 센터**입니다.

구성:
```
경기 센터

라인업
실시간 기록
경기 이벤트
선수 기록
통계
```

### Match → Player → Stats → Ranking 흐름

```
경기 생성
  ↓
라인업 등록
  ↓
경기 이벤트 기록 (골, 어시스트, 카드 등)
  ↓
선수 기록 자동 업데이트
  ↓
팀 통계 자동 업데이트
  ↓
랭킹 자동 재계산
```

이 흐름이 완성되면 **진짜 스포츠 플랫폼**이 됩니다.

---

## 2️⃣ Game Center UI 구조

### 2-1. Game Center 페이지

```
/matches/{matchId}
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ GAME CENTER                              │
│                                          │
│ Tigers  3 : 2  Lions                     │
│ 2024-03-15 15:00 · 마들스타디움          │
│ [종료]                                   │
├─────────────────────────────────────────┤
│ [ 개요 ] [ 라인업 ] [ 타임라인 ] [ 통계 ] │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (개요/라인업/타임라인/통계 내용)          │
│                                          │
└─────────────────────────────────────────┘
```

### 2-2. 라인업 탭

```
┌─────────────────────────────────────────┐
│ 라인업                                    │
│                                          │
│ 홈팀 (Tigers)        원정팀 (Lions)      │
│                                          │
│ FW  John (9)         FW  Alex (10)       │
│ MF  Kim (7)          MF  Park (8)        │
│ DF  Lee (5)          DF  Choi (4)        │
│ GK  Park (1)         GK  Jung (1)        │
│                                          │
│ 교체:                                   │
│ - Min (23')          - Han (45')        │
└─────────────────────────────────────────┘
```

### 2-3. 타임라인 탭

```
┌─────────────────────────────────────────┐
│ 경기 타임라인                             │
│                                          │
│ 23' ⚽ John (Tigers)                     │
│     어시스트: Kim                        │
│                                          │
│ 34' 🟨 Park (Lions)                      │
│                                          │
│ 45' ⚽ Alex (Lions)                      │
│                                          │
│ 56' ⚽ John (Tigers)                     │
│     어시스트: Lee                        │
│                                          │
│ 70' 🔄 교체: Min → Choi (Tigers)         │
│                                          │
│ 89' ⚽ Alex (Lions)                      │
└─────────────────────────────────────────┘
```

### 2-4. 통계 탭

```
┌─────────────────────────────────────────┐
│ 경기 통계                                 │
│                                          │
│ ┌──────────┐  ┌──────────┐             │
│ │ Tigers    │  │ Lions    │             │
│ ├──────────┤  ├──────────┤             │
│ │ 점유율 55%│  │ 점유율 45%│             │
│ │ 슛 12    │  │ 슛 8     │             │
│ │ 유효슛 6  │  │ 유효슛 4  │             │
│ │ 코너킥 5  │  │ 코너킥 3  │             │
│ │ 파울 8   │  │ 파울 10   │             │
│ └──────────┘  └──────────┘             │
└─────────────────────────────────────────┘
```

---

## 3️⃣ Firestore 구조

### 3-1. Match Lineups

```
matches/{matchId}/lineups/{playerId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  playerId: string;
  playerName: string;
  position: "GK" | "DF" | "MF" | "FW";
  number: number;
  isStarter: boolean; // 선발/교체
  substitutionMinute?: number; // 교체 시간
  substitutionPlayerId?: string; // 교체된 선수
}
```

### 3-2. Match Events

```
matches/{matchId}/events/{eventId}
```

**문서 스키마**:
```typescript
{
  type: "goal" | "assist" | "yellow_card" | "red_card" | "substitution";
  minute: number;
  teamId: string;
  playerId: string;
  playerName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  substitutionPlayerId?: string;
  substitutionPlayerName?: string;
  createdAt: Timestamp;
}
```

### 3-3. Match Stats

```
matches/{matchId}/stats
```

**문서 스키마**:
```typescript
{
  homeTeam: {
    possession: number; // 점유율 (%)
    shots: number;
    shotsOnTarget: number;
    corners: number;
    fouls: number;
    offsides: number;
  };
  awayTeam: {
    possession: number;
    shots: number;
    shotsOnTarget: number;
    corners: number;
    fouls: number;
    offsides: number;
  };
  updatedAt: Timestamp;
}
```

---

## 4️⃣ 실시간 경기 기록

### 4-1. 경기 이벤트 입력 UI

```
┌─────────────────────────────────────────┐
│ 경기 이벤트 입력                          │
│                                          │
│ [ 골 ] [ 어시스트 ] [ 경고 ] [ 퇴장 ]    │
│                                          │
│ 선수: [선택]                             │
│ 시간: [입력]                             │
│                                          │
│ [ 기록 ]                                 │
└─────────────────────────────────────────┘
```

### 4-2. 실시간 타임라인 업데이트

```typescript
// src/hooks/useMatchTimeline.ts
export function useMatchTimeline(matchId: string) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  
  useEffect(() => {
    if (!matchId) return;
    
    const eventsRef = collection(db, "matches", matchId, "events");
    const q = query(eventsRef, orderBy("minute", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MatchEvent[];
      setEvents(data);
    });
    
    return () => unsubscribe();
  }, [matchId]);
  
  return { events };
}
```

---

## 5️⃣ 선수 기록 입력

### 5-1. 선수 기록 입력 UI

```
┌─────────────────────────────────────────┐
│ 선수 기록 입력                            │
│                                          │
│ 선수: John (FW)                          │
│                                          │
│ 득점: [ 2 ]                              │
│ 도움: [ 1 ]                              │
│ 경고: [ 0 ]                              │
│ 출전 시간: [ 90 ] 분                      │
│                                          │
│ [ 저장 ]                                 │
└─────────────────────────────────────────┘
```

### 5-2. 선수 기록 자동 업데이트

```typescript
// functions/src/match/onMatchEventCreated.ts
export const onMatchEventCreated = onDocumentCreated(
  "matches/{matchId}/events/{eventId}",
  async (event) => {
    const { matchId, eventId } = event.params;
    const eventData = event.data?.data();
    
    const seasonId = getSeasonId(new Date());
    
    // 골인 경우
    if (eventData.type === "goal") {
      // Player Stats 업데이트
      const playerStatsRef = db.doc(`players/${eventData.playerId}/stats/${seasonId}`);
      await playerStatsRef.set({
        goals: admin.firestore.FieldValue.increment(1),
        matches: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      
      // Player Match History에 추가
      await db.collection(`players/${eventData.playerId}/matches`).add({
        matchId,
        teamId: eventData.teamId,
        goals: 1,
        assists: 0,
        date: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
);
```

---

## 6️⃣ 통계 자동 생성

### 6-1. 경기 완료 시 통계 생성

```typescript
// functions/src/match/onMatchCompleted.ts
export const onMatchCompleted = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    if (before.status !== "completed" && after.status === "completed") {
      const seasonId = getSeasonId(after.date);
      
      // 홈팀 통계 업데이트
      await updateTeamMatchStats(
        after.homeTeamId,
        seasonId,
        after.score.home,
        after.score.away,
        true
      );
      
      // 원정팀 통계 업데이트
      await updateTeamMatchStats(
        after.awayTeamId,
        seasonId,
        after.score.away,
        after.score.home,
        false
      );
      
      // 랭킹 재계산
      await recalculateTeamRanking(seasonId);
    }
  }
);
```

---

## 7️⃣ 실제 구현 코드

### 7-1. Match Timeline 컴포넌트

```typescript
// src/components/match/MatchTimeline.tsx
import { useMatchTimeline } from "@/hooks/useMatchTimeline";
import { MatchEvent } from "@/types/matchGame";

interface MatchTimelineProps {
  matchId: string;
}

export function MatchTimeline({ matchId }: MatchTimelineProps) {
  const { events } = useMatchTimeline(matchId);
  
  const getEventIcon = (type: string) => {
    const icons = {
      goal: "⚽",
      assist: "🎯",
      yellow_card: "🟨",
      red_card: "🟥",
      substitution: "🔄",
    };
    return icons[type] || "📌";
  };
  
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
          <div className="font-bold text-gray-900">{event.minute}'</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">{getEventIcon(event.type)}</span>
              <span className="font-semibold">{event.playerName}</span>
              {event.assistPlayerName && (
                <span className="text-sm text-gray-500">
                  (어시스트: {event.assistPlayerName})
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 7-2. Match Lineup 컴포넌트

```typescript
// src/components/match/MatchLineup.tsx
import { useMatchLineup } from "@/hooks/useMatchLineup";
import { MatchLineup as MatchLineupType } from "@/types/matchGame";

interface MatchLineupProps {
  matchId: string;
}

export function MatchLineup({ matchId }: MatchLineupProps) {
  const { lineups, loading } = useMatchLineup(matchId);
  
  if (loading) return <div>로딩 중...</div>;
  
  const homeTeamLineup = lineups.filter(
    l => l.teamId === lineups[0]?.teamId && l.isStarter
  );
  const awayTeamLineup = lineups.filter(
    l => l.teamId !== lineups[0]?.teamId && l.isStarter
  );
  
  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 홈팀 라인업 */}
      <div>
        <h3 className="font-bold mb-4">홈팀</h3>
        <div className="space-y-2">
          {homeTeamLineup.map((player) => (
            <div key={player.id} className="flex items-center gap-2">
              <span className="font-semibold">#{player.number}</span>
              <span>{player.playerName}</span>
              <span className="text-sm text-gray-500">({player.position})</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* 원정팀 라인업 */}
      <div>
        <h3 className="font-bold mb-4">원정팀</h3>
        <div className="space-y-2">
          {awayTeamLineup.map((player) => (
            <div key={player.id} className="flex items-center gap-2">
              <span className="font-semibold">#{player.number}</span>
              <span>{player.playerName}</span>
              <span className="text-sm text-gray-500">({player.position})</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Match Timeline 컴포넌트
- [ ] Match Lineup 컴포넌트
- [ ] Match Stats 컴포넌트
- [ ] 경기 이벤트 입력 UI

### Phase 2 (다음)
- [ ] 실시간 경기 업데이트
- [ ] 선수 기록 입력 UI
- [ ] Cloud Functions 트리거

### Phase 3 (확장)
- [ ] 경기 하이라이트
- [ ] 경기 분석
- [ ] 경기 리포트

---

**작성일**: 2024년  
**상태**: ✅ Game Center 설계 완료
