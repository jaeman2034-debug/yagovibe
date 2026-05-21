# 🔥 YAGO VIBE Create System v1 로드맵

## 📋 현재 상태 (v1 기본 완성)

### ✅ 완료된 기능

| 기능 | 상태 | 파일 |
|------|------|------|
| Create Modal | ✅ 완료 | `src/components/create/CreateModal.tsx` |
| Floating 버튼 | ✅ 완료 | `src/components/FloatingWriteButton.tsx` |
| 일정 작성 | ✅ 완료 | `/activity/schedule/create` |
| 팀 작성 | ✅ 완료 | `/team/create` |
| 거래 작성 | ✅ 완료 | `/market/create` |

### 🎨 UI 개선 사항

- ✅ 닫기 버튼 추가 (X 버튼)
- ✅ 이모지 아이콘 추가
- ✅ 구분선 추가
- ✅ AI 추천 작성 옵션 준비 (비활성화)
- ✅ 향후 확장 가능한 구조

---

## 🚀 다음 단계 (v1.1 ~ v2.0)

### 1️⃣ Draft 저장 시스템 (우선순위: 높음)

**목표**: 작성 중인 글을 자동 저장하고 복원

**구조**:
```
Firestore
  └ drafts/{uid}
      └ {type}/{draftId}
          {
            type: "market" | "schedule" | "team",
            data: {...},
            updatedAt: Timestamp
          }
```

**UX 플로우**:
1. 사용자가 작성 페이지에서 뒤로 가기
2. Draft 자동 저장
3. 다시 들어오면 "작성 중이던 글이 있습니다" 모달 표시
4. 이어서 작성 또는 새로 작성 선택

**구현 파일**:
- `src/services/draftService.ts` (신규)
- `src/components/create/DraftRestoreModal.tsx` (신규)
- 각 작성 페이지에 Draft 로직 통합

---

### 2️⃣ Quick Create (우선순위: 중간)

**목표**: 모달에서 바로 빠르게 작성

**UX 플로우**:
```
Create Modal
  ↓
Quick Create 버튼 클릭
  ↓
인라인 작성 폼 (모달 내부)
  ↓
제출 → 완료
```

**구현 파일**:
- `src/components/create/QuickCreate.tsx` (신규)
- `src/components/create/QuickMarketForm.tsx` (신규)
- `src/components/create/QuickScheduleForm.tsx` (신규)

**Quick Create 옵션**:
- ⚡ 빠른 거래 등록 (상품명, 가격, 사진만)
- ⚡ 빠른 일정 등록 (제목, 날짜, 시간만)
- ⚡ 빠른 팀 모집 (팀명, 지역만)

---

### 3️⃣ AI 추천 작성 (우선순위: 낮음, v2.0)

**목표**: AI가 사용자에게 맞는 글 작성 추천

**UX 플로우**:
```
Create Modal
  ↓
⚡ AI 추천 작성 클릭
  ↓
AI 질문 모달
  "어떤 글을 작성할까요?"
  - 거래
  - 팀 모집
  - 일정
  ↓
AI가 추천하는 템플릿 표시
```

**구현 파일**:
- `src/components/create/AICreateModal.tsx` (신규)
- `src/services/aiCreateService.ts` (신규)

---

## 📐 향후 확장 옵션

### 스포츠 플랫폼 특화 옵션

CreateModal에 추가 가능한 옵션:

```typescript
{
  id: "recruit",
  label: "팀원 모집",
  description: "팀원 모집 글 작성",
  icon: UserPlus,
  path: "/market/create?category=recruit",
  color: "bg-orange-600 hover:bg-orange-700",
  emoji: "⚽",
},
{
  id: "match",
  label: "경기 매칭",
  description: "경기 상대팀 모집",
  icon: Trophy,
  path: "/market/create?category=match",
  color: "bg-red-600 hover:bg-red-700",
  emoji: "🏆",
},
```

**활성화 방법**:
1. `CreateModal.tsx`에서 주석 해제
2. 각 카테고리별 라우트 확인
3. MarketWritePage에서 category 파라미터 처리 확인

---

## 📂 권장 파일 구조

