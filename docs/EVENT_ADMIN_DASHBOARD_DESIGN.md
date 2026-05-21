# 🔥 Event Admin Dashboard 설계

## 목표

운영자가 Event Platform을 한 화면에서 관리할 수 있는 Admin Dashboard

---

## 페이지 구조

```
/admin/events                    # Event 목록
/admin/events/create             # Event 생성
/admin/events/:eventId           # Event 상세
/admin/events/:eventId/entries   # 참가팀 관리
/admin/events/:eventId/matches   # 경기 관리
/admin/events/:eventId/bracket   # 대진표 생성/관리
```

---

## 1️⃣ Event 목록 페이지 (`/admin/events`)

### 기능

- Event 목록 조회 (필터: season, region, type, status)
- Event 생성 버튼
- Event 상세 이동

### 컴포넌트

```typescript
// src/pages/admin/EventListPage.tsx
import { getEvents } from "@/services/eventService";

export default function EventListPage() {
  const [events, setEvents] = useState<Event[]>([]);
  
  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const data = await getEvents({
      seasonId: "2026",
      status: "scheduled",
    });
    setEvents(data);
  };

  return (
    <div>
      <h1>행사 관리</h1>
      <Button onClick={() => navigate("/admin/events/create")}>
        새 행사 생성
      </Button>
      <EventTable events={events} />
    </div>
  );
}
```

---

## 2️⃣ Event 생성 페이지 (`/admin/events/create`)

### 기능

- Event 기본 정보 입력
- Division 자동 생성 (Cloud Function)
- Event 생성 후 상세 페이지로 이동

### 폼 필드

```typescript
interface EventFormData {
  name: string;              // "2026 노원구 협회장기"
  type: EventType;           // "tournament" | "league" | ...
  sportType: string;         // "football"
  regionCode: string;        // "KR_SEOUL_NOWON"
  seasonId: string;          // "2026"
  organizerName: string;     // "노원구축구협회"
  sponsorName?: string;
  startDate: Date;
  endDate: Date;
  description?: string;
  isPublic: boolean;
}
```

### 컴포넌트

```typescript
// src/pages/admin/EventCreatePage.tsx
import { createEvent } from "@/services/eventService";

export default function EventCreatePage() {
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    type: "tournament",
    sportType: "football",
    regionCode: "KR_SEOUL_NOWON",
    seasonId: "2026",
    organizerName: "",
    startDate: new Date(),
    endDate: new Date(),
    isPublic: true,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const eventId = await createEvent({
      ...formData,
      createdBy: user.uid,
    });

    navigate(`/admin/events/${eventId}`);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Input
        label="행사명"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        required
      />
      <Select
        label="행사 유형"
        value={formData.type}
        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
        options={[
          { value: "tournament", label: "토너먼트" },
          { value: "league", label: "리그" },
          { value: "academy", label: "아카데미" },
        ]}
      />
      {/* ... 나머지 필드 */}
      <Button type="submit">생성</Button>
    </form>
  );
}
```

---

## 3️⃣ Event 상세 페이지 (`/admin/events/:eventId`)

### 기능

- Event 기본 정보 표시
- Division 목록
- 참가팀 수
- 경기 수
- 빠른 액션 버튼

### 컴포넌트

```typescript
// src/pages/admin/EventDetailPage.tsx
import { getEvent } from "@/services/eventService";
import { getEventEntries } from "@/services/eventEntryService";
import { getEventMatches } from "@/services/eventMatchService";

export default function EventDetailPage() {
  const { eventId } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [matches, setMatches] = useState<EventMatch[]>([]);

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    const [eventData, entriesData, matchesData] = await Promise.all([
      getEvent(eventId!),
      getEventEntries({ eventId: eventId! }),
      getEventMatches({ eventId: eventId! }),
    ]);
    
    setEvent(eventData);
    setEntries(entriesData);
    setMatches(matchesData);
  };

  return (
    <div>
      <h1>{event?.name}</h1>
      
      <StatsCards
        entriesCount={entries.length}
        matchesCount={matches.length}
        completedMatches={matches.filter(m => m.status === "completed").length}
      />

      <QuickActions>
        <Button onClick={() => navigate(`/admin/events/${eventId}/entries`)}>
          참가팀 관리
        </Button>
        <Button onClick={() => navigate(`/admin/events/${eventId}/matches`)}>
          경기 관리
        </Button>
        <Button onClick={() => navigate(`/admin/events/${eventId}/bracket`)}>
          대진표 생성
        </Button>
      </QuickActions>
    </div>
  );
}
```

