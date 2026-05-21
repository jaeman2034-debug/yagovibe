# 🤖 YAGO VIBE SPORTS - Sports AI Coach (스포츠 AI 코치) 설계

> **작성일**: 2024년  
> **목적**: 경기 분석 + 선수 분석 + 전술 추천 + 훈련 추천 AI 시스템

---

## 📋 목차

1. [Sports AI Coach 개념](#1-sports-ai-coach-개념)
2. [AI 분석 기능](#2-ai-분석-기능)
3. [Firestore 구조](#3-firestore-구조)
4. [AI 모델 통합](#4-ai-모델-통합)
5. [실제 구현 코드](#5-실제-구현-코드)

---

## 1️⃣ Sports AI Coach 개념

### Sports AI Coach 역할

**경기 데이터를 분석하여 전술 추천, 선수 분석, 훈련 추천을 제공하는 AI 시스템**입니다.

기능:
```
AI Coach

경기 분석
선수 분석
전술 추천
훈련 추천
```

### AI 분석 흐름

```
경기 데이터
  ↓
AI 분석
  ↓
인사이트 생성
  ↓
추천 제공
```

---

## 2️⃣ AI 분석 기능

### 2-1. 경기 분석

```
경기 데이터 분석

득점 패턴
수비 패턴
공격 패턴
전술 분석
```

### 2-2. 선수 분석

```
선수 성과 분석

득점 패턴
패스 정확도
수비 성과
체력 분석
```

### 2-3. 전술 추천

```
AI 전술 추천

상대 팀 분석
전술 추천
라인업 추천
```

### 2-4. 훈련 추천

```
AI 훈련 추천

약점 분석
훈련 프로그램 추천
개인 훈련 추천
```

---

## 3️⃣ Firestore 구조

### 3-1. AI 분석 결과

```
ai_analyses/{analysisId}
```

**문서 스키마**:
```typescript
{
  type: "match" | "player" | "team" | "tactical";
  entityId: string; // matchId, playerId, teamId
  entityType: string;
  insights: {
    summary: string;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
  createdAt: Timestamp;
}
```

### 3-2. AI 추천

```
ai_recommendations/{recommendationId}
```

**문서 스키마**:
```typescript
{
  type: "tactical" | "training" | "lineup";
  entityId: string;
  recommendations: {
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
  }[];
  createdAt: Timestamp;
}
```

---

## 4️⃣ AI 모델 통합

### 4-1. AI 분석 함수

```typescript
// functions/src/ai/analyzeMatch.ts
import { getFirestore } from "firebase-admin/firestore";
import { OpenAI } from "openai";

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
  
  // AI 프롬프트 생성
  const prompt = `
    다음 축구 경기 데이터를 분석해주세요:
    
    홈팀: ${matchData.homeTeamName}
    원정팀: ${matchData.awayTeamName}
    점수: ${matchData.score.home} : ${matchData.score.away}
    
    경기 이벤트:
    ${events.map(e => `${e.minute}' ${e.type} - ${e.playerName}`).join('\n')}
    
    다음 형식으로 분석 결과를 제공해주세요:
    1. 경기 요약
    2. 강점
    3. 약점
    4. 개선 추천
  `;
  
  // OpenAI API 호출
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "당신은 전문 축구 분석가입니다." },
      { role: "user", content: prompt }
    ],
  });
  
  const analysis = completion.choices[0].message.content;
  
  // 분석 결과 저장
  const analysisRef = db.collection("ai_analyses").doc();
  await analysisRef.set({
    type: "match",
    entityId: matchId,
    entityType: "match",
    insights: parseAnalysis(analysis),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return analysis;
}
```

### 4-2. 전술 추천 함수

```typescript
// functions/src/ai/recommendTactics.ts
export async function recommendTactics(teamId: string, opponentTeamId: string) {
  // 팀 데이터 조회
  const teamRef = db.doc(`teams/${teamId}`);
  const opponentRef = db.doc(`teams/${opponentTeamId}`);
  
  const [teamSnap, opponentSnap] = await Promise.all([
    teamRef.get(),
    opponentRef.get(),
  ]);
  
  const teamData = teamSnap.data();
  const opponentData = opponentSnap.data();
  
  // 최근 경기 데이터 조회
  const recentMatchesRef = db.collection("matches")
    .where("homeTeamId", "in", [teamId, opponentTeamId])
    .where("status", "==", "finished")
    .orderBy("date", "desc")
    .limit(5);
  
  const recentMatchesSnap = await recentMatchesRef.get();
  const recentMatches = recentMatchesSnap.docs.map(doc => doc.data());
  
  // AI 프롬프트 생성
  const prompt = `
    다음 팀 정보를 바탕으로 전술을 추천해주세요:
    
    우리 팀: ${teamData.name}
    상대 팀: ${opponentTeamId.name}
    
    최근 경기:
    ${recentMatches.map(m => `${m.homeTeamName} ${m.score.home} : ${m.score.away} ${m.awayTeamName}`).join('\n')}
    
    다음 형식으로 전술 추천을 제공해주세요:
    1. 추천 포메이션
    2. 공격 전술
    3. 수비 전술
    4. 주의사항
  `;
  
  // OpenAI API 호출
  const completion = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "당신은 전문 축구 전술가입니다." },
      { role: "user", content: prompt }
    ],
  });
  
  const recommendations = completion.choices[0].message.content;
  
  // 추천 저장
  const recommendationRef = db.collection("ai_recommendations").doc();
  await recommendationRef.set({
    type: "tactical",
    entityId: teamId,
    recommendations: parseRecommendations(recommendations),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  
  return recommendations;
}
```

---

## 5️⃣ 실제 구현 코드

### 5-1. AI Analysis 컴포넌트

```typescript
// src/components/ai/AIAnalysis.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AIAnalysisProps {
  entityId: string;
  entityType: "match" | "player" | "team";
}

export function AIAnalysis({ entityId, entityType }: AIAnalysisProps) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchAnalysis = async () => {
      try {
        const analysesRef = collection(db, "ai_analyses");
        const q = query(
          analysesRef,
          where("entityId", "==", entityId),
          where("entityType", "==", entityType),
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
  }, [entityId, entityType]);
  
  if (loading) return <div>로딩 중...</div>;
  if (!analysis) return <div>AI 분석이 없습니다</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">AI 분석</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">요약</h3>
          <p className="text-gray-700">{analysis.insights.summary}</p>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">강점</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.insights.strengths.map((strength: string, idx: number) => (
              <li key={idx} className="text-gray-700">{strength}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">약점</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.insights.weaknesses.map((weakness: string, idx: number) => (
              <li key={idx} className="text-gray-700">{weakness}</li>
            ))}
          </ul>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">개선 추천</h3>
          <ul className="list-disc list-inside space-y-1">
            {analysis.insights.recommendations.map((rec: string, idx: number) => (
              <li key={idx} className="text-gray-700">{rec}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

### 5-2. AI Recommendations 컴포넌트

```typescript
// src/components/ai/AIRecommendations.tsx
import { useState, useEffect } from "react";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AIRecommendationsProps {
  entityId: string;
  type: "tactical" | "training" | "lineup";
}

export function AIRecommendations({ entityId, type }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        const recommendationsRef = collection(db, "ai_recommendations");
        const q = query(
          recommendationsRef,
          where("entityId", "==", entityId),
          where("type", "==", type),
          orderBy("createdAt", "desc"),
          limit(1)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setRecommendations(data.recommendations || []);
        }
      } catch (error) {
        console.error("AI 추천 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [entityId, type]);
  
  if (loading) return <div>로딩 중...</div>;
  if (recommendations.length === 0) return <div>AI 추천이 없습니다</div>;
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">AI 추천</h2>
      
      <div className="space-y-4">
        {recommendations.map((rec, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold">{rec.title}</h3>
              <span className={`px-2 py-1 rounded text-xs ${
                rec.priority === "high" ? "bg-red-100 text-red-800" :
                rec.priority === "medium" ? "bg-yellow-100 text-yellow-800" :
                "bg-gray-100 text-gray-800"
              }`}>
                {rec.priority === "high" ? "높음" :
                 rec.priority === "medium" ? "보통" : "낮음"}
              </span>
            </div>
            <p className="text-gray-700">{rec.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] AI Analysis 컴포넌트
- [ ] AI Recommendations 컴포넌트
- [ ] AI 분석 함수 (Cloud Functions)

### Phase 2 (다음)
- [ ] OpenAI API 통합
- [ ] 경기 분석 자동화
- [ ] 전술 추천 자동화

### Phase 3 (확장)
- [ ] 선수 분석
- [ ] 훈련 추천
- [ ] 라인업 추천

---

**작성일**: 2024년  
**상태**: ✅ Sports AI Coach 설계 완료
