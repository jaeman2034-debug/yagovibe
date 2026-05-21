# 🔥 온보딩 협회 가입 버튼 UX 수정

**생성일**: 2025-01-27  
**목적**: 온보딩 화면의 "[협회에 가입하고 활동 시작하기]" 버튼이 에러 페이지로 이동하는 문제 해결  
**상태**: ✅ 수정 완료

---

## ❌ 문제 상황

### 증상
1. 팀 생성 성공 후 온보딩 카드 표시
2. "[협회에 가입하고 활동 시작하기]" 버튼 클릭
3. "팀 정보를 불러올 수 없습니다" 에러 화면 표시

### 원인
- 버튼이 `/associations/assoc-nowon-football/apply?teamId=${teamId}`로 직접 이동
- `AssociationApplyPage`에서 `teamId`가 없거나 팀 정보를 불러올 수 없을 때 에러 표시
- 온보딩 화면에서는 팀 컨텍스트가 안정적으로 전달되지 않음

---

## ✅ 해결 방법

### 핵심 원칙
> **온보딩 화면에서는 절대 팀 정보 페이지를 직접 열면 안 됨**  
> **항상 `/me`를 허브로 거쳐야 함**

### 수정 내용

#### 1. `TeamCreateStep2.tsx` 수정

**변경 전:**
```typescript
const handleRequestMembership = () => {
  if (!teamId) {
    navigate("/me", { replace: true });
    return;
  }
  // ❌ 협회 가입 신청 페이지로 직접 이동
  navigate(`/associations/assoc-nowon-football/apply?teamId=${teamId}`);
};
```

**변경 후:**
```typescript
const handleRequestMembership = () => {
  // ✅ 항상 /me로 이동 (팀 상태는 /me에서 판단)
  navigate("/me", { replace: true });
};
```

---

## 🎯 예상 플로우

### 수정 후 플로우

1. **팀 생성 성공**
   - `/sports/football/team/create?step=2&teamId={teamId}` 표시

2. **"[협회에 가입하고 활동 시작하기]" 버튼 클릭**
   - `/me`로 이동

3. **`/me` 페이지에서:**
   - `useMyTeams` 훅으로 팀 정보 실시간 구독
   - Persona: P3 (팀장) 상태로 전환
   - `PersonaSection`에서 팀 관리 링크 표시
   - 사용자가 팀 관리 페이지에서 협회 가입 진행

---

## 📋 추가 개선 사항 (선택사항)

### `/me` 페이지에 협회 가입 CTA 추가

현재 `OpportunitySection`은 P3 상태에서 `ApplyTournamentCard`만 표시합니다.  
협회 가입 CTA를 추가하려면:

1. **`OpportunitySection.tsx` 수정:**
   ```typescript
   // P3: 대회 참가 + 협회 가입
   {showP3Opportunity && (
     <>
       <ApplyTournamentCard onClick={onApplyTournament} />
       <AssociationJoinCard onClick={onAssociationJoin} />
     </>
   )}
   ```

2. **`AssociationJoinCard` 컴포넌트 생성:**
   - P3 상태에서만 표시
   - 팀이 협회에 가입되지 않은 경우에만 표시
   - 클릭 시 `/associations/assoc-nowon-football/apply?teamId={teamId}`로 이동

---

## ✅ 검증 체크리스트

- [x] `TeamCreateStep2.tsx`의 `handleRequestMembership`이 `/me`로 이동
- [ ] `/me` 페이지에서 P3 상태로 정상 전환
- [ ] 팀 관리 페이지에서 협회 가입 링크 접근 가능
- [ ] "팀 정보를 불러올 수 없습니다" 에러가 더 이상 발생하지 않음

---

## 🔍 관련 파일

- `src/pages/team/TeamCreateStep2.tsx` - 온보딩 카드 버튼
- `src/pages/association/AssociationApplyPage.tsx` - 협회 가입 신청 페이지
- `src/pages/me/MePage.tsx` - `/me` 허브 페이지
- `src/components/me/OpportunitySection.tsx` - CTA 섹션
- `src/components/me/PersonaSection.tsx` - Persona별 섹션

---

**작성일**: 2025-01-27  
**상태**: ✅ 수정 완료  
**다음 단계**: 실제 테스트 및 추가 개선 사항 검토
