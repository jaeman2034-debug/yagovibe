# 🔴 YAGO VIBE SPORTS - Live Match System (실시간 경기 기록) 설계

> **작성일**: 2024년  
> **목적**: 실시간 경기 기록 입력 → 자동 통계 업데이트 → 실시간 알림 시스템

---

## 📋 목차

1. [Live Match System 개념](#1-live-match-system-개념)
2. [실시간 경기 기록 입력](#2-실시간-경기-기록-입력)
3. [실시간 업데이트 흐름](#3-실시간-업데이트-흐름)
4. [알림 시스템](#4-알림-시스템)
5. [실제 구현 코드](#5-실제-구현-코드)

---

## 1️⃣ Live Match System 개념

### Live Match System 역할

**경기 중 실시간으로 이벤트를 기록하고, 즉시 통계를 업데이트하며, 관련 사용자에게 알림을 보내는 시스템**입니다.

흐름:
```
Goal 입력
  ↓
실시간 업데이트 (onSnapshot)
  ↓
채팅 알림
  ↓
통계 자동 업데이트
  ↓
랭킹 자동 재계산
```

### 실시간 경기 기록의 핵심

1. **즉시 반영**: 이벤트 입력 즉시 화면에 반영
2. **자동 통계**: 통계 자동 업데이트
3. **실시간 알림**: 관련 사용자에게 즉시 알림
4. **랭킹 재계산**: 랭킹 자동 재계산

---

## 2️⃣ 실시간 경기 기록 입력

### 2-1. 경기 이벤트 입력 UI

```
┌─────────────────────────────────────────┐
│ 경기 이벤트 입력                          │
│                                          │
│ 현재 시간: 45'                           │
│                                          │
│ [ 골 ] [ 어시스트 ] [ 경고 ] [ 퇴장 ]    │
│ [ 교체 ]                                 │
│                                          │
│ 선수: [선택]                             │
│ 어시스트: [선택] (선택사항)              │
│                                          │
│ [ 기록 ]                                 │
└─────────────────────────────────────────┘
```

### 2-2. 이벤트 입력 즉시 반영

```typescript
// src/components/match/LiveEventInput.tsx
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LiveEventInputProps {
  matchId: string;
  currentMinute: number;
  homeTeamId: string;
  awayTeamId: string;
}

export function LiveEventInput({ 
  matchId, 
  currentMinute, 
  homeTeamId, 
  awayTeamId 
}: LiveEventInputProps) {
  const { user } = useAuth();
  const [eventType, setEventType] = useState<"goal" | "assist" | "yellow_card" | "red_card" | "substitution">("goal");
  const [teamId, setTeamId] = useState<string>(homeTeamId);
  const [playerId, setPlayerId] = useState<string>("");
  const [assistPlayerId, setAssistPlayerId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !playerId) return;
    
    setLoading(true);
    try {
      const eventsRef = collection(db, "matches", matchId, "events");
      await addDoc(eventsRef, {
        type: eventType,
        minute: currentMinute,
        teamId,
        playerId,
        assistPlayerId: eventType === "goal" && assistPlayerId ? assistPlayerId : undefined,
        createdAt: serverTimestamp(),
      });
      
      // 입력 폼 초기화
      setPlayerId("");
      setAssistPlayerId("");
    } catch (error) {
      console.error("이벤트 기록 실패:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">경기 이벤트 입력</h3>
      
      <div className="space-y-4">
        {/* 이벤트 타입 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">이벤트 타입</label>
          <div className="flex gap-2">
            {["goal", "assist", "yellow_card", "red_card", "substitution"].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setEventType(type as any)}
                className={`px-3 py-2 rounded-lg ${
                  eventType === type
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {type === "goal" ? "골" : 
                 type === "assist" ? "어시스트" :
                 type === "yellow_card" ? "경고" :
                 type === "red_card" ? "퇴장" : "교체"}
              </button>
            ))}
          </div>
        </div>
        
        {/* 팀 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">팀</label>
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value={homeTeamId}>홈팀</option>
            <option value={awayTeamId}>원정팀</option>
          </select>
        </div>
        
        {/* 선수 선택 */}
        <div>
          <label className="block text-sm font-semibold mb-2">선수</label>
          <select
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">선수 선택</option>
            {/* 선수 목록은 팀 멤버에서 가져옴 */}
          </select>
        </div>
        
        {/* 어시스트 선택 (골인 경우만) */}
        {eventType === "goal" && (
          <div>
            <label className="block text-sm font-semibold mb-2">어시스트 (선택사항)</label>
            <select
              value={assistPlayerId}
              onChange={(e) => setAssistPlayerId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">없음</option>
              {/* 선수 목록은 팀 멤버에서 가져옴 */}
            </select>
          </div>
        )}
        
        {/* 현재 시간 */}
        <div>
          <label className="block text-sm font-semibold mb-2">시간</label>
          <div className="text-lg font-bold">{currentMinute}'</div>
        </div>
        
        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "기록 중..." : "이벤트 기록"}
        </button>
      </div>
    </form>
  );
}
```

---

## 3️⃣ 실시간 업데이트 흐름

### 3-1. 이벤트 생성 → 실시간 반영

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

### 3-2. 점수 실시간 업데이트

```typescript
// src/hooks/useMatchScore.ts
import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { MatchGame } from "@/types/matchGame";

export function useMatchScore(matchId: string) {
  const [score, setScore] = useState<{ home: number; away: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!matchId) return;
    
    const matchRef = doc(db, "matches", matchId);
    const unsubscribe = onSnapshot(
      matchRef,
      (snap) => {
        if (snap.exists()) {
          const match = snap.data() as MatchGame;
          setScore(match.score);
        }
        setLoading(false);
      },
      (error) => {
        console.error("점수 구독 오류:", error);
        setLoading(false);
      }
    );
    
    return () => unsubscribe();
  }, [matchId]);
  
  return { score, loading };
}
```

---

## 4️⃣ 알림 시스템

### 4-1. 경기 이벤트 알림

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
    
    // 경기 정보 조회
    const matchRef = db.doc(`matches/${matchId}`);
    const matchSnap = await matchRef.get();
    const matchData = matchSnap.data();
    
    if (!matchData) return;
    
    // 선수 정보 조회
    const playerRef = db.doc(`players/${eventData.playerId}`);
    const playerSnap = await playerRef.get();
    const playerData = playerSnap.data();
    
    // 알림 메시지 생성
    let notificationMessage = "";
    if (eventData.type === "goal") {
      notificationMessage = `${playerData?.name || "선수"}이(가) 골을 넣었습니다!`;
    } else if (eventData.type === "yellow_card") {
      notificationMessage = `${playerData?.name || "선수"}이(가) 경고를 받았습니다.`;
    } else if (eventData.type === "red_card") {
      notificationMessage = `${playerData?.name || "선수"}이(가) 퇴장했습니다.`;
    }
    
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
        title: notificationMessage,
        message: `${matchData.homeTeamName} vs ${matchData.awayTeamName}`,
        link: `/matches/${matchId}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false,
      });
    });
    
    await batch.commit();
    
    // 채팅 메시지 자동 생성
    const chatRoomId = `match_${matchId}`;
    const messagesRef = db.collection(`chatRooms/${chatRoomId}/messages`);
    await messagesRef.add({
      userId: "system",
      userName: "시스템",
      text: notificationMessage,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
);
```

### 4-2. 통계 자동 업데이트

```typescript
// functions/src/match/onMatchEventCreated.ts (계속)
// ... 위 코드 이후

// 선수 통계 업데이트
const seasonId = getSeasonId(new Date());
const playerStatsRef = db.doc(`players/${eventData.playerId}/stats/${seasonId}`);

if (eventData.type === "goal") {
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
  
  // 경기 점수 업데이트
  const matchRef = db.doc(`matches/${matchId}`);
  if (eventData.teamId === matchData.homeTeamId) {
    await matchRef.update({
      "score.home": admin.firestore.FieldValue.increment(1),
    });
  } else {
    await matchRef.update({
      "score.away": admin.firestore.FieldValue.increment(1),
    });
  }
}
```

---

## 5️⃣ 실제 구현 코드

### 5-1. Live Match Page

```typescript
// src/pages/match/LiveMatchPage.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useMatch } from "@/hooks/useMatch";
import { useMatchTimeline } from "@/hooks/useMatchTimeline";
import { useMatchScore } from "@/hooks/useMatchScore";
import { MatchHeader } from "@/components/match/MatchHeader";
import { MatchTimeline } from "@/components/match/MatchTimeline";
import { LiveEventInput } from "@/components/match/LiveEventInput";
import { MatchChat } from "@/components/match/MatchChat";

export default function LiveMatchPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { match, loading } = useMatch(matchId!);
  const { events } = useMatchTimeline(matchId!);
  const { score } = useMatchScore(matchId!);
  const [currentMinute, setCurrentMinute] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // 경기 시간 타이머 (실제로는 경기 시작 시간 기준으로 계산)
  useEffect(() => {
    const interval = setInterval(() => {
      if (match?.status === "live") {
        setCurrentMinute(prev => prev + 1);
      }
    }, 60000); // 1분마다 업데이트
    
    return () => clearInterval(interval);
  }, [match?.status]);
  
  if (loading) return <div>로딩 중...</div>;
  if (!match) return <div>경기를 찾을 수 없습니다</div>;
  
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <MatchHeader match={match} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 메인 영역 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 실시간 타임라인 */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">경기 타임라인</h2>
              <MatchTimeline matchId={match.id} />
            </div>
            
            {/* 관리자용 이벤트 입력 */}
            {isAdmin && match.status === "live" && (
              <LiveEventInput
                matchId={match.id}
                currentMinute={currentMinute}
                homeTeamId={match.homeTeamId}
                awayTeamId={match.awayTeamId}
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
- [ ] LiveEventInput 컴포넌트
- [ ] 실시간 타임라인 업데이트
- [ ] 실시간 점수 업데이트
- [ ] Cloud Functions 트리거

### Phase 2 (다음)
- [ ] 실시간 알림 시스템
- [ ] 채팅 자동 메시지
- [ ] 통계 자동 업데이트

### Phase 3 (확장)
- [ ] 경기 하이라이트
- [ ] 경기 분석
- [ ] 경기 리포트

---

**작성일**: 2024년  
**상태**: ✅ Live Match System 설계 완료
