# ⚽ YAGO VIBE SPORTS - Game Center (경기 센터) 완전 설계

> **작성일**: 2024년  
> **목적**: ESPN + SofaScore + LeagueApps + TeamSnap을 합친 핵심 경기 화면

---

## 📋 목차

1. [Game Center 개념](#1-game-center-개념)
2. [Game Center UI 구조](#2-game-center-ui-구조)
3. [Firestore 구조](#3-firestore-구조)
4. [Match Chat](#4-match-chat)
5. [실제 구현 코드](#5-실제-구현-코드)

---

## 1️⃣ Game Center 개념

### Game Center 역할

**하나의 경기를 중심으로 모든 정보를 보여주는 페이지**입니다.

참고 서비스:
- **ESPN**: 경기 상세 페이지
- **SofaScore**: 실시간 경기 통계
- **LeagueApps**: 경기 관리
- **TeamSnap**: 팀 경기 기록

### Match = 스포츠 데이터 허브

```
경기 하나가 생성되면:

Match
  ├─ Lineups (라인업)
  ├─ Events (경기 이벤트)
  ├─ Player Stats (선수 기록)
  ├─ Team Stats (팀 통계)
  ├─ Chat (경기 채팅)
  └─ Activity Feed (활동 피드)
```

---

## 2️⃣ Game Center UI 구조

### 2-1. Game Center 페이지

```
/matches/{matchId}
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ MATCH CENTER                             │
│                                          │
│ Tigers  vs  Lions                        │
│ 3 : 2                                    │
│ 2024-03-15 15:00 · 마들스타디움          │
│ [종료]                                   │
├─────────────────────────────────────────┤
│ [ 개요 ] [ 라인업 ] [ 타임라인 ] [ 통계 ] │
│ [ 채팅 ]                                 │
├─────────────────────────────────────────┤
│ Tab Content                              │
│                                          │
│ (개요/라인업/타임라인/통계/채팅 내용)     │
│                                          │
└─────────────────────────────────────────┘
```

### 2-2. Match Header

```
┌─────────────────────────────────────────┐
│ Tigers  vs  Lions                        │
│                                          │
│ 3 : 2                                    │
│                                          │
│ 2024-03-15 15:00                         │
│ 마들스타디움                             │
│ [종료]                                   │
└─────────────────────────────────────────┘
```

### 2-3. 라인업 탭

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

### 2-4. 타임라인 탭

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

### 2-5. 통계 탭

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

### 3-1. Matches 컬렉션

```
matches/{matchId}
```

**문서 스키마**:
```typescript
{
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  date: Timestamp;
  location: string;
  status: "scheduled" | "live" | "finished" | "cancelled";
  score: {
    home: number;
    away: number;
  };
  tournamentId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 3-2. Match Lineups 서브컬렉션

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
  substitutionPlayerName?: string;
}
```

### 3-3. Match Events 서브컬렉션

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

### 3-4. Match Stats 문서

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

## 4️⃣ Match Chat

### 4-1. 경기 채팅 구조

```
chatRooms/match_{matchId}
```

**메시지 스키마**:
```typescript
{
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp;
}
```

### 4-2. Match Chat UI

```
┌─────────────────────────────────────────┐
│ 경기 채팅                                 │
│                                          │
│ John: 나이스 골!                          │
│ Alex: 수비 좋았다                         │
│ Kim: 다음 골 기대합니다                   │
│                                          │
│ [ 메시지 입력... ]                        │
│ [ 전송 ]                                 │
└─────────────────────────────────────────┘
```

---

## 5️⃣ 실제 구현 코드

### 5-1. Match Header 컴포넌트

```typescript
// src/components/match/MatchHeader.tsx
import { MatchGame } from "@/types/matchGame";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface MatchHeaderProps {
  match: MatchGame;
}

export function MatchHeader({ match }: MatchHeaderProps) {
  const statusLabels = {
    scheduled: "예정",
    live: "진행중",
    finished: "종료",
    cancelled: "취소",
  };
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{match.homeTeamName}</div>
          </div>
          <div className="text-4xl font-bold">
            {match.score.home} : {match.score.away}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{match.awayTeamName}</div>
          </div>
        </div>
        
        <div className="text-sm text-gray-500 mb-2">
          {format(match.date.toDate(), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
        </div>
        <div className="text-sm text-gray-500 mb-4">{match.location}</div>
        
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          {statusLabels[match.status]}
        </span>
      </div>
    </div>
  );
}
```

### 5-2. Match Timeline 컴포넌트

```typescript
// src/components/match/MatchTimeline.tsx
import { useMatchTimeline } from "@/hooks/useMatchTimeline";
import { MatchEvent } from "@/types/matchGame";

interface MatchTimelineProps {
  matchId: string;
}

export function MatchTimeline({ matchId }: MatchTimelineProps) {
  const { events, loading } = useMatchTimeline(matchId);
  
  if (loading) return <div>로딩 중...</div>;
  
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
      {events.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          경기 이벤트가 없습니다
        </div>
      ) : (
        events.map((event) => (
          <div key={event.id} className="flex items-start gap-3 p-4 bg-white border border-gray-200 rounded-lg">
            <div className="font-bold text-gray-900 min-w-[40px]">
              {event.minute}'
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xl">{getEventIcon(event.type)}</span>
                <span className="font-semibold">{event.playerName}</span>
                {event.assistPlayerName && (
                  <span className="text-sm text-gray-500">
                    (어시스트: {event.assistPlayerName})
                  </span>
                )}
                {event.substitutionPlayerName && (
                  <span className="text-sm text-gray-500">
                    → {event.substitutionPlayerName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
```

### 5-3. Match Lineup 컴포넌트

```typescript
// src/components/match/MatchLineup.tsx
import { useMatchLineup } from "@/hooks/useMatchLineup";

interface MatchLineupProps {
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
}

export function MatchLineup({ matchId, homeTeamId, awayTeamId }: MatchLineupProps) {
  const { lineups, loading } = useMatchLineup(matchId);
  
  if (loading) return <div>로딩 중...</div>;
  
  const homeTeamLineup = lineups.filter(
    l => l.teamId === homeTeamId && l.isStarter
  ).sort((a, b) => {
    const positionOrder = { GK: 0, DF: 1, MF: 2, FW: 3 };
    return positionOrder[a.position] - positionOrder[b.position];
  });
  
  const awayTeamLineup = lineups.filter(
    l => l.teamId === awayTeamId && l.isStarter
  ).sort((a, b) => {
    const positionOrder = { GK: 0, DF: 1, MF: 2, FW: 3 };
    return positionOrder[a.position] - positionOrder[b.position];
  });
  
  const homeSubs = lineups.filter(
    l => l.teamId === homeTeamId && !l.isStarter
  );
  
  const awaySubs = lineups.filter(
    l => l.teamId === awayTeamId && !l.isStarter
  );
  
  return (
    <div className="space-y-6">
      {/* 선발 라인업 */}
      <div className="grid grid-cols-2 gap-6">
        {/* 홈팀 라인업 */}
        <div>
          <h3 className="font-bold mb-4 text-lg">홈팀</h3>
          <div className="space-y-2">
            {homeTeamLineup.map((player) => (
              <div key={player.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="font-semibold min-w-[30px]">#{player.number}</span>
                <span className="flex-1">{player.playerName}</span>
                <span className="text-sm text-gray-500">({player.position})</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 원정팀 라인업 */}
        <div>
          <h3 className="font-bold mb-4 text-lg">원정팀</h3>
          <div className="space-y-2">
            {awayTeamLineup.map((player) => (
              <div key={player.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="font-semibold min-w-[30px]">#{player.number}</span>
                <span className="flex-1">{player.playerName}</span>
                <span className="text-sm text-gray-500">({player.position})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 교체 선수 */}
      {(homeSubs.length > 0 || awaySubs.length > 0) && (
        <div className="grid grid-cols-2 gap-6 mt-6">
          <div>
            <h4 className="font-semibold mb-2 text-sm text-gray-600">교체</h4>
            <div className="space-y-1">
              {homeSubs.map((player) => (
                <div key={player.id} className="text-sm text-gray-600">
                  {player.substitutionMinute}' {player.playerName}
                  {player.substitutionPlayerName && ` → ${player.substitutionPlayerName}`}
                </div>
              ))}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-2 text-sm text-gray-600">교체</h4>
            <div className="space-y-1">
              {awaySubs.map((player) => (
                <div key={player.id} className="text-sm text-gray-600">
                  {player.substitutionMinute}' {player.playerName}
                  {player.substitutionPlayerName && ` → ${player.substitutionPlayerName}`}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 5-4. Match Stats 컴포넌트

```typescript
// src/components/match/MatchStats.tsx
import { useMatchStats } from "@/hooks/useMatchStats";

interface MatchStatsProps {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
}

export function MatchStats({ matchId, homeTeamName, awayTeamName }: MatchStatsProps) {
  const { stats, loading } = useMatchStats(matchId);
  
  if (loading) return <div>로딩 중...</div>;
  if (!stats) return <div>통계가 없습니다</div>;
  
  const statItems = [
    { label: "점유율", home: stats.homeTeam.possession, away: stats.awayTeam.possession, unit: "%" },
    { label: "슛", home: stats.homeTeam.shots, away: stats.awayTeam.shots },
    { label: "유효슛", home: stats.homeTeam.shotsOnTarget, away: stats.awayTeam.shotsOnTarget },
    { label: "코너킥", home: stats.homeTeam.corners, away: stats.awayTeam.corners },
    { label: "파울", home: stats.homeTeam.fouls, away: stats.awayTeam.fouls },
    { label: "오프사이드", home: stats.homeTeam.offsides, away: stats.awayTeam.offsides },
  ];
  
  return (
    <div className="space-y-4">
      {statItems.map((item) => (
        <div key={item.label} className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">{item.label}</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1 text-right">
              <span className="font-bold">{item.home}</span>
              {item.unit && <span className="text-sm text-gray-500 ml-1">{item.unit}</span>}
            </div>
            <div className="w-32 bg-gray-200 rounded-full h-2 relative">
              <div 
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: `${(item.home / (item.home + item.away)) * 100}%` }}
              />
            </div>
            <div className="flex-1 text-left">
              <span className="font-bold">{item.away}</span>
              {item.unit && <span className="text-sm text-gray-500 ml-1">{item.unit}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 5-5. Match Chat 컴포넌트

```typescript
// src/components/match/MatchChat.tsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface MatchChatProps {
  matchId: string;
}

export function MatchChat({ matchId }: MatchChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!matchId) return;
    
    const chatRoomId = `match_${matchId}`;
    const messagesRef = collection(db, "chatRooms", chatRoomId, "messages");
    const q = query(
      messagesRef,
      orderBy("createdAt", "asc"),
      limit(50)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(data);
      setLoading(false);
      
      // 스크롤을 맨 아래로
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });
    
    return () => unsubscribe();
  }, [matchId]);
  
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !messageText.trim()) return;
    
    const chatRoomId = `match_${matchId}`;
    const messagesRef = collection(db, "chatRooms", chatRoomId, "messages");
    
    await addDoc(messagesRef, {
      userId: user.uid,
      userName: user.displayName || "익명",
      text: messageText.trim(),
      createdAt: serverTimestamp(),
    });
    
    setMessageText("");
  };
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="flex flex-col h-[600px] bg-white border border-gray-200 rounded-xl">
      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <div className="font-semibold text-sm">{msg.userName}</div>
            <div className="text-gray-700">{msg.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 메시지 입력 */}
      <form onSubmit={handleSend} className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="메시지 입력..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 5-6. Match Detail Page

```typescript
// src/pages/match/MatchDetailPage.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useMatch } from "@/hooks/useMatch";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchLineup } from "@/components/match/MatchLineup";
import { MatchTimeline } from "@/components/match/MatchTimeline";
import { MatchStats } from "@/components/match/MatchStats";
import { MatchChat } from "@/components/match/MatchChat";

export default function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { match, loading } = useMatch(matchId!);
  const [activeTab, setActiveTab] = useState<"overview" | "lineup" | "timeline" | "stats" | "chat">("overview");
  
  if (loading) return <div>로딩 중...</div>;
  if (!match) return <div>경기를 찾을 수 없습니다</div>;
  
  const tabs = [
    { id: "overview", label: "개요" },
    { id: "lineup", label: "라인업" },
    { id: "timeline", label: "타임라인" },
    { id: "stats", label: "통계" },
    { id: "chat", label: "채팅" },
  ];
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <MatchHeader match={match} />
        
        {/* 탭 */}
        <div className="flex gap-4 border-b border-gray-200 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 font-semibold ${
                activeTab === tab.id
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* 탭 컨텐츠 */}
        <div>
          {activeTab === "overview" && (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">경기 정보</h2>
              <div className="space-y-2 text-gray-700">
                <div>날짜: {match.date.toDate().toLocaleString()}</div>
                <div>장소: {match.location}</div>
                <div>상태: {match.status}</div>
              </div>
            </div>
          )}
          
          {activeTab === "lineup" && (
            <MatchLineup
              matchId={match.id}
              homeTeamId={match.homeTeamId}
              awayTeamId={match.awayTeamId}
            />
          )}
          
          {activeTab === "timeline" && (
            <MatchTimeline matchId={match.id} />
          )}
          
          {activeTab === "stats" && (
            <MatchStats
              matchId={match.id}
              homeTeamName={match.homeTeamName}
              awayTeamName={match.awayTeamName}
            />
          )}
          
          {activeTab === "chat" && (
            <MatchChat matchId={match.id} />
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
- [ ] Match Header 컴포넌트
- [ ] Match Timeline 컴포넌트
- [ ] Match Lineup 컴포넌트
- [ ] Match Stats 컴포넌트
- [ ] Match Chat 컴포넌트
- [ ] Match Detail Page

### Phase 2 (다음)
- [ ] 실시간 경기 업데이트
- [ ] 경기 이벤트 입력 UI
- [ ] Cloud Functions 트리거

### Phase 3 (확장)
- [ ] 경기 하이라이트
- [ ] 경기 분석
- [ ] 경기 리포트

---

**작성일**: 2024년  
**상태**: ✅ Game Center 완전 설계 완료