---

## 4️⃣ 참가팀 관리 페이지 (`/admin/events/:eventId/entries`)

### 기능

- 참가 신청 목록 (pending, approved, rejected)
- 참가 승인/거부
- 참가팀 목록 표시

### 컴포넌트

```typescript
// src/pages/admin/EventEntriesPage.tsx
import { getEventEntries, approveEventEntry, rejectEventEntry } from "@/services/eventEntryService";

export default function EventEntriesPage() {
  const { eventId } = useParams();
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");

  useEffect(() => {
    loadEntries();
  }, [eventId, filter]);

  const loadEntries = async () => {
    const data = await getEventEntries({
      eventId: eventId!,
      applicationStatus: filter === "all" ? undefined : filter,
    });
    setEntries(data);
  };

  const handleApprove = async (entryId: string) => {
    await approveEventEntry(entryId, user.uid);
    loadEntries();
  };

  const handleReject = async (entryId: string) => {
    await rejectEventEntry(entryId, user.uid);
    loadEntries();
  };

  return (
    <div>
      <h1>참가팀 관리</h1>
      
      <Tabs>
        <Tab label="대기 중" onClick={() => setFilter("pending")} />
        <Tab label="승인됨" onClick={() => setFilter("approved")} />
        <Tab label="전체" onClick={() => setFilter("all")} />
      </Tabs>

      <EntryTable
        entries={entries}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
```

---

## 5️⃣ 경기 관리 페이지 (`/admin/events/:eventId/matches`)

### 기능

- 경기 목록 (라운드별 필터)
- 경기 결과 입력
- 경기 일정 수정

### 컴포넌트

```typescript
// src/pages/admin/EventMatchesPage.tsx
import { getEventMatches, completeEventMatch } from "@/services/eventMatchService";

export default function EventMatchesPage() {
  const { eventId } = useParams();
  const [matches, setMatches] = useState<EventMatch[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>("all");

  useEffect(() => {
    loadMatches();
  }, [eventId, selectedRound]);

  const loadMatches = async () => {
    const data = await getEventMatches({
      eventId: eventId!,
      roundCode: selectedRound === "all" ? undefined : selectedRound,
    });
    setMatches(data);
  };

  const handleCompleteMatch = async (
    matchId: string,
    homeScore: number,
    awayScore: number
  ) => {
    await completeEventMatch(matchId, {
      homeScore,
      awayScore,
      recordedBy: user.uid,
    });
    loadMatches();
  };

  return (
    <div>
      <h1>경기 관리</h1>
      
      <RoundFilter
        rounds={["R16", "QF", "SF", "F"]}
        selected={selectedRound}
        onChange={setSelectedRound}
      />

      <MatchTable
        matches={matches}
        onComplete={handleCompleteMatch}
      />
    </div>
  );
}
```

---

## 6️⃣ 대진표 생성 페이지 (`/admin/events/:eventId/bracket`)

### 기능

- 참가 승인된 팀 목록 표시
- 토너먼트 대진표 자동 생성
- 대진표 시각화

### 컴포넌트

```typescript
// src/pages/admin/EventBracketPage.tsx
import { getEventEntries } from "@/services/eventEntryService";
import { generateKnockoutBracket } from "@/services/tournamentBracketService";

export default function EventBracketPage() {
  const { eventId } = useParams();
  const [entries, setEntries] = useState<EventEntry[]>([]);
  const [bracket, setBracket] = useState<any>(null);

  useEffect(() => {
    loadEntries();
  }, [eventId]);

  const loadEntries = async () => {
    const data = await getEventEntries({
      eventId: eventId!,
      applicationStatus: "approved",
    });
    setEntries(data);
  };

  const handleGenerateBracket = async () => {
    const teams = entries.map((entry, index) => ({
      teamId: entry.teamId,
      teamName: entry.teamName,
      seed: index + 1,
    }));

    const result = await generateKnockoutBracket({
      eventId: eventId!,
      divisionId: entries[0]?.divisionId || "",
      seasonId: "2026",
      teams,
      startDate: new Date("2026-05-01"),
      createdBy: user.uid,
    });

    setBracket(result);
  };

  return (
    <div>
      <h1>대진표 생성</h1>
      
      <div>
        <p>참가 승인된 팀: {entries.length}팀</p>
        <Button
          onClick={handleGenerateBracket}
          disabled={entries.length < 2}
        >
          대진표 생성
        </Button>
      </div>

      {bracket && (
        <BracketVisualization bracket={bracket} />
      )}
    </div>
  );
}
```

