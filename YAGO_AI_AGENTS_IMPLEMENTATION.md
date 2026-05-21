# 🤖 YAGO VIBE SPORTS - AI 에이전트 실제 구현 설계

> **작성일**: 2024년  
> **목적**: AI 에이전트 실제 동작 로직 및 구현 가이드

---

## 📋 목차

1. [AI 에이전트 시스템 개요](#1-ai-에이전트-시스템-개요)
2. [대표 AI 비서 구현](#2-대표-ai-비서-구현)
3. [대회 안내 AI 구현](#3-대회-안내-ai-구현)
4. [경기 운영 AI 구현](#4-경기-운영-ai-구현)
5. [규정 AI 구현](#5-규정-ai-구현)
6. [AI 챗봇 UI 통합](#6-ai-챗봇-ui-통합)
7. [Cloud Functions 구현](#7-cloud-functions-구현)

---

## 1️⃣ AI 에이전트 시스템 개요

### 에이전트 구조

```
사용자 질문
  ↓
의도 분석 (NLP)
  ↓
에이전트 라우팅
  ↓
에이전트별 처리
  ↓
응답 생성
  ↓
사용자에게 전달
```

### 에이전트 타입

```typescript
type AIAgentType =
  | "main"              // 대표 AI 비서
  | "tournament"        // 대회 안내 AI
  | "match"             // 경기 운영 AI
  | "registration"      // 팀/선수 등록 AI
  | "regulation"        // 규정/문서 AI
  | "administration"    // 협회 행정 AI
  | "sponsor";          // 후원사 AI
```

---

## 2️⃣ 대표 AI 비서 구현

### 역할

**홈페이지 전체 검색 및 안내**

### 질문 예시

```
"대회 일정 알려줘"
"노원구청장기 참가팀이 몇 팀이야?"
"유소년 팀 등록은 어디서 해?"
"대진표 보여줘"
"협회 연락처 알려줘"
```

### 구현 코드

```typescript
// functions/src/ai/mainAssistant.ts
import { getFirestore } from "firebase-admin/firestore";
import OpenAI from "openai";

const db = getFirestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function handleMainAssistantQuery(
  federationId: string,
  userId: string,
  question: string
): Promise<string> {
  // 1. Federation 정보 조회
  const federationDoc = await db.collection("federations").doc(federationId).get();
  const federation = federationDoc.data();

  // 2. 관련 데이터 조회
  const [notices, tournaments, matches] = await Promise.all([
    getRecentNotices(federationId),
    getActiveTournaments(federationId),
    getUpcomingMatches(federationId),
  ]);

  // 3. 컨텍스트 구성
  const context = {
    federation: {
      name: federation?.name,
      region: federation?.region,
      contact: federation?.contact,
    },
    notices: notices.slice(0, 5),
    tournaments: tournaments.slice(0, 3),
    matches: matches.slice(0, 5),
  };

  // 4. OpenAI API 호출
  const systemPrompt = `당신은 ${federation?.name}의 AI 비서입니다.
다음 정보를 바탕으로 사용자의 질문에 친절하고 정확하게 답변해주세요.

협회 정보:
- 이름: ${federation?.name}
- 지역: ${federation?.region}
- 연락처: ${federation?.contact?.phone || "없음"}

최근 공지:
${notices.map((n: any) => `- ${n.title}`).join("\n")}

진행중 대회:
${tournaments.map((t: any) => `- ${t.name}`).join("\n")}

다가오는 경기:
${matches.map((m: any) => `- ${m.homeTeamName} vs ${m.awayTeamName} (${m.scheduledDate})`).join("\n")}

사용자가 특정 페이지로 이동해야 하는 경우, 해당 페이지의 경로를 제안해주세요.
예: "/federations/${federationId}/tournaments"`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0].message.content || "죄송합니다. 답변을 생성할 수 없습니다.";
}

async function getRecentNotices(federationId: string) {
  const noticesRef = db.collection(`federations/${federationId}/notices`);
  const snapshot = await noticesRef
    .orderBy("createdAt", "desc")
    .limit(5)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getActiveTournaments(federationId: string) {
  const tournamentsRef = db.collection(`federations/${federationId}/tournaments`);
  const snapshot = await tournamentsRef
    .where("status", "==", "active")
    .limit(3)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

async function getUpcomingMatches(federationId: string) {
  const matchesRef = db.collection(`federations/${federationId}/matches`);
  const now = new Date();
  const snapshot = await matchesRef
    .where("scheduledDate", ">=", now)
    .orderBy("scheduledDate", "asc")
    .limit(5)
    .get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
```

---

## 3️⃣ 대회 안내 AI 구현

### 역할

**브로슈어 기반 대회 정보 제공**

### 구현 코드

```typescript
// functions/src/ai/tournamentAssistant.ts
export async function handleTournamentQuery(
  federationId: string,
  tournamentId: string,
  question: string
): Promise<string> {
  // 1. 대회 정보 조회
  const tournamentDoc = await db
    .collection(`federations/${federationId}/tournaments`)
    .doc(tournamentId)
    .get();
  const tournament = tournamentDoc.data();

  // 2. 관련 데이터 조회
  const [teams, matches, standings] = await Promise.all([
    getTournamentTeams(federationId, tournamentId),
    getTournamentMatches(federationId, tournamentId),
    getTournamentStandings(federationId, tournamentId),
  ]);

  // 3. OpenAI API 호출
  const systemPrompt = `당신은 ${tournament?.name} 대회 안내 AI입니다.
다음 대회 정보를 바탕으로 사용자의 질문에 답변해주세요.

대회 정보:
- 이름: ${tournament?.name}
- 기간: ${tournament?.startDate} ~ ${tournament?.endDate}
- 참가팀: ${tournament?.teamCount}팀
- 형식: ${tournament?.type}

참가팀:
${teams.map((t: any) => `- ${t.name}`).join("\n")}

경기 일정:
${matches.map((m: any) => `- ${m.homeTeamName} vs ${m.awayTeamName} (${m.scheduledDate})`).join("\n")}

순위:
${standings.slice(0, 5).map((s: any) => `${s.rank}. ${s.teamName} (${s.points}점)`).join("\n")}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0].message.content || "죄송합니다. 답변을 생성할 수 없습니다.";
}
```

---

## 4️⃣ 경기 운영 AI 구현

### 역할

**운영진용 경기 관리 보조**

### 구현 코드

```typescript
// functions/src/ai/matchOperationAssistant.ts
export async function handleMatchOperationQuery(
  federationId: string,
  question: string,
  userId: string
): Promise<string> {
  // 권한 확인
  const isAdmin = await checkFederationAdmin(federationId, userId);
  if (!isAdmin) {
    return "경기 운영 AI는 관리자만 사용할 수 있습니다.";
  }

  // 1. 관련 데이터 조회
  const [pendingMatches, incompleteResults, upcomingMatches] = await Promise.all([
    getPendingMatches(federationId),
    getIncompleteResults(federationId),
    getUpcomingMatches(federationId),
  ]);

  // 2. OpenAI API 호출
  const systemPrompt = `당신은 ${federationId} 협회의 경기 운영 AI입니다.
운영진을 도와 경기 일정, 결과 입력, 순위 계산 등을 보조합니다.

대기 중인 경기: ${pendingMatches.length}경기
결과 미입력 경기: ${incompleteResults.length}경기
다가오는 경기: ${upcomingMatches.length}경기

사용자의 요청에 따라 적절한 조치를 제안해주세요.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  return completion.choices[0].message.content || "죄송합니다. 답변을 생성할 수 없습니다.";
}
```

---

## 5️⃣ 규정 AI 구현

### 역할

**규정 검색 및 해석**

### 구현 코드

```typescript
// functions/src/ai/regulationAssistant.ts
export async function handleRegulationQuery(
  federationId: string,
  question: string
): Promise<string> {
  // 1. 규정 문서 검색
  const regulationsRef = db.collection(`federations/${federationId}/regulations`);
  const snapshot = await regulationsRef.get();
  const regulations = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  // 2. 관련 규정 필터링 (키워드 기반)
  const relevantRegulations = regulations.filter((reg: any) => {
    const keywords = question.toLowerCase().split(" ");
    const content = `${reg.title} ${reg.content}`.toLowerCase();
    return keywords.some((keyword) => content.includes(keyword));
  });

  // 3. OpenAI API 호출
  const systemPrompt = `당신은 ${federationId} 협회의 규정 안내 AI입니다.
다음 규정 문서를 바탕으로 사용자의 질문에 정확하게 답변해주세요.

규정 문서:
${relevantRegulations.map((reg: any) => `\n## ${reg.title}\n${reg.content}`).join("\n\n")}

규정을 정확히 인용하고, 필요시 해당 문서의 링크를 제공해주세요.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question },
    ],
    temperature: 0.3, // 규정은 정확성이 중요하므로 낮은 temperature
    max_tokens: 500,
  });

  return completion.choices[0].message.content || "죄송합니다. 답변을 생성할 수 없습니다.";
}
```

---

## 6️⃣ AI 챗봇 UI 통합

### 프론트엔드 훅

```typescript
// src/hooks/useAIChat.ts
import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getAuth } from "firebase/auth";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function useAIChat(federationId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async (content: string, agentType: string = "main") => {
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error("로그인이 필요합니다.");
    }

    // 사용자 메시지 추가
    const userMessage: Message = {
      role: "user",
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const functions = getFunctions();
      const queryAIFn = httpsCallable(functions, "queryAI");

      const result = await queryAIFn({
        federationId,
        agentType,
        question: content,
        userId: auth.currentUser.uid,
      });

      // AI 응답 추가
      const assistantMessage: Message = {
        role: "assistant",
        content: result.data as string,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("AI 쿼리 실패:", error);
      const errorMessage: Message = {
        role: "assistant",
        content: "죄송합니다. 답변을 생성하는 중 오류가 발생했습니다.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, sendMessage };
}
```

---

## 7️⃣ Cloud Functions 구현

### queryAI 함수

```typescript
// functions/src/ai/queryAI.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { handleMainAssistantQuery } from "./mainAssistant";
import { handleTournamentQuery } from "./tournamentAssistant";
import { handleMatchOperationQuery } from "./matchOperationAssistant";
import { handleRegulationQuery } from "./regulationAssistant";

export const queryAI = onCall(
  {
    cors: true,
    memory: "512MiB",
    timeoutSeconds: 30,
  },
  async (request) => {
    const { data, auth } = request;

    if (!auth) {
      throw new HttpsError("unauthenticated", "인증이 필요합니다.");
    }

    const { federationId, agentType, question, tournamentId } = data;

    if (!federationId || !agentType || !question) {
      throw new HttpsError("invalid-argument", "필수 파라미터가 누락되었습니다.");
    }

    try {
      let response: string;

      switch (agentType) {
        case "main":
          response = await handleMainAssistantQuery(federationId, auth.uid, question);
          break;
        case "tournament":
          if (!tournamentId) {
            throw new HttpsError("invalid-argument", "tournamentId가 필요합니다.");
          }
          response = await handleTournamentQuery(federationId, tournamentId, question);
          break;
        case "match":
          response = await handleMatchOperationQuery(federationId, question, auth.uid);
          break;
        case "regulation":
          response = await handleRegulationQuery(federationId, question);
          break;
        default:
          response = await handleMainAssistantQuery(federationId, auth.uid, question);
      }

      // 대화 기록 저장
      await saveConversation(federationId, auth.uid, agentType, question, response);

      return response;
    } catch (error: any) {
      console.error("AI 쿼리 오류:", error);
      throw new HttpsError("internal", error.message || "AI 쿼리 처리 중 오류가 발생했습니다.");
    }
  }
);

async function saveConversation(
  federationId: string,
  userId: string,
  agentType: string,
  question: string,
  response: string
) {
  const db = getFirestore();
  const conversationsRef = db.collection("aiConversations");

  await conversationsRef.add({
    federationId,
    userId,
    agentType,
    question,
    response,
    createdAt: FieldValue.serverTimestamp(),
  });
}
```

---

## ✅ AI 에이전트 통합 플로우

### 전체 플로우

```
사용자 질문 입력
  ↓
의도 분석 (키워드 기반)
  ↓
에이전트 타입 결정
  ↓
해당 에이전트 함수 호출
  ↓
Firestore 데이터 조회
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

**작성일**: 2024년  
**상태**: ✅ AI 에이전트 실제 구현 설계 완료
