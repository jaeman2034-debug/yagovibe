# 🧠 YAGO VIBE SPORTS - Sports AI Coach System (AI 스포츠 코치) 완전 설계

> **작성일**: 2024년  
> **목적**: 경기 데이터 + 선수 기록 + 팀 통계를 분석해서 코칭 정보를 제공하는 AI 시스템

---

## 📋 목차

1. [Sports AI Coach 개념](#1-sports-ai-coach-개념)
2. [AI Coach 데이터 소스](#2-ai-coach-데이터-소스)
3. [Firestore 구조](#3-firestore-구조)
4. [AI 분석 타입](#4-ai-분석-타입)
5. [AI Coach UI](#5-ai-coach-ui)
6. [AI 데이터 생성 방식](#6-ai-데이터-생성-방식)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ Sports AI Coach 개념

### Sports AI Coach 역할

**경기 데이터 + 선수 기록 + 팀 통계를 분석해서 코칭 정보를 제공하는 시스템**입니다.

예:
```
AI COACH

Tigers vs Lions 경기 분석

- 점유율 58%
- 슈팅 12 : 7
- 패스 성공률 82%

AI 추천

✔ 공격 전개 속도 증가
✔ 왼쪽 측면 활용
✔ 수비 라인 간격 유지
```

### 데이터 → 분석 → 코칭

```
데이터 수집
  ↓
AI 분석
  ↓
인사이트 생성
  ↓
코칭 추천 제공
```

---

## 2️⃣ AI Coach 데이터 소스

### 2-1. 데이터 소스 목록

AI는 다음 데이터를 분석합니다:

```
Match Events
Player Stats
Team Stats
Lineup
Tournament Results
Match Timeline
Match Stats
```

### 2-2. 데이터 흐름

```
Match
  ↓
Events
  ↓
Stats
  ↓
AI Analysis
  ↓
Coach Insights
```

### 2-3. 데이터 수집 예시

```typescript
// 경기 데이터 수집
const matchData = {
  homeTeam: "Tigers",
  awayTeam: "Lions",
  score: { home: 3, away: 2 },
  possession: { home: 58, away: 42 },
  shots: { home: 12, away: 7 },
  passes: { home: 450, away: 320 },
  passAccuracy: { home: 82, away: 75 },
  events: [
    { type: "goal", minute: 23, player: "John" },
    { type: "goal", minute: 45, player: "Alex" },
    { type: "yellow_card", minute: 60, player: "Mark" },
  ]
};
```

---

## 3️⃣ Firestore 구조

### 3-1. Match AI Analysis

```
matches/{matchId}/analysis/{analysisId}
```

**문서 스키마**:
```typescript
{
  type: "match_analysis";
  summary: string;
  keyInsights: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }[];
  performanceScore: number; // 0-100
  createdAt: Timestamp;
}
```

### 3-2. Player AI Analysis

```
players/{playerId}/analysis/{analysisId}
```

**문서 스키마**:
```typescript
{
  playerId: string;
  seasonId: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: {
    title: string;
    description: string;
    category: "technical" | "tactical" | "physical" | "mental";
  }[];
  performanceScore: number; // 0-100
  createdAt: Timestamp;
}
```

### 3-3. Team AI Analysis

```
teams/{teamId}/analysis/{analysisId}
```

**문서 스키마**:
```typescript
{
  teamId: string;
  seasonId: string;
  performanceScore: number; // 0-100
  strengths: string[];
  improvements: string[];
  tacticalRecommendations: {
    formation: string;
    attackingStyle: string;
    defensiveStyle: string;
  };
  createdAt: Timestamp;
}
```

---

## 4️⃣ AI 분석 타입

### 4-1. 경기 분석 (Match Analysis)

```
경기 데이터 분석

득점 패턴
수비 패턴
공격 패턴
전술 분석
```

### 4-2. 선수 분석 (Player Analysis)

```
선수 성과 분석

득점 패턴
패스 정확도
수비 성과
체력 분석
```

### 4-3. 팀 분석 (Team Analysis)

```
팀 성과 분석

전술 패턴
팀워크
강점/약점
개선 방향
```

### 4-4. 전술 추천 (Tactical Recommendations)

```
AI 전술 추천

상대 팀 분석
전술 추천
라인업 추천
```

### 4-5. 훈련 추천 (Training Recommendations)

```
AI 훈련 추천

약점 분석
훈련 프로그램 추천
개인 훈련 추천
```

---

## 5️⃣ AI Coach UI

### 5-1. Match AI Analysis UI

```
┌─────────────────────────────────────────┐
│ AI 경기 분석                              │
│                                          │
│ Tigers vs Lions                          │
│                                          │
│ Performance Score: 82                    │
│                                          │
│ 요약                                      │
│ Tigers가 점유율과 공격에서 우세했으나    │
│ 수비 전환에서 약점이 있었습니다.          │
│                                          │
│ 강점                                      │
│ ✔ 공격 전개 속도가 빠름                   │
│ ✔ 왼쪽 측면 공격이 효과적                 │
│                                          │
│ 약점                                      │
│ ⚠ 수비 라인 간격이 넓음                   │
│ ⚠ 세트피스 수비 취약                      │
│                                          │
│ 추천                                      │
│ 1. 수비 라인 간격 조정                    │
│ 2. 세트피스 수비 전술 개선                │
└─────────────────────────────────────────┘
```

### 5-2. Player AI Report UI

```
┌─────────────────────────────────────────┐
│ AI 선수 분석                              │
│                                          │
│ John (FW)                                 │
│                                          │
│ Performance Score: 85                    │
│                                          │
│ 강점                                      │
│ ✔ 골 결정력이 뛰어남                      │
│ ✔ 위치 선정이 우수함                     │
│                                          │
│ 개선 필요                                 │
│ ⚠ 패스 정확도 향상 필요                  │
│ ⚠ 오프볼 움직임 개선                     │
│                                          │
│ 추천 훈련                                 │
│ 1. 패스 정확도 훈련                      │
│ 2. 오프볼 움직임 훈련                     │
└─────────────────────────────────────────┘
```

### 5-3. Team AI Insights UI

```
┌─────────────────────────────────────────┐
│ AI 팀 분석                                │
│                                          │
│ Tigers                                   │
│                                          │
│ Performance Score: 78                   │
│                                          │
│ 강점                                      │
│ ✔ 하이 프레싱 효과적                      │
│ ✔ 윙 플레이 우수                          │
│                                          │
│ 개선 필요                                 │
│ ⚠ 미드필드 간격 조정                     │
│ ⚠ 수비 전환 개선                         │
│                                          │
│ 전술 추천                                 │
│ 포메이션: 4-3-3                          │
│ 공격: 빠른 전개                           │
│ 수비: 하이 프레싱                        │
└─────────────────────────────────────────┘
```

---

## 6️⃣ AI 데이터 생성 방식

### 6-1. Cloud Functions 자동 생성

```typescript
// functions/src/ai/onMatchFinished.ts
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore } from "firebase-admin/firestore";
import { analyzeMatch } from "./analyzeMatch";

const db = getFirestore();

export const onMatchFinished = onDocumentUpdated(
  "matches/{matchId}",
  async (event) => {
    const { matchId } = event.params;
    const before = event.data.before.data();
    const after = event.data.after.data();
    
    // 경기가 종료된 경우 AI 분석 생성
    if (before.status !== "finished" && after.status === "finished") {
      await analyzeMatch(matchId);
    }
  }
);
```

### 6-2. OpenAI API 통합

```typescript
// functions/src/ai/analyzeMatch.ts
import { getFirestore } from "firebase-admin/firestore";
import { OpenAI } from "openai";
import * as admin from "firebase-admin";

const db = getFirestore();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeMatch(matchId: string) {
  // 경기 데이터 조회
  const matchRef = db.doc(`matches/${matchId}`);
  const matchSnap = await matchRef.get();
  const matchData = matchSnap.data();
  
  if (!matchData) return;
  
  // 경기 이벤트 조회
  const eventsRef = db.collection(`matches/${matchId}/events`);
  const eventsSnap = await eventsRef.get();
  const events = eventsSnap.docs.map(doc => doc.data());
  
  // 경기 통계 조회
  const statsRef = db.doc(`matches/${matchId}/stats`);
  const statsSnap = await statsRef.get();
  const stats = statsSnap.data();
  
  // AI 프롬프트 생성
  const prompt = `
    다음 축구 경기 데이터를 분석해주세요:
    
    홈팀: ${matchData.homeTeamName}
    원정팀: ${matchData.awayTeamName}
    점수: ${matchData.score.home} : ${matchData.score.away}
    
    경기 통계:
    - 점유율: 홈팀 ${stats?.homeTeam?.possession}% vs 원정팀 ${stats?.awayTeam?.possession}%
    - 슛: 홈팀 ${stats?.homeTeam?.shots} vs 원정팀 ${stats?.awayTeam?.shots}
    - 패스 성공률: 홈팀 ${stats?.homeTeam?.passAccuracy}% vs 원정팀 ${stats?.awayTeam?.passAccuracy}%
    
    경기 이벤트:
    ${events.map(e => `${e.minute}' ${e.type} - ${e.playerName}`).join('\n')}
    
    다음 형식으로 분석 결과를 JSON으로 제공해주세요:
    {
      "summary": "경기 요약",
      "keyInsights": ["핵심 인사이트 1", "핵심 인사이트 2"],
      "strengths": ["강점 1", "강점 2"],
      "weaknesses": ["약점 1", "약점 2"],
      "recommendations": [
        {
          "title": "추천 제목",
          "description": "추천 설명",
          "priority": "high"
        }
      ],
      "performanceScore": 82
    }
  `;
  
  // OpenAI API 호출
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { 
        role: "system", 
        content: "당신은 전문 축구 분석가입니다. 경기 데이터를 분석하여 코칭 인사이트를 제공합니다." 
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(completion.choices[0].message.content || "{}");
  
  // 분석 결과 저장
  const analysisRef = db.collection(`matches/${matchId}/analysis`).doc();
  await analysisRef.set({
    type: "match_analysis",
    summary: analysis.summary,
    keyInsights: analysis.keyInsights,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations: analysis.recommendations,
    performanceScore: analysis.performanceScore,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return analysis;
}
```

### 6-3. Player Analysis 함수

```typescript
// functions/src/ai/analyzePlayer.ts
export async function analyzePlayer(playerId: string, seasonId: string) {
  // 선수 통계 조회
  const statsRef = db.doc(`players/${playerId}/stats/${seasonId}`);
  const statsSnap = await statsRef.get();
  const stats = statsSnap.data();
  
  // 선수 경기 기록 조회
  const matchesRef = db.collection(`players/${playerId}/matches`);
  const matchesSnap = await matchesRef.get();
  const matches = matchesSnap.docs.map(doc => doc.data());
  
  // AI 프롬프트 생성
  const prompt = `
    다음 선수 데이터를 분석해주세요:
    
    시즌 통계:
    - 경기: ${stats?.matches}
    - 득점: ${stats?.goals}
    - 도움: ${stats?.assists}
    - 출전 시간: ${stats?.minutesPlayed}분
    
    최근 경기 기록:
    ${matches.slice(0, 5).map(m => `${m.date} - ${m.goals}골 ${m.assists}도움`).join('\n')}
    
    다음 형식으로 분석 결과를 JSON으로 제공해주세요:
    {
      "strengths": ["강점 1", "강점 2"],
      "weaknesses": ["약점 1", "약점 2"],
      "recommendations": [
        {
          "title": "추천 제목",
          "description": "추천 설명",
          "category": "technical"
        }
      ],
      "performanceScore": 85
    }
  `;
  
  // OpenAI API 호출
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { 
        role: "system", 
        content: "당신은 전문 축구 코치입니다. 선수 데이터를 분석하여 개선 방향을 제시합니다." 
      },
      { role: "user", content: prompt }
    ],
    response_format: { type: "json_object" }
  });
  
  const analysis = JSON.parse(completion.choices[0].message.content || "{}");
  
  // 분석 결과 저장
  const analysisRef = db.collection(`players/${playerId}/analysis`).doc();
  await analysisRef.set({
    playerId,
    seasonId,
    strengths: analysis.strengths,
    weaknesses: analysis.weaknesses,
    recommendations: analysis.recommendations,
    performanceScore: analysis.performanceScore,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return analysis;
}
```

---

## 7️⃣ 실제 구현 코드

### 7-1. Match AI Analysis 컴포넌트

```typescript
// src/components/ai/MatchAIAnalysis.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface MatchAIAnalysisProps {
  matchId: string;
}

export function MatchAIAnalysis({ matchId }: MatchAIAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const analysesRef = collection(db, "matches", matchId, "analysis");
        const q = query(
          analysesRef,
          orderBy("createdAt", "desc"),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setAnalysis(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error("AI 분석 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalysis();
  }, [matchId]);
  
  if (loading) return <div>로딩 중...</div>;
  if (!analysis) return <div>AI 분석이 없습니다</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">AI 경기 분석</h2>
        <div className="text-2xl font-bold text-blue-600">
          {analysis.performanceScore}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* 요약 */}
        <div>
          <h3 className="font-semibold mb-2">요약</h3>
          <p className="text-gray-700">{analysis.summary}</p>
        </div>
        
        {/* 강점 */}
        <div>
          <h3 className="font-semibold mb-2">강점</h3>
          <ul className="space-y-1">
            {analysis.strengths.map((strength: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-600">✔</span>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* 약점 */}
        <div>
          <h3 className="font-semibold mb-2">약점</h3>
          <ul className="space-y-1">
            {analysis.weaknesses.map((weakness: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-yellow-600">⚠</span>
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* 추천 */}
        <div>
          <h3 className="font-semibold mb-2">추천</h3>
          <ul className="space-y-2">
            {analysis.recommendations.map((rec: any, idx: number) => (
              <li key={idx} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="font-semibold">{rec.title}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    rec.priority === "high" ? "bg-red-100 text-red-800" :
                    rec.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {rec.priority === "high" ? "높음" :
                     rec.priority === "medium" ? "보통" : "낮음"}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{rec.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### 7-2. Team AI Insights 컴포넌트

```typescript
// src/components/ai/TeamAIInsights.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface TeamAIInsightsProps {
  teamId: string;
  seasonId: string;
}

export function TeamAIInsights({ teamId, seasonId }: TeamAIInsightsProps) {
  const [insights, setInsights] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const insightsRef = collection(db, "teams", teamId, "analysis");
        const q = query(
          insightsRef,
          where("seasonId", "==", seasonId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setInsights(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error("AI 인사이트 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInsights();
  }, [teamId, seasonId]);
  
  if (loading) return <div>로딩 중...</div>;
  if (!insights) return <div>AI 인사이트가 없습니다</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">AI 팀 분석</h2>
        <div className="text-2xl font-bold text-blue-600">
          {insights.performanceScore}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* 강점 */}
        <div>
          <h3 className="font-semibold mb-2">강점</h3>
          <ul className="space-y-1">
            {insights.strengths.map((strength: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-600">✔</span>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* 개선 필요 */}
        <div>
          <h3 className="font-semibold mb-2">개선 필요</h3>
          <ul className="space-y-1">
            {insights.improvements.map((improvement: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-yellow-600">⚠</span>
                <span className="text-gray-700">{improvement}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* 전술 추천 */}
        {insights.tacticalRecommendations && (
          <div>
            <h3 className="font-semibold mb-2">전술 추천</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">포메이션:</span>{" "}
                  <span>{insights.tacticalRecommendations.formation}</span>
                </div>
                <div>
                  <span className="font-semibold">공격 스타일:</span>{" "}
                  <span>{insights.tacticalRecommendations.attackingStyle}</span>
                </div>
                <div>
                  <span className="font-semibold">수비 스타일:</span>{" "}
                  <span>{insights.tacticalRecommendations.defensiveStyle}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

### 7-3. Player AI Report 컴포넌트

```typescript
// src/components/ai/PlayerAIReport.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface PlayerAIReportProps {
  playerId: string;
  seasonId: string;
}

export function PlayerAIReport({ playerId, seasonId }: PlayerAIReportProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchReport = async () => {
      try {
        const reportsRef = collection(db, "players", playerId, "analysis");
        const q = query(
          reportsRef,
          where("seasonId", "==", seasonId),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          setReport(snapshot.docs[0].data());
        }
      } catch (error) {
        console.error("AI 리포트 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchReport();
  }, [playerId, seasonId]);
  
  if (loading) return <div>로딩 중...</div>;
  if (!report) return <div>AI 리포트가 없습니다</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">AI 선수 분석</h2>
        <div className="text-2xl font-bold text-blue-600">
          {report.performanceScore}
        </div>
      </div>
      
      <div className="space-y-4">
        {/* 강점 */}
        <div>
          <h3 className="font-semibold mb-2">강점</h3>
          <ul className="space-y-1">
            {report.strengths.map((strength: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-green-600">✔</span>
                <span className="text-gray-700">{strength}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* 개선 필요 */}
        <div>
          <h3 className="font-semibold mb-2">개선 필요</h3>
          <ul className="space-y-1">
            {report.weaknesses.map((weakness: string, idx: number) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-yellow-600">⚠</span>
                <span className="text-gray-700">{weakness}</span>
              </li>
            ))}
          </ul>
        </div>
        
        {/* 추천 훈련 */}
        <div>
          <h3 className="font-semibold mb-2">추천 훈련</h3>
          <ul className="space-y-2">
            {report.recommendations.map((rec: any, idx: number) => (
              <li key={idx} className="border border-gray-200 rounded-lg p-3">
                <div className="flex items-start justify-between mb-1">
                  <span className="font-semibold">{rec.title}</span>
                  <span className="text-xs text-gray-500">{rec.category}</span>
                </div>
                <p className="text-sm text-gray-600">{rec.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Match AI Analysis 컴포넌트
- [ ] Team AI Insights 컴포넌트
- [ ] Player AI Report 컴포넌트
- [ ] AI 분석 함수 (Cloud Functions)

### Phase 2 (다음)
- [ ] OpenAI API 통합
- [ ] 경기 분석 자동화
- [ ] 선수 분석 자동화
- [ ] 팀 분석 자동화

### Phase 3 (확장)
- [ ] 전술 추천
- [ ] 훈련 추천
- [ ] 라인업 추천

---

**작성일**: 2024년  
**상태**: ✅ Sports AI Coach System 완전 설계 완료
