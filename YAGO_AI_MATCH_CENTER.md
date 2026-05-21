# YAGO AI Match Center - 차별화 기능 아키텍처

## 🎯 핵심 가치

**경기 결과 입력 → AI 분석 → 자동 경기 리포트 생성 → 웹사이트 게시**

기존 리그 시스템: 경기 결과만 표시  
YAGO: 경기 결과 + AI 기사 + 통계 + 하이라이트

---

## 📊 전체 구조

```
Match Result Input (관리자 입력)
        │
        ▼
Match Event Data (이벤트 수집)
        │
        ▼
AI Match Analysis (AI 분석)
        │
        ▼
Match Report Generator (리포트 생성)
        │
        ▼
Website + Social Content (자동 게시)
```

---

## 🗄️ 데이터 구조 (Firestore)

### 1. LeagueMatch (경기)

```typescript
interface LeagueMatch {
  id: string;
  organizationId: string;
  leagueId: string;
  seasonId: string;
  
  // 팀 정보
  homeTeamId: string;
  homeTeamName: string;
  awayTeamId: string;
  awayTeamName: string;
  
  // 일정
  scheduledAt: Timestamp;
  playedAt?: Timestamp;
  
  // 결과
  status: "scheduled" | "live" | "completed" | "cancelled";
  homeScore?: number;
  awayScore?: number;
  
  // AI 리포트
  matchReportId?: string;         // MatchReport 참조
  
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

### 2. MatchEvent (경기 이벤트)

**경기 중 발생한 모든 이벤트**

```typescript
interface MatchEvent {
  id: string;
  matchId: string;
  organizationId: string;
  
  // 이벤트 정보
  minute: number;                 // 경기 시간 (분)
  teamId: string;                 // 이벤트 발생 팀
  playerId?: string;              // 관련 선수 (득점, 어시스트 등)
  eventType: "goal" | "assist" | "yellow_card" | "red_card" | "substitution" | "penalty" | "own_goal";
  
  // 추가 정보
  description?: string;            // "김민수 골", "박준호 어시스트" 등
  isHomeTeam: boolean;            // 홈팀인지 어웨이팀인지
  
  createdAt: Timestamp;
}
```

**예시 데이터**:
```json
[
  {
    "id": "event-001",
    "matchId": "match-123",
    "minute": 12,
    "teamId": "team-nowon-fc",
    "playerId": "player-kim-minsu",
    "eventType": "goal",
    "description": "김민수 골",
    "isHomeTeam": true
  },
  {
    "id": "event-002",
    "matchId": "match-123",
    "minute": 34,
    "teamId": "team-nowon-fc",
    "playerId": "player-park-junho",
    "eventType": "goal",
    "description": "박준호 골",
    "isHomeTeam": true
  },
  {
    "id": "event-003",
    "matchId": "match-123",
    "minute": 61,
    "teamId": "team-nowon-fc",
    "playerId": "player-kim-minsu",
    "eventType": "goal",
    "description": "김민수 골",
    "isHomeTeam": true
  },
  {
    "id": "event-004",
    "matchId": "match-123",
    "minute": 75,
    "teamId": "team-sanggye-united",
    "playerId": "player-lee-junho",
    "eventType": "goal",
    "description": "이준호 골",
    "isHomeTeam": false
  }
]
```

---

### 3. MatchReport (AI 생성 리포트)

**AI가 생성한 경기 리포트**

```typescript
interface MatchReport {
  id: string;
  matchId: string;
  organizationId: string;
  
  // AI 생성 콘텐츠
  title: string;                  // "노원FC, 상계유나이티드 3-1 완승"
  summary: string;                // 경기 요약 (1-2문단)
  fullReport: string;             // 전체 리포트 (3-5문단)
  
  // 하이라이트
  highlights: string[];            // ["12' 김민수 선제골", "61' 김민수 추가골"]
  
