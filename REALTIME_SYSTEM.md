# 🔴 Realtime System 설계

## 📋 목차

1. [개요](#1-개요)
2. [Live Score](#2-live-score)
3. [Live Match Update](#3-live-match-update)
4. [Realtime Leaderboard](#4-realtime-leaderboard)
5. [구현 패턴](#5-구현-패턴)
6. [성능 최적화](#6-성능-최적화)

---

## 1️⃣ 개요

### 목표

```text
관리 시스템 → 스포츠 라이브 플랫폼
```

### 핵심 기능

1. **Live Score**: 실시간 점수 업데이트
2. **Live Match Update**: 경기 상태 실시간 반영
3. **Realtime Leaderboard**: 리더보드 실시간 갱신

### 기술 스택

- **Firestore onSnapshot**: 실시간 리스너
- **React Hooks**: 상태 관리
- **Optimistic Updates**: 즉각적인 UI 반영

---

## 2️⃣ Live Score

### 기능

- 경기 점수 실시간 업데이트
- 경기 상태 변경 감지
- 승자 자동 계산

### 구현 위치

```
src/hooks/useLiveMatch.ts
src/components/live/LiveScore.tsx
```

### Firestore 리스너

```ts
onSnapshot(
  doc(db, "event_matches", matchId),
  (snapshot) => {
    const match = snapshot.data();
    // 점수 업데이트
  }
)
```

### UI 컴포넌트

```tsx
<LiveScore
  matchId={matchId}
  homeTeam="노원FC"
  awayTeam="강북FC"
/>
```

---

## 3️⃣ Live Match Update

### 기능

- 경기 상태 변경 감지
- 경기 일정 변경 감지
- 경기 결과 업데이트

### 구현 위치

```
src/hooks/useLiveMatch.ts
src/components/live/LiveMatchCard.tsx
```

### 상태 변화 감지

```ts
onSnapshot(
  doc(db, "event_matches", matchId),
  (snapshot) => {
    const match = snapshot.data();
    
    // 상태 변화 감지
    if (match.status === "live") {
      // 라이브 모드 활성화
    }
    
    if (match.status === "completed") {
      // 완료 처리
    }
  }
)
```

---

## 4️⃣ Realtime Leaderboard

### 기능

- 리더보드 실시간 갱신
- 순위 변화 감지
- 득점/도움 실시간 반영

### 구현 위치

```
src/hooks/useLiveLeaderboard.ts
src/components/live/LiveLeaderboard.tsx
```

### Firestore 리스너

```ts
onSnapshot(
  query(
    collection(db, "leaderboards"),
    where("eventId", "==", eventId),
    where("type", "==", "goals"),
    orderBy("value", "desc"),
    limit(10)
  ),
  (snapshot) => {
    const leaderboard = snapshot.docs.map(doc => doc.data());
    // 리더보드 업데이트
  }
)
```

### UI 컴포넌트

```tsx
<LiveLeaderboard
  eventId={eventId}
  category="goals"
  limit={10}
/>
```

---

## 5️⃣ 구현 패턴

### Hook 패턴

```tsx
export function useLiveMatch(matchId: string) {
  const [match, setMatch] = useState<EventMatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) return;

    const matchRef = doc(db, "event_matches", matchId);
    const unsubscribe = onSnapshot(
      matchRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setMatch({
            id: snapshot.id,
            ...snapshot.data(),
          } as EventMatch);
        }
        setLoading(false);
      },
      (error) => {
        console.error("Live match 구독 실패:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [matchId]);

  return { match, loading };
}
```

### 컴포넌트 패턴

```tsx
export function LiveScore({ matchId }: { matchId: string }) {
  const { match, loading } = useLiveMatch(matchId);

  if (loading) return <Skeleton />;
  if (!match) return null;

  return (
    <div className="live-score">
      <div className="home-score">{match.score?.home || 0}</div>
      <div className="vs">vs</div>
      <div className="away-score">{match.score?.away || 0}</div>
      {match.status === "live" && (
        <div className="live-indicator">LIVE</div>
      )}
    </div>
  );
}
```

---

## 6️⃣ 성능 최적화

### 1. 리스너 최소화

```ts
// ❌ 나쁜 예: 모든 경기 구독
matches.forEach(match => {
  onSnapshot(doc(db, "event_matches", match.id), ...);
});

// ✅ 좋은 예: 필요한 경기만 구독
const activeMatchIds = matches
  .filter(m => m.status === "live")
  .map(m => m.id);
```

### 2. Debounce 업데이트

```ts
const debouncedUpdate = useMemo(
  () => debounce((data) => {
    updateUI(data);
  }, 500),
  []
);
```

### 3. 메모이제이션

```tsx
const memoizedLeaderboard = useMemo(
  () => leaderboard.map(item => ({
    ...item,
    rank: calculateRank(item),
  })),
  [leaderboard]
);
```

### 4. 조건부 구독

```tsx
const shouldSubscribe = match.status === "live" || match.status === "scheduled";

useEffect(() => {
  if (!shouldSubscribe) return;
  
  const unsubscribe = onSnapshot(...);
  return () => unsubscribe();
}, [shouldSubscribe]);
```

---

## 📁 파일 구조

```
src/
├── hooks/
│   ├── useLiveMatch.ts
│   ├── useLiveLeaderboard.ts
│   └── useLiveEvent.ts
├── components/
│   └── live/
│       ├── LiveScore.tsx
│       ├── LiveMatchCard.tsx
│       └── LiveLeaderboard.tsx
└── services/
    └── liveService.ts
```

---

## 🚀 사용 예시

### Live Score

```tsx
function MatchPage() {
  const { matchId } = useParams();
  const { match } = useLiveMatch(matchId!);

  return (
    <div>
      <LiveScore matchId={matchId!} />
      {match?.status === "live" && (
        <LiveUpdates matchId={matchId!} />
      )}
    </div>
  );
}
```

### Live Leaderboard

```tsx
function EventStatsPage() {
  const { eventId } = useParams();
  const { leaderboard } = useLiveLeaderboard(eventId!, "goals");

  return (
    <LiveLeaderboard
      leaderboard={leaderboard}
      category="goals"
    />
  );
}
```

---

## 📚 참고

- Firestore 실시간 리스너: [Firestore Documentation](https://firebase.google.com/docs/firestore/query-data/listen)
- 전체 시스템 아키텍처: [PLATFORM_ARCHITECTURE.md](PLATFORM_ARCHITECTURE.md)
