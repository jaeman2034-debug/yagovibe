# 🚀 노원구 축구협회 Live Match System 완전 설계

> **실시간 경기 기록 시스템 - GameChanger/Hudl 수준 설계**

---

## 📋 목차

1. [Live Match System 전체 구조](#1-live-match-system-전체-구조)
2. [경기 상태 관리](#2-경기-상태-관리)
3. [실시간 Timeline 시스템](#3-실시간-timeline-시스템)
4. [관리자 경기 기록 UI](#4-관리자-경기-기록-ui)
5. [Firestore 데이터 구조](#5-firestore-데이터-구조)
6. [Cloud Functions 트리거](#6-cloud-functions-트리거)
7. [React 컴포넌트 구조](#7-react-컴포넌트-구조)
8. [실제 구현 코드](#8-실제-구현-코드)

---

## 1️⃣ Live Match System 전체 구조

### Live Match 모듈

```
Live Match System
 ├─ Match Status Management (경기 상태 관리)
 │   ├─ scheduled (예정)
 │   ├─ live (진행중)
 │   └─ completed (종료)
 ├─ Real-time Timeline (실시간 타임라인)
 │   ├─ Goal (득점)
 │   ├─ Assist (어시스트)
 │   ├─ Yellow Card (경고)
 │   ├─ Red Card (퇴장)
 │   ├─ Substitution (교체)
 │   └─ Other Events (기타 이벤트)
 ├─ Live Stats (실시간 통계)
 │   ├─ Possession (점유율)
 │   ├─ Shots (슛)
 │   ├─ Corners (코너킥)
 │   └─ Fouls (파울)
 ├─ Admin Recording UI (관리자 기록 UI)
 │   ├─ Event Input Forms
 │   └─ Quick Actions
 └─ Real-time Updates (실시간 업데이트)
     ├─ Match Score
     ├─ Timeline Events
     └─ Statistics
```

### URL 구조

```
/a/[associationSlug]/matches/[matchId]          # Public Live Match
/a/[associationSlug]/admin/matches/[matchId]/live  # Admin Recording
```

---

## 2️⃣ 경기 상태 관리

### Match Status 타입

**파일**: `src/types/match.ts`

```typescript
export type MatchStatus = "scheduled" | "live" | "completed" | "cancelled";

export interface Match {
  id: string;
  associationId: string;
  tournamentId: string;
  
  // 팀 정보
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  
  // 경기 상태
  status: MatchStatus;
  
  // 스코어
  homeScore?: number;
  awayScore?: number;
  
  // 시간
  scheduledAt: Timestamp;
  startedAt?: Timestamp;
  endedAt?: Timestamp;
  
  // 실시간 정보
  currentMinute?: number;  // 현재 경기 시간 (예: 45, 90)
  addedTime?: number;       // 추가 시간
  
  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 경기 상태 전환

```typescript
// 경기 시작
scheduled → live

// 경기 종료
live → completed

// 경기 취소
scheduled/live → cancelled
```

---

## 3️⃣ 실시간 Timeline 시스템

### Match Event 타입

**파일**: `src/types/matchEvent.ts`

```typescript
import { Timestamp } from "firebase/firestore";

export type MatchEventType =
  | "goal"              // 득점
  | "assist"            // 어시스트
  | "yellow_card"       // 경고
  | "red_card"          // 퇴장
  | "substitution"      // 교체
  | "penalty_goal"      // 페널티 득점
  | "own_goal"          // 자책골
  | "penalty_missed"    // 페널티 실축
  | "var_goal"          // VAR 확인 득점
  | "var_cancelled";    // VAR 취소

export interface MatchEvent {
  id: string;
  matchId: string;
  
  // 이벤트 정보
  type: MatchEventType;
  minute: number;              // 경기 시간 (예: 23, 45+2)
  addedTime?: number;          // 추가 시간 (예: 45+2의 경우 2)
  
  // 선수 정보
  playerId: string;
  playerName: string;
  playerNumber?: number;       // 등번호
  teamId: string;
  teamName: string;
  
  // 추가 정보
  assistPlayerId?: string;     // 어시스트 선수 (득점일 경우)
  assistPlayerName?: string;
  
  // 교체 정보
  playerOutId?: string;         // 교체일 경우
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  
  // 설명
  description?: string;         // 추가 설명
  
  // 메타데이터
  recordedBy: string;           // 기록한 사람 (관리자/심판)
  createdAt: Timestamp;
}
```

### Timeline 이벤트 아이콘

```typescript
const eventIcons: Record<MatchEventType, string> = {
  goal: "⚽",
  assist: "🎯",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  penalty_goal: "⚽",
  own_goal: "⚽",
  penalty_missed: "❌",
  var_goal: "⚽",
  var_cancelled: "❌",
};
```

---

## 4️⃣ 관리자 경기 기록 UI

### Live Match Recording Page

**파일**: `src/pages/admin/matches/LiveMatchRecordingPage.tsx`

```typescript
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getMatch } from "@/services/matchService";
import { LiveMatchHeader } from "@/components/match/LiveMatchHeader";
import { LiveTimeline } from "@/components/match/LiveTimeline";
import { EventRecordingPanel } from "@/components/match/EventRecordingPanel";
import { LiveStats } from "@/components/match/LiveStats";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/context/AuthProvider";
import { hasPermission } from "@/utils/permissions";

export default function LiveMatchRecordingPage() {
  const { associationSlug, matchId } = useParams<{
    associationSlug: string;
    matchId: string;
  }>();
  const { user } = useAuth();
  const [match, setMatch] = useState<Match | null>(null);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // 권한 확인
  useEffect(() => {
    const checkPermission = async () => {
      if (!user || !matchId) return;
      
      // 관리자 또는 심판 권한 확인
      const authorized = await hasPermission(user.uid, {
        type: "match",
        action: "record",
        matchId,
      });
      
      setIsAuthorized(authorized);
    };
    
    checkPermission();
  }, [user, matchId]);

  // 실시간 경기 구독
  useEffect(() => {
    if (!matchId) return;

    const matchRef = doc(db, "matches", matchId);
    const unsubscribe = onSnapshot(matchRef, (snap) => {
      if (snap.exists()) {
        setMatch({
          id: snap.id,
          ...snap.data(),
        } as Match);
      }
    });

    return () => unsubscribe();
  }, [matchId]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Card className="p-6">
          <p className="text-slate-600">경기 기록 권한이 없습니다.</p>
        </Card>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">경기를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Live Match Header */}
        <LiveMatchHeader match={match} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Timeline */}
          <div className="lg:col-span-2">
            <LiveTimeline matchId={matchId!} />
          </div>

          {/* Recording Panel */}
          <div className="lg:col-span-1">
            <EventRecordingPanel match={match} />
          </div>
        </div>

        {/* Live Stats */}
        <div className="mt-6">
          <LiveStats matchId={matchId!} />
        </div>
      </div>
    </div>
  );
}
```

---

### Event Recording Panel

**파일**: `src/components/match/EventRecordingPanel.tsx`

```typescript
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GoalForm } from "./GoalForm";
import { CardForm } from "./CardForm";
import { SubstitutionForm } from "./SubstitutionForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, AlertTriangle, RefreshCw } from "lucide-react";
import { createMatchEvent } from "@/services/matchEventService";
import { toast } from "sonner";
import type { Match } from "@/types/match";

interface EventRecordingPanelProps {
  match: Match;
}

export function EventRecordingPanel({ match }: EventRecordingPanelProps) {
  const [activeTab, setActiveTab] = useState("goal");

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          경기 기록
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="goal">
              <Trophy className="h-4 w-4 mr-1" />
              득점
            </TabsTrigger>
            <TabsTrigger value="card">
              <AlertTriangle className="h-4 w-4 mr-1" />
              카드
            </TabsTrigger>
            <TabsTrigger value="substitution">
              <RefreshCw className="h-4 w-4 mr-1" />
              교체
            </TabsTrigger>
          </TabsList>

          <TabsContent value="goal" className="mt-4">
            <GoalForm match={match} />
          </TabsContent>

          <TabsContent value="card" className="mt-4">
            <CardForm match={match} />
          </TabsContent>

          <TabsContent value="substitution" className="mt-4">
            <SubstitutionForm match={match} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
```

---

### Goal Form

**파일**: `src/components/match/GoalForm.tsx`

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getTeamPlayers } from "@/services/teamService";
import { createMatchEvent } from "@/services/matchEventService";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import type { Match } from "@/types/match";

interface GoalFormProps {
  match: Match;
}

export function GoalForm({ match }: GoalFormProps) {
  const { user } = useAuth();
  const [minute, setMinute] = useState("");
  const [teamId, setTeamId] = useState(match.homeTeamId);
  const [playerId, setPlayerId] = useState("");
  const [assistPlayerId, setAssistPlayerId] = useState("");
  const [isPenalty, setIsPenalty] = useState(false);
  const [isOwnGoal, setIsOwnGoal] = useState(false);
  const [loading, setLoading] = useState(false);

  // 팀 선수 목록 조회
  const { data: homePlayers } = useQuery({
    queryKey: ["teamPlayers", match.homeTeamId],
    queryFn: () => getTeamPlayers(match.homeTeamId),
  });

  const { data: awayPlayers } = useQuery({
    queryKey: ["teamPlayers", match.awayTeamId],
    queryFn: () => getTeamPlayers(match.awayTeamId),
  });

  const players = teamId === match.homeTeamId ? homePlayers : awayPlayers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!minute || !playerId || !user) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const player = players?.find((p) => p.id === playerId);
      if (!player) {
        toast.error("선수를 찾을 수 없습니다.");
        return;
      }

      await createMatchEvent({
        matchId: match.id,
        type: isOwnGoal ? "own_goal" : isPenalty ? "penalty_goal" : "goal",
        minute: parseInt(minute),
        playerId,
        playerName: player.name,
        playerNumber: player.jerseyNumber,
        teamId,
        teamName: teamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName,
        assistPlayerId: assistPlayerId || undefined,
        assistPlayerName: assistPlayerId
          ? players?.find((p) => p.id === assistPlayerId)?.name
          : undefined,
        recordedBy: user.uid,
      });

      toast.success("득점이 기록되었습니다!");
      
      // 폼 초기화
      setMinute("");
      setPlayerId("");
      setAssistPlayerId("");
      setIsPenalty(false);
      setIsOwnGoal(false);
    } catch (error: any) {
      console.error("득점 기록 실패:", error);
      toast.error("득점 기록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 팀 선택 */}
      <div>
        <Label>팀</Label>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={match.homeTeamId}>
              {match.homeTeamName}
            </SelectItem>
            <SelectItem value={match.awayTeamId}>
              {match.awayTeamName}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 시간 */}
      <div>
        <Label>경기 시간 (분)</Label>
        <Input
          type="number"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          placeholder="23"
          min="0"
          max="120"
          required
        />
      </div>

      {/* 득점 선수 */}
      <div>
        <Label>득점 선수</Label>
        <Select value={playerId} onValueChange={setPlayerId} required>
          <SelectTrigger>
            <SelectValue placeholder="선수 선택" />
          </SelectTrigger>
          <SelectContent>
            {players?.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                #{player.jerseyNumber} {player.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 어시스트 선수 */}
      <div>
        <Label>어시스트 선수 (선택)</Label>
        <Select
          value={assistPlayerId}
          onValueChange={setAssistPlayerId}
        >
          <SelectTrigger>
            <SelectValue placeholder="어시스트 없음" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">어시스트 없음</SelectItem>
            {players?.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                #{player.jerseyNumber} {player.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 옵션 */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="penalty"
            checked={isPenalty}
            onChange={(e) => setIsPenalty(e.target.checked)}
          />
          <Label htmlFor="penalty" className="font-normal">
            페널티 킥
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ownGoal"
            checked={isOwnGoal}
            onChange={(e) => setIsOwnGoal(e.target.checked)}
          />
          <Label htmlFor="ownGoal" className="font-normal">
            자책골
          </Label>
        </div>
      </div>

      {/* 제출 버튼 */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "기록 중..." : "⚽ 득점 기록"}
      </Button>
    </form>
  );
}
```

---

### Card Form

**파일**: `src/components/match/CardForm.tsx`

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getTeamPlayers } from "@/services/teamService";
import { createMatchEvent } from "@/services/matchEventService";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import type { Match } from "@/types/match";

interface CardFormProps {
  match: Match;
}

export function CardForm({ match }: CardFormProps) {
  const { user } = useAuth();
  const [minute, setMinute] = useState("");
  const [teamId, setTeamId] = useState(match.homeTeamId);
  const [playerId, setPlayerId] = useState("");
  const [cardType, setCardType] = useState<"yellow_card" | "red_card">("yellow_card");
  const [loading, setLoading] = useState(false);

  const { data: homePlayers } = useQuery({
    queryKey: ["teamPlayers", match.homeTeamId],
    queryFn: () => getTeamPlayers(match.homeTeamId),
  });

  const { data: awayPlayers } = useQuery({
    queryKey: ["teamPlayers", match.awayTeamId],
    queryFn: () => getTeamPlayers(match.awayTeamId),
  });

  const players = teamId === match.homeTeamId ? homePlayers : awayPlayers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!minute || !playerId || !user) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const player = players?.find((p) => p.id === playerId);
      if (!player) {
        toast.error("선수를 찾을 수 없습니다.");
        return;
      }

      await createMatchEvent({
        matchId: match.id,
        type: cardType,
        minute: parseInt(minute),
        playerId,
        playerName: player.name,
        playerNumber: player.jerseyNumber,
        teamId,
        teamName: teamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName,
        recordedBy: user.uid,
      });

      toast.success(`${cardType === "yellow_card" ? "경고" : "퇴장"}가 기록되었습니다!`);
      
      // 폼 초기화
      setMinute("");
      setPlayerId("");
    } catch (error: any) {
      console.error("카드 기록 실패:", error);
      toast.error("카드 기록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 팀 선택 */}
      <div>
        <Label>팀</Label>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={match.homeTeamId}>
              {match.homeTeamName}
            </SelectItem>
            <SelectItem value={match.awayTeamId}>
              {match.awayTeamName}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 카드 타입 */}
      <div>
        <Label>카드 타입</Label>
        <Select
          value={cardType}
          onValueChange={(v) => setCardType(v as "yellow_card" | "red_card")}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="yellow_card">🟨 경고</SelectItem>
            <SelectItem value="red_card">🟥 퇴장</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 시간 */}
      <div>
        <Label>경기 시간 (분)</Label>
        <Input
          type="number"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          placeholder="45"
          min="0"
          max="120"
          required
        />
      </div>

      {/* 선수 선택 */}
      <div>
        <Label>선수</Label>
        <Select value={playerId} onValueChange={setPlayerId} required>
          <SelectTrigger>
            <SelectValue placeholder="선수 선택" />
          </SelectTrigger>
          <SelectContent>
            {players?.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                #{player.jerseyNumber} {player.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 제출 버튼 */}
      <Button
        type="submit"
        className="w-full"
        disabled={loading}
        variant={cardType === "red_card" ? "destructive" : "default"}
      >
        {loading
          ? "기록 중..."
          : cardType === "yellow_card"
          ? "🟨 경고 기록"
          : "🟥 퇴장 기록"}
      </Button>
    </form>
  );
}
```

---

### Substitution Form

**파일**: `src/components/match/SubstitutionForm.tsx`

```typescript
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { getTeamPlayers } from "@/services/teamService";
import { createMatchEvent } from "@/services/matchEventService";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthProvider";
import type { Match } from "@/types/match";

interface SubstitutionFormProps {
  match: Match;
}

export function SubstitutionForm({ match }: SubstitutionFormProps) {
  const { user } = useAuth();
  const [minute, setMinute] = useState("");
  const [teamId, setTeamId] = useState(match.homeTeamId);
  const [playerOutId, setPlayerOutId] = useState("");
  const [playerInId, setPlayerInId] = useState("");
  const [loading, setLoading] = useState(false);

  const { data: homePlayers } = useQuery({
    queryKey: ["teamPlayers", match.homeTeamId],
    queryFn: () => getTeamPlayers(match.homeTeamId),
  });

  const { data: awayPlayers } = useQuery({
    queryKey: ["teamPlayers", match.awayTeamId],
    queryFn: () => getTeamPlayers(match.awayTeamId),
  });

  const players = teamId === match.homeTeamId ? homePlayers : awayPlayers;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!minute || !playerOutId || !playerInId || !user) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    if (playerOutId === playerInId) {
      toast.error("교체 선수는 서로 달라야 합니다.");
      return;
    }

    setLoading(true);
    try {
      const playerOut = players?.find((p) => p.id === playerOutId);
      const playerIn = players?.find((p) => p.id === playerInId);

      if (!playerOut || !playerIn) {
        toast.error("선수를 찾을 수 없습니다.");
        return;
      }

      await createMatchEvent({
        matchId: match.id,
        type: "substitution",
        minute: parseInt(minute),
        playerId: playerInId,
        playerName: playerIn.name,
        playerNumber: playerIn.jerseyNumber,
        teamId,
        teamName: teamId === match.homeTeamId ? match.homeTeamName : match.awayTeamName,
        playerOutId,
        playerOutName: playerOut.name,
        playerInId,
        playerInName: playerIn.name,
        recordedBy: user.uid,
      });

      toast.success("교체가 기록되었습니다!");
      
      // 폼 초기화
      setMinute("");
      setPlayerOutId("");
      setPlayerInId("");
    } catch (error: any) {
      console.error("교체 기록 실패:", error);
      toast.error("교체 기록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 팀 선택 */}
      <div>
        <Label>팀</Label>
        <Select value={teamId} onValueChange={setTeamId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={match.homeTeamId}>
              {match.homeTeamName}
            </SelectItem>
            <SelectItem value={match.awayTeamId}>
              {match.awayTeamName}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* 시간 */}
      <div>
        <Label>경기 시간 (분)</Label>
        <Input
          type="number"
          value={minute}
          onChange={(e) => setMinute(e.target.value)}
          placeholder="61"
          min="0"
          max="120"
          required
        />
      </div>

      {/* 교체 아웃 */}
      <div>
        <Label>교체 아웃</Label>
        <Select value={playerOutId} onValueChange={setPlayerOutId} required>
          <SelectTrigger>
            <SelectValue placeholder="선수 선택" />
          </SelectTrigger>
          <SelectContent>
            {players?.map((player) => (
              <SelectItem key={player.id} value={player.id}>
                #{player.jerseyNumber} {player.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 교체 인 */}
      <div>
        <Label>교체 인</Label>
        <Select value={playerInId} onValueChange={setPlayerInId} required>
          <SelectTrigger>
            <SelectValue placeholder="선수 선택" />
          </SelectTrigger>
          <SelectContent>
            {players
              ?.filter((p) => p.id !== playerOutId)
              .map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  #{player.jerseyNumber} {player.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* 제출 버튼 */}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "기록 중..." : "🔄 교체 기록"}
      </Button>
    </form>
  );
}
```

---

## 5️⃣ Firestore 데이터 구조

### match_events 컬렉션

**경로**: `matches/{matchId}/events/{eventId}`

또는 전역: `match_events/{eventId}` (matchId 필드 포함)

```typescript
// match_events/{eventId}
{
  id: string;
  matchId: string;
  
  // 이벤트 정보
  type: "goal",
  minute: 23,
  addedTime?: 2,  // 45+2의 경우
  
  // 선수 정보
  playerId: string;
  playerName: string;
  playerNumber: 10,
  teamId: string;
  teamName: string;
  
  // 추가 정보
  assistPlayerId?: string;
  assistPlayerName?: string;
  
  // 교체 정보
  playerOutId?: string;
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  
  // 설명
  description?: string;
  
  // 메타데이터
  recordedBy: string;
  createdAt: Timestamp,
}
```

### 인덱스

```javascript
// Firestore 인덱스
{
  collectionGroup: "match_events",
  fields: [
    { field: "matchId", order: "ASCENDING" },
    { field: "minute", order: "ASCENDING" },
    { field: "createdAt", order: "ASCENDING" }
  ]
}
```

---

## 6️⃣ Cloud Functions 트리거

### 6-1. 이벤트 생성 시 자동 처리

**파일**: `functions/src/match/onMatchEventCreated.ts`

```typescript
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { createActivity } from "../activities/activityService";

const db = getFirestore();

/**
 * 경기 이벤트 생성 시 자동 처리
 */
export const onMatchEventCreated = onDocumentCreated(
  {
    document: "match_events/{eventId}",
    region: "asia-northeast3",
  },
  async (event) => {
    const eventData = event.data?.data();
    if (!eventData) {
      return;
    }

    const eventId = event.params.eventId;
    const matchId = eventData.matchId;
    const eventType = eventData.type;

    logger.info(`[onMatchEventCreated] 이벤트 생성: ${eventType} (${eventId})`);

    try {
      // 경기 정보 조회
      const matchDoc = await db.collection("matches").doc(matchId).get();
      const matchData = matchDoc.data();
      if (!matchData) {
        return;
      }

      // 득점일 경우 스코어 업데이트
      if (eventType === "goal" || eventType === "penalty_goal") {
        const isHomeTeam = eventData.teamId === matchData.homeTeamId;
        
        await db.collection("matches").doc(matchId).update({
          [isHomeTeam ? "homeScore" : "awayScore"]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info(`[onMatchEventCreated] 스코어 업데이트: ${matchId}`);
      }

      // 자책골일 경우 상대팀 스코어 업데이트
      if (eventType === "own_goal") {
        const isHomeTeam = eventData.teamId === matchData.homeTeamId;
        
        await db.collection("matches").doc(matchId).update({
          [isHomeTeam ? "awayScore" : "homeScore"]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });

        logger.info(`[onMatchEventCreated] 자책골 스코어 업데이트: ${matchId}`);
      }

      // Activity 생성 (득점, 해트트릭 등)
      if (eventType === "goal" || eventType === "penalty_goal") {
        // 해당 경기에서의 득점 수 확인
        const goalsQuery = await db
          .collection("match_events")
          .where("matchId", "==", matchId)
          .where("type", "in", ["goal", "penalty_goal"])
          .where("playerId", "==", eventData.playerId)
          .get();

        const goalCount = goalsQuery.size;

        await createActivity({
          type: goalCount === 3 ? "hat_trick" : "goal_scored",
          associationId: matchData.associationId,
          actorType: "player",
          actorId: eventData.playerId,
          actorName: eventData.playerName,
          entityType: "match",
          entityId: matchId,
          entityName: `${matchData.homeTeamName} vs ${matchData.awayTeamName}`,
          message: goalCount === 3
            ? `${eventData.playerName}이 해트트릭을 기록했습니다! 🎉`
            : `${eventData.playerName}이 ${eventData.minute}분에 득점했습니다`,
          summary: `${eventData.teamName} ${eventData.minute}분`,
          metadata: {
            playerId: eventData.playerId,
            goalCount,
            minute: eventData.minute,
            matchId,
          },
          linkUrl: `/a/${matchData.associationSlug}/matches/${matchId}`,
          visibility: "public",
        });
      }

      logger.info(`[onMatchEventCreated] 처리 완료: ${eventId}`);
    } catch (error: any) {
      logger.error(`[onMatchEventCreated] 처리 실패: ${error.message}`);
    }
  }
);
```

---

## 7️⃣ React 컴포넌트 구조

### 7-1. Live Timeline 컴포넌트

**파일**: `src/components/match/LiveTimeline.tsx`

```typescript
import { useEffect, useState } from "react";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TimelineItem } from "./TimelineItem";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Radio } from "lucide-react";
import type { MatchEvent } from "@/types/matchEvent";

interface LiveTimelineProps {
  matchId: string;
}

export function LiveTimeline({ matchId }: LiveTimelineProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 실시간 이벤트 구독
    const eventsRef = collection(db, "match_events");
    const q = query(
      eventsRef,
      where("matchId", "==", matchId),
      orderBy("minute", "asc"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MatchEvent[];

        setEvents(items);
        setLoading(false);
      },
      (error) => {
        console.error("Timeline 구독 오류:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-slate-500">타임라인을 불러오는 중...</p>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5" />
            경기 타임라인
          </CardTitle>
        </CardHeader>
        <CardContent className="py-12 text-center text-slate-500">
          아직 경기 이벤트가 없습니다.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Radio className="h-5 w-5" />
          경기 타임라인
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {events.map((event) => (
            <TimelineItem key={event.id} event={event} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 7-2. Timeline Item 컴포넌트

**파일**: `src/components/match/TimelineItem.tsx`

```typescript
import { MatchEvent, MatchEventType } from "@/types/matchEvent";

interface TimelineItemProps {
  event: MatchEvent;
}

const eventIcons: Record<MatchEventType, string> = {
  goal: "⚽",
  assist: "🎯",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  penalty_goal: "⚽",
  own_goal: "⚽",
  penalty_missed: "❌",
  var_goal: "⚽",
  var_cancelled: "❌",
};

const eventColors: Record<MatchEventType, string> = {
  goal: "text-emerald-600 bg-emerald-50",
  assist: "text-blue-600 bg-blue-50",
  yellow_card: "text-yellow-600 bg-yellow-50",
  red_card: "text-red-600 bg-red-50",
  substitution: "text-purple-600 bg-purple-50",
  penalty_goal: "text-emerald-600 bg-emerald-50",
  own_goal: "text-orange-600 bg-orange-50",
  penalty_missed: "text-gray-600 bg-gray-50",
  var_goal: "text-emerald-600 bg-emerald-50",
  var_cancelled: "text-gray-600 bg-gray-50",
};

export function TimelineItem({ event }: TimelineItemProps) {
  const icon = eventIcons[event.type];
  const colorClass = eventColors[event.type] || "text-slate-600 bg-slate-50";
  const minuteLabel = event.addedTime
    ? `${event.minute}+${event.addedTime}`
    : `${event.minute}`;

  return (
    <div className="flex items-start gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:shadow-sm transition-shadow">
      {/* 시간 */}
      <div className="flex-shrink-0">
        <div className="rounded-lg bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
          {minuteLabel}'
        </div>
      </div>

      {/* 이벤트 아이콘 */}
      <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${colorClass}`}>
        <span className="text-xl">{icon}</span>
      </div>

      {/* 이벤트 정보 */}
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-slate-900">
          {event.playerName}
          {event.playerNumber && ` (#${event.playerNumber})`}
        </div>
        <div className="text-sm text-slate-600">{event.teamName}</div>
        
        {/* 어시스트 */}
        {event.assistPlayerName && (
          <div className="text-xs text-slate-500 mt-1">
            어시스트: {event.assistPlayerName}
          </div>
        )}
        
        {/* 교체 */}
        {event.type === "substitution" && event.playerOutName && (
          <div className="text-xs text-slate-500 mt-1">
            {event.playerOutName} → {event.playerInName}
          </div>
        )}
        
        {/* 설명 */}
        {event.description && (
          <div className="text-xs text-slate-500 mt-1">{event.description}</div>
        )}
      </div>
    </div>
  );
}
```

---

### 7-3. Live Match Header

**파일**: `src/components/match/LiveMatchHeader.tsx`

```typescript
import { Match } from "@/types/match";
import { LiveBadge } from "./LiveBadge";

interface LiveMatchHeaderProps {
  match: Match;
}

export function LiveMatchHeader({ match }: LiveMatchHeaderProps) {
  const isLive = match.status === "live";

  return (
    <div className="bg-white border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {match.homeTeamName} vs {match.awayTeamName}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {match.tournamentName}
          </p>
        </div>
        {isLive && <LiveBadge />}
      </div>

      {/* 스코어 */}
      <div className="text-center py-6">
        <div className="text-5xl font-bold text-slate-900">
          {match.homeScore || 0} : {match.awayScore || 0}
        </div>
        {isLive && match.currentMinute !== undefined && (
          <div className="text-sm text-slate-500 mt-2">
            {match.currentMinute}분
            {match.addedTime && ` +${match.addedTime}`}
          </div>
        )}
      </div>
    </div>
  );
}
```

---

### 7-4. Live Badge

**파일**: `src/components/match/LiveBadge.tsx`

```typescript
export function LiveBadge() {
  return (
    <span className="flex items-center gap-2 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white animate-pulse">
      <span className="h-2 w-2 rounded-full bg-white" />
      LIVE
    </span>
  );
}
```

---

## 8️⃣ 실제 구현 코드

### 8-1. Match Event Service

**파일**: `src/services/matchEventService.ts`

```typescript
import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db, serverTimestamp } from "@/lib/firebase";
import type { MatchEvent, MatchEventType } from "@/types/matchEvent";

interface CreateMatchEventInput {
  matchId: string;
  type: MatchEventType;
  minute: number;
  addedTime?: number;
  playerId: string;
  playerName: string;
  playerNumber?: number;
  teamId: string;
  teamName: string;
  assistPlayerId?: string;
  assistPlayerName?: string;
  playerOutId?: string;
  playerOutName?: string;
  playerInId?: string;
  playerInName?: string;
  description?: string;
  recordedBy: string;
}

/**
 * 경기 이벤트 생성
 */
export async function createMatchEvent(
  input: CreateMatchEventInput
): Promise<string> {
  const eventData: Omit<MatchEvent, "id"> = {
    matchId: input.matchId,
    type: input.type,
    minute: input.minute,
    addedTime: input.addedTime,
    playerId: input.playerId,
    playerName: input.playerName,
    playerNumber: input.playerNumber,
    teamId: input.teamId,
    teamName: input.teamName,
    assistPlayerId: input.assistPlayerId,
    assistPlayerName: input.assistPlayerName,
    playerOutId: input.playerOutId,
    playerOutName: input.playerOutName,
    playerInId: input.playerInId,
    playerInName: input.playerInName,
    description: input.description,
    recordedBy: input.recordedBy,
    createdAt: serverTimestamp() as any,
  };

  const eventsRef = collection(db, "match_events");
  const docRef = await addDoc(eventsRef, eventData);

  return docRef.id;
}

/**
 * 경기 이벤트 목록 조회
 */
export async function getMatchEvents(matchId: string): Promise<MatchEvent[]> {
  const eventsRef = collection(db, "match_events");
  const q = query(
    eventsRef,
    where("matchId", "==", matchId),
    orderBy("minute", "asc"),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MatchEvent[];
}

/**
 * 경기 이벤트 단일 조회
 */
export async function getMatchEvent(
  eventId: string
): Promise<MatchEvent | null> {
  const eventRef = doc(db, "match_events", eventId);
  const snapshot = await getDoc(eventRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as MatchEvent;
}
```

---

## ✅ 구현 체크리스트

### Phase 1: Live Match 기본 (MVP)
- [ ] `MatchEvent` 타입 정의
- [ ] `match_events` Firestore 컬렉션 구조 설계
- [ ] `LiveTimeline` 컴포넌트 구현
- [ ] `TimelineItem` 컴포넌트 구현
- [ ] `matchEventService.ts` 작성

### Phase 2: 관리자 기록 UI
- [ ] `LiveMatchRecordingPage` 구현
- [ ] `EventRecordingPanel` 구현
- [ ] `GoalForm` 구현
- [ ] `CardForm` 구현
- [ ] `SubstitutionForm` 구현

### Phase 3: Cloud Functions 트리거
- [ ] `onMatchEventCreated` 구현
- [ ] 자동 스코어 업데이트
- [ ] Activity Feed 연결

### Phase 4: 실시간 업데이트
- [ ] Live Match Header 구현
- [ ] Live Badge 구현
- [ ] 실시간 스코어 업데이트
- [ ] 실시간 Timeline 업데이트

---

**작성일**: 2024년  
**상태**: ✅ 설계 완료 (개발 시작 가능)
