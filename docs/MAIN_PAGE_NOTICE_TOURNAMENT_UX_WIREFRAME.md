# 🎯 메인 화면 공지-대회 연결 UX 와이어프레임

## 📋 현재 구조 분석

### 메인 화면 구성
```
AssociationOfficialPage
├─ HeroSection
├─ NoticeSection          ← 공지 섹션
│  └─ NoticeCard (운영/시스템)
│
├─ TournamentSection      ← 대회 일정 섹션
│  └─ TournamentCard
│
├─ FacilitySection
├─ StorySection
└─ ClubSummarySection
```

## ❌ 현재 문제점

1. **공지 ↔ 대회 연결 끊김**
   - 공지에는 "대회 안내" 있음
   - 대회 일정 섹션은 비어 있음
   - → 사용자 인지 충돌: "공지 있는데 대회는 왜 없지?"

2. **시스템 공지 누락**
   - 대회 생성 시 시스템 공지가 자동 생성되어야 함
   - 하지만 UI에 표시되지 않음
   - → "대회는 있는데 생성 기록은 안 보이는 UI"

3. **시스템 공지 UX 미완성**
   - 시스템 공지 카드에 [대회 바로가기] 버튼 추가됨 (이미 구현)
   - 하지만 메인 화면에서 시스템 공지가 표시되지 않음

## ✅ 해결 방안 (UX 와이어프레임)

### 1️⃣ NoticeSection 개선

#### 현재 구조
```
NoticeSection
├─ 상단: "공지사항" 헤더
└─ 공지 카드 목록
   ├─ 고정 공지
   └─ 일반 공지 (최대 5개)
```

#### 개선 후 구조
```
NoticeSection
├─ 상단: "공지사항" 헤더
├─ 필터/정렬 (선택적, 관리자 모드)
│  ├─ [전체] [운영 🟦] [시스템 ⚙️]
│  └─ [최신순] [중요도순]
│
└─ 공지 카드 목록 (타임라인)
   ├─ 고정 공지
   ├─ 운영 공지 (사람이 작성)
   │  └─ NoticeCard (🟦 운영)
   │
   └─ 시스템 공지 (시스템 자동 생성)
      └─ NoticeCard (⚙️ 시스템)
         ├─ [대회 생성] 제목
         ├─ 대회 정보 요약
         └─ [🏆 대회 바로가기] 버튼 ← 클릭 시
            → TournamentSection의 해당 대회로 스크롤
            → 또는 대회 상세 페이지로 이동
```

### 2️⃣ TournamentSection 개선

#### 현재 구조
```
TournamentSection
├─ 상단: "대회 일정" 헤더
└─ 대회 카드 목록
   └─ (비어 있음 또는 대회 목록)
```

#### 개선 후 구조
```
TournamentSection
├─ 상단: "대회 일정" 헤더
│  └─ "생성된 대회: N건" (시스템 공지 기반 카운트)
│
└─ 대회 카드 목록
   ├─ 진행 중인 대회 (status: ongoing)
   ├─ 예정된 대회 (status: upcoming)
   └─ 종료된 대회 (status: ended, 최근 3개만)
   
   각 TournamentCard:
   ├─ 대회명
   ├─ 기간
   ├─ 상태 뱃지
   └─ [대회 상세] 버튼
```

### 3️⃣ 공지-대회 연결 UX 플로우

#### 플로우 1: 시스템 공지 → 대회 바로가기
```
사용자 액션: [🏆 대회 바로가기] 클릭

시나리오 A: 같은 페이지 내 대회 존재
└─ TournamentSection으로 부드럽게 스크롤
   └─ 해당 대회 카드 하이라이트 (임시)

시나리오 B: 다른 페이지 이동
└─ `/association/{id}/tournaments/{tournamentId}` 이동
```

#### 플로우 2: 대회 카드 → 관련 공지 보기
```
TournamentCard에 추가:
└─ "관련 공지: N건" 링크
   └─ 클릭 시
      └─ NoticeSection으로 스크롤
      └─ 해당 대회 관련 공지만 필터링
```

#### 플로우 3: 공지 타임라인에서 대회 생성 흐름 확인
```
NoticeSection에 표시되는 순서:
1. [대회 생성] 시스템 공지 (⚙️)
2. [대회 안내] 운영 공지 (🟦)
3. [참가 신청 시작] 시스템 공지 (⚙️)
4. ... (시간순)

→ 타임라인으로 "대회가 어떻게 진행됐는지" 한눈에 파악
```

## 🎨 UI 컴포넌트 개선 사항

### 1. NoticeSection에 시스템 공지 표시
- ✅ 이미 구현됨 (NoticeCard에 시스템 공지 뱃지 추가)
- 🔧 추가 필요: 시스템 공지가 메인 화면에도 표시되도록 쿼리 수정

### 2. 시스템 공지 카드의 "대회 바로가기" 버튼
- ✅ 이미 구현됨 (NoticeCard.tsx)
- 🔧 추가 필요: 같은 페이지 내 대회로 스크롤 기능

### 3. TournamentSection에 생성된 대회 표시
- ✅ 이미 구현됨 (TournamentSection이 대회 목록 표시)
- 🔧 추가 필요: 시스템 공지 기반 카운트 표시

## 📐 데이터 연결 로직

### 시스템 공지 → 대회 연결
```typescript
// NoticeCard에서
{notice.isSystemGenerated && notice.relatedTournamentId && (
  <button onClick={() => {
    // 시나리오 A: 같은 페이지 내 스크롤
    const tournamentCard = document.getElementById(`tournament-${notice.relatedTournamentId}`);
    if (tournamentCard) {
      tournamentCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // 하이라이트 효과
      tournamentCard.classList.add('ring-2', 'ring-blue-500');
      setTimeout(() => tournamentCard.classList.remove('ring-2', 'ring-blue-500'), 2000);
    } else {
      // 시나리오 B: 다른 페이지로 이동
      navigate(`/association/${associationId}/tournaments/${notice.relatedTournamentId}`);
    }
  }}>
    🏆 대회 바로가기
  </button>
)}
```

### 대회 카드 ID 추가
```typescript
// TournamentSection에서
<TournamentCard 
  id={`tournament-${tournament.id}`}  // ← ID 추가
  tournament={tournament}
/>
```

## 🔄 실시간 연결 확인

### 시스템 공지 생성 시 대회 표시
```
1. 대회 생성 (TournamentEditDrawer)
   └─ onTournamentCreated 트리거
   
2. 시스템 공지 자동 생성
   └─ relatedTournamentId 포함
   
3. NoticeSection 새로고침
   └─ 시스템 공지 표시
   
4. TournamentSection 새로고침
   └─ 생성된 대회 표시
   
→ 두 섹션이 자동으로 연결됨
```

## ✅ 최종 UX 체크리스트

- [x] NoticeCard에 시스템 공지 뱃지 (⚙️)
- [x] NoticeCard에 대회 바로가기 버튼
- [ ] NoticeSection에 시스템 공지 표시
- [ ] 시스템 공지 → 대회 스크롤 기능
- [ ] TournamentSection에 생성된 대회 표시
- [ ] 대회 카드 ID 추가 (스크롤 타겟용)
- [ ] 시스템 공지 기반 대회 카운트

## 🎯 구현 우선순위

1. **최우선**: NoticeSection에 시스템 공지 표시 (쿼리 수정)
2. **중요**: 시스템 공지 → 대회 스크롤 기능
3. **선택**: 대회 카드 → 관련 공지 필터링

---

**이 와이어프레임을 기준으로 실제 구현을 진행합니다.**

