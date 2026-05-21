# YAGO Player Identity System - 플랫폼 레벨 아키텍처

## 🎯 핵심 개념

**Player ≠ Team, Player ≠ Organization**

선수는 **플랫폼 전체에서 하나의 계정**이고,  
팀 / 클럽 / 리그는 **참여 관계(Membership)**입니다.

```
Player Identity (플랫폼 레벨)
        │
        ▼
Player Membership (참여 관계)
        │
        ├─ Team A (노원FC)
        ├─ Team B (상계유나이티드)
        └─ Organization C (서울 아카데미)
```

---

## 📊 전체 구조

```
User (Global Identity)
 │
 ├─ Player Profile (플랫폼 레벨)
 │   ├─ name, birthYear, position
 │   ├─ profileImage
 │   └─ globalStats
 │
 ├─ Player Memberships (참여 관계)
 │   ├─ Organization A → Team A → League A
 │   ├─ Organization B → Team B → League B
 │   └─ Organization C → Team C → League C
 │
 └─ Match Stats (플랫폼 전체)
     ├─ Total Matches
     ├─ Total Goals
     └─ Career History
```

---

## 🗄️ 데이터 구조 (Firestore)

### 1. Users (Global Identity)

**플랫폼 전체 사용자**

```typescript
interface User {
  id: string;                    // Global User ID
  email: string;
  displayName: string;
  photoURL?: string;
  role: "ADMIN" | "USER";
  createdAt: Timestamp;
}
```

---

### 2. Players (플랫폼 레벨 선수 프로필)

**플랫폼 전체에서 하나만 존재**

```typescript
interface Player {
  id: string;                    // Global Player ID
  userId: string;                // Users 참조
  playerName: string;            // 선수 이름
  birthYear?: number;            // 출생년도
  position?: string;             // 주 포지션
  profileImageUrl?: string;      // 프로필 이미지
  
  // 플랫폼 전체 통계 (집계)
  globalStats?: {
    totalMatches: number;        // 총 경기 수
    totalGoals: number;          // 총 득점
    totalAssists: number;        // 총 어시스트
    totalWins: number;           // 총 승리
    totalDraws: number;          // 총 무승부
    totalLosses: number;         // 총 패배
  };
  
  // 커리어 히스토리
  careerStartYear?: number;      // 커리어 시작년도
  currentTeams?: string[];       // 현재 소속 팀 ID 목록
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```json
{
  "id": "player-kim-minsu",
  "userId": "user-123",
  "playerName": "김민수",
  "birthYear": 1995,
  "position": "공격수",
  "profileImageUrl": "/players/kim-minsu/photo.jpg",
  "globalStats": {
    "totalMatches": 156,
    "totalGoals": 89,
    "totalAssists": 32,
    "totalWins": 98,
    "totalDraws": 28,
    "totalLosses": 30
  },
  "careerStartYear": 2020,
  "currentTeams": ["team-nowon-fc", "team-sanggye-united"]
}
```

---

### 3. Player Memberships (참여 관계)

**선수가 어디에 속하는지 관리**

```typescript
interface PlayerMembership {
  id: string;
  playerId: string;              // Players 참조
  organizationId: string;        // Organizations 참조
  teamId: string;                // Teams 참조
  leagueId?: string;             // Leagues 참조 (선택)
  seasonId?: string;             // Seasons 참조 (선택)
  
  // 조직별 선수 정보
  jerseyNumber?: number;         // 등번호
  position?: string;              // 포지션 (팀별로 다를 수 있음)
  role: "player" | "captain" | "vice_captain" | "coach" | "manager";
  
  // 상태
  status: "active" | "inactive" | "transferred" | "retired";
  
  // 일정
  joinedAt: Timestamp;           // 가입일
  leftAt?: Timestamp;            // 이적/탈퇴일
  
