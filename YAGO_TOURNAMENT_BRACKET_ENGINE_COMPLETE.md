# 🏆 YAGO VIBE SPORTS - Tournament Bracket Engine (토너먼트 자동 생성 엔진) 완전 설계

> **작성일**: 2024년  
> **목적**: 리그 시즌 이후 플레이오프 / 컵 대회 / 토너먼트 운영 시스템

---

## 📋 목차

1. [Tournament Bracket 개념](#1-tournament-bracket-개념)
2. [Tournament 구조](#2-tournament-구조)
3. [Bracket 생성 로직](#3-bracket-생성-로직)
4. [Firestore 구조](#4-firestore-구조)
5. [Tournament 진행 흐름](#5-tournament-진행-흐름)
6. [UI 구조](#6-ui-구조)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ Tournament Bracket 개념

### Tournament Bracket 역할

**패하면 탈락하는 Knockout Tournament 방식**입니다.

### 예시: 4팀 플레이오프

```
Semi Final

1위 vs 4위
2위 vs 3위

Final

Winner vs Winner
```

### 리그 + 토너먼트 구조

```
Round Robin League
      ↓
상위 팀 선정
      ↓
Tournament Bracket
      ↓
Champion
```

---

## 2️⃣ Tournament 구조

### 2-1. 8팀 토너먼트 예시

```
Quarter Final

1 vs 8
2 vs 7
3 vs 6
4 vs 5

Semi Final

Winner QF1 vs Winner QF2
Winner QF3 vs Winner QF4

Final

Winner SF1 vs Winner SF2
```

### 2-2. 4팀 플레이오프 예시

```
Semi Final

1 vs 4
2 vs 3

Final

Winner vs Winner
```

### 2-3. Bracket 시각화

```
Tigers (1) ──┐
             ├── Winner ──┐
Wolves (4) ──┘            │
                          ├── Champion
Lions (2) ───┐            │
             ├── Winner ──┘
Eagles (3) ──┘
```

---

## 3️⃣ Bracket 생성 로직

### 3-1. 리그 상위 팀 선정

```
standings

1 Tigers
2 Lions
3 Eagles
4 Wolves
```

### 3-2. Bracket 생성

```
1 vs 4
2 vs 3
```

### 3-3. TypeScript Bracket 생성 함수

```typescript
// src/services/tournamentBracketService.ts

interface Team {
  id: string;
  name: string;
  rank: number;
}

interface BracketMatch {
  round: string; // "quarter_final", "semi_final", "final"
  roundNumber: number;
  matchNumber: number;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  winnerTeamId?: string;
  scheduledDate?: Date;
  status: "scheduled" | "live" | "finished";
}

export function generateKnockoutBracket(teams: Team[]): BracketMatch[] {
  const teamCount = teams.length;
  const rounds = Math.ceil(Math.log2(teamCount));
  const bracket: BracketMatch[] = [];
  
  // 시드 배정 (1번 시드가 가장 강한 팀)
  const seededTeams = [...teams].sort((a, b) => a.rank - b.rank);
  
  // 첫 라운드 매칭 (1 vs 마지막, 2 vs 마지막-1, ...)
  let currentRound = 1;
  let currentTeams = seededTeams;
  let matchNumber = 1;
  
  while (currentTeams.length > 1) {
    const roundName = getRoundName(currentRound, rounds);
    const roundMatches: BracketMatch[] = [];
    
    // 팀을 두 개씩 매칭
    for (let i = 0; i < currentTeams.length; i += 2) {
      if (i + 1 < currentTeams.length) {
        roundMatches.push({
          round: roundName,
          roundNumber: currentRound,
          matchNumber: matchNumber++,
          homeTeamId: currentTeams[i].id,
          homeTeamName: currentTeams[i].name,
          awayTeamId: currentTeams[i + 1].id,
          awayTeamName: currentTeams[i + 1].name,
          status: "scheduled",
        });
      } else {
        // 홀수인 경우 부전승
        roundMatches.push({
          round: roundName,
          roundNumber: currentRound,
          matchNumber: matchNumber++,
          homeTeamId: currentTeams[i].id,
          homeTeamName: currentTeams[i].name,
          status: "scheduled",
        });
      }
    }
    
    bracket.push(...roundMatches);
    
    // 다음 라운드를 위해 승자만 남김 (실제로는 경기 결과 후 업데이트)
    currentTeams = roundMatches
      .filter(m => m.winnerTeamId || !m.awayTeamId) // 승자 또는 부전승
      .map(m => ({
        id: m.winnerTeamId || m.homeTeamId!,
        name: m.winnerTeamId ? 
          (m.winnerTeamId === m.homeTeamId ? m.homeTeamName! : m.awayTeamName!) :
          m.homeTeamName!,
        rank: 0, // 다음 라운드에서는 순위 무의미
      }));
    
    currentRound++;
  }
  
  return bracket;
}

function getRoundName(round: number, totalRounds: number): string {
  if (round === totalRounds) return "final";
  if (round === totalRounds - 1) return "semi_final";
  if (round === totalRounds - 2) return "quarter_final";
  return `round_${round}`;
}
```

### 3-4. Playoff Bracket 생성 (리그 상위 팀)

```typescript
export function generatePlayoffBracket(
  topTeams: Team[], // 리그 상위 팀들
  format: "top4" | "top8" = "top4"
): BracketMatch[] {
  if (format === "top4") {
    // Semi Final + Final
    return [
      {
        round: "semi_final",
        roundNumber: 1,
        matchNumber: 1,
        homeTeamId: topTeams[0].id,
        homeTeamName: topTeams[0].name,
        awayTeamId: topTeams[3].id,
        awayTeamName: topTeams[3].name,
        status: "scheduled",
      },
      {
        round: "semi_final",
        roundNumber: 1,
        matchNumber: 2,
        homeTeamId: topTeams[1].id,
        homeTeamName: topTeams[1].name,
        awayTeamId: topTeams[2].id,
        awayTeamName: topTeams[2].name,
        status: "scheduled",
      },
      {
        round: "final",
        roundNumber: 2,
        matchNumber: 1,
        // 승자는 경기 결과 후 업데이트
        status: "scheduled",
      },
    ];
  } else {
    // Top 8: Quarter Final + Semi Final + Final
    return generateKnockoutBracket(topTeams);
  }
}
```

---

## 4️⃣ Firestore 구조

### 4-1. Tournaments 컬렉션

```
tournaments/{tournamentId}
```

**문서 스키마**:
```typescript
{
  leagueId?: string; // 연결된 리그 ID (플레이오프인 경우)
  name: string; // "2025 Seoul Cup"
  format: "knockout" | "single_elimination" | "double_elimination" | "playoff";
  teamCount: number; // 참가 팀 수
  status: "draft" | "active" | "completed" | "cancelled";
  startDate: Timestamp;
  endDate?: Timestamp;
  createdAt: Timestamp;
}
```

### 4-2. Tournament Matches 서브컬렉션

```
tournaments/{tournamentId}/matches/{matchId}
```

**문서 스키마**:
```typescript
{
  matchId: string; // matches/{matchId} 참조
  round: string; // "quarter_final", "semi_final", "final"
  roundNumber: number;
  matchNumber: number;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  winnerTeamId?: string;
  scheduledDate?: Timestamp;
  status: "scheduled" | "live" | "finished" | "cancelled";
  createdAt: Timestamp;
}
```

### 4-3. Tournament Brackets 서브컬렉션 (선택적)

```
tournaments/{tournamentId}/brackets/{roundId}
```

**문서 스키마**:
```typescript
{
  round: string;
  roundNumber: number;
  matchIds: string[];
  completed: boolean;
}
```

---

## 5️⃣ Tournament 진행 흐름

### 5-1. 전체 흐름

```
Bracket 생성
      ↓
경기 진행
      ↓
승자 기록
      ↓
다음 라운드 자동 생성
      ↓
Final
      ↓
Champion
```

### 5-2. 경기 결과 반영

```typescript
// functions/src/tournament/onTournamentMatchFinished.ts
export const onTournamentMatchFinished = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // 경기가 완료된 경우
    if (before.status !== "finished" && after.status === "finished") {
      const tournamentId = after.tournamentId;
      if (!tournamentId) return;
      
      // Tournament Match 업데이트
      const tournamentMatchRef = db.doc(`tournaments/${tournamentId}/matches/${matchId}`);
      await tournamentMatchRef.update({
        winnerTeamId: after.score.home > after.score.away 
          ? after.homeTeamId 
          : after.awayTeamId,
        status: "finished",
      });
      
      // 다음 라운드 자동 생성
      await updateNextRound(tournamentId, matchId, after);
    }
  }
);
```

### 5-3. 다음 라운드 자동 생성

```typescript
async function updateNextRound(
  tournamentId: string,
  completedMatchId: string,
  matchData: any
) {
  const tournamentMatchSnap = await db.doc(`tournaments/${tournamentId}/matches/${completedMatchId}`).get();
  const tournamentMatch = tournamentMatchSnap.data();
  
  if (!tournamentMatch) return;
  
  const currentRound = tournamentMatch.roundNumber;
  const winnerTeamId = matchData.score.home > matchData.score.away 
    ? matchData.homeTeamId 
    : matchData.awayTeamId;
  const winnerTeamName = matchData.score.home > matchData.score.away 
    ? matchData.homeTeamName 
    : matchData.awayTeamName;
  
  // 같은 라운드의 다른 경기 확인
  const roundMatchesRef = db.collection(`tournaments/${tournamentId}/matches`);
  const roundMatchesSnap = await roundMatchesRef
    .where("roundNumber", "==", currentRound)
    .get();
  
  const roundMatches = roundMatchesSnap.docs.map(doc => doc.data());
  const allFinished = roundMatches.every(m => m.status === "finished");
  
  if (allFinished) {
    // 다음 라운드 생성
    const nextRound = currentRound + 1;
    const nextRoundName = getRoundName(nextRound, 10); // 임시로 10
    
    // 같은 라운드의 승자들을 매칭
    const winners = roundMatches.map(m => ({
      id: m.winnerTeamId,
      name: m.winnerTeamId === m.homeTeamId ? m.homeTeamName : m.awayTeamName,
    }));
    
    // 다음 라운드 경기 생성
    for (let i = 0; i < winners.length; i += 2) {
      if (i + 1 < winners.length) {
        const nextMatchRef = doc(collection(db, "matches"));
        const nextMatchData = {
          tournamentId,
          homeTeamId: winners[i].id,
          homeTeamName: winners[i].name,
          awayTeamId: winners[i + 1].id,
          awayTeamName: winners[i + 1].name,
          status: "scheduled",
          createdAt: serverTimestamp(),
        };
        
        await setDoc(nextMatchRef, nextMatchData);
        
        // Tournament Match 추가
        await addDoc(collection(db, `tournaments/${tournamentId}/matches`), {
          matchId: nextMatchRef.id,
          round: nextRoundName,
          roundNumber: nextRound,
          matchNumber: Math.floor(i / 2) + 1,
          homeTeamId: winners[i].id,
          homeTeamName: winners[i].name,
          awayTeamId: winners[i + 1].id,
          awayTeamName: winners[i + 1].name,
          status: "scheduled",
          createdAt: serverTimestamp(),
        });
      }
    }
  }
}
```

---

## 6️⃣ UI 구조

### 6-1. Tournament Bracket 페이지

```
/tournaments/{tournamentId}
```

**UI**:
```
┌─────────────────────────────────────────┐
│ TOURNAMENT BRACKET                       │
│                                          │
│ 2025 Seoul Cup                           │
│                                          │
│ Quarter Final                            │
│ ┌──────────┐      ┌──────────┐         │
│ │ Tigers   │      │ Lions    │         │
│ │ (1)      │      │ (2)      │         │
│ └──────────┘      └──────────┘         │
│      │                  │               │
│      └────────┬─────────┘               │
│               │                         │
│            Semi Final                   │
│         ┌──────────┐                   │
│         │ Winner   │                   │
│         └──────────┘                   │
│               │                         │
│            Final                       │
│         ┌──────────┐                   │
│         │ Champion │                   │
│         └──────────┘                   │
└─────────────────────────────────────────┘
```

### 6-2. Bracket 생성 UI

```
┌─────────────────────────────────────────┐
│ Tournament Bracket 생성                   │
│                                          │
│ 리그: Seoul Futsal League 2025          │
│                                          │
│ 포맷: [ Playoff (Top 4) ]               │
│                                          │
│ 상위 팀 (4팀)                            │
│ ┌─────────────────────────────────────┐ │
│ │ 1. Tigers (20 pts)                  │ │
│ │ 2. Lions (18 pts)                   │ │
│ │ 3. Eagles (16 pts)                  │ │
│ │ 4. Wolves (14 pts)                  │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 시작일: [2025-05-20]                     │
│                                          │
│ [ Bracket 생성 ]                         │
└─────────────────────────────────────────┘
```

---

## 7️⃣ 실제 구현 코드

### 7-1. Tournament Bracket 컴포넌트

```typescript
// src/components/tournament/TournamentBracket.tsx
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Link } from "react-router-dom";

interface TournamentBracketProps {
  tournamentId: string;
}

export function TournamentBracket({ tournamentId }: TournamentBracketProps) {
  const [bracket, setBracket] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchBracket = async () => {
      try {
        const bracketRef = collection(db, "tournaments", tournamentId, "matches");
        const q = query(bracketRef, orderBy("roundNumber", "asc"), orderBy("matchNumber", "asc"));
        
        const snapshot = await getDocs(q);
        const bracketData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setBracket(bracketData);
      } catch (error) {
        console.error("Bracket 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBracket();
  }, [tournamentId]);
  
  if (loading) return <div>로딩 중...</div>;
  
  // 라운드별로 그룹화
  const groupedByRound = bracket.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<string, any[]>);
  
  const roundOrder = ["round_1", "round_2", "quarter_final", "semi_final", "final"];
  
  return (
    <div className="space-y-8">
      {roundOrder.map((round) => {
        const matches = groupedByRound[round];
        if (!matches || matches.length === 0) return null;
        
        return (
          <div key={round} className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-xl font-bold mb-4 capitalize">
              {round.replace("_", " ")}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((match) => (
                <Link
                  key={match.id}
                  to={`/matches/${match.matchId}`}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold">
                        {match.homeTeamName || "TBD"}
                      </div>
                      <div className="text-sm text-gray-500 my-1">vs</div>
                      <div className="font-semibold">
                        {match.awayTeamName || "TBD"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {match.winnerTeamId && (
                        <div className="text-green-600 font-bold">✓</div>
                      )}
                      <span className={`px-3 py-1 rounded-full text-xs ${
                        match.status === "finished" ? "bg-green-100 text-green-800" :
                        match.status === "live" ? "bg-red-100 text-red-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {match.status === "finished" ? "종료" :
                         match.status === "live" ? "진행중" : "예정"}
                      </span>
                    </div>
                  </div>
                  
                  {match.scheduledDate && (
                    <div className="text-sm text-gray-500 mt-2">
                      {match.scheduledDate.toDate().toLocaleDateString()}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

### 7-2. Playoff Bracket Generator 컴포넌트

```typescript
// src/components/tournament/PlayoffBracketGenerator.tsx
import { useState } from "react";
import { useLeagueStandings } from "@/hooks/useLeagueStandings";
import { createPlayoffBracket } from "@/services/tournamentBracketService";

interface PlayoffBracketGeneratorProps {
  leagueId: string;
  onComplete: () => void;
}

export function PlayoffBracketGenerator({ leagueId, onComplete }: PlayoffBracketGeneratorProps) {
  const { standings, loading } = useLeagueStandings(leagueId);
  const [topCount, setTopCount] = useState(4);
  const [startDate, setStartDate] = useState("");
  const [generating, setGenerating] = useState(false);
  
  const topTeams = standings.slice(0, topCount).map((team, index) => ({
    id: team.teamId,
    name: team.teamName,
    rank: index + 1,
  }));
  
  const handleGenerate = async () => {
    if (topTeams.length < 2) {
      alert("최소 2팀 이상 필요합니다");
      return;
    }
    
    if (!startDate) {
      alert("시작일을 선택해주세요");
      return;
    }
    
    setGenerating(true);
    try {
      await createPlayoffBracket({
        leagueId,
        teams: topTeams,
        format: topCount === 4 ? "top4" : "top8",
        startDate: new Date(startDate),
      });
      
      alert("플레이오프 브라켓이 생성되었습니다");
      onComplete();
    } catch (error) {
      console.error("브라켓 생성 실패:", error);
      alert("브라켓 생성에 실패했습니다");
    } finally {
      setGenerating(false);
    }
  };
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Playoff Bracket 생성</h2>
      
      <div className="space-y-4">
        {/* 상위 팀 수 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">상위 팀 수</label>
          <select
            value={topCount}
            onChange={(e) => setTopCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value={4}>Top 4</option>
            <option value={8}>Top 8</option>
          </select>
        </div>
        
        {/* 상위 팀 목록 */}
        <div>
          <label className="block text-sm font-semibold mb-2">상위 팀</label>
          <div className="border border-gray-200 rounded-lg p-4">
            {standings.slice(0, topCount).map((team, index) => (
              <div key={team.teamId} className="flex items-center justify-between p-2">
                <span className="font-semibold">
                  {index + 1}. {team.teamName}
                </span>
                <span className="text-sm text-gray-500">{team.points} pts</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 시작일 */}
        <div>
          <label className="block text-sm font-semibold mb-2">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        {/* 생성 버튼 */}
        <button
          onClick={handleGenerate}
          disabled={generating || topTeams.length < 2 || !startDate}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {generating ? "브라켓 생성 중..." : "Playoff Bracket 생성"}
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Knockout Bracket 알고리즘
- [ ] Playoff Bracket 생성 함수
- [ ] Tournament Bracket 컴포넌트
- [ ] Playoff Bracket Generator 컴포넌트

### Phase 2 (다음)
- [ ] 경기 결과 반영 함수
- [ ] 다음 라운드 자동 생성
- [ ] Bracket 시각화

### Phase 3 (확장)
- [ ] Double Elimination
- [ ] 3위 결정전
- [ ] 시드 배정

---

**작성일**: 2024년  
**상태**: ✅ Tournament Bracket Engine 완전 설계 완료
