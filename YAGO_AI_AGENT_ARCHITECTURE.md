# 🤖 YAGO VIBE SPORTS - AI 에이전트 시스템 아키텍처

> **작성일**: 2024년  
> **목적**: AI가 실제 협회 운영을 도와주는 플랫폼 - 역할별 에이전트 시스템

---

## 📋 목차

1. [AI 에이전트 전체 구조](#1-ai-에이전트-전체-구조)
2. [Public AI Assistant](#2-public-ai-assistant)
3. [역할별 에이전트](#3-역할별-에이전트)
4. [AI 데이터 연결 구조](#4-ai-데이터-연결-구조)
5. [AI 처리 흐름](#5-ai-처리-흐름)
6. [AI 프롬프트 구조](#6-ai-프롬프트-구조)
7. [관리자 AI 패널](#7-관리자-ai-패널)
8. [AI 자동화 기능](#8-ai-자동화-기능)
9. [AI UI 위치](#9-ai-ui-위치)
10. [AI 기술 구조](#10-ai-기술-구조)

---

## 1️⃣ AI 에이전트 전체 구조

### 에이전트 계층 구조

```
AI Federation Assistant (메인 게이트웨이)
│
├─ Tournament Guide Agent (대회 안내)
├─ Team Registration Agent (팀 참가)
├─ Match Operations Agent (경기 운영)
├─ Rules & Documents Agent (규정 안내)
├─ Admin Operations Agent (관리자 보조)
├─ Sponsor & Partnership Agent (후원사)
└─ Federation Builder Agent (협회 생성)
```

### 핵심 원칙

1. **역할 분리**: 각 에이전트는 특정 도메인만 담당
2. **협회별 데이터**: `federations/{federationId}` 기반 데이터 접근
3. **RAG 기반**: Firestore 데이터를 컨텍스트로 활용
4. **자동 라우팅**: 의도 분석 후 적절한 에이전트로 라우팅

---

## 2️⃣ Public AI Assistant

### 위치

```
/federations/{federationId}
```

### UI 구성

```typescript
interface AIChatbotProps {
  federationId: string;
  position: "bottom-right" | "bottom-left" | "inline";
  initialMessage?: string;
}

// 홈페이지 우하단 고정 챗봇
<AIChatbot
  federationId="nowon-football"
  position="bottom-right"
  initialMessage="노원구 축구협회 AI 도우미입니다. 무엇을 도와드릴까요?"
/>
```

### 사용자 질문 예시

```
"대회 일정 알려줘"
"노원구청장기 대진표 보여줘"
"팀 참가 신청 방법"
"유소년 팀 등록 어떻게 해?"
"오늘 경기 뭐 있어?"
"노원FC 다음 경기 언제야?"
"선수 등록 규정 알려줘"
```

### AI 데이터 소스

```typescript
const publicAIDataSources = [
  "notices",        // 공지사항
  "tournaments",    // 대회
  "matches",        // 경기 일정
  "standings",      // 순위
  "teams",          // 팀 정보
  "documents",      // 규정/문서
  "sponsors",       // 후원사
  "pages",          // 정적 페이지
];
```

---

## 3️⃣ 역할별 에이전트

### 3.1 Tournament Guide Agent

**역할**: 대회 관련 질문 처리

**질문 예시**:
```
"2025 노원구청장기 언제 시작해?"
"참가팀 몇 팀이야?"
"대진표 보여줘"
"조별 리그 어떻게 진행돼?"
"8강 대진 어떻게 되나요?"
```

**데이터 소스**:
```typescript
const tournamentAgentSources = [
  "tournaments",
  "matches",
  "groups",
  "brackets",
  "standings",
  "notices", // 대회 관련 공지
];
```

**처리 로직**:
```typescript
async function processTournamentQuery(
  question: string,
  federationId: string
): Promise<string> {
  // 1. 의도 분석
  const intent = analyzeIntent(question);
  
  // 2. 대회 정보 조회
  const tournaments = await getActiveTournaments(federationId);
  const matches = await getTournamentMatches(federationId);
  const brackets = await getTournamentBrackets(federationId);
  const standings = await getTournamentStandings(federationId);
  
  // 3. 컨텍스트 구성
  const context = {
    tournaments: tournaments.map(t => ({
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      teamCount: t.teamCount,
      format: t.format,
      status: t.status,
    })),
    matches: matches.map(m => ({
      date: m.matchDate,
      homeTeam: m.homeTeamName,
      awayTeam: m.awayTeamName,
      venue: m.venueName,
    })),
    brackets: brackets.map(b => ({
      round: b.roundName,
      homeTeam: b.homeTeamName,
      awayTeam: b.awayTeamName,
    })),
    standings: standings.slice(0, 10),
  };
  
  // 4. AI 응답 생성
  const response = await callAI({
    systemPrompt: buildTournamentGuidePrompt(federationId),
    userQuestion: question,
    context: JSON.stringify(context, null, 2),
  });
  
  return response;
}

function buildTournamentGuidePrompt(federationId: string): string {
  const federation = getFederation(federationId);
  return `
당신은 ${federation.name}의 대회 안내 AI입니다.
사용자의 대회 관련 질문에 정확하고 친절하게 답변해주세요.

다음 정보를 바탕으로 답변하세요:
- 대회 일정
- 참가팀 정보
- 대진표
- 순위
- 경기 일정

정보가 없는 경우 "해당 정보를 확인 중입니다"라고 안내하세요.
  `;
}
```

---

### 3.2 Team Registration Agent

**역할**: 팀 참가 관련 질문 처리

**질문 예시**:
```
"리그 참가하려면 어떻게 해?"
"선수 등록 규정 알려줘"
"참가비 얼마야?"
"필요 서류 뭐야?"
"팀 등록 마감일 언제야?"
```

**데이터 소스**:
```typescript
const teamRegistrationSources = [
  "registrations",
  "teams",
  "players",
  "documents", // 등록 규정
  "notices",   // 등록 공지
];
```

**처리 로직**:
```typescript
async function processTeamRegistrationQuery(
  question: string,
  federationId: string
): Promise<string> {
  // 1. 등록 관련 문서 조회
  const registrationDocs = await getDocuments(federationId, {
    category: "registration",
    tags: ["team", "registration"],
  });
  
  // 2. 등록 관련 공지 조회
  const registrationNotices = await getNotices(federationId, {
    category: "registration",
  });
  
  // 3. 현재 진행 중인 등록 대회 조회
  const openTournaments = await getTournaments(federationId, {
    status: "registration",
  });
  
  // 4. 컨텍스트 구성
  const context = {
    registrationRules: registrationDocs,
    registrationNotices: registrationNotices,
    openTournaments: openTournaments.map(t => ({
      name: t.name,
      registrationStart: t.registrationStart,
      registrationEnd: t.registrationEnd,
      entryFee: t.entryFee,
      requiredDocuments: t.requiredDocuments,
    })),
  };
  
  // 5. AI 응답 생성
  const response = await callAI({
    systemPrompt: buildTeamRegistrationPrompt(federationId),
    userQuestion: question,
    context: JSON.stringify(context, null, 2),
  });
  
  return response;
}
```

**자동 기능**:
- 참가 신청 안내
- 필요 서류 안내
- 신청 페이지 링크 제공
- 등록 마감일 알림

---

### 3.3 Match Operations Agent

**역할**: 경기 관련 질문 처리

**질문 예시**:
```
"오늘 경기 뭐 있어?"
"노원FC 다음 경기 언제야?"
"현재 순위 알려줘"
"이번 주 경기 일정"
"경기 결과 알려줘"
```

**데이터 소스**:
```typescript
const matchOperationsSources = [
  "matches",
  "standings",
  "stats",
  "players",
  "teams",
];
```

**처리 로직**:
```typescript
async function processMatchQuery(
  question: string,
  federationId: string
): Promise<string> {
  // 1. 의도 분석
  const intent = analyzeIntent(question);
  
  // 2. 경기 정보 조회
  let matches: Match[] = [];
  
  if (intent.type === "today_matches") {
    matches = await getTodayMatches(federationId);
  } else if (intent.type === "team_matches") {
    const teamId = extractTeamId(question);
    matches = await getTeamMatches(federationId, teamId);
  } else if (intent.type === "week_matches") {
    matches = await getWeekMatches(federationId);
  }
  
  // 3. 순위 정보 조회
  const standings = await getCurrentStandings(federationId);
  
  // 4. 컨텍스트 구성
  const context = {
    matches: matches.map(m => ({
      date: formatDate(m.matchDate),
      time: m.matchTime,
      homeTeam: m.homeTeamName,
      awayTeam: m.awayTeamName,
      venue: m.venueName,
      score: m.status === "completed" 
        ? `${m.homeScore} : ${m.awayScore}`
        : null,
    })),
    standings: standings.slice(0, 5),
  };
  
  // 5. AI 응답 생성
  const response = await callAI({
    systemPrompt: buildMatchOperationsPrompt(federationId),
    userQuestion: question,
    context: JSON.stringify(context, null, 2),
  });
  
  return response;
}
```

---

### 3.4 Rules & Documents Agent

**역할**: 규정 관련 질문 처리

**질문 예시**:
```
"선수 등록 규정 알려줘"
"경고 누적 규정 뭐야?"
"연령 제한 있나요?"
"퇴장 규정 알려줘"
"교체 규정"
```

**데이터 소스**:
```typescript
const rulesDocumentsSources = [
  "documents",  // 규정 문서
  "rulebooks",  // 규정집
  "notices",    // 규정 관련 공지
];
```

**처리 로직**:
```typescript
async function processRulesQuery(
  question: string,
  federationId: string
): Promise<string> {
  // 1. 키워드 추출
  const keywords = extractKeywords(question);
  
  // 2. 규정 문서 검색
  const relevantDocs = await searchDocuments(federationId, keywords);
  
  // 3. 관련 규정 추출
  const rules = relevantDocs.filter(doc => 
    doc.category === "rule" || doc.category === "regulation"
  );
  
  // 4. 컨텍스트 구성
  const context = {
    rules: rules.map(r => ({
      title: r.title,
      content: r.content,
      category: r.category,
    })),
  };
  
  // 5. AI 응답 생성 (낮은 temperature로 정확성 확보)
  const response = await callAI({
    systemPrompt: buildRulesPrompt(federationId),
    userQuestion: question,
    context: JSON.stringify(context, null, 2),
    temperature: 0.3, // 정확성 우선
  });
  
  return response;
}

function buildRulesPrompt(federationId: string): string {
  const federation = getFederation(federationId);
  return `
당신은 ${federation.name}의 규정 AI입니다.
규정을 정확하게 해석하고 안내합니다.

주의사항:
- 규정은 정확하게 해석해야 합니다
- 불확실한 내용은 "규정 문서를 확인해주세요"라고 안내하세요
- 추측하지 마세요
  `;
}
```

---

### 3.5 Admin Operations Agent

**역할**: 관리자용 운영 보조

**위치**:
```
/admin/dashboard
```

**기능**:
```typescript
interface AdminAIFeatures {
  // 운영 리포트
  generateDailyReport: () => Promise<AdminReport>;
  
  // 알림 생성
  generateAlerts: () => Promise<Alert[]>;
  
  // 추천 액션
  suggestActions: () => Promise<Action[]>;
  
  // 공지 초안 생성
  generateNoticeDraft: (type: string) => Promise<string>;
}
```

**질문 예시**:
```
"오늘 경기 몇 개야?"
"결과 미입력 경기 알려줘"
"승인 대기 팀 몇 개?"
"경고 누적 선수 목록"
"이번 주 일정 요약"
```

**처리 로직**:
```typescript
async function processAdminQuery(
  question: string,
  federationId: string,
  adminId: string
): Promise<string> {
  // 1. 권한 확인
  const hasAdminAccess = await checkAdminAccess(federationId, adminId);
  if (!hasAdminAccess) {
    return "관리자 권한이 필요합니다.";
  }
  
  // 2. 운영 데이터 조회
  const todayMatches = await getTodayMatches(federationId);
  const missingResults = await getMissingResults(federationId);
  const pendingApprovals = await getPendingApprovals(federationId);
  const disciplineAlerts = await getDisciplineAlerts(federationId);
  
  // 3. 컨텍스트 구성
  const context = {
    todayMatches: {
      total: todayMatches.length,
      completed: todayMatches.filter(m => m.status === "completed").length,
      missing: missingResults.length,
    },
    pendingApprovals: {
      teams: pendingApprovals.teams.length,
      players: pendingApprovals.players.length,
    },
    disciplineAlerts: disciplineAlerts.length,
  };
  
  // 4. AI 응답 생성
  const response = await callAI({
    systemPrompt: buildAdminOperationsPrompt(federationId),
    userQuestion: question,
    context: JSON.stringify(context, null, 2),
  });
  
  return response;
}
```

**자동 리포트 생성**:
```typescript
async function generateDailyReport(
  federationId: string
): Promise<AdminReport> {
  const today = new Date();
  
  const report = {
    date: formatDate(today),
    summary: {
      todayMatches: await getTodayMatchesCount(federationId),
      completedMatches: await getCompletedMatchesCount(federationId, today),
      missingResults: await getMissingResultsCount(federationId),
      pendingApprovals: await getPendingApprovalsCount(federationId),
      disciplineAlerts: await getDisciplineAlertsCount(federationId),
    },
    alerts: await generateAlerts(federationId),
    recommendations: await generateRecommendations(federationId),
  };
  
  return report;
}
```

---

### 3.6 Sponsor & Partnership Agent

**역할**: 후원사 관련 문의 처리

**질문 예시**:
```
"광고 문의"
"후원 방법"
"협력 병원 등록"
"스폰서십 안내"
```

**데이터 소스**:
```typescript
const sponsorSources = [
  "sponsors",
  "ads",
  "contracts",
  "partnerships",
];
```

---

### 3.7 Federation Builder Agent

**역할**: 새 협회 생성 시 사용

**기능**:
```typescript
async function buildFederationWithAI(
  input: CreateFederationInput
): Promise<string> {
  // 1. AI가 협회 정보 분석
  const analysis = await analyzeFederationInput(input);
  
  // 2. AI가 홈페이지 구조 제안
  const homepageStructure = await proposeHomepageStructure(analysis);
  
  // 3. AI가 대회 시스템 제안
  const tournamentSystem = await proposeTournamentSystem(analysis);
  
  // 4. AI가 AI 에이전트 구성 제안
  const aiAgents = await proposeAIAgents(analysis);
  
  // 5. 자동 생성 실행
  const federationId = await createFederation({
    ...input,
    homepageStructure,
    tournamentSystem,
    aiAgents,
  });
  
  return federationId;
}
```

---

## 4️⃣ AI 데이터 연결 구조

### 협회별 데이터 분리

```typescript
// AI는 협회별 데이터만 접근
const aiDataPath = `federations/${federationId}`;

const aiDataSources = {
  pages: `${aiDataPath}/pages`,
  notices: `${aiDataPath}/notices`,
  tournaments: `${aiDataPath}/tournaments`,
  teams: `${aiDataPath}/teams`,
  players: `${aiDataPath}/players`,
  matches: `${aiDataPath}/matches`,
  standings: `${aiDataPath}/standings`,
  documents: `${aiDataPath}/documents`,
  sponsors: `${aiDataPath}/sponsors`,
};
```

### RAG (Retrieval-Augmented Generation) 구조

```typescript
async function retrieveContext(
  question: string,
  federationId: string,
  agentType: string
): Promise<string> {
  // 1. 의도 분석
  const intent = analyzeIntent(question);
  
  // 2. 관련 데이터 조회
  const relevantData = await queryRelevantData(
    federationId,
    agentType,
    intent
  );
  
  // 3. 컨텍스트 구성
  const context = formatContext(relevantData);
  
  return context;
}

async function queryRelevantData(
  federationId: string,
  agentType: string,
  intent: Intent
): Promise<any> {
  const dataSources = getAgentDataSources(agentType);
  const results: any = {};
  
  for (const source of dataSources) {
    const query = buildQuery(source, intent);
    results[source] = await queryFirestore(federationId, source, query);
  }
  
  return results;
}
```

---

## 5️⃣ AI 처리 흐름

### 전체 플로우

```
사용자 질문
  ↓
의도 분석 (Intent Detection)
  ↓
에이전트 라우팅 (Agent Routing)
  ↓
데이터 조회 (Firestore Query)
  ↓
컨텍스트 구성 (Context Building)
  ↓
OpenAI API 호출
  ↓
응답 생성
  ↓
대화 기록 저장
  ↓
사용자에게 전달
```

### 의도 분석

```typescript
interface Intent {
  type: "tournament" | "match" | "team" | "player" | "rule" | "registration" | "general";
  confidence: number;
  entities: {
    tournamentId?: string;
    teamId?: string;
    playerId?: string;
    date?: string;
  };
}

function analyzeIntent(question: string): Intent {
  const lowerQuestion = question.toLowerCase();
  
  // 키워드 기반 의도 분석
  const keywords = {
    tournament: ["대회", "리그", "토너먼트", "경기", "시즌"],
    match: ["경기", "일정", "스케줄", "매치"],
    team: ["팀", "클럽", "구단"],
    player: ["선수", "플레이어"],
    rule: ["규정", "규칙", "규약"],
    registration: ["등록", "신청", "참가"],
  };
  
  // 의도 점수 계산
  const scores: Record<string, number> = {};
  
  for (const [intent, words] of Object.entries(keywords)) {
    scores[intent] = words.reduce((score, word) => {
      return score + (lowerQuestion.includes(word) ? 1 : 0);
    }, 0);
  }
  
  // 최고 점수 의도 선택
  const maxScore = Math.max(...Object.values(scores));
  const intentType = Object.keys(scores).find(
    key => scores[key] === maxScore
  ) || "general";
  
  // 엔티티 추출
  const entities = extractEntities(question);
  
  return {
    type: intentType as Intent["type"],
    confidence: maxScore / Math.max(1, question.split(" ").length),
    entities,
  };
}
```

### 에이전트 라우팅

```typescript
function routeToAgent(intent: Intent): string {
  switch (intent.type) {
    case "tournament":
      return "tournament-guide";
    case "match":
      return "match-operations";
    case "team":
    case "registration":
      return "team-registration";
    case "rule":
      return "rules-documents";
    default:
      return "general-assistant";
  }
}
```

---

## 6️⃣ AI 프롬프트 구조

### 기본 시스템 프롬프트

```typescript
function buildSystemPrompt(
  federationId: string,
  agentType: string
): string {
  const federation = getFederation(federationId);
  
  const basePrompt = `You are an AI assistant for ${federation.name}.

Your role is to help visitors, players, and managers understand the federation's:
- Leagues and tournaments
- Teams and players
- Match schedules and results
- Rules and regulations
- Registration processes

Always answer based on the provided federation data.
If information is not available, direct users to the appropriate page.
Be friendly, accurate, and helpful.`;

  const agentSpecificPrompts: Record<string, string> = {
    "tournament-guide": `
Focus on tournament information:
- Tournament schedules
- Bracket structures
- Participating teams
- Match results
    `,
    "team-registration": `
Focus on team registration:
- Registration requirements
- Required documents
- Registration deadlines
- Entry fees
    `,
    "match-operations": `
Focus on match information:
- Match schedules
- Results
- Standings
- Team performance
    `,
    "rules-documents": `
Focus on rules and regulations:
- Player registration rules
- Match rules
- Disciplinary rules
- Age restrictions

IMPORTANT: Be accurate. If uncertain, direct users to check the official documents.
    `,
  };
  
  return basePrompt + "\n\n" + (agentSpecificPrompts[agentType] || "");
}
```

---

## 7️⃣ 관리자 AI 패널

### AI 운영 리포트 위젯

```typescript
interface AdminAIPanel {
  // 일일 리포트
  dailyReport: {
    todayMatches: number;
    completedMatches: number;
    missingResults: number;
    pendingApprovals: number;
    disciplineAlerts: number;
  };
  
  // 알림
  alerts: Alert[];
  
  // 추천 액션
  recommendedActions: Action[];
}

// 컴포넌트
<AdminAIPanel federationId={federationId} />
```

### 리포트 예시

```json
{
  "date": "2024-09-03",
  "summary": {
    "todayMatches": 6,
    "completedMatches": 4,
    "missingResults": 2,
    "pendingApprovals": 3,
    "disciplineAlerts": 4
  },
  "alerts": [
    {
      "type": "missing_result",
      "message": "2건의 경기 결과가 입력되지 않았습니다.",
      "matches": ["match-001", "match-002"]
    },
    {
      "type": "pending_approval",
      "message": "3건의 팀 참가 신청이 승인 대기 중입니다.",
      "count": 3
    }
  ],
  "recommendations": [
    {
      "action": "enter_results",
      "message": "경기 결과를 입력해주세요.",
      "priority": "high"
    },
    {
      "action": "review_registrations",
      "message": "참가 신청을 검토해주세요.",
      "priority": "medium"
    }
  ]
}
```

---

## 8️⃣ AI 자동화 기능

### 자동화 트리거

```typescript
// 1. 경기 결과 입력 시
onMatchResultEntered(async (matchId) => {
  // 순위 자동 계산
  await updateStandings(matchId);
  
  // AI 리포트 업데이트
  await updateAIReport(matchId);
});

// 2. 대회 생성 시
onTournamentCreated(async (tournamentId) => {
  // AI가 대진표 생성 제안
  await suggestBracketFormat(tournamentId);
});

// 3. 공지 필요 시
onNoticeNeeded(async (type) => {
  // AI가 공지 초안 생성
  const draft = await generateNoticeDraft(type);
  // 관리자 검토 후 게시
});
```

### 공지 자동 생성

```typescript
async function generateNoticeDraft(
  type: "schedule_change" | "result_update" | "advancement",
  data: any
): Promise<string> {
  const prompt = `
다음 정보를 바탕으로 공지사항 초안을 작성해주세요.

타입: ${type}
데이터: ${JSON.stringify(data, null, 2)}

공지사항은:
- 명확하고 간결해야 합니다
- 중요한 정보를 강조해야 합니다
- 친절한 톤을 유지해야 합니다
  `;
  
  const draft = await callAI({
    systemPrompt: "You are a notice writer for a football federation.",
    userQuestion: prompt,
    temperature: 0.7,
  });
  
  return draft;
}
```

---

## 9️⃣ AI UI 위치

### Public AI (홈페이지)

```typescript
// 홈페이지 우하단 고정 챗봇
<FederationHomePage>
  {/* 페이지 내용 */}
  
  <AIChatbot
    federationId={federationId}
    position="bottom-right"
    agentType="general-assistant"
  />
</FederationHomePage>
```

### Admin AI (관리자 대시보드)

```typescript
// 관리자 대시보드 AI 패널
<AdminDashboard>
  <AdminAIPanel
    federationId={federationId}
    agentType="admin-operations"
  />
</AdminDashboard>
```

---

## 🔟 AI 기술 구조

### 기술 스택

```
LLM (OpenAI GPT-4)
  +
RAG (Firestore 데이터)
  +
API Layer (Cloud Functions)
  +
Frontend (React)
```

### 구현 구조

```typescript
// Cloud Function: AI Gateway
export const queryAI = onCall(async (request) => {
  const { federationId, question, agentType, conversationId } = request.data;
  
  // 1. 의도 분석
  const intent = analyzeIntent(question);
  
  // 2. 에이전트 라우팅
  const targetAgent = routeToAgent(intent);
  
  // 3. 데이터 조회
  const context = await retrieveContext(question, federationId, targetAgent);
  
  // 4. AI 호출
  const response = await callOpenAI({
    systemPrompt: buildSystemPrompt(federationId, targetAgent),
    userQuestion: question,
    context: context,
  });
  
  // 5. 대화 기록 저장
  await saveConversation(federationId, conversationId, question, response);
  
  return { response, intent: intent.type };
});
```

---

## ✅ AI 에이전트 시스템 요약

### 핵심 특징

1. **역할별 에이전트**: 7개 특화 에이전트
2. **협회별 데이터**: 멀티 테넌트 구조
3. **RAG 기반**: Firestore 데이터를 컨텍스트로 활용
4. **자동 라우팅**: 의도 분석 후 적절한 에이전트로 라우팅
5. **운영 보조**: 관리자 업무 자동화

### 경쟁력

이 시스템이 완성되면 YAGO는:
- **홈페이지 플랫폼**
- **대회 운영 시스템**
- **AI 대진표 엔진**
- **AI 운영 보조**
- **멀티 협회 SaaS**

를 모두 갖춘 플랫폼이 됩니다.

---

**작성일**: 2024년  
**상태**: ✅ AI 에이전트 시스템 아키텍처 완료
