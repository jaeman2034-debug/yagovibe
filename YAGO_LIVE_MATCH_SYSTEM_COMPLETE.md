# ⚡ YAGO VIBE SPORTS - Live Match System (실시간 경기 엔진) 완전 설계

> **작성일**: 2024년  
> **목적**: 경기 중 실시간 기록 → 통계 → 채팅 → 피드까지 연결하는 시스템

---

## 📋 목차

1. [Live Match System 개념](#1-live-match-system-개념)
2. [Live Match 흐름](#2-live-match-흐름)
3. [Firestore 구조](#3-firestore-구조)
4. [실시간 업데이트](#4-실시간-업데이트)
5. [Scoreboard 자동 계산](#5-scoreboard-자동-계산)
6. [Stats 자동 업데이트](#6-stats-자동-업데이트)
7. [Activity Feed 연결](#7-activity-feed-연결)
8. [Chat 알림](#8-chat-알림)
9. [실제 구현 코드](#9-실제-구현-코드)

---

## 1️⃣ Live Match System 개념

### Live Match System 역할

**경기 중 발생하는 이벤트를 실시간으로 기록하고 모든 화면에 반영하는 시스템**입니다.

예:
```
LIVE MATCH

Tigers vs Lions

2 : 1

34' ⚽ John Goal
52' ⚽ Alex Goal
71' 🟨 Mark Yellow Card
```

### 경기 이벤트 → 실시간 업데이트

```
경기 이벤트 입력
  ↓
Firestore 업데이트
  ↓
Realtime Listeners (onSnapshot)
  ↓
UI 즉시 업데이트
  ↓
Stats 자동 업데이트
  ↓
Ranking 자동 재계산
  ↓
Activity Feed 자동 생성
  ↓
Chat 알림 발송
```

---

## 2️⃣ Live Match 흐름

### 전체 흐름도

```
Match Event 입력
        ↓
Firestore update
        ↓
Realtime listeners (onSnapshot)
        ↓
UI 업데이트
        ↓
Stats 업데이트 (Cloud Function)
        ↓
Ranking 업데이트 (Cloud Function)
        ↓
Activity Feed 생성 (Cloud Function)
        ↓
Chat 알림 (Cloud Function)
```

### 단계별 설명

1. **이벤트 입력**: 관리자가 경기 이벤트 입력
2. **Firestore 업데이트**: `matches/{matchId}/events/{eventId}` 생성
3. **Realtime Listeners**: 모든 구독자에게 즉시 전달
4. **UI 업데이트**: Scoreboard, Timeline, Stats 즉시 반영
5. **Stats 업데이트**: Player/Team Stats 자동 업데이트
6. **Ranking 업데이트**: 랭킹 자동 재계산
7. **Activity Feed**: 팀 활동 피드에 자동 추가
8. **Chat 알림**: 경기 채팅에 자동 메시지 발송

---

## 3️⃣ Firestore 구조

### 3-1. Match 상태

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
  currentMinute: number; // 현재 경기 시간
  score: {
    home: number;
    away: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
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

---

## 4️⃣ 실시간 업데이트

### 4-1. Match 상태 실시간 구독

```typescript
// src/hooks/useLiveMatch.ts
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchGame } from "@/types/matchGame";

export function useLiveMatch(matchId: string) {
  const [match, setMatch] = useState<MatchGame | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!matchId) return;
    
    const matchRef = doc(db, "matches", matchId);
    const unsubscribe = onSnapshot(
      matchRef,
      (snap) => {
        if (snap.exists()) {
          setMatch({ id: snap.id, ...snap.data() } as MatchGame);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Live Match 구독 오류:", error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [matchId]);
  
  return { match, loading };
}
```

### 4-2. Match Events 실시간 구독

```typescript
// src/hooks/useMatchTimeline.ts
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchEvent } from "@/types/matchGame";

export function useMatchTimeline(matchId: string) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!matchId) return;
    
    const eventsRef = collection(db, "matches", matchId, "events");
    const q = query(eventsRef, orderBy("minute", "asc"));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as MatchEvent[];
        setEvents(data);
        setLoading(false);
      },
      (error) => {
        console.error("타임라인 구독 오류:", error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [matchId]);
  
  return { events, loading };
}
```

---

## 5️⃣ Scoreboard 자동 계산

### 5-1. 점수 자동 계산

```typescript
// functions/src/match/onMatchEventCreated.ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import * as admin from "firebase-admin";

const db = getFirestore();

export const onMatchEventCreated = onDocumentCreated(
  "matches/{matchId}/events/{eventId}",
  async (event) => {
    const { matchId, eventId } = event.params;
    const eventData = event.data?.data();
    
    // 골인 경우 점수 업데이트
    if (eventData.type === "goal") {
      const matchRef = db.doc(`matches/${matchId}`);
      const matchSnap = await matchRef.get();
      const matchData = matchSnap.data();
      
      if (!matchData) return;
      
      // 홈팀 골인 경우
      if (eventData.teamId === matchData.homeTeamId) {
        await matchRef.update({
          "score.home": admin.firestore.FieldValue.increment(1),
        });
      } else {
        // 원정팀 골인 경우
        await matchRef.update({
          "score.away": admin.firestore.FieldValue.increment(1),
        });
      }
    }
  }
);
```

### 5-2. 실시간 Scoreboard 컴포넌트

```typescript
// src/components/match/live/LiveScoreBoard.tsx
import { useLiveMatch } from "@/hooks/useLiveMatch";

interface LiveScoreBoardProps {
  matchId: string;
}

export function LiveScoreBoard({ matchId }: LiveScoreBoardProps) {
  const { match, loading } = useLiveMatch(matchId);
  
  if (loading) return <div>로딩 중...</div>;
  if (!match) return null;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{match.homeTeamName}</div>
          </div>
          <div className="text-5xl font-bold text-blue-600">
            {match.score.home} : {match.score.away}
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{match.awayTeamName}</div>
          </div>
        </div>
        
        {match.status === "live" && (
          <div className="flex items-center justify-center gap-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="text-red-600 font-semibold">LIVE</span>
            <span className="text-gray-500">{match.currentMinute}'</span>
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## 6️⃣ Stats 자동 업데이트

### 6-1. Player Stats 자동 업데이트

```typescript
// functions/src/match/onMatchEventCreated.ts (계속)
// 골인 경우 선수 통계 업데이트
if (eventData.type === "goal") {
  const seasonId = getSeasonId(new Date());
  const playerStatsRef = db.doc(`players/${eventData.playerId}/stats/${seasonId}`);
  
  await playerStatsRef.set({
    goals: admin.firestore.FieldValue.increment(1),
    matches: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  
  // 어시스트 통계 업데이트
  if (eventData.assistPlayerId) {
    const assistStatsRef = db.doc(`players/${eventData.assistPlayerId}/stats/${seasonId}`);
    await assistStatsRef.set({
      assists: admin.firestore.FieldValue.increment(1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
}
```

### 6-2. Team Stats 자동 업데이트

```typescript
// 경기 완료 시 팀 통계 업데이트
// functions/src/match/onMatchCompleted.ts
export const onMatchCompleted = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    if (before.status !== "finished" && after.status === "finished") {
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
    }
  }
);
```

---

## 7️⃣ Activity Feed 연결

### 7-1. 경기 이벤트 → Activity Feed

```typescript
// functions/src/match/onMatchEventCreated.ts (계속)
// 골인 경우 Activity Feed에 추가
if (eventData.type === "goal") {
  const matchRef = db.doc(`matches/${matchId}`);
  const matchSnap = await matchRef.get();
  const matchData = matchSnap.data();
  
  if (!matchData) return;
  
  // 홈팀 Activity Feed
  const homeActivitiesRef = db.collection(`teams/${matchData.homeTeamId}/activities`);
  await homeActivitiesRef.add({
    type: "match_event",
    title: `${eventData.playerName}이(가) 골을 넣었습니다!`,
    description: `${matchData.homeTeamName} vs ${matchData.awayTeamName}`,
    createdBy: eventData.playerId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    referenceId: matchId,
    referenceType: "match",
  });
  
  // 원정팀 Activity Feed
  const awayActivitiesRef = db.collection(`teams/${matchData.awayTeamId}/activities`);
  await awayActivitiesRef.add({
    type: "match_event",
    title: `${eventData.playerName}이(가) 골을 넣었습니다!`,
    description: `${matchData.homeTeamName} vs ${matchData.awayTeamName}`,
    createdBy: eventData.playerId,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    referenceId: matchId,
    referenceType: "match",
  });
}
```

---

## 8️⃣ Chat 알림

### 8-1. 경기 이벤트 → Chat 알림

```typescript
// functions/src/match/onMatchEventCreated.ts (계속)
// 경기 채팅에 자동 메시지 발송
const chatRoomId = `match_${matchId}`;
const messagesRef = db.collection(`chatRooms/${chatRoomId}/messages`);

let chatMessage = "";
if (eventData.type === "goal") {
  chatMessage = `⚽ GOAL! ${eventData.playerName}이(가) 골을 넣었습니다!`;
} else if (eventData.type === "yellow_card") {
  chatMessage = `🟨 ${eventData.playerName}이(가) 경고를 받았습니다.`;
} else if (eventData.type === "red_card") {
  chatMessage = `🟥 ${eventData.playerName}이(가) 퇴장했습니다.`;
}

if (chatMessage) {
  await messagesRef.add({
    userId: "system",
    userName: "시스템",
    text: chatMessage,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}
```

### 8-2. 사용자 알림 발송

```typescript
// 팀 멤버들에게 알림 발송
const homeTeamMembersRef = db.collection(`teams/${matchData.homeTeamId}/members`);
const awayTeamMembersRef = db.collection(`teams/${matchData.awayTeamId}/members`);

const [homeMembersSnap, awayMembersSnap] = await Promise.all([
  homeTeamMembersRef.get(),
  awayTeamMembersRef.get(),
]);

const allMembers = [
  ...homeMembersSnap.docs.map(doc => doc.id),
  ...awayMembersSnap.docs.map(doc => doc.id),
];

// 알림 생성
const batch = db.batch();
allMembers.forEach(memberId => {
  const notifRef = db.collection("notifications").doc();
  batch.set(notifRef, {
    userId: memberId,
    type: "match_event",
    title: chatMessage,
    message: `${matchData.homeTeamName} vs ${matchData.awayTeamName}`,
    link: `/matches/${matchId}`,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    read: false,
  });
});

await batch.commit();
```

---

## 9️⃣ 실제 구현 코드

### 9-1. Live Match Header 컴포넌트

```typescript
// src/components/match/live/LiveMatchHeader.tsx
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface LiveMatchHeaderProps {
  matchId: string;
}

export function LiveMatchHeader({ matchId }: LiveMatchHeaderProps) {
  const { match, loading } = useLiveMatch(matchId);
  
  if (loading) return <div>로딩 중...</div>;
  if (!match) return null;
  
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-xl p-6 mb-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-8 mb-4">
          <div className="text-center">
            <div className="text-3xl font-bold">{match.homeTeamName}</div>
          </div>
          <div className="text-6xl font-bold">
            {match.score.home} : {match.score.away}
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold">{match.awayTeamName}</div>
          </div>
        </div>
        
        {match.status === "live" && (
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            <span className="font-semibold">LIVE</span>
            <span className="text-blue-200">{match.currentMinute}'</span>
          </div>
        )}
        
        <div className="text-sm text-blue-200">
          {format(match.date.toDate(), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
        </div>
        <div className="text-sm text-blue-200">{match.location}</div>
      </div>
    </div>
  );
}
```

### 9-2. Live Event Timeline 컴포넌트

```typescript
// src/components/match/live/LiveEventTimeline.tsx
import { useMatchTimeline } from "@/hooks/useMatchTimeline";

interface LiveEventTimelineProps {
  matchId: string;
}

export function LiveEventTimeline({ matchId }: LiveEventTimelineProps) {
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
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">경기 이벤트</h2>
      
      {events.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          경기 이벤트가 없습니다
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div key={event.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="font-bold text-gray-900 min-w-[50px]">
                {event.minute}'
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{getEventIcon(event.type)}</span>
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
          ))}
        </div>
      )}
    </div>
  );
}
```

### 9-3. Live Match Controls 컴포넌트

```typescript
// src/components/match/live/LiveMatchControls.tsx
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { LiveEventInput } from "./LiveEventInput";

interface LiveMatchControlsProps {
  matchId: string;
  match: any;
  currentMinute: number;
  setCurrentMinute: (minute: number) => void;
}

export function LiveMatchControls({ 
  matchId, 
  match, 
  currentMinute, 
  setCurrentMinute 
}: LiveMatchControlsProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  
  const handleStartMatch = async () => {
    setLoading(true);
    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, {
        status: "live",
        currentMinute: 0,
      });
    } catch (error) {
      console.error("경기 시작 실패:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleEndMatch = async () => {
    setLoading(true);
    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, {
        status: "finished",
      });
    } catch (error) {
      console.error("경기 종료 실패:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateMinute = async (minute: number) => {
    setLoading(true);
    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, {
        currentMinute: minute,
      });
      setCurrentMinute(minute);
    } catch (error) {
      console.error("시간 업데이트 실패:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (match.status === "finished") {
    return null;
  }
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">경기 제어</h3>
      
      <div className="space-y-4">
        {/* 경기 시작/종료 */}
        <div className="flex gap-2">
          {match.status === "scheduled" && (
            <button
              onClick={handleStartMatch}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              경기 시작
            </button>
          )}
          {match.status === "live" && (
            <button
              onClick={handleEndMatch}
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              경기 종료
            </button>
          )}
        </div>
        
        {/* 시간 업데이트 */}
        {match.status === "live" && (
          <div>
            <label className="block text-sm font-semibold mb-2">현재 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={currentMinute}
                onChange={(e) => setCurrentMinute(Number(e.target.value))}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg"
                min="0"
                max="120"
              />
              <span className="text-gray-500">분</span>
              <button
                onClick={() => handleUpdateMinute(currentMinute)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                업데이트
              </button>
            </div>
          </div>
        )}
        
        {/* 이벤트 입력 */}
        {match.status === "live" && (
          <LiveEventInput
            matchId={matchId}
            currentMinute={currentMinute}
            homeTeamId={match.homeTeamId}
            awayTeamId={match.awayTeamId}
          />
        )}
      </div>
    </div>
  );
}
```

### 9-4. Live Match Page

```typescript
// src/pages/match/LiveMatchPage.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useLiveMatch } from "@/hooks/useLiveMatch";
import { LiveMatchHeader } from "@/components/match/live/LiveMatchHeader";
import { LiveEventTimeline } from "@/components/match/live/LiveEventTimeline";
import { LiveMatchControls } from "@/components/match/live/LiveMatchControls";
import { MatchChat } from "@/components/match/MatchChat";

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { match, loading } = useLiveMatch(matchId!);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    if (match) {
      setCurrentMinute(match.currentMinute || 0);
    }
  }, [match]);
  
  if (loading) return <div>로딩 중...</div>;
  if (!match) return <div>경기를 찾을 수 없습니다</div>;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <LiveMatchHeader matchId={match.id} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 영역 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 실시간 타임라인 */}
            <LiveEventTimeline matchId={match.id} />
            
            {/* 관리자용 제어 */}
            {isAdmin && (
              <LiveMatchControls
                matchId={match.id}
                match={match}
                currentMinute={currentMinute}
                setCurrentMinute={setCurrentMinute}
              />
            )}
          </div>
          
          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 경기 채팅 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">경기 채팅</h2>
              <MatchChat matchId={match.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] LiveMatchHeader 컴포넌트
- [ ] LiveEventTimeline 컴포넌트
- [ ] LiveMatchControls 컴포넌트
- [ ] Live Match Page
- [ ] 실시간 구독 Hooks

### Phase 2 (다음)
- [ ] Cloud Functions 트리거
- [ ] Stats 자동 업데이트
- [ ] Activity Feed 연결
- [ ] Chat 알림

### Phase 3 (확장)
- [ ] 경기 하이라이트
- [ ] 경기 분석
- [ ] 경기 리포트

---

**작성일**: 2024년  
**상태**: ✅ Live Match System 완전 설계 완료
