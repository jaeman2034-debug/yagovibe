# 🔥 PR 5: 기존 "대회 참가 준비" UI 제거 & Opportunity 카드로 흡수

**PR 제목:** `refactor(me): 기존 EmptyState UI 제거 및 Opportunity 카드로 재배치`

**상태:** ✅ 완료

---

## 📋 변경 범위

### 삭제된 파일
1. `src/components/me/MeEmptyState.tsx`
   - "대회 참가 준비" UI 포함
   - EmptyState 컴포넌트 완전 제거

### 수정된 파일
1. `src/components/me/opportunity/CreateTeamCard.tsx`
   - MeCard 디자인 시스템 적용
   - 문구 정리 (선택 톤)

2. `src/components/me/opportunity/JoinTeamCard.tsx`
   - 문구 정리 (선택 톤)

3. `src/components/me/opportunity/ApplyTournamentCard.tsx`
   - 문구 정리 (선택 톤)

---

## ✅ PR 5 체크리스트 (머지 조건)

- [x] PersonaSection에서 "대회 참가" 관련 문구 0개
- [x] EmptyState 컴포넌트 /me에서 완전 제거
- [x] "팀 만들기" 버튼은 OpportunitySection에만 존재
- [x] P1 개인 체육인 첫 화면 = 카드 4종
- [x] 신규 계정 /me 진입 시 안내만 있고 강요 없음
- [x] 기존 기능 손실 없음

**👉 이 조건을 만족하면 PR 5는 안정 머지**

---

## 📝 변경 상세

### MeEmptyState.tsx (삭제)

**제거된 내용:**
- "대회 참가 준비" UI
- "아직 참가한 대회가 없어요" 문구
- "팀을 만들고 대회에 참가해보세요" 문구
- STEP A 안내 로직

**대체:**
- OpportunitySection의 CreateTeamCard / JoinTeamCard
- OpportunitySection의 ApplyTournamentCard

### CreateTeamCard.tsx (MeCard 디자인 시스템 적용)

**변경 전:**
```typescript
<div className="bg-white rounded-lg border border-gray-200 p-4">
  <h3>팀 만들기</h3>
  <p>팀을 만들어 선수들을 관리할 수 있어요.</p>
  <Button>팀 만들기</Button>
</div>
```

**변경 후:**
```typescript
<MeCard
  variant="action"
  icon={<Users />}
  title="팀 만들기"
  subText="팀을 만들거나 소속될 수 있어요." // 선택 톤
  actionLabel="팀 만들기"
  onAction={onClick}
/>
```

### 문구 정리 (선택 톤)

**변경 전 (강요 톤):**
- "팀을 먼저 생성해주세요"
- "아직 참가한 대회가 없어요"

**변경 후 (선택 톤):**
- "팀을 만들거나 소속될 수 있어요"
- "이미 활동 중인 팀에 합류할 수 있어요"
- "팀으로 대회에 참가할 수 있어요"

---

## 🎯 PR 5 머지 후 최종 상태

### /me 구조 완전 봉인 🔒
- PersonaSection: 메인 콘텐츠만 (CTA 없음)
- OpportunitySection: CTA만 (선택 유도)

### 신규/개인 체육인 UX 정상화 ✅
- P1 개인 체육인 첫 화면 = 카드 4종
- 신규 계정 /me 진입 시 안내만 있고 강요 없음

### 관리자 계정으로 개발해도 UX 왜곡 없음 ✅
- Persona 기반 분기로 관리자/일반 유저 구분

### "왜 여기서 이게 뜨지?" 질문 사라짐 ❌
- 모든 CTA가 OpportunitySection에만 존재
- PersonaSection은 정보 제공만

---

## 🧪 테스트 방법

### 확인 사항
- [ ] PersonaSection에서 "대회 참가" 관련 문구 0개
- [ ] EmptyState 컴포넌트 /me에서 완전 제거
- [ ] "팀 만들기" 버튼은 OpportunitySection에만 존재
- [ ] P1 개인 체육인 첫 화면 = 카드 4종
- [ ] 신규 계정 /me 진입 시 안내만 있고 강요 없음
- [ ] 기존 기능 손실 없음

### 테스트 시나리오
1. 신규 유저 (P0) - PersonaSection에 선택지만, OpportunitySection 없음
2. 개인 체육인 (P1) - 카드 4종 + OpportunitySection (JoinTeamCard)
3. 팀장 (P3) - 팀 관리 UI + OpportunitySection (ApplyTournamentCard)

---

## 📚 관련 문서

- `docs/ME_PAGE_EXECUTION_ROADMAP.md` - 실행 로드맵
- `docs/ME_PAGE_DESIGN_MASTER.md` - 전체 설계
- `docs/PR1_COMPLETE.md` - PR 1 완료
- `docs/PR2_COMPLETE.md` - PR 2 완료
- `docs/PR3_COMPLETE.md` - PR 3 완료
- `docs/PR4_COMPLETE.md` - PR 4 완료

---

**PR 상태: ✅ 완료**
**머지 준비: ✅ 완료**

**"잘못된 UI를 고친 게 아니라 제자리에 돌려놓았다."**
