# 🎨 YAGO VIBE SPORTS - 노원구 축구협회 실제 화면 설계 (Visual Design Spec)

> **작성일**: 2024년  
> **목적**: 개발자가 바로 구현 가능한 수준의 실제 화면 구성 및 디자인 스펙

---

## 📋 목차

1. [메인 홈페이지 전체 레이아웃](#1-메인-홈페이지-전체-레이아웃)
2. [Hero 영역 상세](#2-hero-영역-상세)
3. [진행중 대회 섹션](#3-진행중-대회-섹션)
4. [경기 일정 섹션](#4-경기-일정-섹션)
5. [현재 순위 섹션](#5-현재-순위-섹션)
6. [참가팀/클럽 섹션](#6-참가팀클럽-섹션)
7. [후원사 섹션](#7-후원사-섹션)
8. [AI 협회 도우미](#8-ai-협회-도우미)
9. [페이지별 상세 레이아웃](#9-페이지별-상세-레이아웃)

---

## 1️⃣ 메인 홈페이지 전체 레이아웃

### 경로: `/federations/nowon-football`

### 전체 구조 (시각적)

```
┌─────────────────────────────────────────────────────────────┐
│ Header (고정)                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [로고] YAGO SPORTS    [검색] [로그인] [프로필]          │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 협회 헤더                                                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [로고] 노원구 축구협회                    [관리자]      │ │
│ │        서울 노원구 지역 축구 리그 및 팀 운영 플랫폼    │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 탭 메뉴                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ [홈] [협회소개] [공지] [대회] [경기] [순위] [팀] ...   │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ HERO 영역 (전체 너비, 높이 600px)                          │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │                                                          │ │
│ │        노원구 축구협회                                   │ │
│ │                                                          │ │
│ │   지역 축구 리그 및 대회 운영 플랫폼                    │ │
│ │                                                          │ │
│ │   [ 대회 보기 ]  [ 경기 일정 ]  [ 참가 신청 ]           │ │
│ │                                                          │ │
│ │   ┌────┐  ┌────┐  ┌────┐  ┌────┐                      │ │
│ │   │ 4  │  │ 24 │  │ 66 │  │312 │                      │ │
│ │   │리그│  │ 팀 │  │경기│  │선수│                      │ │
│ │   └────┘  └────┘  └────┘  └────┘                      │ │
│ │                                                          │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 진행중 대회 (최대 너비 1280px, 중앙 정렬)                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 진행중 대회                              [전체 보기]    │ │
│ │                                                          │ │
│ │ ┌──────────┐  ┌──────────┐  ┌──────────┐              │ │
│ │ │ 노원구청 │  │ 주말리그 │  │ 유소년리그│              │ │
│ │ │ 장기 축구│  │          │  │          │              │ │
│ │ │ 대회     │  │          │  │          │              │ │
│ │ │          │  │          │  │          │              │ │
│ │ │ 36팀    │  │ 24팀    │  │ 12팀    │              │ │
│ │ │ 66경기  │  │          │  │          │              │ │
│ │ │          │  │          │  │          │              │ │
│ │ │[대회보기]│  │[리그보기]│  │[리그보기]│              │ │
│ │ └──────────┘  └──────────┘  └──────────┘              │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 경기 일정 (최대 너비 1280px, 중앙 정렬)                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 오늘 경기                                [전체 일정 보기]│ │
│ │                                                          │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ K7 리그                                            │ │ │
│ │ │                                                     │ │ │
│ │ │ 노원FC  vs  상계FC                                 │ │ │
│ │ │                                                     │ │ │
│ │ │ 14:00 · 마들 스타디움                              │ │ │
│ │ │                                                     │ │ │
│ │ │ [ 경기 보기 ]                                      │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 현재 순위 (최대 너비 1280px, 중앙 정렬)                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 현재 순위                              [전체 순위 보기] │ │
│ │                                                          │ │
│ │ ┌────────────────────────────────────────────────────┐ │ │
│ │ │ 순위 │ 팀      │ 경기 │ 승점 │ 득실              │ │ │
│ │ │ ──────────────────────────────────────────────── │ │ │
│ │ │  1   │ 노원FC  │  10  │  12  │  +8              │ │ │
│ │ │  2   │ 상계FC  │  10  │   9  │  +5              │ │ │
│ │ │  3   │ 중계FC  │  10  │   6  │  +2              │ │ │
│ │ │  4   │ 공릉FC  │  10  │   3  │  -3              │ │ │
│ │ └────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 참가팀/클럽 (최대 너비 1280px, 중앙 정렬)                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 참가 클럽                              [전체 클럽 보기] │ │
│ │                                                          │ │
│ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │ │
│ │ │로고│ │로고│ │로고│ │로고│ │로고│ │로고│          │ │
│ │ │노원│ │상계│ │중계│ │공릉│ │하계│ │월계│          │ │
│ │ │ FC │ │ FC │ │ FC │ │ FC │ │ FC │ │ FC │          │ │
│ │ │노원│ │상계│ │중계│ │공릉│ │하계│ │월계│          │ │
│ │ │구  │ │구  │ │구  │ │구  │ │구  │ │구  │          │ │
│ │ └────┘ └────┘ └────┘ └────┘ └────┘ └────┘          │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ 후원사 (최대 너비 1280px, 중앙 정렬)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 공식 후원사                                              │ │
│ │                                                          │ │
│ │ ┌────┐ ┌────┐ ┌────┐ ┌────┐                            │ │
│ │ │로고│ │로고│ │로고│ │로고│                            │ │
│ │ │병원│ │스포│ │식당│ │아카│                            │ │
│ │ └────┘ └────┘ └────┘ └────┘                            │ │
│ │                                                          │ │
│ │ ┌──────────┐ ┌──────────┐ ┌──────────┐                │ │
│ │ │ 방병원   │ │ 스포츠용품│ │ 지역식당 │                │ │
│ │ │ 협력 병원│ │ 브랜드    │ │ 상권     │                │ │
│ │ └──────────┘ └──────────┘ └──────────┘                │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Footer                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 노원구 축구협회 | 주소 | 연락처 | 약관 | 개인정보       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
│                                                              │
│                    [AI 챗봇 버튼] (우하단 고정)              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Hero 영역 상세

### 디자인 스펙

```tsx
// 실제 구현 코드
<section className="relative h-[600px] bg-gradient-to-r from-blue-600 via-blue-700 to-green-600 text-white overflow-hidden">
  {/* 배경 이미지 */}
  <div className="absolute inset-0">
    <img
      src="/images/football-field-hero.jpg"
      alt="축구 경기장"
      className="w-full h-full object-cover opacity-30"
    />
    <div className="absolute inset-0 bg-black/40" />
  </div>
  
  {/* 콘텐츠 */}
  <div className="relative max-w-7xl mx-auto px-4 h-full flex items-center">
    <div className="max-w-3xl">
      {/* 협회명 */}
      <h1 className="text-5xl md:text-7xl font-bold mb-6 drop-shadow-lg">
        노원구 축구협회
      </h1>
      
      {/* 설명 */}
      <p className="text-2xl md:text-3xl mb-10 text-gray-100 drop-shadow-md">
        지역 축구 리그 및 대회 운영 플랫폼
      </p>
      
      {/* CTA 버튼 */}
      <div className="flex flex-wrap gap-4 mb-12">
        <button className="px-8 py-4 bg-white text-blue-600 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors shadow-lg">
          대회 보기
        </button>
        <button className="px-8 py-4 bg-white/10 text-white border-2 border-white rounded-lg font-semibold text-lg hover:bg-white/20 transition-colors">
          경기 일정
        </button>
        <button className="px-8 py-4 bg-white/10 text-white border-2 border-white rounded-lg font-semibold text-lg hover:bg-white/20 transition-colors">
          참가 신청
        </button>
      </div>
      
      {/* 통계 카드 */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="text-4xl font-bold mb-2">4</div>
          <div className="text-sm text-gray-200">진행중 리그</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="text-4xl font-bold mb-2">24</div>
          <div className="text-sm text-gray-200">참가 팀</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="text-4xl font-bold mb-2">66</div>
          <div className="text-sm text-gray-200">총 경기</div>
        </div>
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
          <div className="text-4xl font-bold mb-2">312</div>
          <div className="text-sm text-gray-200">등록 선수</div>
        </div>
      </div>
    </div>
  </div>
</section>
```

### 색상 스펙
- 배경 그라데이션: `from-blue-600 via-blue-700 to-green-600`
- 텍스트: `text-white`
- 버튼 (Primary): `bg-white text-blue-600`
- 버튼 (Secondary): `bg-white/10 border-white text-white`
- 통계 카드: `bg-white/10 backdrop-blur-sm border-white/20`

### 타이포그래피
- 제목: `text-5xl md:text-7xl font-bold` (48px → 72px)
- 설명: `text-2xl md:text-3xl` (24px → 30px)
- 버튼: `text-lg font-semibold`
- 통계 숫자: `text-4xl font-bold`
- 통계 라벨: `text-sm`

---

## 3️⃣ 진행중 대회 섹션

### 디자인 스펙

```tsx
<section className="max-w-7xl mx-auto px-4 py-16">
  <div className="flex items-center justify-between mb-8">
    <h2 className="text-3xl font-bold text-gray-900">진행중 대회</h2>
    <a href="/tournaments" className="text-blue-600 hover:text-blue-700 font-medium">
      전체 보기 →
    </a>
  </div>
  
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
    {/* 대회 카드 1 */}
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-6 h-6 text-yellow-500" />
          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded">
            진행중
          </span>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-3">
        노원구청장기 축구대회
      </h3>
      
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>2025.08.31 ~ 2025.09.07</span>
        </div>
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4" />
          <span>참가팀 36 · 경기수 66</span>
        </div>
      </div>
      
      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
        대회 보기
      </button>
    </div>
    
    {/* 대회 카드 2, 3도 동일한 구조 */}
  </div>
</section>
```

### 카드 스펙
- 배경: `bg-white`
- 테두리: `border border-gray-200`
- 그림자: `shadow-sm hover:shadow-lg`
- 패딩: `p-6`
- 둥근 모서리: `rounded-xl`

---

## 4️⃣ 경기 일정 섹션

### 디자인 스펙

```tsx
<section className="bg-white border-t border-gray-200 py-16">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-3xl font-bold text-gray-900">오늘 경기</h2>
      <a href="/matches" className="text-blue-600 hover:text-blue-700 font-medium">
        전체 일정 보기 →
      </a>
    </div>
    
    <div className="space-y-4">
      {/* 경기 카드 */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="text-sm text-gray-600 mb-2">K7 리그</div>
            
            <div className="flex items-center gap-4 mb-3">
              <div className="text-lg font-bold text-gray-900">노원FC</div>
              <span className="text-gray-400">vs</span>
              <div className="text-lg font-bold text-gray-900">상계FC</div>
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>14:00</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>마들 스타디움</span>
              </div>
            </div>
          </div>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
            경기 보기
          </button>
        </div>
      </div>
    </div>
  </div>
</section>
```

---

## 5️⃣ 현재 순위 섹션

### 디자인 스펙

```tsx
<section className="max-w-7xl mx-auto px-4 py-16">
  <div className="flex items-center justify-between mb-8">
    <h2 className="text-3xl font-bold text-gray-900">현재 순위</h2>
    <a href="/results" className="text-blue-600 hover:text-blue-700 font-medium">
      전체 순위 보기 →
    </a>
  </div>
  
  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
    <table className="min-w-full divide-y divide-gray-200">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            순위
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
            팀
          </th>
          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
            경기
          </th>
          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
            승점
          </th>
          <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
            득실
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        <tr className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="flex items-center">
              <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
              <span className="text-sm font-bold text-blue-600">1</span>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap">
            <div className="text-sm font-semibold text-gray-900">노원FC</div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
            10
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-center">
            <span className="text-sm font-bold text-gray-900">12</span>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
            +8
          </td>
        </tr>
        {/* 나머지 행들도 동일한 구조 */}
      </tbody>
    </table>
  </div>
</section>
```

---

## 6️⃣ 참가팀/클럽 섹션

### 디자인 스펙

```tsx
<section className="bg-gray-50 py-16">
  <div className="max-w-7xl mx-auto px-4">
    <div className="flex items-center justify-between mb-8">
      <h2 className="text-3xl font-bold text-gray-900">참가 클럽</h2>
      <a href="/clubs" className="text-blue-600 hover:text-blue-700 font-medium">
        전체 클럽 보기 →
      </a>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 클럽 카드 */}
      <a href="/clubs/nowon-fc" className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow text-center">
        <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
          <Users className="w-8 h-8 text-gray-400" />
        </div>
        <div className="font-semibold text-gray-900 mb-1">노원FC</div>
        <div className="flex items-center justify-center gap-1 text-xs text-gray-600">
          <MapPin className="w-3 h-3" />
          <span>노원구</span>
        </div>
      </a>
      {/* 나머지 클럽 카드들도 동일한 구조 */}
    </div>
  </div>
</section>
```

---

## 7️⃣ 후원사 섹션

### 디자인 스펙

```tsx
<section className="bg-white border-t border-gray-200 py-16">
  <div className="max-w-7xl mx-auto px-4">
    <h2 className="text-3xl font-bold text-gray-900 mb-8">공식 후원사</h2>
    
    {/* 후원사 로고 그리드 */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-12">
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-6 text-center hover:shadow-md transition-shadow">
        <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-3" />
        <div className="font-semibold text-gray-900">방병원</div>
        <div className="text-sm text-gray-600">협력 병원</div>
      </div>
      {/* 나머지 후원사 카드들도 동일한 구조 */}
    </div>
    
    {/* 후원사 카테고리 */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-gray-200 p-6 text-center">
        <Heart className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <div className="font-semibold text-gray-900 mb-1">협력 병원</div>
        <div className="text-sm text-gray-600">의료 지원 파트너</div>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-gray-200 p-6 text-center">
        <ShoppingBag className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <div className="font-semibold text-gray-900 mb-1">스포츠 브랜드</div>
        <div className="text-sm text-gray-600">용품 및 유니폼</div>
      </div>
      <div className="bg-gradient-to-br from-blue-50 to-green-50 rounded-xl border border-gray-200 p-6 text-center">
        <Utensils className="w-12 h-12 text-blue-600 mx-auto mb-3" />
        <div className="font-semibold text-gray-900 mb-1">지역 상권</div>
        <div className="text-sm text-gray-600">식음 및 서비스</div>
      </div>
    </div>
  </div>
</section>
```

---

## 8️⃣ AI 협회 도우미

### 디자인 스펙

```tsx
{/* 우하단 고정 버튼 */}
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
        {/* 빠른 질문 버튼들 */}
        <div className="space-y-2">
          <div className="text-sm text-gray-600 mb-4">빠른 질문:</div>
          <button className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">
            대회 일정 알려줘
          </button>
          <button className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">
            대진표 보여줘
          </button>
          <button className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">
            팀 등록 방법
          </button>
          <button className="block w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-700">
            규정 알려줘
          </button>
        </div>
      </div>
      
      {/* 입력 영역 */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="메시지를 입력하세요..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
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
```

---

## 9️⃣ 페이지별 상세 레이아웃

### 협회소개 페이지

```
┌─────────────────────────────────────────┐
│ 협회 헤더 + 탭 메뉴 (동일)              │
├─────────────────────────────────────────┤
│ 협회소개 탭 메뉴                         │
│ [인사말] [축사] [연혁] [비전] [조직도]  │
├─────────────────────────────────────────┤
│ 협회장 인사말                            │
│ ┌─────────────────────────────────────┐ │
│ │ [사진]                               │ │
│ │                                      │ │
│ │ 협회장 인사말                        │ │
│ │                                      │ │
│ │ 노원구 축구협회를 찾아주신...       │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

### 대회 페이지

```
┌─────────────────────────────────────────┐
│ 협회 헤더 + 탭 메뉴 (동일)              │
├─────────────────────────────────────────┤
│ 필터                                    │
│ [전체] [진행중] [예정] [종료]           │
├─────────────────────────────────────────┤
│ 대회 목록                                │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│ │ 대회 카드│ │ 대회 카드│ │ 대회 카드│ │
│ └──────────┘ └──────────┘ └──────────┘ │
└─────────────────────────────────────────┘
```

### 관리자 대시보드

```
┌─────────────────────────────────────────┐
│ Header                                  │
├──────────┬──────────────────────────────┤
│ 사이드바 │ 메인 콘텐츠                   │
│          │                               │
│ [대시보드]│ ┌────┐ ┌────┐ ┌────┐        │
│ [대회관리]│ │ 4  │ │ 24 │ │ 66 │        │
│ [리그관리]│ │리그│ │ 팀 │ │경기│        │
│ [팀승인]  │ └────┘ └────┘ └────┘        │
│ [선수등록]│                               │
│ ...       │ [빠른 액션]                   │
│           │ [리그 생성] [시즌 생성] ...   │
│           │                               │
│           │ [승인 대기 팀]                │
│           │ [결과 미입력 경기]             │
└──────────┴──────────────────────────────┘
```

---

## ✅ 반응형 디자인

### 브레이크포인트
- 모바일: `< 768px`
- 태블릿: `768px - 1024px`
- 데스크탑: `> 1024px`

### 모바일 최적화
- Hero 영역 높이: `400px` (모바일)
- 그리드: `grid-cols-1` (모바일)
- 폰트 크기: `text-3xl` → `text-2xl` (모바일)
- 패딩: `px-4` (모바일)

---

**작성일**: 2024년  
**상태**: ✅ 노원구 축구협회 실제 화면 설계 완료
