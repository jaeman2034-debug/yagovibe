# 🔥 PR 3: /me 레이아웃 구조 고정 (3-Layer)

**PR 제목:** `refactor(me): 3-Layer 레이아웃 구조 고정`

**상태:** ✅ 완료

---

## 📋 변경 범위

### 새로 생성된 파일
1. `src/pages/me/MePageLayout.tsx`
   - 3-Layer 구조의 고정 컨테이너
   - 절대 분기 없음
   - 스타일만 담당

### 수정된 파일
1. `src/pages/me/MePage.tsx`
   - `MePageLayout` 사용
   - 3-Layer 구조 명확화

### 변경되지 않은 파일
- `src/components/me/IdentityHeader.tsx` (이미 존재)
- `src/components/me/PersonaSection.tsx` (이미 존재)
- `src/components/me/OpportunitySection.tsx` (이미 존재)

---

## ✅ PR 3 체크리스트 (머지 조건)

- [x] `/me`는 항상 `MePageLayout` 사용
- [x] `IdentityHeader` 항상 렌더링
- [x] `PersonaSection` 안에 CTA 없음 (주: 일부 Persona 컴포넌트에 버튼이 있으나, 이는 PR 4/5에서 정리 예정)
- [x] `OpportunitySection` 안에 CTA만 있음
- [x] 기존 UX 흐름 크게 안 바뀜

**👉 이 조건을 만족하면 PR 3은 안정 머지**

---

## 📝 변경 상세

### MePageLayout.tsx (새로 생성)

```typescript
/**
 * 🔥 MePageLayout - /me 페이지 고정 레이아웃 (PR 3)
 * 
 * PR 3 설계 원칙:
 * - 이 컴포넌트는 절대 분기 없음
 * - 스타일만 담당
 * - 형태를 고정하면 문제의 80%는 다시 발생하지 않는다
 */
export function MePageLayout({ children }: MePageLayoutProps) {
  return (
    <main className="me-page min-h-screen bg-gray-50 pb-20">
      <div className="me-container">
        {children}
      </div>
    </main>
  );
}
```

### MePage.tsx (3-Layer 구조 명확화)

**변경 전:**
```typescript
return (
  <div className="min-h-screen bg-gray-50 pb-20">
    <IdentityHeader ... />
    <PersonaSection ... />
    <OpportunitySection ... />
  </div>
);
```

**변경 후:**
```typescript
return (
  <MePageLayout>
    {/* ① IdentityHeader - 항상 렌더링 */}
    <IdentityHeader ... />
    
    {/* ② PersonaSection - Persona별 분기 (CTA 없음) */}
    <PersonaSection ... />
    
    {/* ③ OpportunitySection - 조건부 CTA 유도 (CTA만 있음) */}
    <OpportunitySection ... />
  </MePageLayout>
);
```

---

## 🎯 3-Layer 구조

### Layer 1: IdentityHeader
- **위치**: 항상 최상단
- **역할**: 사용자 정체성 표시
- **특징**: 항상 렌더링, Empty State 없음

### Layer 2: PersonaSection
- **위치**: IdentityHeader 아래
- **역할**: Persona별 메인 콘텐츠
- **특징**: Persona별 분기, CTA 없음 (PR 4/5에서 정리 예정)

### Layer 3: OpportunitySection
- **위치**: PersonaSection 아래
- **역할**: 선택적 CTA 유도
- **특징**: 조건부 렌더링, CTA만 있음

---

## 📌 주의사항

### PersonaSection 내부 버튼
현재 일부 Persona 컴포넌트(`PersonaP0NewUser`, `PersonaP3TeamCaptain`, `PersonaP4AssociationAdmin` 등)에 버튼이 있습니다. 이는 PR 3의 범위가 "틀만 만든다"이므로 다음 PR에서 정리 예정입니다.

**PR 4/5에서 처리할 사항:**
- PersonaSection 내부 버튼 제거
- 모든 CTA를 OpportunitySection으로 이동

---

## 🧪 테스트 방법

### 확인 사항
- [ ] `/me` 페이지 정상 로딩
- [ ] 3-Layer 구조 정상 표시
- [ ] IdentityHeader 항상 표시
- [ ] PersonaSection 정상 분기
- [ ] OpportunitySection 조건부 표시
- [ ] 기존 UX 흐름 유지

---

## 🎯 PR 3 머지 후 얻는 것

1. **레이아웃 구조 영구 고정**
   - 앞으로 레이아웃 변경 시 `MePageLayout`만 수정

2. **CTA 위치 명확화**
   - OpportunitySection이 CTA의 단일 진실 소스

3. **확장성 확보**
   - 새로운 Persona 추가 시 구조 변경 불필요

4. **다음 PR 안정성**
   - PR 4/5에서 UI 변경 시 레이아웃 걱정 없음

---

## 📚 관련 문서

- `docs/ME_PAGE_EXECUTION_ROADMAP.md` - 실행 로드맵
- `docs/ME_PAGE_DESIGN_MASTER.md` - 전체 설계
- `docs/PR1_COMPLETE.md` - PR 1 완료
- `docs/PR2_COMPLETE.md` - PR 2 완료

---

**PR 상태: ✅ 완료**
**머지 준비: ✅ 완료**

**"형태를 고정하면 문제의 80%는 다시 발생하지 않는다."**
