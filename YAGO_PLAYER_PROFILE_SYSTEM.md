# 🏅 YAGO VIBE SPORTS - Player Profile System (플랫폼 핵심)

> **작성일**: 2024년  
> **목적**: Player → Team → Match → Stats → Ranking 핵심 루프 완성

---

## 📋 목차

1. [Player Profile 개념](#1-player-profile-개념)
2. [Firestore 구조](#2-firestore-구조)
3. [Player Profile UI](#3-player-profile-ui)
4. [Player Stats 표시](#4-player-stats-표시)
5. [Player Ranking 연결](#5-player-ranking-연결)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ Player Profile 개념

### Player Profile 역할

**선수의 모든 정보를 한 곳에 모은 프로필**입니다.

표시 내용:
```
선수 프로필

John (FW)
소속: Tigers
등번호: 9

경기 20
득점 12
도움 5
랭킹 3위
```

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
  position: "GK" | "DF" | "MF" | "FW";
  number: number;
  birthDate?: Timestamp;
  height?: number;
  weight?: number;
  photoUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
}
```

### 2-2. Player Stats 서브컬렉션

```
players/{playerId}/stats/{seasonId}
```

**문서 스키마**:
```typescript
{
  seasonId: string;
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

### 2-3. Player Match History

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
}
```

---

## 3️⃣ Player Profile UI

### 3-1. Player Profile 페이지

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
│ John (FW)                                │
│ 소속: Tigers                              │
│ 등번호: 9                                 │
├─────────────────────────────────────────┤
│ [ 개요 ] [ 통계 ] [ 경기 기록 ] [ 수상 ] │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (개요/통계/경기 기록/수상 내용)          │
│                                          │
└─────────────────────────────────────────┘
```

### 3-2. Player Stats 표시

```
┌─────────────────────────────────────────┐
│ 선수 통계                                 │
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

### 3-3. Player Match History

```
┌─────────────────────────────────────────┐
│ 경기 기록                                 │
│                                          │
│ ┌───────────────────────────────────┐  │
│ │ Tigers 3 : 2 Lions                │  │
│ │ 2024-03-15                        │  │
│ │ 득점: 2  도움: 1                  │  │
│ │ [상세보기]                         │  │
│ └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

---

## 4️⃣ Player Stats 표시

### 4-1. 시즌별 통계

```typescript
// src/components/player/PlayerStatsCard.tsx
interface PlayerStatsCardProps {
  playerId: string;
  seasonId: string;
}

export function PlayerStatsCard({ playerId, seasonId }: PlayerStatsCardProps) {
  const { stats, loading } = usePlayerStats(playerId, seasonId);
  
  if (loading) return <div>로딩 중...</div>;
  if (!stats) return <div>통계가 없습니다</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">시즌 통계</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <div className="text-2xl font-bold">{stats.matches}</div>
          <div className="text-sm text-gray-500">경기</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{stats.goals}</div>
          <div className="text-sm text-gray-500">득점</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{stats.assists}</div>
          <div className="text-sm text-gray-500">도움</div>
        </div>
        <div>
          <div className="text-2xl font-bold">{stats.minutesPlayed}</div>
          <div className="text-sm text-gray-500">출전 시간</div>
        </div>
      </div>
    </div>
  );
}
```

---

## 5️⃣ Player Ranking 연결

### 5-1. 랭킹 표시

```typescript
// src/components/player/PlayerRanking.tsx
export function PlayerRanking({ playerId, seasonId }: { playerId: string; seasonId: string }) {
  const { ranking, loading } = usePlayerRanking(playerId, seasonId);
  
  if (loading) return <div>로딩 중...</div>;
  if (!ranking) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">랭킹</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between">
          <span>득점 랭킹</span>
          <span className="font-bold">{ranking.goalsRank}위</span>
        </div>
        <div className="flex justify-between">
          <span>어시스트 랭킹</span>
          <span className="font-bold">{ranking.assistsRank}위</span>
        </div>
      </div>
    </div>
  );
}
```

---

## 6️⃣ 실제 구현 코드

### 6-1. Player Service

```typescript
// src/services/playerService.ts
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

### 6-2. Player Hook

```typescript
// src/hooks/usePlayer.ts
export function usePlayer(playerId: string) {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!playerId) {
      setLoading(false);
      return;
    }
    
    const playerRef = doc(db, "players", playerId);
    const unsubscribe = onSnapshot(playerRef, (snap) => {
      if (snap.exists()) {
        setPlayer({ id: snap.id, ...snap.data() } as Player);
      }
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [playerId]);
  
  return { player, loading };
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Player Profile 페이지
- [ ] Player Stats 표시
- [ ] Player Match History
- [ ] Player Ranking 연결

### Phase 2 (다음)
- [ ] Player Awards 표시
- [ ] Player Career Timeline
- [ ] Player Comparison

---

**작성일**: 2024년  
**상태**: ✅ Player Profile System 설계 완료
