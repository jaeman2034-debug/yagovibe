# 🏅 YAGO VIBE SPORTS - Player Profile System (선수 프로필 시스템) 완전 설계

> **작성일**: 2024년  
> **목적**: Player → Team → Match → Stats → Ranking 핵심 루프 완성

---

## 📋 목차

1. [Player Profile System 개념](#1-player-profile-system-개념)
2. [Firestore 구조](#2-firestore-구조)
3. [Player UI 구조](#3-player-ui-구조)
4. [Match System 연결](#4-match-system-연결)
5. [Ranking 연결](#5-ranking-연결)
6. [Player Career](#6-player-career)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ Player Profile System 개념

### Player Profile 역할

**플랫폼의 개인 스포츠 아이덴티티**입니다.

선수 프로필은:
- 스포츠 이력서
- 경기 기록
- 통계
- 랭킹
- 커리어

모든 것을 한 곳에 모은 **선수의 모든 것**입니다.

### 스포츠 플랫폼 핵심 루프

```
Player
  ↓
Team
  ↓
Match
  ↓
Stats
  ↓
Ranking
```

이 루프가 완성되면 **진짜 스포츠 플랫폼**이 됩니다.

---

## 2️⃣ Firestore 구조

### 2-1. Players 컬렉션

```
players/{playerId}
```

**문서 스키마**:
```typescript
{
  name: string;
  teamId: string;
  teamName: string;
  sport: string; // "soccer" | "basketball" | ...
  position: "GK" | "DF" | "MF" | "FW";
  number: number;
  height?: number; // cm
  weight?: number; // kg
  birthDate?: Timestamp;
  photoUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2-2. Player Stats 서브컬렉션

```
players/{playerId}/stats/{seasonId}
```

**문서 스키마**:
```typescript
{
  seasonId: string; // "2025" 또는 "2025-spring"
  matches: number;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  cleanSheets?: number; // GK
  saves?: number; // GK
  updatedAt: Timestamp;
}
```

### 2-3. Player Career 서브컬렉션

```
players/{playerId}/career/{careerId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  teamName: string;
  season: string;
  matches: number;
  goals: number;
  assists: number;
  startDate: Timestamp;
  endDate?: Timestamp; // 현재 팀인 경우 없음
  updatedAt: Timestamp;
}
```

### 2-4. Player Match History 서브컬렉션

```
players/{playerId}/matches/{matchId}
```

**문서 스키마**:
```typescript
{
  matchId: string;
  teamId: string;
  opponentTeamId: string;
  opponentTeamName: string;
  date: Timestamp;
  goals: number;
  assists: number;
  yellowCards: number;
  redCards: number;
  minutesPlayed: number;
  isStarter: boolean;
  position: "GK" | "DF" | "MF" | "FW";
}
```

---

## 3️⃣ Player UI 구조

### 3-1. Player 목록 페이지

```
/players
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 선수                                      │
│                                          │
│ [ 선수 검색 ] [ 필터 ]                   │
├─────────────────────────────────────────┤
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ John Kim (FW) - Tigers            │  │
│ │ 득점: 12  도움: 5  경기: 20        │  │
│ │ [프로필 보기]                       │  │
│ └───────────────────────────────────┘  │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ Alex Park (MF) - Lions            │  │
│ │ 득점: 8  도움: 12  경기: 18        │  │
│ │ [프로필 보기]                       │  │
│ └───────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

### 3-2. Player Profile 페이지

```
/players/{playerId}
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ PLAYER PROFILE                           │
│                                          │
│ [프로필 사진]                             │
│                                          │
│ John Kim                                 │
│ FW · Tigers · #9                         │
│                                          │
├─────────────────────────────────────────┤
│ [ 개요 ] [ 통계 ] [ 경기 기록 ] [ 커리어 ] │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (개요/통계/경기 기록/커리어 내용)        │
│                                          │
└─────────────────────────────────────────┘
```

### 3-3. Player Stats 표시

```
┌─────────────────────────────────────────┐
│ 시즌 통계                                 │
│                                          │
│ 경기: 20                                 │
│ 득점: 12                                 │
│ 도움: 5                                  │
│ 경고: 2                                  │
│ 출전 시간: 1,800분                        │
│                                          │
│ 득점 랭킹: 3위                            │
│ 어시스트 랭킹: 5위                        │
└─────────────────────────────────────────┘
```

### 3-4. Player Career 표시

```
┌─────────────────────────────────────────┐
│ 커리어                                    │
│                                          │
│ 2025 Tigers                             │
│ 경기: 20  득점: 12  도움: 5              │
│                                          │
│ 2024 Lions                              │
│ 경기: 15  득점: 7  도움: 3               │
│                                          │
│ 2023 Eagles                             │
│ 경기: 10  득점: 5  도움: 2               │
└─────────────────────────────────────────┘
```

---

## 4️⃣ Match System 연결

### 4-1. 경기 이벤트 → Player Stats 업데이트

```
경기 이벤트 기록
  ↓
matches/{matchId}/events/{eventId} 생성
  ↓
Cloud Function 트리거
  ↓
Player Stats 자동 업데이트
```

### 4-2. Cloud Function 예시

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
    
    // 어시스트인 경우
    if (eventData.assistPlayerId) {
      const assistStatsRef = db.doc(`players/${eventData.assistPlayerId}/stats/${seasonId}`);
      await assistStatsRef.set({
        assists: admin.firestore.FieldValue.increment(1),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
);
```

---

## 5️⃣ Ranking 연결

### 5-1. Player Ranking 조회

```typescript
// src/services/rankingService.ts
export async function getPlayerRanking(
  seasonId: string,
  category: "goals" | "assists",
  limit: number = 20
): Promise<PlayerRanking[]> {
  const rankingRef = collection(
    db, 
    "rankings", 
    seasonId, 
    "players", 
    category
  );
  const q = query(
    rankingRef,
    orderBy("rank", "asc"),
    limit(limit)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PlayerRanking[];
}
```

### 5-2. Player Profile에 랭킹 표시

```typescript
// src/components/player/PlayerRanking.tsx
export function PlayerRanking({ playerId, seasonId }: { 
  playerId: string; 
  seasonId: string;
}) {
  const { ranking, loading } = usePlayerRanking(playerId, seasonId);
  
  if (loading) return <div>로딩 중...</div>;
  if (!ranking) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">랭킹</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span>득점 랭킹</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{ranking.goalsRank}</span>
            <span className="text-sm text-gray-500">위</span>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span>어시스트 랭킹</span>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">{ranking.assistsRank}</span>
            <span className="text-sm text-gray-500">위</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 6️⃣ Player Career

### 6-1. Career 자동 생성

경기 완료 시 Career 자동 업데이트:

```typescript
// functions/src/player/onPlayerMatchCompleted.ts
export const onPlayerMatchCompleted = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const after = event.data.after.data();
    
    if (after.status === "completed") {
      const seasonId = getSeasonId(after.date);
      
      // 경기에 참여한 모든 선수에 대해 Career 업데이트
      const lineupsRef = collection(db, "matches", matchId, "lineups");
      const lineupsSnap = await getDocs(lineupsRef);
      
      for (const lineupDoc of lineupsSnap.docs) {
        const lineup = lineupDoc.data();
        const playerId = lineup.playerId;
        const teamId = lineup.teamId;
        
        // Career 문서 찾기 또는 생성
        const careerRef = db.doc(
          `players/${playerId}/career/${teamId}_${seasonId}`
        );
        const careerSnap = await careerRef.get();
        
        if (careerSnap.exists()) {
          await careerRef.update({
            matches: admin.firestore.FieldValue.increment(1),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          // 팀 정보 조회
          const teamSnap = await db.doc(`teams/${teamId}`).get();
          const teamName = teamSnap.data()?.name || "Unknown";
          
          await careerRef.set({
            teamId,
            teamName,
            season: seasonId,
            matches: 1,
            goals: 0,
            assists: 0,
            startDate: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }
    }
  }
);
```

---

## 7️⃣ 실제 구현 코드

### 7-1. Player Service

```typescript
// src/services/playerService.ts
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Player, PlayerStats, PlayerCareer, PlayerMatch } from "@/types/player";

export async function getPlayer(playerId: string): Promise<Player | null> {
  const playerRef = doc(db, "players", playerId);
  const playerSnap = await getDoc(playerRef);
  
  if (!playerSnap.exists()) {
    return null;
  }
  
  return {
    id: playerSnap.id,
    ...playerSnap.data()
  } as Player;
}

export async function getPlayers(options?: {
  teamId?: string;
  position?: string;
  limit?: number;
}): Promise<Player[]> {
  const playersRef = collection(db, "players");
  let q = query(playersRef, orderBy("name", "asc"));
  
  if (options?.teamId) {
    q = query(q, where("teamId", "==", options.teamId));
  }
  
  if (options?.position) {
    q = query(q, where("position", "==", options.position));
  }
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
}

export async function getPlayerStats(
  playerId: string,
  seasonId: string
): Promise<PlayerStats | null> {
  const statsRef = doc(db, "players", playerId, "stats", seasonId);
  const statsSnap = await getDoc(statsRef);
  
  if (!statsSnap.exists()) {
    return null;
  }
  
  return {
    id: statsSnap.id,
    ...statsSnap.data()
  } as PlayerStats;
}

export async function getPlayerCareer(
  playerId: string
): Promise<PlayerCareer[]> {
  const careerRef = collection(db, "players", playerId, "career");
  const q = query(careerRef, orderBy("startDate", "desc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PlayerCareer[];
}

export async function getPlayerMatchHistory(
  playerId: string,
  limitCount: number = 20
): Promise<PlayerMatch[]> {
  const matchesRef = collection(db, "players", playerId, "matches");
  const q = query(
    matchesRef,
    orderBy("date", "desc"),
    limit(limitCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PlayerMatch[];
}
```

### 7-2. Player Hook

```typescript
// src/hooks/usePlayer.ts
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Player } from "@/types/player";

export function usePlayer(playerId: string) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }
    
    const playerRef = doc(db, "players", playerId);
    const unsubscribe = onSnapshot(
      playerRef,
      (snap) => {
        if (snap.exists()) {
          setPlayer({ id: snap.id, ...snap.data() } as Player);
        } else {
          setPlayer(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Player 구독 오류:", err);
        setError("선수 정보를 불러오는 중 오류가 발생했습니다");
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [playerId]);
  
  return { player, loading, error };
}
```

### 7-3. Player Profile 컴포넌트

```typescript
// src/components/player/PlayerProfileHeader.tsx
import { Player } from "@/types/player";
import { Avatar } from "@/components/ui/Avatar";

interface PlayerProfileHeaderProps {
  player: Player;
}

export function PlayerProfileHeader({ player }: PlayerProfileHeaderProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="flex items-center gap-6">
        <Avatar userId={player.id} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {player.name}
          </h1>
          <div className="flex items-center gap-4 text-gray-600">
            <span>{player.position}</span>
            <span>·</span>
            <span>{player.teamName}</span>
            <span>·</span>
            <span>#{player.number}</span>
          </div>
          {player.height && player.weight && (
            <div className="mt-2 text-sm text-gray-500">
              {player.height}cm / {player.weight}kg
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Player 타입 정의
- [ ] Player Service 구현
- [ ] Player Hook 구현
- [ ] Player 목록 페이지
- [ ] Player Profile 페이지
- [ ] PlayerProfileHeader 컴포넌트

### Phase 2 (다음)
- [ ] Player Stats 표시
- [ ] Player Career 표시
- [ ] Player Match History
- [ ] Player Ranking 연결

### Phase 3 (확장)
- [ ] Player Awards 표시
- [ ] Player Career Timeline
- [ ] Player Comparison

---

**작성일**: 2024년  
**상태**: ✅ Player Profile System 완전 설계 완료
