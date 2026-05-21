# 🔥 STEP 14: 팀 페이지에 Persona 패턴 확산

**상태:** ✅ 완료

---

## 📋 변경 범위

### 새로 생성된 파일
1. `src/pages/team/TeamPageLayout.tsx`
   - 3-Layer 구조의 고정 컨테이너
   - /me와 동일한 구조

2. `src/components/team/TeamIdentityHeader.tsx`
   - 팀 페이지 공통 헤더
   - 사용자 정보 + 팀 관계 요약

3. `src/components/team/TeamPersonaSection.tsx`
   - Persona별 분기 컴포넌트

4. `src/components/team/TeamOpportunitySection.tsx`
   - 선택적 CTA 유도 영역

5. `src/components/team/persona/TeamPersonaP0NewUser.tsx`
   - P0 신규 유저 UI

6. `src/components/team/persona/TeamPersonaP1Individual.tsx`
   - P1 팀 없는 개인 체육인 UI (핵심)

7. `src/components/team/persona/TeamPersonaP2TeamMember.tsx`
   - P2 팀 소속 선수 UI

8. `src/components/team/persona/TeamPersonaP3TeamCaptain.tsx`
   - P3 팀장 UI

9. `src/components/team/persona/TeamPersonaP4AssociationAdmin.tsx`
   - P4 협회 관리자 UI

### 수정된 파일
1. `src/pages/team/TeamPage.tsx`
   - Persona 패턴으로 완전 리팩토링
   - /me와 동일한 구조

---

## ✅ STEP 14 완료 체크리스트

- [x] 팀 페이지에 Persona 패턴 적용
- [x] /me와 동일한 3-Layer 구조 적용
- [x] resolvePersona 재사용
- [x] PersonaSection 구현 (P1, P2, P3, P4)
- [x] OpportunitySection 구현
- [x] 팀이 없어도 / 있어도 / 관리자가 아니어도 안 터짐

---

## 📝 핵심 변경

### 팀 페이지 재정의

**변경 전:**
- 팀이 있으면 팀 정보 표시
- 팀이 없으면 "아직 내 팀이 없습니다" + 강요 버튼

**변경 후:**
- 팀 페이지는 '팀과의 관계를 보여주는 허브'
- 팀 없으면 접근 불가 ❌ / 에러 화면 ❌ / "팀을 먼저 만드세요" 메인 강요 ❌
- Persona 기반 분기로 모든 상태 정상 처리

### Persona 재사용

/me와 동일한 Persona를 사용:
- P0: 프로필 미완 (팀 개념 노출 ❌)
- P1: 팀 없는 개인 체육인
- P2: 팀 소속 선수
- P3: 팀장
- P4: 협회 관리자

### 3-Layer 구조 (/me와 동일)

1. **TeamIdentityHeader** - 항상 렌더링 (나 + 팀 관계 요약)
2. **TeamPersonaSection** - Persona별 분기 (CTA 없음)
3. **TeamOpportunitySection** - 조건부 CTA 유도 (CTA만 있음)

---

## 🎯 PersonaSection 상세

### P1 - 팀 없는 개인 체육인 (핵심)

**제거:**
- "아직 소속된 팀은 없어요" ❌ (금지)

**추가:**
- info 카드: "팀에 소속되면 이런 활동을 할 수 있어요"
- hint 카드: "팀은 선택 사항이에요"

### P2 - 팀 소속 선수

- 내 팀 카드
- 팀 일정
- 팀 공지
- 관리 버튼 없음

### P3 - 팀장

- 팀 관리
- 선수 목록
- 대회 참가 관리

### P4 - 협회 관리자

- 팀 목록
- 승인/관리 도구

---

## 🎯 OpportunitySection

Persona별 CTA:
- P1: JoinTeamCard 또는 CreateTeamCard (택 1)
- P2: ❌
- P3: ApplyTournamentCard
- P4: ❌

---

## 🧪 테스트 방법

### 확인 사항
- [ ] 팀 없어도 /me 진입 가능
- [ ] 팀 있어도 /me 진입 가능
- [ ] 관리자 계정으로도 정상
- [ ] Persona별 UI 정상 표시
- [ ] CTA는 OpportunitySection에만 존재
- [ ] 콘솔 에러 0개

---

## 🎯 STEP 14 머지 후 얻는 것

1. **팀 페이지 안정성 확보**
   - 팀이 없어도 / 있어도 / 관리자가 아니어도 안 터짐

2. **"팀 중심 UX"의 오해 제거**
   - 개인→팀 전환을 부드럽게 만듦

3. **/me에서 만든 기준 재사용**
   - 검증된 구조의 재사용으로 리스크 최소화

4. **다음 확장 기반**
   - 대회 페이지에도 동일 패턴 적용 가능

---

## 📚 관련 문서

- `docs/ME_PAGE_EXECUTION_ROADMAP.md` - 실행 로드맵
- `docs/ME_PAGE_DESIGN_MASTER.md` - 전체 설계
- `docs/PR1_COMPLETE.md` - PR 1 완료
- `docs/PR2_COMPLETE.md` - PR 2 완료
- `docs/PR3_COMPLETE.md` - PR 3 완료
- `docs/PR4_COMPLETE.md` - PR 4 완료
- `docs/PR5_COMPLETE.md` - PR 5 완료

---

**STEP 상태: ✅ 완료**

**"한 번 증명된 구조는 복제할수록 가치가 커진다."**
