# 👥 YAGO VIBE SPORTS - Team Roster System (팀 선수 등록 시스템) 설계

> **작성일**: 2024년  
> **목적**: 팀 → 선수 → 경기 → 기록 전체 스포츠 흐름 완성

---

## 📋 목차

1. [Team Roster System 개념](#1-team-roster-system-개념)
2. [선수 등록 흐름](#2-선수-등록-흐름)
3. [Firestore 구조](#3-firestore-구조)
4. [선수 승인 시스템](#4-선수-승인-시스템)
5. [경기 출전 명단](#5-경기-출전-명단)
6. [UI 구조](#6-ui-구조)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ Team Roster System 개념

### Team Roster System 역할

**팀에 선수를 등록하고, 경기 출전 명단을 관리하는 시스템**입니다.

### 전체 스포츠 흐름

```
팀 → 선수 → 경기 → 기록
```

이 흐름이 완성되면 **전체 스포츠 플랫폼이 완성됩니다.**

---

## 2️⃣ 선수 등록 흐름

### 2-1. 전체 흐름

```
선수 등록 (팀장/코치)
      ↓
팀 승인 대기
      ↓
팀 승인/거절
      ↓
팀 명단에 추가
      ↓
경기 출전 가능
```

### 2-2. 선수 등록 방법

1. **팀장이 직접 등록**: 팀장이 선수 정보 입력
2. **선수가 신청**: 선수가 팀에 가입 신청
3. **일괄 등록**: 엑셀/CSV 파일로 일괄 등록

---

## 3️⃣ Firestore 구조

### 3-1. Team Players 서브컬렉션

```
teams/{teamId}/players/{playerId}
```

**문서 스키마**:
```typescript
{
  playerId: string; // players/{playerId} 참조
  playerName: string;
  position: "GK" | "DF" | "MF" | "FW";
  number: number; // 등번호
  status: "pending" | "approved" | "rejected";
  joinedAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  createdAt: Timestamp;
}
```

### 3-2. Players 컬렉션

```
players/{playerId}
```

**문서 스키마**:
```typescript
{
  name: string;
  teamId?: string; // 현재 소속 팀
  sport: string; // "soccer"
  position: "GK" | "DF" | "MF" | "FW";
  number?: number;
  birthDate?: Timestamp;
  height?: number;
  weight?: number;
  photoUrl?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
}
```

### 3-3. Player Join Requests 서브컬렉션

```
teams/{teamId}/joinRequests/{requestId}
```

**문서 스키마**:
```typescript
{
  playerId: string;
  playerName: string;
  message?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Timestamp;
}
```

---

## 4️⃣ 선수 승인 시스템

### 4-1. 승인 프로세스

```
팀장/코치
  ↓
선수 신청 목록 확인
  ↓
선수 정보 검토
  ↓
승인/거절 결정
  ↓
팀 명단에 추가
```

### 4-2. 승인 시 자동 처리

```
선수 승인
  ↓
teams/{teamId}/players/{playerId} 추가
  ↓
players/{playerId} 업데이트 (teamId 추가)
  ↓
선수에게 알림 발송
```

---

## 5️⃣ 경기 출전 명단

### 5-1. Match Lineup 구조

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

### 5-2. Lineup 생성 흐름

```
경기 생성
      ↓
팀 선수 목록 조회
      ↓
라인업 선택
      ↓
Match Lineup 저장
```

---

## 6️⃣ UI 구조

### 6-1. 팀 선수 목록 UI

```
┌─────────────────────────────────────────┐
│ 팀 선수 명단                              │
│                                          │
│ [ 선수 추가 ]                             │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ #9  John Kim (FW)                   │ │
│ │ 가입일: 2025-03-01                  │ │
│ │ [상세보기] [수정] [삭제]             │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ #7  Alex Park (MF)                  │ │
│ │ 가입일: 2025-03-02                  │ │
│ │ [상세보기] [수정] [삭제]             │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 6-2. 선수 등록 UI

```
┌─────────────────────────────────────────┐
│ 선수 등록                                 │
│                                          │
│ 이름: [John Kim]                        │
│ 포지션: [FW ▼]                          │
│ 등번호: [9]                             │
│ 생년월일: [1990-01-01]                  │
│ 키: [178] cm                            │
│ 몸무게: [72] kg                         │
│                                          │
│ [ 등록 ]                                 │
└─────────────────────────────────────────┘
```

### 6-3. 경기 라인업 UI

```
┌─────────────────────────────────────────┐
│ 경기 라인업                               │
│                                          │
│ 선발                                      │
│ ┌─────────────────────────────────────┐ │
│ │ GK  Park (1)                        │ │
│ │ DF  Lee (5)                         │ │
│ │ MF  Kim (7)                         │ │
│ │ FW  John (9)                        │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ 교체                                      │
│ ┌─────────────────────────────────────┐ │
│ │ Min (23)                            │ │
│ │ Choi (15)                           │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ [ 라인업 저장 ]                           │
└─────────────────────────────────────────┘
```

---

## 7️⃣ 실제 구현 코드

### 7-1. Team Roster Service

```typescript
// src/services/teamRosterService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  getDoc 
} from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AddPlayerParams {
  teamId: string;
  playerName: string;
  position: "GK" | "DF" | "MF" | "FW";
  number: number;
  birthDate?: Date;
  height?: number;
  weight?: number;
}

export async function addPlayerToTeam(params: AddPlayerParams): Promise<string> {
  const { teamId, playerName, position, number, birthDate, height, weight } = params;
  
  // 선수 문서 생성
  const playerRef = doc(collection(db, "players"));
  await setDoc(playerRef, {
    name: playerName,
    teamId,
    sport: "soccer", // 팀에서 가져오기
    position,
    number,
    birthDate: birthDate ? Timestamp.fromDate(birthDate) : null,
    height,
    weight,
    status: "approved",
    createdAt: serverTimestamp(),
  });
  
  // 팀 선수 목록에 추가
  const teamPlayersRef = collection(db, "teams", teamId, "players");
  await addDoc(teamPlayersRef, {
    playerId: playerRef.id,
    playerName,
    position,
    number,
    status: "approved",
    joinedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  
  return playerRef.id;
}

export async function getTeamRoster(teamId: string): Promise<any[]> {
  const teamPlayersRef = collection(db, "teams", teamId, "players");
  const q = query(teamPlayersRef, where("status", "==", "approved"), orderBy("number", "asc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}
```

### 7-2. Team Roster 컴포넌트

```typescript
// src/components/team/TeamRoster.tsx
import { useState, useEffect } from "react";
import { getTeamRoster } from "@/services/teamRosterService";
import { AddPlayerModal } from "./AddPlayerModal";

interface TeamRosterProps {
  teamId: string;
  isAdmin: boolean;
}

export function TeamRoster({ teamId, isAdmin }: TeamRosterProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  
  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const roster = await getTeamRoster(teamId);
        setPlayers(roster);
      } catch (error) {
        console.error("선수 명단 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoster();
  }, [teamId]);
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">팀 선수 명단</h2>
        {isAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            선수 추가
          </button>
        )}
      </div>
      
      {/* 선수 목록 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {players.map((player) => (
          <div
            key={player.id}
            className="bg-white border border-gray-200 rounded-xl p-4"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold text-lg">#{player.number}</div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {player.position}
              </span>
            </div>
            <div className="font-semibold">{player.playerName}</div>
            {player.joinedAt && (
              <div className="text-xs text-gray-500 mt-1">
                가입일: {player.joinedAt.toDate().toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
      
      {showAddModal && (
        <AddPlayerModal
          teamId={teamId}
          onClose={() => setShowAddModal(false)}
          onComplete={() => {
            setShowAddModal(false);
            // 목록 새로고침
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
```

### 7-3. Match Lineup 컴포넌트

```typescript
// src/components/match/MatchLineupEditor.tsx
import { useState, useEffect } from "react";
import { getTeamRoster } from "@/services/teamRosterService";
import { saveMatchLineup } from "@/services/matchService";

interface MatchLineupEditorProps {
  matchId: string;
  teamId: string;
  isAdmin: boolean;
}

export function MatchLineupEditor({ matchId, teamId, isAdmin }: MatchLineupEditorProps) {
  const [roster, setRoster] = useState<any[]>([]);
  const [starters, setStarters] = useState<string[]>([]);
  const [substitutes, setSubstitutes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const fetchRoster = async () => {
      try {
        const teamRoster = await getTeamRoster(teamId);
        setRoster(teamRoster);
      } catch (error) {
        console.error("선수 명단 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRoster();
  }, [teamId]);
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await saveMatchLineup({
        matchId,
        teamId,
        starters,
        substitutes,
      });
      alert("라인업이 저장되었습니다");
    } catch (error) {
      console.error("라인업 저장 실패:", error);
      alert("라인업 저장에 실패했습니다");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div>로딩 중...</div>;
  if (!isAdmin) return <div>권한이 없습니다</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">경기 라인업</h2>
      
      <div className="space-y-6">
        {/* 선발 */}
        <div>
          <h3 className="font-semibold mb-3">선발 (11명)</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {roster.map((player) => (
              <label
                key={player.id}
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                  starters.includes(player.playerId)
                    ? "bg-blue-50 border-blue-500"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <input
                  type="checkbox"
                  checked={starters.includes(player.playerId)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      if (starters.length < 11) {
                        setStarters([...starters, player.playerId]);
                        setSubstitutes(substitutes.filter(id => id !== player.playerId));
                      } else {
                        alert("선발은 최대 11명입니다");
                      }
                    } else {
                      setStarters(starters.filter(id => id !== player.playerId));
                    }
                  }}
                />
                <div>
                  <div className="font-semibold">#{player.number} {player.playerName}</div>
                  <div className="text-xs text-gray-500">{player.position}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        
        {/* 교체 */}
        <div>
          <h3 className="font-semibold mb-3">교체</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {roster
              .filter(p => !starters.includes(p.playerId))
              .map((player) => (
                <label
                  key={player.id}
                  className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer ${
                    substitutes.includes(player.playerId)
                      ? "bg-green-50 border-green-500"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={substitutes.includes(player.playerId)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSubstitutes([...substitutes, player.playerId]);
                      } else {
                        setSubstitutes(substitutes.filter(id => id !== player.playerId));
                      }
                    }}
                  />
                  <div>
                    <div className="font-semibold">#{player.number} {player.playerName}</div>
                    <div className="text-xs text-gray-500">{player.position}</div>
                  </div>
                </label>
              ))}
          </div>
        </div>
        
        {/* 저장 버튼 */}
        <button
          onClick={handleSave}
          disabled={saving || starters.length === 0}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "라인업 저장"}
        </button>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Team Roster Service
- [ ] Team Roster 컴포넌트
- [ ] Add Player 기능
- [ ] Match Lineup Editor

### Phase 2 (다음)
- [ ] 선수 신청 기능
- [ ] 선수 승인 시스템
- [ ] 선수 정보 수정

### Phase 3 (확장)
- [ ] 일괄 등록 (CSV)
- [ ] 선수 통계 연결
- [ ] 선수 이력 관리

---

**작성일**: 2024년  
**상태**: ✅ Team Roster System 설계 완료
