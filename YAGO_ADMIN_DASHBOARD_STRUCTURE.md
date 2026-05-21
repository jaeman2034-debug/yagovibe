# 🎛 YAGO VIBE SPORTS - 관리자 화면 구조 (노원구 축구협회)

> **작성일**: 2024년  
> **목적**: 노원구 축구협회 관리자용 실전 대시보드 설계

---

## 📋 목차

1. [관리자 화면 전체 구조](#1-관리자-화면-전체-구조)
2. [협회 관리자 대시보드](#2-협회-관리자-대시보드)
3. [리그 운영 화면](#3-리그-운영-화면)
4. [시즌 운영 화면](#4-시즌-운영-화면)
5. [팀 신청/승인 화면](#5-팀-신청승인-화면)
6. [경기 운영 화면](#6-경기-운영-화면)
7. [실제 구현 코드](#7-실제-구현-코드)

---

## 1️⃣ 관리자 화면 전체 구조

### 관리자 권한 레벨

```
협회 관리자 (Federation Admin)
  ↓
리그 운영자 (League Admin)
  ↓
팀 관리자 (Team Admin)
  ↓
일반 사용자 (User)
```

### 관리자 메뉴 구조

```
관리자 대시보드
├─ 협회 관리
│   ├─ 협회 정보
│   ├─ 리그 관리
│   └─ 공지 관리
├─ 리그 운영
│   ├─ 리그 생성
│   ├─ 시즌 관리
│   ├─ 팀 승인
│   └─ 일정 관리
├─ 경기 운영
│   ├─ 경기 일정
│   ├─ 결과 입력
│   └─ 통계 관리
└─ 시스템 관리
    ├─ 사용자 관리
    ├─ 권한 관리
    └─ 설정
```

---

## 2️⃣ 협회 관리자 대시보드

### 경로: `/federations/nowon-football/admin`

### 화면 구성

```
┌─────────────────────────────────────────┐
│ 노원구 축구협회 관리자 대시보드              │
├─────────────────────────────────────────┤
│                                         │
│ 요약 카드                                │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ │
│ │ 리그 4개 │ │ 팀 24개  │ │ 경기 66개│ │
│ └─────────┘ └─────────┘ └─────────┘ │
│                                         │
│ 진행중 리그                              │
│ ┌─────────────────────────────────────┐ │
│ │ 노원구 K7 리그                      │ │
│ │ 2025 전반기 · 12팀 · 36경기        │ │
│ │ [관리하기]                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 승인 대기                                │
│ ┌─────────────────────────────────────┐ │
│ │ 팀 신청 3건                         │ │
│ │ [승인하기]                          │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 오늘 경기                                │
│ ┌─────────────────────────────────────┐ │
│ │ Tigers vs Lions 15:00              │ │
│ │ [경기 관리]                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 최근 공지                                │
│ ┌─────────────────────────────────────┐ │
│ │ 2025 시즌 참가 등록 안내            │ │
│ │ [공지 관리]                         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 주요 기능

1. **요약 카드**: 리그 수, 팀 수, 경기 수
2. **진행중 리그**: 현재 운영 중인 리그 목록
3. **승인 대기**: 팀 신청 승인 대기 목록
4. **오늘 경기**: 오늘 예정된 경기 목록
5. **최근 공지**: 최근 작성된 공지사항

---

## 3️⃣ 리그 운영 화면

### 경로: `/federations/nowon-football/leagues`

### 화면 구성

```
┌─────────────────────────────────────────┐
│ 리그 관리                                 │
├─────────────────────────────────────────┤
│                                         │
│ [ 새 리그 생성 ]                         │
│                                         │
│ 리그 목록                                │
│ ┌─────────────────────────────────────┐ │
│ │ 노원구 K7 리그                      │ │
│ │ 상태: 진행중                         │ │
│ │ 시즌: 2025 전반기                    │ │
│ │ 팀: 12팀 · 경기: 36경기             │ │
│ │ [관리] [시즌] [팀] [일정]            │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 노원구 주말리그                     │ │
│ │ 상태: 등록중                         │ │
│ │ 시즌: 2025 하반기                   │ │
│ │ 팀: 8팀 · 경기: 0경기               │ │
│ │ [관리] [시즌] [팀] [일정]            │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 리그 생성 모달

```
┌─────────────────────────────────────────┐
│ 새 리그 생성                             │
├─────────────────────────────────────────┤
│                                         │
│ 리그명: [노원구 K7 리그]                │
│ 종목: [축구 ▼]                          │
│ 형식: [리그 ▼]                          │
│ 설명: [입력 영역]                       │
│                                         │
│ [ 취소 ] [ 생성 ]                       │
└─────────────────────────────────────────┘
```

---

## 4️⃣ 시즌 운영 화면

### 경로: `/leagues/{leagueId}/seasons/{seasonId}/admin`

### 화면 구성

```
┌─────────────────────────────────────────┐
│ 2025 전반기 시즌 관리                     │
├─────────────────────────────────────────┤
│                                         │
│ 시즌 정보                                │
│ ┌─────────────────────────────────────┐ │
│ │ 시작일: 2025-03-01                  │ │
│ │ 종료일: 2025-06-30                  │ │
│ │ 상태: 진행중                         │ │
│ │ [수정]                              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 탭                                      │
│ [ 팀 ] [ 일정 ] [ 순위 ] [ 공지 ]      │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 참가 팀 (12팀)                     │ │
│ │                                     │ │
│ │ Tigers                              │ │
│ │ Lions                               │ │
│ │ Eagles                              │ │
│ │ ...                                 │ │
│ │                                     │ │
│ │ [ 팀 추가 ]                         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 시즌 생성 모달

```
┌─────────────────────────────────────────┐
│ 새 시즌 생성                             │
├─────────────────────────────────────────┤
│                                         │
│ 시즌명: [2025 전반기]                  │
│ 시작일: [2025-03-01]                    │
│ 종료일: [2025-06-30]                    │
│                                         │
│ [ 취소 ] [ 생성 ]                       │
└─────────────────────────────────────────┘
```

---

## 5️⃣ 팀 신청/승인 화면

### 경로: `/leagues/{leagueId}/registrations`

### 화면 구성

```
┌─────────────────────────────────────────┐
│ 팀 참가 신청 관리                          │
├─────────────────────────────────────────┤
│                                         │
│ 필터                                    │
│ [ 전체 ] [ 대기중 ] [ 승인 ] [ 거절 ]   │
│                                         │
│ 신청 목록                                │
│ ┌─────────────────────────────────────┐ │
│ │ Tigers                              │ │
│ │ 팀장: John Kim                      │ │
│ │ 연락처: team@email.com              │ │
│ │ 신청일: 2025-02-15                  │ │
│ │ 상태: 대기중                         │ │
│ │                                     │ │
│ │ [ 승인 ] [ 거절 ]                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Lions                               │ │
│ │ 팀장: Alex Park                     │ │
│ │ 연락처: lions@email.com             │ │
│ │ 신청일: 2025-02-16                  │ │
│ │ 상태: 승인됨                        │ │
│ │                                     │ │
│ │ [ 상세보기 ]                        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 승인/거절 모달

```
┌─────────────────────────────────────────┐
│ 팀 승인                                  │
├─────────────────────────────────────────┤
│                                         │
│ 팀명: Tigers                            │
│ 팀장: John Kim                          │
│                                         │
│ 승인 메시지 (선택사항):                  │
│ [입력 영역]                             │
│                                         │
│ [ 취소 ] [ 승인 ]                       │
└─────────────────────────────────────────┘
```

---

## 6️⃣ 경기 운영 화면

### 경로: `/matches/{matchId}/admin`

### 화면 구성

```
┌─────────────────────────────────────────┐
│ 경기 관리                                 │
├─────────────────────────────────────────┤
│                                         │
│ 경기 정보                                │
│ ┌─────────────────────────────────────┐ │
│ │ Tigers vs Lions                     │ │
│ │ 날짜: 2025-03-15 15:00              │ │
│ │ 경기장: 마들스타디움                  │ │
│ │ 상태: 예정                           │ │
│ │ [수정]                              │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 탭                                      │
│ [ 라인업 ] [ 기록 ] [ 결과 ] [ 통계 ]   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 라인업 입력                         │ │
│ │                                     │ │
│ │ Tigers (홈)                        │ │
│ │ [ 선수 선택 ]                      │ │
│ │                                     │ │
│ │ Lions (원정)                       │ │
│ │ [ 선수 선택 ]                      │ │
│ │                                     │ │
│ │ [ 라인업 저장 ]                    │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 경기 결과 입력

```
┌─────────────────────────────────────────┐
│ 경기 결과 입력                            │
├─────────────────────────────────────────┤
│                                         │
│ Tigers  [2] : [1]  Lions                │
│                                         │
│ 득점 기록                                │
│ ┌─────────────────────────────────────┐ │
│ │ [ + 득점 추가 ]                     │ │
│ │                                     │ │
│ │ John (23')                         │ │
│ │ Alex (56')                         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ 경고/퇴장                                │
│ ┌─────────────────────────────────────┐ │
│ │ [ + 카드 추가 ]                     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [ 취소 ] [ 결과 저장 ]                  │
└─────────────────────────────────────────┘
```

---

## 7️⃣ 실제 구현 코드

### 7-1. 협회 관리자 대시보드 컴포넌트

```typescript
// src/pages/admin/FederationAdminDashboard.tsx
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { getFederationStats } from "@/services/federationService";

export function FederationAdminDashboard() {
  const { federationId } = useParams<{ federationId: string }>();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getFederationStats(federationId!);
        setStats(data);
      } catch (error) {
        console.error("통계 조회 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStats();
  }, [federationId]);
  
  if (loading) return <div>로딩 중...</div>;
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">노원구 축구협회 관리자 대시보드</h1>
        
        {/* 요약 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-2xl font-bold">{stats?.leagueCount || 0}</div>
            <div className="text-sm text-gray-500">리그</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-2xl font-bold">{stats?.teamCount || 0}</div>
            <div className="text-sm text-gray-500">참가 팀</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="text-2xl font-bold">{stats?.matchCount || 0}</div>
            <div className="text-sm text-gray-500">총 경기</div>
          </div>
        </div>
        
        {/* 진행중 리그 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">진행중 리그</h2>
          <div className="space-y-3">
            {stats?.activeLeagues?.map((league: any) => (
              <div key={league.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-semibold">{league.name}</div>
                  <div className="text-sm text-gray-500">
                    {league.seasonName} · {league.teamCount}팀 · {league.matchCount}경기
                  </div>
                </div>
                <a
                  href={`/leagues/${league.id}/admin`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  관리하기
                </a>
              </div>
            ))}
          </div>
        </div>
        
        {/* 승인 대기 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">승인 대기</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{stats?.pendingRegistrations || 0}</div>
              <div className="text-sm text-gray-500">팀 신청</div>
            </div>
            <a
              href="/admin/registrations"
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
            >
              승인하기
            </a>
          </div>
        </div>
        
        {/* 오늘 경기 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4">오늘 경기</h2>
          <div className="space-y-3">
            {stats?.todayMatches?.map((match: any) => (
              <div key={match.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-semibold">
                    {match.homeTeam} vs {match.awayTeam}
                  </div>
                  <div className="text-sm text-gray-500">
                    {match.time} · {match.venue}
                  </div>
                </div>
                <a
                  href={`/matches/${match.id}/admin`}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  경기 관리
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] 협회 관리자 대시보드
- [ ] 리그 운영 화면
- [ ] 시즌 운영 화면
- [ ] 팀 신청/승인 화면

### Phase 2 (다음)
- [ ] 경기 운영 화면
- [ ] 경기 결과 입력
- [ ] 순위 관리
- [ ] 공지 관리

### Phase 3 (확장)
- [ ] 통계 대시보드
- [ ] 리포트 생성
- [ ] 사용자 관리
- [ ] 권한 관리

---

**작성일**: 2024년  
**상태**: ✅ 관리자 화면 구조 설계 완료
