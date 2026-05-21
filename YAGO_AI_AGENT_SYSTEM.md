# 🤖 YAGO VIBE SPORTS - AI 에이전트 실제 동작 로직

> **작성일**: 2024년  
> **목적**: AI 에이전트의 실제 동작 로직 및 구현 가이드

---

## 📋 목차

1. [AI 에이전트 개요](#1-ai-에이전트-개요)
2. [에이전트 타입별 로직](#2-에이전트-타입별-로직)
3. [의도 분석 시스템](#3-의도-분석-시스템)
4. [컨텍스트 구성](#4-컨텍스트-구성)
5. [실제 구현 코드](#5-실제-구현-코드)

---

## 1️⃣ AI 에이전트 개요

### 에이전트 구조

```
AI Agent System
  ├─ General Assistant (대표 AI 비서)
  ├─ Tournament Guide (대회 안내 AI)
  ├─ Match Operations (경기 운영 AI)
  ├─ Team Registration (팀 등록 AI)
  ├─ Player Registration (선수 등록 AI)
  ├─ Rules & Docs (규정 AI)
  ├─ Admin Operations (협회 행정 AI)
  └─ Sponsor Assistant (후원사 AI)
```

### 처리 플로우

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

---

## 2️⃣ 에이전트 타입별 로직

### 2.1 General Assistant (대표 AI 비서)

**역할**: 홈페이지 전체 검색 및 안내

**지식 소스**:
- notices (공지사항)
- documents (규정/문서)
- tournaments (대회)
- matches (경기)
- teams (팀)
- players (선수)

**처리 로직**:

```typescript
async function processGeneralAssistant(
  question: string,
  federationId: string
): Promise<string> {
  // 1. 의도 분석
  const intent = analyzeIntent(question);
  
  // 2. 관련 데이터 조회
  const context = await gatherContext(federationId, intent);
  
  // 3. 시스템 프롬프트 구성
  const systemPrompt = `
당신은 ${federationName}의 AI 비서입니다.
다음 정보를 바탕으로 사용자의 질문에 친절하고 정확하게 답변해주세요.

협회 정보:
${federationInfo}

공지사항:
${notices}

대회 정보:
${tournaments}

경기 일정:
${matches}

팀 정보:
${teams}
  `;
  
  // 4. OpenAI API 호출
  const response = await callOpenAI(systemPrompt, question);
  
  return response;
}
```

**예시 질문**:
- "오늘 경기 일정 알려줘"
- "다음 대회 언제 시작해?"
- "팀 등록 방법 알려줘"

---

### 2.2 Tournament Guide (대회 안내 AI)

**역할**: 브로슈어 기반 대회 정보 제공

**지식 소스**:
- tournaments (대회)
- notices (공지사항)
- documents (규정/문서)

**처리 로직**:

```typescript
async function processTournamentGuide(
  question: string,
  federationId: string,
  tournamentId?: string
): Promise<string> {
  // 1. 대회 정보 조회
  const tournaments = tournamentId
    ? [await getTournament(federationId, tournamentId)]
    : await getActiveTournaments(federationId);
  
  // 2. 관련 공지사항 조회
  const notices = await getTournamentNotices(federationId, tournamentId);
  
  // 3. 관련 문서 조회
  const documents = await getTournamentDocuments(federationId, tournamentId);
  
  // 4. 컨텍스트 구성
  const context = {
    tournaments: tournaments.map(t => ({
      name: t.name,
      startDate: t.startDate,
      endDate: t.endDate,
      registrationStart: t.registrationStart,
      registrationEnd: t.registrationEnd,
      maxTeams: t.maxTeams,
      entryFee: t.entryFee,
      status: t.status,
    })),
    notices: notices.map(n => ({
      title: n.title,
      content: n.content,
      createdAt: n.createdAt,
    })),
    documents: documents.map(d => ({
      title: d.title,
      content: d.content,
    })),
  };
  
  // 5. 시스템 프롬프트
  const systemPrompt = `
당신은 ${federationName}의 대회 안내 AI입니다.
다음 대회 정보를 바탕으로 사용자의 질문에 답변해주세요.

대회 정보:
${JSON.stringify(context.tournaments, null, 2)}

공지사항:
${JSON.stringify(context.notices, null, 2)}

규정/문서:
${JSON.stringify(context.documents, null, 2)}
  `;
  
  const response = await callOpenAI(systemPrompt, question);
  return response;
}
```

**예시 질문**:
- "다음 대회 언제 시작해?"
- "대회 참가비 얼마야?"
- "팀 등록 마감일 언제야?"

---

### 2.3 Match Operations (경기 운영 AI)

**역할**: 운영진용 경기 관리 보조

**지식 소스**:
- matches (경기)
- teams (팀)
- players (선수)
- standings (순위)

**처리 로직**:

```typescript
async function processMatchOps(
  question: string,
  federationId: string,
  seasonId?: string
): Promise<string> {
  // 1. 경기 정보 조회
  const matches = await getMatches(federationId, seasonId, {
    status: ["scheduled", "live", "completed"],
    limit: 20,
  });
  
  // 2. 순위 정보 조회
  const standings = await getStandings(federationId, seasonId);
  
  // 3. 컨텍스트 구성
  const context = {
    upcomingMatches: matches.filter(m => m.status === "scheduled"),
    liveMatches: matches.filter(m => m.status === "live"),
    completedMatches: matches.filter(m => m.status === "completed"),
    standings: standings.slice(0, 10), // 상위 10팀
  };
  
  // 4. 시스템 프롬프트
  const systemPrompt = `
당신은 ${federationName}의 경기 운영 AI입니다.
운영진을 도와 경기 관리 업무를 보조합니다.

다가오는 경기:
${JSON.stringify(context.upcomingMatches, null, 2)}

진행 중인 경기:
${JSON.stringify(context.liveMatches, null, 2)}

최근 완료된 경기:
${JSON.stringify(context.completedMatches, null, 2)}

현재 순위:
${JSON.stringify(context.standings, null, 2)}
  `;
  
  const response = await callOpenAI(systemPrompt, question);
  return response;
}
```

**예시 질문**:
- "오늘 경기 몇 개야?"
- "다음 주 경기 일정 알려줘"
- "1위 팀 누구야?"

---

### 2.4 Team Registration (팀 등록 AI)

**역할**: 팀 등록 안내 및 검수

**지식 소스**:
- documents (규정/문서)
- notices (공지사항)
- tournaments (대회)

**처리 로직**:

```typescript
async function processTeamRegistration(
  question: string,
  federationId: string
): Promise<string> {
  // 1. 등록 관련 문서 조회
  const documents = await getDocuments(federationId, {
    category: "registration",
    tags: ["team", "registration"],
  });
  
  // 2. 등록 관련 공지사항 조회
  const notices = await getNotices(federationId, {
    category: "registration",
  });
  
  // 3. 현재 진행 중인 등록 대회 조회
  const tournaments = await getTournaments(federationId, {
    status: "registration",
  });
  
  // 4. 컨텍스트 구성
  const context = {
    registrationRules: documents.filter(d => d.type === "rule"),
    registrationNotices: notices,
    openTournaments: tournaments,
  };
  
  // 5. 시스템 프롬프트
  const systemPrompt = `
당신은 ${federationName}의 팀 등록 AI입니다.
팀 등록 절차와 규정을 안내합니다.

등록 규정:
${JSON.stringify(context.registrationRules, null, 2)}

등록 공지사항:
${JSON.stringify(context.registrationNotices, null, 2)}

현재 등록 가능한 대회:
${JSON.stringify(context.openTournaments, null, 2)}
  `;
  
  const response = await callOpenAI(systemPrompt, question);
  return response;
}
```

**예시 질문**:
- "팀 등록 어떻게 해?"
- "등록비 얼마야?"
- "필요 서류 뭐야?"

---

### 2.5 Rules & Docs (규정 AI)

**역할**: 규정 검색 및 해석

**지식 소스**:
- documents (규정/문서)

**처리 로직**:

```typescript
async function processRulesDocs(
  question: string,
  federationId: string
): Promise<string> {
  // 1. 규정 문서 조회 (키워드 검색)
  const keywords = extractKeywords(question);
  const documents = await searchDocuments(federationId, keywords);
  
  // 2. 관련 규정 추출
  const relevantRules = documents.filter(d => 
    d.category === "rule" || d.category === "regulation"
  );
  
  // 3. 컨텍스트 구성
  const context = {
    rules: relevantRules.map(r => ({
      title: r.title,
      content: r.content,
      category: r.category,
    })),
  };
  
  // 4. 시스템 프롬프트 (낮은 temperature로 정확성 확보)
  const systemPrompt = `
당신은 ${federationName}의 규정 AI입니다.
규정을 정확하게 해석하고 안내합니다.

규정 문서:
${JSON.stringify(context.rules, null, 2)}

주의: 규정은 정확하게 해석해야 하며, 불확실한 내용은 "규정 문서를 확인해주세요"라고 안내하세요.
  `;
  
  const response = await callOpenAI(systemPrompt, question, {
    temperature: 0.3, // 낮은 temperature로 정확성 확보
  });
  
  return response;
}
```

**예시 질문**:
- "경기 규칙 알려줘"
- "선수 교체 규정 뭐야?"
- "퇴장 규정 알려줘"

---

## 3️⃣ 의도 분석 시스템

### 의도 분석 로직

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

function extractEntities(question: string): Intent["entities"] {
  const entities: Intent["entities"] = {};
  
  // 날짜 추출
  const datePattern = /(\d{4})년?\s*(\d{1,2})월?\s*(\d{1,2})일?/;
  const dateMatch = question.match(datePattern);
  if (dateMatch) {
    entities.date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
  }
  
  // ID 추출 (URL 또는 명시적 ID)
  const idPattern = /(?:id|ID)[:\s]+([a-zA-Z0-9-_]+)/;
  const idMatch = question.match(idPattern);
  if (idMatch) {
    // ID 타입 추론은 추가 로직 필요
  }
  
  return entities;
}
```

---

## 4️⃣ 컨텍스트 구성

### 컨텍스트 빌더

```typescript
async function gatherContext(
  federationId: string,
  intent: Intent
): Promise<Context> {
  const context: Context = {
    federation: await getFederation(federationId),
    tournaments: [],
    matches: [],
    teams: [],
    players: [],
    notices: [],
    documents: [],
  };
  
  switch (intent.type) {
    case "tournament":
      context.tournaments = await getActiveTournaments(federationId);
      if (intent.entities.tournamentId) {
        const tournament = await getTournament(
          federationId,
          intent.entities.tournamentId
        );
        if (tournament) {
          context.tournaments = [tournament];
        }
      }
      break;
      
    case "match":
      const date = intent.entities.date
        ? new Date(intent.entities.date)
        : new Date();
      context.matches = await getMatches(federationId, {
        date: date,
        limit: 10,
      });
      break;
      
    case "team":
      context.teams = await getTeams(federationId, {
        limit: 20,
      });
      if (intent.entities.teamId) {
        const team = await getTeam(federationId, intent.entities.teamId);
        if (team) {
          context.teams = [team];
        }
      }
      break;
      
    case "rule":
      context.documents = await getDocuments(federationId, {
        category: "rule",
        limit: 10,
      });
      break;
      
    default:
      // General: 모든 데이터 조회
      context.tournaments = await getActiveTournaments(federationId);
      context.matches = await getUpcomingMatches(federationId, { limit: 5 });
      context.notices = await getRecentNotices(federationId, { limit: 5 });
      break;
  }
  
  return context;
}
```

---

## 5️⃣ 실제 구현 코드

### 통합 AI 쿼리 함수

```typescript
// functions/src/ai/queryAI.ts
import { onCall } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";

const db = getFirestore();
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const queryAI = onCall(
  {
    cors: true,
    memory: "512MiB",
    timeoutSeconds: 60,
  },
  async (request) => {
    const { data, auth } = request;
    
    if (!auth) {
      throw new HttpsError("unauthenticated", "인증이 필요합니다.");
    }
    
    const {
      federationId,
      agentType,
      question,
      conversationId,
    } = data as {
      federationId: string;
      agentType: string;
      question: string;
      conversationId?: string;
    };
    
    try {
      // 1. 의도 분석
      const intent = analyzeIntent(question);
      
      // 2. 에이전트별 처리
      let response: string;
      
      switch (agentType) {
        case "general-assistant":
          response = await processGeneralAssistant(question, federationId);
          break;
        case "tournament-guide":
          response = await processTournamentGuide(question, federationId);
          break;
        case "match-ops":
          response = await processMatchOps(question, federationId);
          break;
        case "team-registration":
          response = await processTeamRegistration(question, federationId);
          break;
        case "player-registration":
          response = await processPlayerRegistration(question, federationId);
          break;
        case "rules-docs":
          response = await processRulesDocs(question, federationId);
          break;
        case "admin-ops":
          response = await processAdminOps(question, federationId);
          break;
        default:
          response = await processGeneralAssistant(question, federationId);
      }
      
      // 3. 대화 기록 저장
      if (conversationId) {
        await saveConversationMessage(
          federationId,
          conversationId,
          question,
          response
        );
      }
      
      return {
        success: true,
        response,
        intent: intent.type,
        confidence: intent.confidence,
      };
    } catch (error: any) {
      console.error("AI 쿼리 오류:", error);
      throw new HttpsError("internal", error.message || "AI 응답 생성 중 오류가 발생했습니다.");
    }
  }
);

async function processGeneralAssistant(
  question: string,
  federationId: string
): Promise<string> {
  // 컨텍스트 수집
  const context = await gatherContext(federationId, analyzeIntent(question));
  
  // 시스템 프롬프트 구성
  const systemPrompt = buildSystemPrompt("general-assistant", context);
  
  // OpenAI API 호출
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });
  
  return completion.choices[0].message.content || "응답을 생성할 수 없습니다.";
}

function buildSystemPrompt(
  agentType: string,
  context: Context
): string {
  const federationName = context.federation?.name || "협회";
  
  const basePrompt = `당신은 ${federationName}의 AI 비서입니다.
사용자의 질문에 친절하고 정확하게 답변해주세요.
`;
  
  switch (agentType) {
    case "general-assistant":
      return `${basePrompt}
      
협회 정보:
${JSON.stringify(context.federation, null, 2)}

공지사항:
${JSON.stringify(context.notices, null, 2)}

대회 정보:
${JSON.stringify(context.tournaments, null, 2)}

경기 일정:
${JSON.stringify(context.matches, null, 2)}
      `;
      
    case "tournament-guide":
      return `${basePrompt}
      
대회 정보:
${JSON.stringify(context.tournaments, null, 2)}

공지사항:
${JSON.stringify(context.notices, null, 2)}
      `;
      
    case "rules-docs":
      return `${basePrompt}
      
규정 문서:
${JSON.stringify(context.documents, null, 2)}

주의: 규정은 정확하게 해석해야 하며, 불확실한 내용은 "규정 문서를 확인해주세요"라고 안내하세요.
      `;
      
    default:
      return basePrompt;
  }
}
```

---

## ✅ AI 에이전트 시스템 요약

### 핵심 특징

1. **의도 기반 라우팅**: 사용자 질문을 분석하여 적절한 에이전트로 라우팅
2. **컨텍스트 기반 응답**: Firestore 데이터를 기반으로 정확한 정보 제공
3. **에이전트별 특화**: 각 에이전트는 특정 도메인에 특화된 응답 생성
4. **대화 기록 저장**: 대화 기록을 저장하여 연속적인 대화 지원

### 확장 가능성

- 새로운 에이전트 타입 추가 용이
- 커스텀 프롬프트로 협회별 특화 가능
- 다양한 AI 모델 지원 (GPT-4, Claude 등)

---

**작성일**: 2024년  
**상태**: ✅ AI 에이전트 실제 동작 로직 완료