```
src
 ├ components
 │   └ create
 │       ├ CreateModal.tsx          ✅ 완료
 │       ├ CreateButton.tsx          (향후)
 │       ├ QuickCreate.tsx           (v1.1)
 │       ├ QuickMarketForm.tsx       (v1.1)
 │       ├ QuickScheduleForm.tsx     (v1.1)
 │       ├ DraftRestoreModal.tsx     (v1.1)
 │       └ AICreateModal.tsx         (v2.0)
 │
 ├ services
 │   ├ draftService.ts              (v1.1)
 │   └ aiCreateService.ts           (v2.0)
 │
 ├ pages
 │   ├ schedule
 │   │    └ ScheduleCreatePage.tsx   ✅ 완료
 │   ├ team
 │   │    └ TeamCreatePage.tsx       ✅ 완료
 │   └ market
 │        └ MarketCreatePage.tsx     ✅ 완료
```

---

## 🎯 우선순위별 작업 계획

### Phase 1: Draft 저장 (v1.1)
1. `draftService.ts` 작성
2. 각 작성 페이지에 Draft 로직 통합
3. `DraftRestoreModal` 컴포넌트 작성
4. 테스트 및 검증

**예상 작업 시간**: 2-3일

---

### Phase 2: Quick Create (v1.2)
1. `QuickCreate` 컴포넌트 작성
2. `QuickMarketForm` 작성
3. `QuickScheduleForm` 작성
4. CreateModal에 Quick Create 옵션 추가
5. 테스트 및 검증

**예상 작업 시간**: 3-4일

---

### Phase 3: 스포츠 특화 옵션 (v1.3)
1. 팀원 모집 옵션 활성화
2. 경기 매칭 옵션 활성화
3. 각 카테고리별 라우트 확인
4. UI/UX 테스트

**예상 작업 시간**: 1-2일

---

### Phase 4: AI 추천 작성 (v2.0)
1. AI 서비스 연동 설계
2. `AICreateModal` 컴포넌트 작성
3. AI 추천 로직 구현
4. 테스트 및 검증

**예상 작업 시간**: 5-7일

---

## 📊 현재 개발 진행도

| 기능 | 진행도 | 상태 |
|------|--------|------|
| Create Modal | 100% | ✅ 완료 |
| 기본 작성 옵션 | 100% | ✅ 완료 |
| Draft 저장 | 0% | 📋 예정 |
| Quick Create | 0% | 📋 예정 |
| AI 추천 작성 | 0% | 📋 예정 |
| 스포츠 특화 옵션 | 50% | 🔄 준비됨 (코드 주석 처리) |

---

## 🔧 다음 작업 추천

**즉시 시작 가능**:
1. Draft 저장 시스템 구현
2. 스포츠 특화 옵션 활성화 (주석 해제)

**준비 필요**:
1. Quick Create 설계 및 구현
2. AI 서비스 연동 준비

---

## 💡 참고사항

### CreateModal 확장 방법

새로운 작성 옵션을 추가하려면:

```typescript
const createOptions: CreateOption[] = [
  // 기존 옵션들...
  {
    id: "new-option",
    label: "새 옵션",
    description: "설명",
    icon: IconComponent,
    path: "/path/to/create",
    color: "bg-color-600 hover:bg-color-700",
    emoji: "🎯",
  },
];
```

### Draft 저장 통합 방법

각 작성 페이지에서:

```typescript
import { saveDraft, getDraft } from "@/services/draftService";

// 페이지 진입 시
useEffect(() => {
  const draft = getDraft("market", user.uid);
  if (draft) {
    setShowDraftModal(true);
  }
}, []);

// 폼 데이터 변경 시
useEffect(() => {
  const timer = setTimeout(() => {
    saveDraft("market", user.uid, formData);
  }, 1000);
  return () => clearTimeout(timer);
}, [formData]);
```

---

## ✅ 체크리스트

- [x] CreateModal 기본 구조 완성
- [x] 닫기 버튼 추가
- [x] UI 개선 (이모지, 구분선)
- [x] AI 추천 작성 옵션 준비
- [x] 스포츠 특화 옵션 코드 준비 (주석 처리)
- [ ] Draft 저장 시스템 구현
- [ ] Quick Create 구현
- [ ] AI 추천 작성 구현
- [ ] 스포츠 특화 옵션 활성화