---

## 공통 컴포넌트

### EventTable

```typescript
// src/components/admin/EventTable.tsx
export function EventTable({ events }: { events: Event[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>행사명</th>
          <th>유형</th>
          <th>시작일</th>
          <th>상태</th>
          <th>액션</th>
        </tr>
      </thead>
      <tbody>
        {events.map(event => (
          <tr key={event.id}>
            <td>{event.name}</td>
            <td>{event.type}</td>
            <td>{formatDate(event.startDate)}</td>
            <td>{event.status}</td>
            <td>
              <Button onClick={() => navigate(`/admin/events/${event.id}`)}>
                상세
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

### MatchTable

```typescript
// src/components/admin/MatchTable.tsx
export function MatchTable({
  matches,
  onComplete,
}: {
  matches: EventMatch[];
  onComplete: (matchId: string, homeScore: number, awayScore: number) => void;
}) {
  return (
    <table>
      <thead>
        <tr>
          <th>라운드</th>
          <th>홈팀</th>
          <th>어웨이팀</th>
          <th>점수</th>
          <th>상태</th>
          <th>액션</th>
        </tr>
      </thead>
      <tbody>
        {matches.map(match => (
          <tr key={match.id}>
            <td>{match.roundName || match.roundCode}</td>
            <td>{match.homeTeamName}</td>
            <td>{match.awayTeamName}</td>
            <td>
              {match.status === "completed" 
                ? `${match.homeScore} : ${match.awayScore}`
                : "-"
              }
            </td>
            <td>{match.status}</td>
            <td>
              {match.status === "scheduled" && (
                <MatchResultInput
                  matchId={match.id}
                  onSubmit={onComplete}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 라우트 설정

```typescript
// src/App.tsx
<Route path="/admin/events" element={<ProtectedRoute><EventListPage /></ProtectedRoute>} />
<Route path="/admin/events/create" element={<ProtectedRoute><EventCreatePage /></ProtectedRoute>} />
<Route path="/admin/events/:eventId" element={<ProtectedRoute><EventDetailPage /></ProtectedRoute>} />
<Route path="/admin/events/:eventId/entries" element={<ProtectedRoute><EventEntriesPage /></ProtectedRoute>} />
<Route path="/admin/events/:eventId/matches" element={<ProtectedRoute><EventMatchesPage /></ProtectedRoute>} />
<Route path="/admin/events/:eventId/bracket" element={<ProtectedRoute><EventBracketPage /></ProtectedRoute>} />
```

---

## 권한 체크

```typescript
// src/components/admin/AdminOnlyRoute.tsx
export function AdminOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, profile } = useAuth();
  
  if (!user || !profile) {
    return <Navigate to="/login" />;
  }

  const isAdmin = profile.role?.toUpperCase() === "ADMIN";
  
  if (!isAdmin) {
    return <div>관리자 권한이 필요합니다.</div>;
  }

  return <>{children}</>;
}
```

---

## 구현 우선순위

### Phase 1 (핵심)
1. Event 목록 페이지
2. Event 생성 페이지
3. Event 상세 페이지

### Phase 2 (운영)
4. 참가팀 관리 페이지
5. 경기 관리 페이지

### Phase 3 (고급)
6. 대진표 생성 페이지
7. 대진표 시각화

---

## 다음 단계

1. ✅ **Event Admin Dashboard 설계 완료**
2. → **Phase 1 구현** 시작
3. → **Phase 2 구현**
4. → **Phase 3 구현**
