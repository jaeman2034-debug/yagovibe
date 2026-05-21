# 다음 단계: 기능 연결 설계 (실전 기준)

## ✅ 현재 상태 정리

### 보이는 요소
- `#notice` 공지
- `#tournament` 대회  
- `#facility` 대관

### 상태
- ✅ UI 디자인 완료
- ✅ 버튼/태그 스타일 존재
- ❌ 클릭 이벤트 미연결
- ❌ 라우팅 미연결

### 기술적 원인 (추정)
1. `<button>` 또는 `<div>`인데 `onClick` 없음
2. `<a>` 태그인데 `href` 없음 (스타일용)
3. 라우터 경로는 존재하지만 연결 안 됨

## 🎯 설계 원칙 (재확인)

### 현재 페이지의 목적
- "협회 공식 기준 페이지" 선언용 랜딩 페이지
- 전화 ❌ / 카톡 ❌ / 즉흥 공지 ❌
- 이 페이지가 기준이라는 메시지 전달

### 클릭 미연결의 의도성
- ✅ 의도적으로 미뤘을 가능성 높음
- ✅ UI 설계 완료 단계
- ⏳ 기능 연결은 다음 단계

## 📋 다음 단계 설계 (우선순위)

### 1단계: 섹션 스크롤 연결 (가볍게)

**목표**: 클릭 시 해당 섹션으로 부드럽게 스크롤

**구현 포인트**:
- `NoticeSection`, `TournamentSection`, `FacilitySection`에 `id` 속성 추가
- 헤더/탭의 클릭 이벤트에 `scrollTo` 연결
- 부드러운 스크롤 애니메이션

**예시 코드 구조**:
```typescript
// AssociationOfficialPage.tsx
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  element?.scrollIntoView({ behavior: 'smooth' });
};

// NoticeSection.tsx
<section id="notices" className="py-12 border-b">
  ...
</section>
```

**우선순위**: ⭐⭐⭐ (가장 빠르게 체감)

---

### 2단계: 전용 페이지 라우팅 (정식)

**목표**: 각 섹션 클릭 시 전용 페이지로 이동

**구현 포인트**:
- 이미 존재하는 페이지 연결:
  - `/association/:id/notices` → `NoticeListPage`
  - `/association/:id/tournaments` → `TournamentListPage`
  - `/association/:id/facility` → `FacilityListPage`
- `useNavigate` + `onClick` 연결
- "더 보기" 또는 "전체 보기" 버튼 추가

**예시 코드 구조**:
```typescript
// NoticeSection.tsx
const navigate = useNavigate();
const handleViewAll = () => {
  navigate(`/association/${associationId}/notices`);
};
```

**우선순위**: ⭐⭐⭐⭐⭐ (핵심 기능)

---

### 3단계: 공식 기준 필터링 (공식화)

**목표**: 공식 기준 데이터만 노출, 개인/비공식 글 절대 노출 ❌

**구현 포인트**:
- Firestore 쿼리에 `status === 'published'` 필터 (공지)
- `bracketStatus === 'confirmed'` (대진표)
- 공식 기준 배지 표시
- 권한 체크 (Admin만 CRUD)

**이미 구현된 부분**:
- ✅ `NoticeListPage` - `status === 'published'` 필터
- ✅ `TournamentListPage` - 공식 기준 표시
- ✅ `FacilityListPage` - 읽기 전용

**추가 필요 사항**:
- 쿼리 재확인 및 강화
- "공식 기준" 배지 일관성

**우선순위**: ⭐⭐⭐⭐ (이미 대부분 완료)

---

## 🔧 구체적 구현 계획

### Phase 1: 스크롤 연결 (1-2시간)

**작업 목록**:
1. `NoticeSection`, `TournamentSection`, `FacilitySection`에 `id` 속성 추가
2. 헤더/탭 클릭 핸들러 추가
3. 부드러운 스크롤 테스트

**파일 수정**:
- `src/pages/association/AssociationOfficialPage.tsx`
- `src/components/association/NoticeSection.tsx`
- `src/components/association/TournamentSection.tsx` (있는 경우)
- `src/components/association/FacilitySection.tsx`

---

