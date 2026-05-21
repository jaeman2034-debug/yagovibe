# 📰 YAGO AI Match Reporter - 완전한 설계

> **작성일**: 2024년  
> **목적**: 경기 결과 입력 후 AI가 자동으로 경기 기사 생성 - 플랫폼 차별화 핵심 기능

---

## 📋 목차

1. [제품 정의](#1-제품-정의)
2. [전체 흐름](#2-전체-흐름)
3. [경기 결과 입력](#3-경기-결과-입력)
4. [AI 기사 생성](#4-ai-기사-생성)
5. [기사 표시](#5-기사-표시)
6. [React 구현](#6-react-구현)

---

## 1️⃣ 제품 정의

### 한 줄 정의

```
경기 결과 입력 → AI가 경기 기사 자동 생성 → 플랫폼에 게시
```

### 핵심 기능

```
✓ 경기 결과 입력
✓ AI 기사 자동 생성
✓ 기사 편집 및 수정
✓ 기사 게시
✓ 기사 목록 표시
```

### 차별화 포인트

```
리그 운영 플랫폼
+
스포츠 미디어 플랫폼
```

---

## 2️⃣ 전체 흐름

### 사용자 여정

#### 1. 경기 결과 입력

```
관리자 또는 심판
  ↓
경기 결과 입력
  ↓
득점자, 경고, 퇴장 등록
  ↓
결과 저장
```

#### 2. AI 기사 생성

```
결과 저장 트리거
  ↓
AI 기사 생성 요청
  ↓
경기 데이터 분석
  ↓
기사 초안 생성
  ↓
기사 저장 (대기 상태)
```

#### 3. 기사 검토 및 게시

```
관리자 대시보드
  ↓
생성된 기사 확인
  ↓
기사 편집 (선택)
  ↓
기사 게시
```

---

## 3️⃣ 경기 결과 입력

### 결과 입력 폼

```typescript
// src/pages/federations/[slug]/admin/matches/[matchId]/result/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Input } from "@/components/shared/Input";
import { Button } from "@/components/shared/Button";
import { PlayerSelector } from "@/components/matches/PlayerSelector";
import { ScoreInput } from "@/components/matches/ScoreInput";

export default function MatchResultPage() {
  const params = useParams();
  const navigate = useNavigate();
  const federationSlug = params.federationId as string;
  const matchId = params.matchId as string;

  const [match, setMatch] = useState<any>(null);
  const [result, setResult] = useState({
    homeScore: 0,
    awayScore: 0,
    homeScorers: [] as any[],
    awayScorers: [] as any[],
    homeYellowCards: [] as any[],
    awayYellowCards: [] as any[],
    homeRedCards: [] as any[],
    awayRedCards: [] as any[],
  });
  const [generateArticle, setGenerateArticle] = useState(true);

  const handleSubmit = async () => {
    const response = await fetch(
      `/api/federations/${federationSlug}/matches/${matchId}/result`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...result,
          generateArticle, // AI 기사 생성 여부
        }),
      }
    );

    const data = await response.json();
    if (data.success) {
      if (generateArticle && data.articleId) {
        navigate(
          `/federations/${federationSlug}/admin/articles/${data.articleId}/edit`
        );
      } else {
        navigate(`/federations/${federationSlug}/admin/matches`);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">경기 결과 입력</h1>

      <Card>
        <div className="space-y-6">
          {/* Score Input */}
          <ScoreInput
            homeTeam={match?.homeTeam}
            awayTeam={match?.awayTeam}
            homeScore={result.homeScore}
            awayScore={result.awayScore}
            onScoreChange={(home, away) =>
              setResult({ ...result, homeScore: home, awayScore: away })
            }
          />

          {/* Scorers */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">{match?.homeTeam?.name} 득점자</h3>
              <PlayerSelector
                teamId={match?.homeTeamId}
                selectedPlayers={result.homeScorers}
                onSelect={(players) =>
                  setResult({ ...result, homeScorers: players })
                }
              />
            </div>
            <div>
              <h3 className="font-semibold mb-2">{match?.awayTeam?.name} 득점자</h3>
              <PlayerSelector
                teamId={match?.awayTeamId}
                selectedPlayers={result.awayScorers}
                onSelect={(players) =>
                  setResult({ ...result, awayScorers: players })
                }
              />
            </div>
          </div>

          {/* Cards */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">경고 / 퇴장</h3>
              {/* Yellow/Red Card Input */}
            </div>
            <div>
              <h3 className="font-semibold mb-2">경고 / 퇴장</h3>
              {/* Yellow/Red Card Input */}
            </div>
          </div>

          {/* AI Article Generation Option */}
          <div className="flex items-center gap-3 p-4 bg-primary-50 rounded-lg">
            <input
              type="checkbox"
              id="generateArticle"
              checked={generateArticle}
              onChange={(e) => setGenerateArticle(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="generateArticle" className="text-sm text-gray-700">
              AI가 경기 기사를 자동으로 생성합니다
            </label>
          </div>

          <Button onClick={handleSubmit} className="w-full" size="lg">
            결과 저장 및 기사 생성
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

---

## 4️⃣ AI 기사 생성

### AI 기사 생성 서비스

```typescript
// src/lib/services/aiMatchReporter.ts
import { db } from "@/lib/firebase/firebaseClient";
import { collection, addDoc } from "firebase/firestore";

interface MatchData {
  matchId: string;
  homeTeam: {
    name: string;
    score: number;
    scorers: Array<{ playerName: string; minute: number }>;
  };
  awayTeam: {
    name: string;
    score: number;
    scorers: Array<{ playerName: string; minute: number }>;
  };
  venue: string;
  date: Date;
  leagueName: string;
}

export async function generateMatchArticle(
  federationId: string,
  matchData: MatchData
): Promise<string> {
  // AI 프롬프트 구성
  const prompt = `
다음 경기 결과를 바탕으로 스포츠 기사를 작성해주세요.

경기 정보:
- 리그: ${matchData.leagueName}
- 날짜: ${matchData.date.toLocaleDateString()}
- 경기장: ${matchData.venue}

경기 결과:
${matchData.homeTeam.name} ${matchData.homeTeam.score} : ${matchData.awayTeam.score} ${matchData.awayTeam.name}

득점:
${matchData.homeTeam.scorers
  .map((s) => `${s.playerName} (${s.minute}분)`)
  .join(", ")}
${matchData.awayTeam.scorers
  .map((s) => `${s.playerName} (${s.minute}분)`)
  .join(", ")}

다음 형식으로 기사를 작성해주세요:
1. 제목 (20자 이내)
2. 요약 (2-3문장)
3. 본문 (5-7문장)
4. 하이라이트 (3-4개)
`;

  // AI API 호출 (예: OpenAI, Claude 등)
  const response = await fetch("/api/ai/generate-article", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt }),
  });

  const data = await response.json();
  return data.article;
}

export async function saveMatchArticle(
  federationId: string,
  matchId: string,
  article: {
    title: string;
    summary: string;
    content: string;
    highlights: string[];
  }
): Promise<string> {
  const articlesRef = collection(
    db,
    `federations/${federationId}/articles`
  );

  const docRef = await addDoc(articlesRef, {
    type: "match_report",
    matchId,
    title: article.title,
    summary: article.summary,
    content: article.content,
    highlights: article.highlights,
    status: "draft", // 검토 대기
    createdAt: new Date(),
    generatedBy: "ai",
  });

  return docRef.id;
}
```

### Cloud Functions 트리거

```typescript
// functions/src/match/onMatchResultCreated.ts
import * as functions from "firebase-functions";
import { generateMatchArticle, saveMatchArticle } from "./aiMatchReporter";

export const onMatchResultCreated = functions.firestore
  .document("federations/{federationId}/matches/{matchId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // 결과가 입력되었고, 이전에는 없었던 경우
    if (
      after.status === "finished" &&
      before.status !== "finished" &&
      after.generateArticle
    ) {
      const federationId = context.params.federationId;
      const matchId = context.params.matchId;

      try {
        // AI 기사 생성
        const article = await generateMatchArticle(federationId, {
          matchId,
          homeTeam: {
            name: after.homeTeamName,
            score: after.homeScore,
            scorers: after.homeScorers || [],
          },
          awayTeam: {
            name: after.awayTeamName,
            score: after.awayScore,
            scorers: after.awayScorers || [],
          },
          venue: after.venue,
          date: after.matchDate.toDate(),
          leagueName: after.leagueName,
        });

        // 기사 저장
        await saveMatchArticle(federationId, matchId, article);
      } catch (error) {
        console.error("Failed to generate match article:", error);
      }
    }
  });
```

---

## 5️⃣ 기사 표시

### 기사 목록 페이지

```typescript
// src/pages/federations/[slug]/articles/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { FileText } from "lucide-react";

export default function ArticlesPage() {
  const params = useParams();
  const federationSlug = params.federationId as string;

  const [articles, setArticles] = useState<any[]>([]);

  useEffect(() => {
    const loadArticles = async () => {
      const response = await fetch(
        `/api/federations/${federationSlug}/articles`
      );
      const data = await response.json();
      setArticles(data);
    };
    loadArticles();
  }, [federationSlug]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-8 h-8 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">경기 기사</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
}
```

### 기사 카드 컴포넌트

```typescript
// src/components/articles/ArticleCard.tsx
"use client";

import Link from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Calendar, Eye } from "lucide-react";

export function ArticleCard({ article }: { article: any }) {
  return (
    <Link to={`/federations/${article.federationSlug}/articles/${article.id}`}>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
            {article.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-3">
            {article.summary}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>
                {new Date(article.createdAt).toLocaleDateString()}
              </span>
            </div>
            {article.viewCount && (
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>{article.viewCount}</span>
              </div>
            )}
          </div>
          {article.generatedBy === "ai" && (
            <span className="inline-block px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">
              AI 생성
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
```

### 기사 상세 페이지

```typescript
// src/pages/federations/[slug]/articles/[articleId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { Edit, Share2 } from "lucide-react";

export default function ArticleDetailPage() {
  const params = useParams();
  const federationSlug = params.federationId as string;
  const articleId = params.articleId as string;

  const [article, setArticle] = useState<any>(null);

  useEffect(() => {
    const loadArticle = async () => {
      const response = await fetch(
        `/api/federations/${federationSlug}/articles/${articleId}`
      );
      const data = await response.json();
      setArticle(data);
    };
    loadArticle();
  }, [federationSlug, articleId]);

  if (!article) {
    return <div>로딩 중...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {article.title}
            </h1>
            <p className="text-lg text-gray-600">{article.summary}</p>
            <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
              <span>
                {new Date(article.createdAt).toLocaleDateString()}
              </span>
              {article.generatedBy === "ai" && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                  AI 생성
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="prose max-w-none">
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">
              {article.content}
            </p>
          </div>

          {/* Highlights */}
          {article.highlights && article.highlights.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold text-gray-900 mb-3">하이라이트</h3>
              <ul className="space-y-2">
                {article.highlights.map((highlight: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-primary-600 font-bold">•</span>
                    <span className="text-gray-700">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6 border-t">
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              편집
            </Button>
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              공유
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

---

## 6️⃣ React 구현

### 관리자 대시보드에 기사 섹션 추가

```typescript
// src/pages/federations/[slug]/admin/page.tsx
import { PendingArticlesWidget } from "@/components/admin/PendingArticlesWidget";

export default function FederationAdminDashboard() {
  return (
    <div>
      {/* 기존 대시보드 내용 */}
      
      {/* AI 생성 기사 대기 위젯 */}
      <PendingArticlesWidget federationSlug={federationSlug} />
    </div>
  );
}
```

### 대기 중인 기사 위젯

```typescript
// src/components/admin/PendingArticlesWidget.tsx
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/shared/Button";
import { FileText, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function PendingArticlesWidget({
  federationSlug,
}: {
  federationSlug: string;
}) {
  const navigate = useNavigate();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const loadPendingCount = async () => {
      const response = await fetch(
        `/api/federations/${federationSlug}/articles?status=draft`
      );
      const data = await response.json();
      setPendingCount(data.length);
    };
    loadPendingCount();
  }, [federationSlug]);

  if (pendingCount === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-purple-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-purple-600" />
          <div>
            <p className="font-semibold text-gray-900">
              AI 생성 기사 {pendingCount}건 검토 대기
            </p>
            <p className="text-sm text-gray-600">
              경기 결과 입력 후 자동 생성된 기사를 검토해주세요.
            </p>
          </div>
        </div>
        <Button
          onClick={() =>
            navigate(`/federations/${federationSlug}/admin/articles?status=draft`)
          }
        >
          <FileText className="w-4 h-4 mr-2" />
          검토하기
        </Button>
      </div>
    </Card>
  );
}
```

---

## ✅ AI Match Reporter 완료

### 완성된 내용

- ✅ 경기 결과 입력 폼
- ✅ AI 기사 자동 생성 서비스
- ✅ 기사 저장 및 관리
- ✅ 기사 목록 및 상세 페이지
- ✅ 관리자 검토 시스템
- ✅ React 구현 코드

### 플랫폼 차별화

이제 YAGO는:

```
리그 운영 플랫폼
+
스포츠 미디어 플랫폼
```

---

**작성일**: 2024년  
**상태**: ✅ YAGO AI Match Reporter 완전한 설계 완료
