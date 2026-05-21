# 🔥 YAGO VIBE SPORTS - Realtime 데이터 전략

> **작성일**: 2024년  
> **목적**: 실시간 구독 vs 조회형 패턴 가이드

---

## 📋 핵심 원칙

```
채팅 / 출석 / 활동피드 = realtime (onSnapshot)
목록 / 검색 / 통계 = fetch (getDocs)
```

---

## ✅ 실시간 onSnapshot 권장

### 1. Chat Messages

```typescript
// src/hooks/useChatMessages.ts
export function useChatMessages(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  
  useEffect(() => {
    if (!roomId) return;
    
    const messagesRef = collection(db, "chatRooms", roomId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "desc"), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(data.reverse()); // 최신순으로 표시
    });
    
    return () => unsubscribe();
  }, [roomId]);
  
  return { messages };
}
```

**이유**: 채팅은 실시간성이 핵심

---

### 2. Team Activities

```typescript
// src/hooks/useTeamActivities.ts
export function useTeamActivities(teamId: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  
  useEffect(() => {
    if (!teamId) return;
    
    const activitiesRef = collection(db, "teams", teamId, "activities");
    const q = query(
      activitiesRef,
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Activity[];
      setActivities(data);
    });
    
    return () => unsubscribe();
  }, [teamId]);
  
  return { activities };
}
```

**이유**: 활동 피드는 실시간 업데이트가 중요

---

### 3. Team Events (출석 체크)

```typescript
// src/hooks/useTeamEvent.ts
export function useTeamEvent(teamId: string, eventId: string) {
  const [event, setEvent] = useState<Event | null>(null);
  
  useEffect(() => {
    if (!teamId || !eventId) return;
    
    const eventRef = doc(db, "teams", teamId, "events", eventId);
    const unsubscribe = onSnapshot(eventRef, (snap) => {
      if (snap.exists()) {
        setEvent({ id: snap.id, ...snap.data() } as Event);
      }
    });
    
    return () => unsubscribe();
  }, [teamId, eventId]);
  
  return { event };
}
```

**이유**: 참석자 수 실시간 업데이트 필요

---

### 4. Team Notices

```typescript
// src/hooks/useTeamNotices.ts
export function useTeamNotices(teamId: string) {
  const [notices, setNotices] = useState<Notice[]>([]);
  
  useEffect(() => {
    if (!teamId) return;
    
    const noticesRef = collection(db, "teams", teamId, "notices");
    const q = query(noticesRef, orderBy("createdAt", "desc"), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notice[];
      setNotices(data);
    });
    
    return () => unsubscribe();
  }, [teamId]);
  
  return { notices };
}
```

**이유**: 공지 실시간 업데이트 필요

---

### 5. Team Members

```typescript
// src/hooks/useTeamMembers.ts
export function useTeamMembers(teamId: string) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  
  useEffect(() => {
    if (!teamId) return;
    
    const membersRef = collection(db, "teams", teamId, "members");
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamMember[];
      setMembers(data);
    });
    
    return () => unsubscribe();
  }, [teamId]);
  
  return { members };
}
```

**이유**: 멤버 추가/제거 실시간 반영 필요

---

## 📥 조회형 getDocs 권장

### 1. 대회 목록

```typescript
// src/services/tournamentService.ts
export async function getTournaments(options?: {
  status?: string;
  limit?: number;
}): Promise<Tournament[]> {
  const tournamentsRef = collection(db, "tournaments");
  let q = query(tournamentsRef, orderBy("createdAt", "desc"));
  
  if (options?.status) {
    q = query(q, where("status", "==", options.status));
  }
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Tournament[];
}
```

**이유**: 대회 목록은 자주 변경되지 않음

---

### 2. 선수 디렉토리

```typescript
// src/services/playerService.ts
export async function getPlayers(options?: {
  teamId?: string;
  position?: string;
  limit?: number;
}): Promise<Player[]> {
  const playersRef = collection(db, "players");
  let q = query(playersRef);
  
  if (options?.teamId) {
    q = query(q, where("teamId", "==", options.teamId));
  }
  
  if (options?.position) {
    q = query(q, where("position", "==", options.position));
  }
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Player[];
}
```

**이유**: 선수 목록은 검색/필터링 중심

---

### 3. 통계 페이지

```typescript
// src/services/statsService.ts
export async function getTeamStats(
  teamId: string,
  seasonId: string
): Promise<TeamStats | null> {
  const statsRef = doc(db, "teams", teamId, "stats", seasonId);
  const statsSnap = await getDoc(statsRef);
  
  if (!statsSnap.exists()) {
    return null;
  }
  
  return {
    id: statsSnap.id,
    ...statsSnap.data()
  } as TeamStats;
}
```

**이유**: 통계는 Cloud Functions로 자동 업데이트되므로 조회만 필요

---

### 4. 랭킹 페이지

```typescript
// src/services/rankingService.ts
export async function getTeamRanking(
  seasonId: string,
  limit?: number
): Promise<TeamRanking[]> {
  const rankingRef = collection(db, "rankings", seasonId, "teams");
  let q = query(rankingRef, orderBy("rank", "asc"));
  
  if (limit) {
    q = query(q, limit(limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as TeamRanking[];
}
```

**이유**: 랭킹은 Cloud Functions로 자동 계산되므로 조회만 필요

---

### 5. 아카데미 목록

```typescript
// src/services/academyService.ts
export async function getAcademies(options?: {
  sport?: string;
  region?: string;
  limit?: number;
}): Promise<Academy[]> {
  const academiesRef = collection(db, "academies");
  let q = query(academiesRef);
  
  if (options?.sport) {
    q = query(q, where("sport", "==", options.sport));
  }
  
  if (options?.region) {
    q = query(q, where("region", "==", options.region));
  }
  
  if (options?.limit) {
    q = query(q, limit(options.limit));
  }
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as Academy[];
}
```

**이유**: 아카데미 목록은 검색/필터링 중심

---

## ⚡ 성능 최적화

### 1. 구독 해제 필수

```typescript
// ✅ 좋은 예: useEffect cleanup
useEffect(() => {
  const unsubscribe = onSnapshot(...);
  return () => unsubscribe(); // 필수!
}, [dependencies]);
```

### 2. 조건부 구독

```typescript
// ✅ 좋은 예: 필요한 경우만 구독
useEffect(() => {
  if (!teamId || !isActive) return; // 조건 체크
  
  const unsubscribe = onSnapshot(...);
  return () => unsubscribe();
}, [teamId, isActive]);
```

### 3. 페이지네이션

```typescript
// ✅ 좋은 예: limit으로 데이터 양 제한
const q = query(
  collection(db, "teams", teamId, "activities"),
  orderBy("createdAt", "desc"),
  limit(20) // 최대 20개만 구독
);
```

---

## 📊 패턴 요약

| 데이터 타입 | 패턴 | 이유 |
|------------|------|------|
| Chat Messages | onSnapshot | 실시간 대화 |
| Team Activities | onSnapshot | 실시간 활동 피드 |
| Team Events | onSnapshot | 실시간 출석 체크 |
| Team Notices | onSnapshot | 실시간 공지 |
| Team Members | onSnapshot | 실시간 멤버 변경 |
| Tournament List | getDocs | 자주 변경 안 됨 |
| Player Directory | getDocs | 검색 중심 |
| Stats | getDocs | 자동 업데이트 |
| Ranking | getDocs | 자동 계산 |
| Academy List | getDocs | 검색 중심 |

---

**작성일**: 2024년  
**상태**: ✅ Realtime 데이터 전략 완료