  // 조직별 통계 (집계)
  organizationStats?: {
    matchesPlayed: number;
    goals: number;
    assists: number;
    wins: number;
    draws: number;
    losses: number;
  };
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시**:
```json
{
  "id": "membership-001",
  "playerId": "player-kim-minsu",
  "organizationId": "fed-nowon-football",
  "teamId": "team-nowon-fc",
  "leagueId": "league-k7-2026",
  "seasonId": "season-2026",
  "jerseyNumber": 10,
  "position": "공격수",
  "role": "player",
  "status": "active",
  "joinedAt": "2026-01-15T00:00:00Z",
  "organizationStats": {
    "matchesPlayed": 24,
    "goals": 18,
    "assists": 7,
    "wins": 16,
    "draws": 4,
    "losses": 4
  }
}
```

---

### 4. Match Player Stats (경기 기록)

**경기별 선수 통계**

```typescript
interface MatchPlayerStats {
  id: string;
  matchId: string;               // LeagueMatch 참조
  playerId: string;              // Players 참조
  teamId: string;                // Teams 참조
  organizationId: string;        // Organizations 참조
  
  // 경기 통계
  goals: number;                  // 득점
  assists: number;                // 어시스트
  yellowCards: number;           // 옐로우카드
  redCards: number;               // 레드카드
  minutesPlayed: number;          // 출전 시간 (분)
  
  // 추가 통계 (선택)
  shots?: number;                 // 슈팅
  shotsOnTarget?: number;         // 유효 슈팅
  passes?: number;                // 패스
  passesCompleted?: number;       // 성공 패스
  tackles?: number;               // 태클
  interceptions?: number;         // 인터셉트
  
  // 결과
  result: "win" | "draw" | "loss";
  
  createdAt: Timestamp;
}
```

---

### 5. Player Career History (커리어 히스토리)

**선수의 팀 이동 이력**

```typescript
interface PlayerCareerHistory {
  id: string;
  playerId: string;              // Players 참조
  organizationId: string;        // Organizations 참조
  teamId: string;                // Teams 참조
  seasonId?: string;             // Seasons 참조
  
  // 기간
  startDate: Timestamp;
  endDate?: Timestamp;            // null이면 현재 소속
  
  // 통계
  matchesPlayed: number;
  goals: number;
  assists: number;
  
  // 이적 정보
  transferType?: "joined" | "transferred" | "loaned" | "returned";
  fromTeamId?: string;           // 이적 전 팀
  
  createdAt: Timestamp;
}
```

---

## 🔄 선수 이동 구조

### 시나리오: 팀 이적

```
김민수: 노원FC → 상계유나이티드
```

**처리 과정**:

1. **기존 Membership 종료**:
```typescript
await updateDoc(doc(db, "player_memberships", "membership-001"), {
  status: "transferred",
  leftAt: serverTimestamp()
});
```

2. **새 Membership 생성**:
```typescript
await addDoc(collection(db, "player_memberships"), {
  playerId: "player-kim-minsu",
  organizationId: "fed-nowon-football",
  teamId: "team-sanggye-united",
  leagueId: "league-k7-2026",
  seasonId: "season-2026",
  jerseyNumber: 7,
  position: "공격수",
  role: "player",
  status: "active",
  joinedAt: serverTimestamp()
});
```

3. **Career History 기록**:
```typescript
await addDoc(collection(db, "player_career_history"), {
  playerId: "player-kim-minsu",
  organizationId: "fed-nowon-football",
  teamId: "team-nowon-fc",
  startDate: previousMembership.joinedAt,
  endDate: serverTimestamp(),
  transferType: "transferred",
  fromTeamId: "team-nowon-fc"
});
```

4. **Player 프로필 업데이트**:
```typescript
await updateDoc(doc(db, "players", "player-kim-minsu"), {
  currentTeams: arrayRemove("team-nowon-fc"),
  currentTeams: arrayUnion("team-sanggye-united"),
  updatedAt: serverTimestamp()
});
```

---

## 📊 플랫폼 통계 집계

### Player Global Stats 업데이트

**Cloud Function 트리거**:

```typescript
// 경기 결과 입력 시 선수 통계 자동 업데이트
export const onMatchPlayerStatsWrite = functions.firestore
  .document("match_player_stats/{statsId}")
  .onWrite(async (change, context) => {
    const stats = change.after.data() as MatchPlayerStats;
    const playerId = stats.playerId;
    
    // 플랫폼 전체 통계 집계
    const allStats = await admin.firestore()
      .collection("match_player_stats")
      .where("playerId", "==", playerId)
      .get();
    
    const globalStats = {
      totalMatches: allStats.size,
      totalGoals: allStats.docs.reduce((sum, doc) => sum + (doc.data().goals || 0), 0),
      totalAssists: allStats.docs.reduce((sum, doc) => sum + (doc.data().assists || 0), 0),
      totalWins: allStats.docs.filter(doc => doc.data().result === "win").length,
      totalDraws: allStats.docs.filter(doc => doc.data().result === "draw").length,
      totalLosses: allStats.docs.filter(doc => doc.data().result === "loss").length
    };
    
    // Player 프로필 업데이트
    await admin.firestore()
      .doc(`players/${playerId}`)
      .update({
        globalStats,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
  });
```

---

## 🌐 선수 프로필 페이지

### URL 구조

```
yago.io/players/{playerSlug}
```

**예시**:
```
yago.io/players/kim-minsu
```

### 페이지 구성

```typescript
interface PlayerProfilePageProps {
  playerId: string;
}

export default function PlayerProfilePage({ playerId }: PlayerProfilePageProps) {
  const { player, memberships, careerHistory, globalStats } = usePlayerProfile(playerId);
  
  return (
    <div>
      {/* Hero Section */}
      <PlayerHeroSection player={player} />
      
      {/* 현재 소속 */}
      <CurrentTeams memberships={memberships.filter(m => m.status === "active")} />
      
      {/* 플랫폼 전체 통계 */}
      <GlobalStats stats={globalStats} />
      
      {/* 커리어 히스토리 */}
      <CareerHistory history={careerHistory} />
      
      {/* 시즌별 통계 */}
      <SeasonStats playerId={playerId} />
      
      {/* 최근 경기 */}
      <RecentMatches playerId={playerId} />
    </div>
  );
}
```

---

## 🔍 Player 조회 API

### 플랫폼 전체 선수 검색

```typescript
async function searchPlayers(query: string): Promise<Player[]> {
  // 이름으로 검색
  const q = query(
    collection(db, "players"),
    where("playerName", ">=", query),
    where("playerName", "<=", query + "\uf8ff"),
    limit(20)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
}
```

### 선수의 모든 소속 팀 조회

```typescript
async function getPlayerTeams(playerId: string): Promise<Team[]> {
  // 현재 활성 멤버십만
  const membershipsQuery = query(
    collection(db, "player_memberships"),
    where("playerId", "==", playerId),
    where("status", "==", "active")
  );
  
  const memberships = await getDocs(membershipsQuery);
  const teamIds = memberships.docs.map(doc => doc.data().teamId);
  
  // 팀 정보 조회
  const teams = await Promise.all(
    teamIds.map(teamId => getDoc(doc(db, "teams", teamId)))
  );
  
  return teams
    .filter(doc => doc.exists())
    .map(doc => ({ id: doc.id, ...doc.data() })) as Team[];
}
```

### 선수의 커리어 히스토리 조회

```typescript
async function getPlayerCareerHistory(playerId: string): Promise<PlayerCareerHistory[]> {
  const q = query(
    collection(db, "player_career_history"),
    where("playerId", "==", playerId),
    orderBy("startDate", "desc")
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as PlayerCareerHistory[];
}
```

---

## 📈 플랫폼 레벨 기능

### 1. 선수 랭킹

```typescript
interface PlayerRanking {
  playerId: string;
  playerName: string;
  organizationId: string;
  teamId: string;
  rank: number;
  stats: {
    goals: number;
    assists: number;
    matches: number;
  };
  score: number; // 랭킹 점수
}

async function getPlayerRankings(
  category: "goals" | "assists" | "matches",
  limit: number = 100
): Promise<PlayerRanking[]> {
  // 플랫폼 전체 선수 통계 조회
  const playersQuery = query(
    collection(db, "players"),
    orderBy(`globalStats.total${category.charAt(0).toUpperCase() + category.slice(1)}`, "desc"),
    limit(limit)
  );
  
  const snapshot = await getDocs(playersQuery);
  return snapshot.docs.map((doc, index) => {
    const player = doc.data() as Player;
    return {
      playerId: doc.id,
      playerName: player.playerName,
      organizationId: "", // 최상위 랭킹은 조직 무관
      teamId: "",
      rank: index + 1,
      stats: {
        goals: player.globalStats?.totalGoals || 0,
        assists: player.globalStats?.totalAssists || 0,
        matches: player.globalStats?.totalMatches || 0
      },
      score: player.globalStats?.[`total${category}`] || 0
    };
  });
}
```

### 2. 선수 이적 추적

```typescript
async function getPlayerTransfers(playerId: string): Promise<Transfer[]> {
  const historyQuery = query(
    collection(db, "player_career_history"),
    where("playerId", "==", playerId),
    where("transferType", "in", ["transferred", "loaned"]),
    orderBy("startDate", "desc")
  );
  
  const snapshot = await getDocs(historyQuery);
  return snapshot.docs.map(doc => {
    const history = doc.data() as PlayerCareerHistory;
    return {
      fromTeam: history.fromTeamId,
      toTeam: history.teamId,
      date: history.startDate,
      type: history.transferType
    };
  });
}
```

---

## 🎯 이 구조의 장점

### 1. 선수 커리어 유지

**팀 이동해도 기록 유지**:
```
김민수
  ├─ 2025: 노원FC (24경기, 18득점)
  ├─ 2026: 상계유나이티드 (20경기, 15득점)
  └─ 총계: 44경기, 33득점
```

### 2. 플랫폼 통계

**플랫폼 전체 통계 가능**:
- 총 득점 랭킹
- 총 경기 수
- 시즌별 기록
- 조직별 기록

### 3. 선수 프로필 페이지

**플랫폼 레벨 프로필**:
```
yago.io/players/kim-minsu
  ├─ 현재 소속: 상계유나이티드
  ├─ 플랫폼 통계: 156경기, 89득점
  ├─ 커리어 히스토리
  └─ 최근 경기
```

### 4. 스카우팅 가능

**선수 검색 및 비교**:
- 플랫폼 전체 선수 검색
- 통계 비교
- 이적 이력 확인

---

## 🔄 전체 데이터 흐름

```
User 등록
  │
  ▼
Player 프로필 생성
  │
  ▼
Team 가입 (PlayerMembership 생성)
  │
  ▼
League 참가
  │
  ▼
Match 출전 (MatchPlayerStats 기록)
  │
  ▼
Global Stats 자동 업데이트
  │
  ▼
Player 프로필 업데이트
```

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조
- [ ] Players 컬렉션 (플랫폼 레벨)
- [ ] PlayerMemberships 컬렉션
- [ ] MatchPlayerStats 컬렉션
- [ ] PlayerCareerHistory 컬렉션

### Phase 2: 통계 집계
- [ ] Global Stats 자동 업데이트 (Cloud Function)
- [ ] Organization Stats 자동 업데이트
- [ ] Player 랭킹 시스템

### Phase 3: 프로필 페이지
- [ ] Player 프로필 페이지
- [ ] 커리어 히스토리 표시
- [ ] 통계 시각화

### Phase 4: 검색 및 추적
- [ ] 플랫폼 전체 선수 검색
- [ ] 이적 추적
- [ ] 선수 비교 기능

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO Player Identity System.
Players exist at platform level, not team level.
Use PlayerMemberships to track team/organization participation.
Track MatchPlayerStats for each game.
Maintain PlayerCareerHistory for transfers.
Auto-update global stats using Cloud Functions.
Create player profile pages with career history and statistics.
```

---

이 구조를 구현하면 **YAGO가 진짜 Player 중심 플랫폼이 됩니다!** 🚀