### Phase 2: 라우팅 연결 (2-3시간)

**작업 목록**:
1. 각 Section에 "더 보기" 버튼 추가
2. `useNavigate` 연결
3. 라우팅 테스트

**파일 수정**:
- `src/components/association/NoticeSection.tsx`
- `src/components/association/TournamentSection.tsx`
- `src/components/association/FacilitySection.tsx`

**이미 존재하는 페이지**:
- ✅ `NoticeListPage` (`/association/:id/notices`)
- ✅ `TournamentListPage` (`/association/:id/tournaments`)
- ✅ `FacilityListPage` (`/association/:id/facility`)

---

### Phase 3: 공식 기준 강화 (1-2시간)

**작업 목록**:
1. Firestore 쿼리 재확인
2. "공식 기준" 배지 일관성 체크
3. 권한 체크 재확인

**검토 파일**:
- `src/pages/association/NoticeListPage.tsx`
- `src/pages/association/TournamentListPage.tsx`
- `src/pages/association/FacilityListPage.tsx`

---

## 🧭 공통 UI 패턴 설계

### Section 컴포넌트 공통 구조

```typescript
interface SectionProps {
  associationId: string;
  isEditMode?: boolean;
}

export function XxxSection({ associationId, isEditMode }: SectionProps) {
  const navigate = useNavigate();
  
  const handleViewAll = () => {
    navigate(`/association/${associationId}/xxx`);
  };

  return (
    <section id="xxx" className="py-12 border-b">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">제목</h2>
          <button
            onClick={handleViewAll}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            더 보기 →
          </button>
        </div>
        {/* 콘텐츠 */}
      </div>
    </section>
  );
}
```

---

## 🧱 "공식 기준" 배지 로직

### 배지 표시 규칙

1. **공지**
   - `status === 'published'` → "공식 기준" 배지
   - `isPinned === true` → 상단 고정 배지

2. **대회**
   - 항상 "공식 기준" 배지
   - `bracketStatus === 'confirmed'` → "대진표 확정" 배지

3. **대관**
   - 항상 "공식 기준" 배지
   - 읽기 전용

### 배지 컴포넌트

```typescript
// 이미 존재: OfficialSystemBadge
<OfficialSystemBadge variant="footer" />
```

---

## 📊 우선순위 매트릭스

| 작업 | 시간 | 우선순위 | 의존성 |
|------|------|----------|--------|
| 스크롤 연결 | 1-2h | ⭐⭐⭐ | 없음 |
| 라우팅 연결 | 2-3h | ⭐⭐⭐⭐⭐ | 스크롤 (선택) |
| 공식 기준 강화 | 1-2h | ⭐⭐⭐⭐ | 라우팅 완료 후 |

---

## ✅ 다음에 뭐부터 붙일지 (추천 순서)

### 옵션 1: 빠른 체감 (추천)
1. **스크롤 연결** (1-2시간)
   - 가장 빠르게 체감 가능
   - 기술 난이도 낮음

2. **라우팅 연결** (2-3시간)
   - 핵심 기능
   - 이미 페이지 존재하므로 연결만 하면 됨

3. **공식 기준 강화** (1-2시간)
   - 이미 대부분 완료
   - 마무리 작업

### 옵션 2: 바로 정식 기능
1. **라우팅 연결** (2-3시간)
   - 핵심 기능부터
   - 사용자 경험 개선 직결

2. **공식 기준 강화** (1-2시간)
   - 품질 보완

3. **스크롤 연결** (1-2시간)
   - UX 개선

---

## 🎯 최종 추천

**추천 순서**: 옵션 1 (빠른 체감)

**이유**:
- 스크롤 연결이 가장 빠르게 완료 가능
- 라우팅 연결이 핵심이지만, 스크롤이 있으면 랜딩 페이지에서도 체감 가능
- 공식 기준 강화는 이미 대부분 완료되어 있음

**다음 메시지에서**:
- "스크롤 연결부터 시작하자" → Phase 1 구현
- "라우팅부터 바로 가자" → Phase 2 구현
- "둘 다 한 번에" → Phase 1 + 2 동시 구현

---

**현재 상태 정리 완료. 다음 단계 설계 완료.**

