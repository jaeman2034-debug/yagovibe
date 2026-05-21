# 🚀 YAGO VIBE SPORTS - 통합 개발 프롬프트

> **작성일**: 2024년  
> **목적**: Cursor에서 바로 사용 가능한 실제 개발 가이드

---

## 📋 목차

1. [프로젝트 설정](#1-프로젝트-설정)
2. [핵심 기능 구현 순서](#2-핵심-기능-구현-순서)
3. [Federation 시스템 구현](#3-federation-시스템-구현)
4. [AI 에이전트 통합](#4-ai-에이전트-통합)
5. [개발 체크리스트](#5-개발-체크리스트)

---

## 1️⃣ 프로젝트 설정

### 필수 패키지

```bash
npm install react-router-dom firebase date-fns lucide-react
npm install -D @types/react @types/react-dom
```

### Firebase 설정

```typescript
// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);
```

---

## 2️⃣ 핵심 기능 구현 순서

### Phase 1: 기본 구조 (1주)
1. 라우팅 설정 (`App.tsx`)
2. Federation 목록 페이지
3. Federation 홈페이지 기본 레이아웃
4. Federation 헤더 및 탭 컴포넌트

### Phase 2: 홈페이지 구현 (1주)
1. FederationHero 컴포넌트
2. ActiveTournaments 컴포넌트
3. TodayMatches 컴포넌트
4. CurrentStandings 컴포넌트
5. FeaturedClubs 컴포넌트
6. SponsorsBanner 컴포넌트

### Phase 3: 하위 페이지 (1주)
1. FederationAboutPage
2. FederationNoticesPage
3. FederationTournamentsPage
4. TournamentDetailPage
5. FederationMatchesPage
6. FederationClubsPage

### Phase 4: 관리자 대시보드 (1주)
1. FederationAdminDashboard
2. AdminSidebar
3. AdminKPICards
4. AdminQuickActions
5. AdminWidgets

### Phase 5: 협회 생성 시스템 (1주)
1. CreateFederationPage
2. createFederation Cloud Function
3. 자동 생성 로직
4. 생성 완료 처리

### Phase 6: AI 에이전트 (1주)
1. AIChatbot 컴포넌트
2. useAIChat 훅
3. queryAI Cloud Function
4. 에이전트별 처리 로직

---

## 3️⃣ Federation 시스템 구현

### 3-1. 라우팅 설정

```typescript
// src/App.tsx
import { Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";

const FederationListPage = lazy(() => import("./pages/federations/FederationListPage"));
const FederationHomePage = lazy(() => import("./pages/federations/FederationHomePage"));
const CreateFederationPage = lazy(() => import("./pages/admin/CreateFederationPage"));
const FederationAdminDashboard = lazy(() => import("./pages/federations/FederationAdminDashboard"));

function App() {
  return (
    <Routes>
      {/* 협회 목록 */}
      <Route
        path="/federations"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <FederationListPage />
          </Suspense>
        }
      />
      
      {/* 협회 홈페이지 */}
      <Route
        path="/federations/:federationId"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <FederationHomePage />
          </Suspense>
        }
      />
      
      {/* 협회 생성 */}
      <Route
        path="/admin/create-federation"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <CreateFederationPage />
          </Suspense>
        }
      />
      
      {/* 관리자 대시보드 */}
      <Route
        path="/federations/:federationId/admin"
        element={
          <Suspense fallback={<LoadingSpinner />}>
            <FederationAdminDashboard />
          </Suspense>
        }
      />
    </Routes>
  );
}
```

### 3-2. 커스텀 훅 구현

```typescript
// src/hooks/useFederation.ts
import { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export function useFederation(federationId: string) {
  const [federation, setFederation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!federationId) {
      setLoading(false);
      return;
    }

    const fetchFederation = async () => {
      try {
        const docRef = doc(db, "federations", federationId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setFederation({ id: docSnap.id, ...docSnap.data() });
        } else {
          setError(new Error("협회를 찾을 수 없습니다."));
        }
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchFederation();
  }, [federationId]);

  return { federation, loading, error };
}
```

---

## 4️⃣ AI 에이전트 통합

### 4-1. AI 챗봇 컴포넌트

```typescript
// src/components/federation/AIChatbot.tsx
import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useAIChat } from "@/hooks/useAIChat";

export function AIChatbot({ federationId }: { federationId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, loading, sendMessage } = useAIChat(federationId);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen ? (
        <div className="w-96 h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col">
          {/* 헤더 */}
          <div className="bg-blue-600 text-white p-4 rounded-t-xl flex items-center justify-between">
            <div>
              <div className="font-semibold">노원구 축구협회 AI 도우미</div>
              <div className="text-sm text-blue-100">무엇을 도와드릴까요?</div>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white hover:text-gray-200">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* 메시지 영역 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 입력 영역 */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="메시지를 입력하세요..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-blue-600 text-white rounded-full p-4 shadow-lg hover:bg-blue-700 transition-colors"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
```

---

## 5️⃣ 개발 체크리스트

### ✅ Phase 1: 기본 구조
- [ ] Firebase 설정 완료
- [ ] 라우팅 구조 설정
- [ ] 기본 레이아웃 컴포넌트 (Header, Footer)
- [ ] Federation 목록 페이지
- [ ] Federation 홈페이지 기본 구조

### ✅ Phase 2: 홈페이지 구현
- [ ] FederationHero 컴포넌트
- [ ] ActiveTournaments 컴포넌트
- [ ] TodayMatches 컴포넌트
- [ ] CurrentStandings 컴포넌트
- [ ] FeaturedClubs 컴포넌트
- [ ] SponsorsBanner 컴포넌트
- [ ] AIChatbot 컴포넌트

### ✅ Phase 3: 하위 페이지
- [ ] FederationAboutPage
- [ ] FederationNoticesPage
- [ ] FederationTournamentsPage
- [ ] TournamentDetailPage
- [ ] FederationMatchesPage
- [ ] FederationClubsPage
- [ ] FederationDocsPage
- [ ] FederationSponsorsPage

### ✅ Phase 4: 관리자 대시보드
- [ ] FederationAdminDashboard
- [ ] AdminSidebar
- [ ] AdminKPICards
- [ ] AdminQuickActions
- [ ] AdminWidgets

### ✅ Phase 5: 협회 생성 시스템
- [ ] CreateFederationPage
- [ ] createFederation Cloud Function
- [ ] 자동 생성 로직 (공지, 규정, AI 에이전트)
- [ ] 생성 완료 처리

### ✅ Phase 6: AI 에이전트
- [ ] useAIChat 훅
- [ ] queryAI Cloud Function
- [ ] 대표 AI 비서 구현
- [ ] 대회 안내 AI 구현
- [ ] 경기 운영 AI 구현
- [ ] 규정 AI 구현

### ✅ Phase 7: Firestore 설정
- [ ] 인덱스 배포
- [ ] 보안 규칙 배포
- [ ] 테스트 데이터 생성

---

## 🎯 즉시 시작 가능한 작업

### 1. Federation 홈페이지 기본 구조

```typescript
// src/pages/federations/FederationHomePage.tsx
// 이미 작성된 코드를 기반으로 구현
```

### 2. 협회 생성 페이지

```typescript
// src/pages/admin/CreateFederationPage.tsx
// YAGO_FEDERATION_BUILDER_UI.md 참고
```

### 3. Cloud Functions 배포

```typescript
// functions/src/federation/createFederation.ts
// YAGO_FEDERATION_AUTO_GENERATE_COMPLETE.md 참고
```

---

## 📚 참고 문서

1. **YAGO_COMPLETE_DB_STRUCTURE.md** - 전체 DB 구조
2. **YAGO_FEDERATION_VISUAL_DESIGN_SPEC.md** - UI 디자인 스펙
3. **YAGO_FEDERATION_AUTO_GENERATE_COMPLETE.md** - 자동 생성 시스템
4. **YAGO_AI_AGENTS_IMPLEMENTATION.md** - AI 에이전트 구현
5. **YAGO_FEDERATION_BUILDER_UI.md** - 협회 생성 UI

---

**작성일**: 2024년  
**상태**: ✅ 통합 개발 프롬프트 완료
