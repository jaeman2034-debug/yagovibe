# 🏠 YAGO VIBE SPORTS - 협회 홈페이지 템플릿 시스템

> **작성일**: 2024년  
> **목적**: 협회 생성 시 자동으로 생성되는 홈페이지 템플릿 설계

---

## 📋 목차

1. [협회 홈페이지 템플릿 개념](#1-협회-홈페이지-템플릿-개념)
2. [템플릿 구조](#2-템플릿-구조)
3. [자동 생성 시스템](#3-자동-생성-시스템)
4. [Firestore 구조](#4-firestore-구조)
5. [UI 구조](#5-ui-구조)
6. [실제 구현 코드](#6-실제-구현-코드)

---

## 1️⃣ 협회 홈페이지 템플릿 개념

### 협회 홈페이지 역할

**협회의 공식 브랜드 사이트 + 운영 포털**입니다.

### Portal + Dashboard 구조

```
협회 홈페이지 (/federations/:federationId)
  ├─ Public Portal (일반 사용자)
  │   ├─ 협회 소개
  │   ├─ 공지사항
  │   ├─ 리그
  │   ├─ 경기 일정
  │   ├─ 순위
  │   └─ 참가 팀
  │
  └─ Admin Dashboard (관리자)
      ├─ 운영 대시보드
      ├─ 리그 관리
      ├─ 시즌 관리
      └─ 팀 승인
```

---

## 2️⃣ 템플릿 구조

### 협회 생성 시 자동 생성

```
createFederation()
  ↓
Federation Document 생성
  ↓
Homepage Template 자동 생성
  ↓
기본 섹션 생성
  ↓
홈페이지 활성화
```

### 기본 템플릿 구성

```
협회 헤더
협회 소개
공지 섹션
리그 섹션
경기 일정 섹션
순위 섹션
팀 목록 섹션
스폰서 섹션
연락처 섹션
```

---

## 3️⃣ 자동 생성 시스템

### Cloud Function: onFederationCreated

```typescript
// functions/src/federation/onFederationCreated.ts
export const onFederationCreated = onDocumentCreated(
  "federations/{federationId}",
  async (event) => {
    const federationId = event.params.federationId;
    const federationData = event.data.data();
    
    // 홈페이지 템플릿 자동 생성
    await createHomepageTemplate(federationId, {
      name: federationData.name,
      region: federationData.region,
      sport: federationData.sport,
    });
  }
);
```

### 템플릿 생성 함수

```typescript
async function createHomepageTemplate(
  federationId: string,
  config: {
    name: string;
    region: string;
    sport: string;
  }
) {
  const db = getFirestore();
  
  // 홈페이지 설정 생성
  await db.collection("federations")
    .doc(federationId)
    .collection("homepage")
    .doc("config")
    .set({
      sections: [
        { id: "intro", enabled: true, order: 1 },
        { id: "notices", enabled: true, order: 2 },
        { id: "leagues", enabled: true, order: 3 },
        { id: "matches", enabled: true, order: 4 },
        { id: "standings", enabled: true, order: 5 },
        { id: "teams", enabled: true, order: 6 },
        { id: "sponsors", enabled: false, order: 7 },
        { id: "contact", enabled: true, order: 8 },
      ],
      theme: {
        primaryColor: "#0F3D75",
        accentColor: "#16A34A",
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  
  // 기본 공지 생성
  await db.collection("federations")
    .doc(federationId)
    .collection("notices")
    .add({
      title: `${config.name}에 오신 것을 환영합니다`,
      content: `${config.name} 공식 홈페이지입니다.`,
      isPinned: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
```

---

## 4️⃣ Firestore 구조

### Federation Homepage Config

```
federations/{federationId}/homepage/config
```

**문서 스키마**:
```typescript
{
  sections: Array<{
    id: string;
    enabled: boolean;
    order: number;
  }>;
  theme: {
    primaryColor: string;
    accentColor: string;
  };
  customizations: {
    logoUrl?: string;
    bannerUrl?: string;
    description?: string;
  };
  createdAt: Timestamp;
}
```

### Federation Notices

```
federations/{federationId}/notices/{noticeId}
```

**문서 스키마**:
```typescript
{
  title: string;
  content: string;
  isPinned: boolean;
  category: "general" | "important" | "event";
  createdAt: Timestamp;
}
```

---

## 5️⃣ UI 구조

### 협회 홈페이지 레이아웃

```
┌─────────────────────────────────────────┐
│ Header (YAGO SPORTS)                    │
├─────────────────────────────────────────┤
│ 협회 헤더                                │
│ 노원구 축구협회                          │
│ [ 관리자 ] (관리자만 표시)               │
├─────────────────────────────────────────┤
│ 탭 메뉴                                  │
│ [ 홈 ] [ 공지 ] [ 리그 ] [ 경기 ] ...   │
├─────────────────────────────────────────┤
│ 탭 콘텐츠                                │
│                                         │
│ 협회 소개                                │
│ 요약 카드                                │
│ 진행중 리그                              │
│ 이번주 경기                              │
│ 최근 경기 결과                           │
│ 현재 순위 TOP                            │
│                                         │
└─────────────────────────────────────────┘
```

---

## 6️⃣ 실제 구현 코드

### Federation Homepage 컴포넌트

```typescript
// src/pages/federations/FederationHomePage.tsx
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Header from "@/layout/Header";

export default function FederationHomePage() {
  const { federationId } = useParams<{ federationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [federation, setFederation] = useState<any>(null);
  const [homepageConfig, setHomepageConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("home");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFederation = async () => {
      try {
        // Federation 정보
        const fedDoc = await getDoc(doc(db, "federations", federationId!));
        if (fedDoc.exists()) {
          setFederation({ id: fedDoc.id, ...fedDoc.data() });
        }

        // Homepage 설정
        const configDoc = await getDoc(
          doc(db, "federations", federationId!, "homepage", "config")
        );
        if (configDoc.exists()) {
          setHomepageConfig(configDoc.data());
        }
      } catch (error) {
        console.error("협회 정보 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFederation();
  }, [federationId]);

  // 관리자 여부 확인 (실제로는 Firestore에서 확인)
  const isAdmin = false; // TODO: 실제 권한 체크

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      {/* 협회 헤더 */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {federation?.name || "협회"}
              </h1>
              <p className="text-gray-600 mt-1">
                {federation?.region || ""} {federation?.sport || ""} 리그 및 팀 운영 플랫폼
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={() => navigate(`/federations/${federationId}/admin`)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Settings className="w-4 h-4" />
                관리자
              </button>
            )}
          </div>

          {/* 탭 메뉴 */}
          <div className="flex gap-1 border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {activeTab === "home" && <HomeTab federationId={federationId!} />}
        {activeTab === "notices" && <NoticesTab federationId={federationId!} />}
        {activeTab === "leagues" && <LeaguesTab federationId={federationId!} />}
        {activeTab === "matches" && <MatchesTab federationId={federationId!} />}
        {activeTab === "standings" && <StandingsTab federationId={federationId!} />}
        {activeTab === "teams" && <TeamsTab federationId={federationId!} />}
        {activeTab === "youth" && <YouthTab federationId={federationId!} />}
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] FederationHomePage 컴포넌트
- [ ] FederationAdminDashboard 컴포넌트
- [ ] 탭 구조 (홈, 공지, 리그, 경기, 순위, 팀, 유소년)
- [ ] 관리자 버튼 (권한 체크)

### Phase 2 (다음)
- [ ] Cloud Function: onFederationCreated
- [ ] Homepage Template 자동 생성
- [ ] 섹션 활성화/비활성화
- [ ] 테마 커스터마이징

### Phase 3 (확장)
- [ ] 협회 로고/배너 업로드
- [ ] 커스텀 섹션 추가
- [ ] SEO 최적화
- [ ] 공개/비공개 설정

---

**작성일**: 2024년  
**상태**: ✅ 협회 홈페이지 템플릿 시스템 설계 완료
