# Sprint 1: 공지 UI 컴포넌트 구현 완료

## ✅ 완료된 작업

### 1. 컴포넌트 트리 구조화

#### Public 컴포넌트
- `NoticeItem` - 공지 아이템 (리스트/섹션 공통 사용)
- `NoticeEmptyState` - Empty State (전화/문의 유발 요소 없음)
- `NoticeOfficialFooter` - 공식 기준 하단 고정 문구

#### Admin 컴포넌트
- `StatusSelector` - 상태 선택 (의사결정 최소화)

### 2. 핵심 UX 규칙 적용

#### ✅ Public
- `status === 'published'` 만 렌더
- `isPinned === true` → 상단 분리
- Empty State 필수
- 공식 기준 하단 문구 필수

#### ✅ Admin
- 상태 선택 간소화
- 저장 = 즉시 반영
- 미리보기 ❌
- 저장 성공 토스트만 표시

#### ❌ 절대 구현하지 않음
- 댓글 컴포넌트
- 좋아요/공유
- 문의 버튼

### 3. 컴포넌트 재사용

- `NoticeItem`: NoticeListPage, NoticeSection에서 공통 사용
- `NoticeEmptyState`: NoticeListPage, NoticeSection에서 공통 사용
- `NoticeOfficialFooter`: NoticeListPage, NoticeDetailPage에서 공통 사용

## 📐 상태 모델 (확정)

```typescript
type NoticeStatus = 'draft' | 'scheduled' | 'published' | 'archived';

interface Notice {
  id: string;
  title: string;
  content: string;
  status: NoticeStatus;
  publishAt?: Timestamp;
  endAt?: Timestamp;
  isPinned: boolean;
  label?: "필독" | "변경" | "대회";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 🎯 결과

- ✅ "공지 어디서 봐요?" 질문 즉시 종료
- ✅ 협회 페이지 = 기준 화면 인식
- ✅ 다음 스프린트(대회) 요구사항 자동 정리됨

---

**다음 단계: Tournament 카드 UI + 상태 배지 설계**

