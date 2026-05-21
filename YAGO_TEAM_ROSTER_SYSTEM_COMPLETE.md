# 👥 YAGO VIBE SPORTS - Team Roster System (팀 선수 등록 시스템) 완전 설계

> **작성일**: 2024년  
> **목적**: 협회 → 팀 → 선수 → 경기 → 기록 → 통계 흐름 완전 연결

---

## 📋 목차

1. [Team Roster System 개념](#1-team-roster-system-개념)
2. [Firestore 구조](#2-firestore-구조)
3. [선수 등록 흐름](#3-선수-등록-흐름)
4. [경기 출전 명단](#4-경기-출전-명단)
5. [UI 구조](#5-ui-구조)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ Team Roster System 개념

### Team Roster System 역할

**팀에 등록된 공식 선수 명단**입니다.

### 전체 스포츠 흐름

```
팀 선수 등록 → 경기 출전 → 기록 → 통계
```

이 흐름이 완성되면 **협회 → 팀 → 선수 → 경기 → 기록 → 통계**가 완전히 연결됩니다.

### 예시

```
TEAM ROSTER

Tigers

1 John (FW)
2 Alex (MF)
3 Mark (DF)
4 Leo (GK)
```

---

## 2️⃣ Firestore 구조

### 2-1. Team Roster 서브컬렉션

```
teams/{teamId}/roster/{playerId}
```

**문서 스키마**:
```typescript
{
  playerId: string; // players/{playerId} 참조
  playerName: string;
  position: "GK" | "DF" | "MF" | "FW";
  number: number; // 등번호
  status: "active" | "inactive" | "suspended";
  registeredAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2-2. Players 컬렉션

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
  height?: number; // cm
  weight?: number; // kg
  photoUrl?: string;
  status: "active" | "inactive" | "suspended";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 2-3. Player Join Requests 서브컬렉션 (선택적)

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

## 3️⃣ 선수 등록 흐름

### 3-1. 전체 흐름

```
선수 등록 (팀장/코치)
      ↓
팀 명단에 추가
      ↓
경기 출전 가능
      ↓
경기 기록 입력
      ↓
통계 업데이트
```

### 3-2. 선수 등록 방법

1. **팀장이 직접 등록**: 팀장이 선수 정보 입력
2. **선수가 신청**: 선수가 팀에 가입 신청
3. **일괄 등록**: 엑셀/CSV 파일로 일괄 등록

---

## 4️⃣ 경기 출전 명단

### 4-1. Match Lineup 구조

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

### 4-2. Lineup 생성 흐름

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

## 5️⃣ UI 구조

### 5-1. 팀 선수 목록 UI

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

### 5-2. 선수 등록 UI

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

### 5-3. 경기 라인업 UI

```
┌─────────────────────────────────────────┐
│ 경기 라인업                               │
│                                          │
│ 선발 (11명)                              │
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

## 6️⃣ 실제 구현 코드

### 6-1. Team Roster Service

```typescript
// src/services/teamRosterService.ts
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  doc, 
  setDoc,
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  orderBy 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Timestamp } from "firebase/firestore";

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
  
  // 등번호 중복 확인
  const rosterRef = collection(db, "teams", teamId, "roster");
  const existingQuery = query(rosterRef, where("number", "==", number));
  const existingSnap = await getDocs(existingQuery);
  
  if (!existingSnap.empty) {
    throw new Error(`등번호 ${number}번은 이미 사용 중입니다`);
  }
  
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
    status: "active",
    createdAt: serverTimestamp(),
  });
  
  // 팀 선수 명단에 추가
  await addDoc(rosterRef, {
    playerId: playerRef.id,
    playerName,
    position,
    number,
    status: "active",
    registeredAt: serverTimestamp(),
  });
  
  return playerRef.id;
}

export async function getTeamRoster(teamId: string): Promise<any[]> {
  const rosterRef = collection(db, "teams", teamId, "roster");
  const q = query(rosterRef, where("status", "==", "active"), orderBy("number", "asc"));
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function updatePlayerNumber(
  teamId: string,
  playerId: string,
  newNumber: number
): Promise<void> {
  // 등번호 중복 확인
  const rosterRef = collection(db, "teams", teamId, "roster");
  const existingQuery = query(rosterRef, where("number", "==", newNumber));
  const existingSnap = await getDocs(existingQuery);
  
  if (!existingSnap.empty && existingSnap.docs[0].id !== playerId) {
    throw new Error(`등번호 ${newNumber}번은 이미 사용 중입니다`);
  }
  
  // Roster 업데이트
  const playerRosterRef = doc(db, "teams", teamId, "roster", playerId);
  await updateDoc(playerRosterRef, {
    number: newNumber,
    updatedAt: serverTimestamp(),
  });
  
  // Player 문서도 업데이트
  const rosterSnap = await getDoc(playerRosterRef);
  const rosterData = rosterSnap.data();
  if (rosterData?.playerId) {
    const playerRef = doc(db, "players", rosterData.playerId);
    await updateDoc(playerRef, {
      number: newNumber,
      updatedAt: serverTimestamp(),
    });
  }
}

export async function removePlayerFromTeam(
  teamId: string,
  playerId: string
): Promise<void> {
  const playerRosterRef = doc(db, "teams", teamId, "roster", playerId);
  await updateDoc(playerRosterRef, {
    status: "inactive",
    updatedAt: serverTimestamp(),
  });
  
  // Player 문서에서 teamId 제거
  const rosterSnap = await getDoc(playerRosterRef);
  const rosterData = rosterSnap.data();
  if (rosterData?.playerId) {
    const playerRef = doc(db, "players", rosterData.playerId);
    await updateDoc(playerRef, {
      teamId: null,
      updatedAt: serverTimestamp(),
    });
  }
}
```

### 6-2. Team Roster 컴포넌트

```typescript
// src/components/team/TeamRoster.tsx
import { useState, useEffect } from "react";
import { getTeamRoster, removePlayerFromTeam } from "@/services/teamRosterService";
import { AddPlayerModal } from "./AddPlayerModal";
import { EditPlayerModal } from "./EditPlayerModal";

interface TeamRosterProps {
  teamId: string;
  isAdmin: boolean;
}

export function TeamRoster({ teamId, isAdmin }: TeamRosterProps) {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  
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
  
  const handleRemove = async (playerId: string) => {
    if (!confirm("이 선수를 명단에서 제거하시겠습니까?")) return;
    
    try {
      await removePlayerFromTeam(teamId, playerId);
      alert("선수가 제거되었습니다");
      // 목록 새로고침
      const roster = await getTeamRoster(teamId);
      setPlayers(roster);
    } catch (error: any) {
      alert(error.message || "제거에 실패했습니다");
    }
  };
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">팀 선수 명단 ({players.length}명)</h2>
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
      {players.length === 0 ? (
        <div className="text-center text-gray-500 py-12">
          등록된 선수가 없습니다
        </div>
      ) : (
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
              {player.registeredAt && (
                <div className="text-xs text-gray-500 mt-1">
                  가입일: {player.registeredAt.toDate().toLocaleDateString()}
                </div>
              )}
              
              {isAdmin && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setEditingPlayer(player)}
                    className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleRemove(player.id)}
                    className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                  >
                    제거
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {showAddModal && (
        <AddPlayerModal
          teamId={teamId}
          onClose={() => setShowAddModal(false)}
          onComplete={() => {
            setShowAddModal(false);
            // 목록 새로고침
            getTeamRoster(teamId).then(setPlayers);
          }}
        />
      )}
      
      {editingPlayer && (
        <EditPlayerModal
          teamId={teamId}
          player={editingPlayer}
          onClose={() => setEditingPlayer(null)}
          onComplete={() => {
            setEditingPlayer(null);
            // 목록 새로고침
            getTeamRoster(teamId).then(setPlayers);
          }}
        />
      )}
    </div>
  );
}
```

### 6-3. Add Player Modal 컴포넌트

```typescript
// src/components/team/AddPlayerModal.tsx
import { useState } from "react";
import { addPlayerToTeam } from "@/services/teamRosterService";

interface AddPlayerModalProps {
  teamId: string;
  onClose: () => void;
  onComplete: () => void;
}

export function AddPlayerModal({ teamId, onClose, onComplete }: AddPlayerModalProps) {
  const [playerName, setPlayerName] = useState("");
  const [position, setPosition] = useState<"GK" | "DF" | "MF" | "FW">("FW");
  const [number, setNumber] = useState<number>(1);
  const [birthDate, setBirthDate] = useState("");
  const [height, setHeight] = useState<number>(0);
  const [weight, setWeight] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      alert("이름을 입력해주세요");
      return;
    }
    
    setSubmitting(true);
    try {
      await addPlayerToTeam({
        teamId,
        playerName: playerName.trim(),
        position,
        number,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        height: height || undefined,
        weight: weight || undefined,
      });
      
      alert("선수가 등록되었습니다");
      onComplete();
    } catch (error: any) {
      alert(error.message || "등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">선수 등록</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">이름</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">포지션</label>
            <select
              value={position}
              onChange={(e) => setPosition(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="GK">GK (골키퍼)</option>
              <option value="DF">DF (수비수)</option>
              <option value="MF">MF (미드필더)</option>
              <option value="FW">FW (공격수)</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">등번호</label>
            <input
              type="number"
              value={number}
              onChange={(e) => setNumber(Number(e.target.value))}
              min="1"
              max="99"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold mb-2">생년월일 (선택사항)</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2">키 (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">몸무게 (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "등록 중..." : "등록"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        </form>
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
- [ ] Add Player Modal
- [ ] Edit Player Modal

### Phase 2 (다음)
- [ ] 선수 신청 기능
- [ ] 선수 승인 시스템
- [ ] Match Lineup Editor

### Phase 3 (확장)
- [ ] 일괄 등록 (CSV)
- [ ] 선수 통계 연결
- [ ] 선수 이력 관리

---

**작성일**: 2024년  
**상태**: ✅ Team Roster System 완전 설계 완료