  // MVP
  mvpPlayerId?: string;            // 경기 MVP 선수
  mvpReason?: string;              // MVP 선정 이유
  
  // 통계 요약
  statsSummary?: {
    possession?: string;           // "60% - 40%"
    shots?: string;                // "15 - 8"
    shotsOnTarget?: string;        // "8 - 3"
  };
  
  // 상태
  status: "draft" | "published";
  publishedAt?: Timestamp;
  
  // 메타
  generatedBy: "ai" | "manual";
  aiModel?: string;                // "gpt-4", "claude-3" 등
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

**예시 리포트**:
```json
{
  "id": "report-001",
  "matchId": "match-123",
  "title": "노원FC, 상계유나이티드 3-1 완승... 김민수 멀티골",
  "summary": "노원FC가 상계유나이티드를 3-1로 꺾고 승리를 거두었습니다. 김민수는 두 골을 기록하며 팀 승리를 이끌었고, 경기 초반부터 공격을 주도했습니다.",
  "fullReport": "노원FC가 상계유나이티드를 3-1로 꺾고 승리를 거두었습니다.\n\n경기는 12분 김민수의 선제골로 시작되었습니다. 노원FC는 초반부터 공격을 주도하며 34분 박준호의 추가골로 2-0으로 앞서 나갔습니다.\n\n후반 61분 김민수가 멀티골을 기록하며 승부를 결정지었고, 상계유나이티드는 75분 이준호의 만회골로 한 골을 만회했지만 역전에는 실패했습니다.\n\n김민수는 이번 경기에서 두 골과 한 어시스트를 기록하며 경기 MVP로 선정되었습니다.",
  "highlights": [
    "12' 김민수 선제골",
    "34' 박준호 추가골",
    "61' 김민수 멀티골",
    "75' 이준호 만회골"
  ],
  "mvpPlayerId": "player-kim-minsu",
  "mvpReason": "2골 1어시스트로 팀 승리를 이끔",
  "status": "published",
  "generatedBy": "ai",
  "aiModel": "gpt-4"
}
```

---

## 🤖 AI 리포트 생성 프로세스

### Cloud Function: onMatchCompleted

```typescript
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { admin } from "../firebaseAdmin";
import { generateMatchReport } from "./ai/generateMatchReport";

export const onMatchCompleted = onDocumentWritten(
  "league_matches/{matchId}",
  async (event) => {
    const match = event.data?.after.data() as LeagueMatch;
    const previousMatch = event.data?.before.data() as LeagueMatch;
    
    // 경기가 완료되었는지 확인
    if (match.status !== "completed" || previousMatch?.status === "completed") {
      return;
    }
    
    // 경기 이벤트 수집
    const eventsSnapshot = await admin.firestore()
      .collection("match_events")
      .where("matchId", "==", match.id)
      .orderBy("minute", "asc")
      .get();
    
    const events = eventsSnapshot.docs.map(doc => doc.data() as MatchEvent);
    
    // 선수 통계 수집
    const statsSnapshot = await admin.firestore()
      .collection("match_player_stats")
      .where("matchId", "==", match.id)
      .get();
    
    const playerStats = statsSnapshot.docs.map(doc => doc.data());
    
    // AI 리포트 생성
    const report = await generateMatchReport({
      match,
      events,
      playerStats
    });
    
    // MatchReport 문서 생성
    const reportRef = await admin.firestore()
      .collection("match_reports")
      .add({
        ...report,
        matchId: match.id,
        organizationId: match.organizationId,
        status: "draft",
        generatedBy: "ai",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // Match 문서에 리포트 ID 연결
    await admin.firestore()
      .doc(`league_matches/${match.id}`)
      .update({
        matchReportId: reportRef.id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    
    // 자동 게시 (선택)
    if (match.organizationId) {
      await publishMatchReport(reportRef.id, match.organizationId);
    }
  }
);
```

---

## 🧠 AI 리포트 생성 로직

### generateMatchReport 함수

```typescript
interface GenerateMatchReportInput {
  match: LeagueMatch;
  events: MatchEvent[];
  playerStats: MatchPlayerStats[];
}

async function generateMatchReport(
  input: GenerateMatchReportInput
): Promise<Omit<MatchReport, "id" | "matchId" | "organizationId" | "createdAt">> {
  const { match, events, playerStats } = input;
  
  // AI 프롬프트 생성
  const prompt = buildMatchReportPrompt(match, events, playerStats);
  
  // AI API 호출 (OpenAI / Claude 등)
  const aiResponse = await callAI(prompt);
  
  // MVP 선정
  const mvp = selectMVP(playerStats);
  
  // 하이라이트 추출
  const highlights = extractHighlights(events);
  
  // 리포트 구성
  return {
    title: aiResponse.title,
    summary: aiResponse.summary,
    fullReport: aiResponse.fullReport,
    highlights,
    mvpPlayerId: mvp?.playerId,
    mvpReason: mvp?.reason,
    statsSummary: generateStatsSummary(playerStats),
    status: "draft",
    generatedBy: "ai",
    aiModel: "gpt-4"
  };
}
```

### AI 프롬프트 생성

```typescript
function buildMatchReportPrompt(
  match: LeagueMatch,
  events: MatchEvent[],
  playerStats: MatchPlayerStats[]
): string {
  const homeTeamStats = playerStats.filter(s => s.teamId === match.homeTeamId);
  const awayTeamStats = playerStats.filter(s => s.teamId === match.awayTeamId);
  
  const topScorers = playerStats
    .filter(s => s.goals > 0)
    .sort((a, b) => b.goals - a.goals)
    .slice(0, 3);
  
  return `
다음 축구 경기 데이터를 바탕으로 스포츠 기사를 작성해주세요.

**경기 정보**
- 홈팀: ${match.homeTeamName}
- 어웨이팀: ${match.awayTeamName}
- 최종 스코어: ${match.homeScore} - ${match.awayScore}
- 경기 날짜: ${match.playedAt?.toDate().toLocaleDateString("ko-KR")}

**경기 이벤트**
${events.map(e => `${e.minute}' ${e.description || e.eventType}`).join("\n")}

**주요 선수 통계**
${topScorers.map(s => `- ${s.playerName}: ${s.goals}골 ${s.assists}어시스트`).join("\n")}

**요구사항**
1. 제목: 30자 이내, 임팩트 있는 제목
2. 요약: 1-2문단, 경기 핵심 내용
3. 전체 리포트: 3-5문단, 경기 흐름과 주요 장면 설명
4. 톤: 스포츠 기사 스타일, 객관적이고 흥미롭게

JSON 형식으로 응답:
{
  "title": "...",
  "summary": "...",
  "fullReport": "..."
}
`;
}
```

### MVP 선정 로직

```typescript
function selectMVP(playerStats: MatchPlayerStats[]): {
  playerId: string;
  reason: string;
} | null {
  if (playerStats.length === 0) return null;
  
  // MVP 점수 계산
  const scoredPlayers = playerStats.map(stat => {
    let score = 0;
    
    // 득점: 10점
    score += stat.goals * 10;
    
    // 어시스트: 5점
    score += stat.assists * 5;
    
    // 승리: 3점
    if (stat.result === "win") score += 3;
    
    // 경고: -2점
    score -= stat.yellowCards * 2;
    
    // 퇴장: -5점
    score -= stat.redCards * 5;
    
    return {
      playerId: stat.playerId,
      playerName: stat.playerName || "",
      score,
      goals: stat.goals,
      assists: stat.assists
    };
  });
  
  // 최고 점수 선수
  const mvp = scoredPlayers.sort((a, b) => b.score - a.score)[0];
  
  if (mvp.score <= 0) return null;
  
  // MVP 선정 이유
  const reasons: string[] = [];
  if (mvp.goals > 0) reasons.push(`${mvp.goals}골`);
  if (mvp.assists > 0) reasons.push(`${mvp.assists}어시스트`);
  
  return {
    playerId: mvp.playerId,
    reason: reasons.join(", ") + "로 팀 승리를 이끔"
  };
}
```

---

## 📱 Match Center 페이지 구조

### URL

```
yago.io/{organizationType}s/{slug}/matches/{matchId}
```

**예시**:
```
yago.io/federations/nowon-fa/matches/match-123
```

### 페이지 구성

```typescript
interface MatchCenterPageProps {
  matchId: string;
}

export default function MatchCenterPage({ matchId }: MatchCenterPageProps) {
  const { match, events, report, playerStats } = useMatchData(matchId);
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <MatchHeader match={match} />
      
      {/* Scoreboard */}
      <Scoreboard
        homeTeam={match.homeTeamName}
        awayTeam={match.awayTeamName}
        homeScore={match.homeScore}
        awayScore={match.awayScore}
        status={match.status}
      />
      
      {/* Match Timeline */}
      <MatchTimeline events={events} />
      
      {/* Player Stats */}
      <PlayerStatsTable stats={playerStats} />
      
      {/* AI Match Report */}
      {report && (
        <MatchReportSection report={report} />
      )}
      
      {/* MVP */}
      {report?.mvpPlayerId && (
        <MVPSection
          playerId={report.mvpPlayerId}
          reason={report.mvpReason}
        />
      )}
    </div>
  );
}
```

---

## 🎨 컴포넌트 상세

### 1. Scoreboard

```typescript
interface ScoreboardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: string;
}

export default function Scoreboard({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  status
}: ScoreboardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
      <div className="flex items-center justify-between">
        {/* 홈팀 */}
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold mb-2">{homeTeam}</div>
          <div className="text-5xl font-bold text-blue-600">{homeScore}</div>
        </div>
        
        {/* VS */}
        <div className="text-2xl text-gray-400 mx-8">VS</div>
        
        {/* 어웨이팀 */}
        <div className="flex-1 text-center">
          <div className="text-2xl font-bold mb-2">{awayTeam}</div>
          <div className="text-5xl font-bold text-blue-600">{awayScore}</div>
        </div>
      </div>
      
      {/* 상태 */}
      <div className="text-center mt-4 text-sm text-gray-500">
        {status === "completed" && "경기 종료"}
        {status === "live" && "경기 진행 중"}
      </div>
    </div>
  );
}
```

### 2. MatchTimeline

```typescript
interface MatchTimelineProps {
  events: MatchEvent[];
}

export default function MatchTimeline({ events }: MatchTimelineProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <h3 className="text-xl font-bold mb-4">경기 타임라인</h3>
      <div className="space-y-3">
        {events.map((event) => (
          <div
            key={event.id}
            className={`flex items-center gap-4 ${
              event.isHomeTeam ? "justify-start" : "justify-end"
            }`}
          >
            {event.isHomeTeam && (
              <>
                <div className="text-sm font-medium">{event.minute}'</div>
                <div className="flex items-center gap-2">
                  {event.eventType === "goal" && <span className="text-2xl">⚽</span>}
                  {event.eventType === "yellow_card" && <span className="text-2xl">🟨</span>}
                  {event.eventType === "red_card" && <span className="text-2xl">🟥</span>}
                  <span>{event.description}</span>
                </div>
              </>
            )}
            {!event.isHomeTeam && (
              <>
                <div className="flex items-center gap-2">
                  <span>{event.description}</span>
                  {event.eventType === "goal" && <span className="text-2xl">⚽</span>}
                  {event.eventType === "yellow_card" && <span className="text-2xl">🟨</span>}
                  {event.eventType === "red_card" && <span className="text-2xl">🟥</span>}
                </div>
                <div className="text-sm font-medium">{event.minute}'</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 3. MatchReportSection

```typescript
interface MatchReportSectionProps {
  report: MatchReport;
}

export default function MatchReportSection({ report }: MatchReportSectionProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold">경기 리포트</h3>
        <span className="text-xs text-gray-500">AI 생성</span>
      </div>
      
      {/* 제목 */}
      <h2 className="text-2xl font-bold mb-4">{report.title}</h2>
      
      {/* 요약 */}
      <p className="text-gray-700 mb-4 leading-relaxed">{report.summary}</p>
      
      {/* 전체 리포트 */}
      <div className="prose max-w-none">
        {report.fullReport.split("\n\n").map((paragraph, idx) => (
          <p key={idx} className="text-gray-700 mb-4 leading-relaxed">
            {paragraph}
          </p>
        ))}
      </div>
      
      {/* 하이라이트 */}
      {report.highlights && report.highlights.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="font-semibold mb-3">경기 하이라이트</h4>
          <ul className="space-y-2">
            {report.highlights.map((highlight, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-blue-600">•</span>
                <span>{highlight}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

---

## 🔄 자동 게시 프로세스

### publishMatchReport 함수

```typescript
async function publishMatchReport(
  reportId: string,
  organizationId: string
): Promise<void> {
  const reportRef = admin.firestore().doc(`match_reports/${reportId}`);
  const report = (await reportRef.get()).data() as MatchReport;
  
  // 리포트 게시
  await reportRef.update({
    status: "published",
    publishedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // Organization의 공지/뉴스에 자동 추가 (선택)
  await addDoc(admin.firestore().collection("organization_announcements"), {
    organizationId,
    type: "match_report",
    title: report.title,
    content: report.summary,
    link: `/matches/${report.matchId}`,
    isPublished: true,
    publishedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  // 소셜 미디어 공유용 콘텐츠 생성 (선택)
  await generateSocialContent(report);
}
```

---

## 🎯 이 기능의 가치

### 1. 차별화

**기존 리그 시스템**: 경기 결과만 표시  
**YAGO**: 경기 결과 + AI 기사 + 통계 + 하이라이트

### 2. 콘텐츠 자동화

**수동 작업**: 경기 리포트 작성 (30분-1시간)  
**AI 자동화**: 즉시 생성 (3-5초)

### 3. 플랫폼 레벨 상승

**리그 관리 SaaS** → **AI Sports Media Platform**

### 4. SEO 및 트래픽

**자동 생성 기사**로:
- 검색 엔진 최적화
- 소셜 미디어 공유
- 플랫폼 트래픽 증가

---

## ✅ 구현 체크리스트

### Phase 1: 기본 구조
- [ ] MatchEvent 컬렉션
- [ ] MatchReport 컬렉션
- [ ] 경기 결과 입력 UI
- [ ] 이벤트 입력 UI

### Phase 2: AI 통합
- [ ] AI 리포트 생성 함수
- [ ] MVP 선정 로직
- [ ] 하이라이트 추출
- [ ] Cloud Function 트리거

### Phase 3: Match Center 페이지
- [ ] Scoreboard 컴포넌트
- [ ] MatchTimeline 컴포넌트
- [ ] MatchReportSection 컴포넌트
- [ ] MVPSection 컴포넌트

### Phase 4: 자동 게시
- [ ] 리포트 자동 게시
- [ ] 공지 자동 추가
- [ ] 소셜 콘텐츠 생성

---

## 🚀 Cursor에게 전달할 지시

```
Implement YAGO AI Match Center.
When a match is completed, automatically generate a match report using AI.
Track all match events (goals, assists, cards, etc.).
Generate match reports with title, summary, full report, highlights, and MVP.
Create Match Center page with scoreboard, timeline, player stats, and AI report.
Use Cloud Functions to trigger AI report generation on match completion.
```

---

이 기능을 구현하면 **YAGO가 진짜 AI Sports Media Platform이 됩니다!** 🚀
