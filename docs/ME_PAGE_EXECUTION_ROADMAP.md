# 🔥 /me 페이지 실행 로드맵 + PR 단위 분해 (STEP 13)

**목표: 이 설계를 팀/시간/리스크 없이 코드로 끝낸다**

이 단계는 철학 없음, 결단만 있다.

---

## 1️⃣ 전체 작업을 5개 PR로 쪼갠다 (핵심)

**❗ 이 순서대로 가면 중간에 절대 터지지 않는다**

---

### PR 1 — 데이터 훅 안정화 (🔥 가장 중요)

**변경 범위:**
- `useMyTeams`
- `useMyTournamentApplications`
- `useMyProfile` (필요 시)

**완료 조건:**
- [ ] `enabled: !!userId` 패턴 적용
- [ ] `try/catch` 내부에서 `[] | null` 반환
- [ ] 기본값 반환 (절대 `undefined` 금지)
- [ ] `throw` 없음
- [ ] 권한 오류는 정상 상태로 처리 (빈 배열)

**👉 이 PR만 머지돼도 /me는 다시 안 죽는다**

**리뷰 포인트:**
- 모든 훅이 안전 기본값 반환하는가?
- `enabled` 패턴이 적용되었는가?
- 에러 시에도 빈 배열/null 반환하는가?

---

### PR 2 — Persona 판별 로직 분리

**변경 범위:**
- `resolvePersona.ts` 생성
- 기존 `/me` 조건문 제거

**완료 조건:**
- [ ] Persona 계산이 한 파일에만 존재
- [ ] `/me`에서 `if/else` 거의 사라짐
- [ ] 정규화된 입력값만 사용 (boolean / number)

**리뷰 포인트:**
- Persona 계산이 중복되지 않는가?
- `/me`에서 조건문이 최소화되었는가?

---

### PR 3 — /me 레이아웃 구조 고정

**변경 범위:**
- `IdentityHeader` 컴포넌트
- `PersonaSection` 컴포넌트
- `OpportunitySection` 컴포넌트
- `MePage.tsx` 재구성

**완료 조건:**
- [ ] 3-Layer 구조 고정
- [ ] CTA는 OpportunitySection에만 존재
- [ ] PersonaSection에 Button 없음
- [ ] OpportunitySection에 Button 1개 이하

**리뷰 포인트:**
- 3-Layer 구조가 명확한가?
- CTA가 OpportunitySection에만 있는가?

---

### PR 4 — P1 개인 체육인 UI 구현 (MVP)

**변경 범위:**
- `PersonaP1Individual.tsx` 구현
- 카드 4종 (MySportProfile, PersonalSummary, RecommendedContent, ActivityHint)
- `MeCard` 컴포넌트 (variant 시스템)

**완료 조건:**
- [ ] 데이터 0개 계정에서도 UX 완성
- [ ] "아직 없습니다" 문구 0개
- [ ] 카드 4개 항상 렌더링
- [ ] MeCard variant 시스템 적용

**리뷰 포인트:**
- 신규 유저 계정에서 정상 표시되는가?
- "없음" 문구가 없는가?

---

### PR 5 — 기존 UI 재배치 & 정리

**변경 범위:**
- 기존 "대회 참가 준비" 화면 제거
- `MeEmptyState` 제거 (Persona로 흡수)
- Opportunity 카드로 재배치
- 냄새 코드 정리

**완료 조건:**
- [ ] 메인 PersonaSection에 Empty UI 없음
- [ ] 팀 만들기 강요 제거
- [ ] 냄새 코드 완전 제거
- [ ] 불필요한 조건문 제거

**리뷰 포인트:**
- EmptyState가 완전히 제거되었는가?
- PersonaSection에 Button이 없는가?

---

## 2️⃣ 개발 중 절대 지켜야 할 레드라인 🚨

**이거 하나라도 어기면 바로 후퇴다.**

### ❌ 절대 금지

- [ ] `/me`에 `ErrorCard` 추가
- [ ] `EmptyState` 컴포넌트 재등장
- [ ] "아직 ~가 없습니다" 문구
- [ ] 관리자 기준 UX로 일반 유저 판단
- [ ] PersonaSection에 Button 추가
- [ ] OpportunitySection에 Button 2개 이상
- [ ] 조건문으로 분기 (Persona 대신)
- [ ] `throw` 사용
- [ ] `undefined` 반환

### ✅ 허용되는 예외

- `if (!user) return <LoginGuide />;` (로그인 체크만)
- `if (loading) return <MeSkeleton />;` (로딩만)

---

## 3️⃣ QA 최종 통과 기준 (배포 OK 신호)

### 테스트 계정 A (개인 체육인)

**조건:** 팀 ❌ / 대회 ❌ / 관리자 ❌

**체크리스트:**
- [ ] `/me` 진입 시 에러 없음
- [ ] 카드 4개 보임
  - [ ] MySportProfile (info)
  - [ ] PersonalSummary (summary)
  - [ ] RecommendedContent (info)
  - [ ] ActivityHint (hint)
- [ ] 버튼 1개 (하단 OpportunitySection)
- [ ] "아직 없습니다" 문구 없음
- [ ] 콘솔 에러 0개
- [ ] 새로고침 정상
- [ ] 시크릿 모드 정상

**👉 이게 통과 못 하면 배포 ❌**

---

### 테스트 계정 B (팀장)

**조건:** 팀 ⭕ / 대회 ❌

**체크리스트:**
- [ ] `/me` 진입 시 에러 없음
- [ ] 팀 관리 UI 표시 (P3)
- [ ] 대회 참가 카드 노출 (OpportunitySection)
- [ ] 콘솔 에러 0개

---

### 테스트 계정 C (관리자)

**조건:** `role = ADMIN`

**체크리스트:**
- [ ] `/me` 진입 시 에러 없음
- [ ] 관리자 대시보드 표시 (P4)
- [ ] 일반 사용자 UX 섞이지 않음
- [ ] 콘솔 에러 0개

---

## 4️⃣ PR 병합 순서 (절대 변경 금지)

```
PR 1 (데이터 훅 안정화)
  ↓
PR 2 (Persona 판별 로직 분리)
  ↓
PR 3 (레이아웃 구조 고정)
  ↓
PR 4 (P1 UI 구현)
  ↓
PR 5 (기존 UI 재배치 & 정리)
```

**👉 이 순서 절대 바꾸지 마라**

---

## 5️⃣ 각 PR별 예상 소요 시간

| PR | 작업 | 예상 시간 |
|----|------|-----------|
| PR 1 | 데이터 훅 안정화 | 2-3시간 |
| PR 2 | Persona 판별 로직 분리 | 1-2시간 |
| PR 3 | 레이아웃 구조 고정 | 3-4시간 |
| PR 4 | P1 UI 구현 | 4-6시간 |
| PR 5 | 기존 UI 재배치 | 2-3시간 |
| **총계** | | **12-18시간** |

---

## 6️⃣ 리스크 관리

### 고위험 작업
- **PR 1**: 데이터 훅 수정 → 기존 기능 영향 가능
- **대응**: 단계별 테스트, 기존 테스트 유지

### 중위험 작업
- **PR 3**: 레이아웃 구조 변경 → UI 깨짐 가능
- **대응**: 기존 UI와 병행 배포 가능하도록 구성

### 저위험 작업
- **PR 2, 4, 5**: 새 파일 생성 / 기존 UI 제거
- **대응**: 기존 코드는 유지, 새 구조로 전환

---

## 7️⃣ 롤백 계획

### 각 PR별 롤백 시나리오

**PR 1 롤백:**
- 기존 훅 버전으로 되돌리기
- 영향도: 낮음 (기존 동작 유지)

**PR 2 롤백:**
- `resolvePersona.ts` 제거
- 기존 조건문 복원
- 영향도: 중간

**PR 3 롤백:**
- 기존 `/me` 구조 복원
- 영향도: 중간

**PR 4 롤백:**
- P1 UI 제거, 기본 구조 유지
- 영향도: 낮음

**PR 5 롤백:**
- 기존 UI 복원
- 영향도: 낮음

---

## 8️⃣ 완료 기준

### 전체 완료 기준

- [ ] 모든 PR 머지 완료
- [ ] QA 테스트 통과 (계정 A, B, C)
- [ ] 콘솔 에러 0개
- [ ] 문서화 완료
- [ ] 코드 리뷰 완료

---

## 9️⃣ 핵심 원칙 요약

**"설계는 끝났고, 이제 남은 건 '질서 있게 구현하는 것'뿐이다."**

- ❌ 철학 없음
- ✅ 결단만 있다
- ❌ 순서 변경 금지
- ✅ 레드라인 절대 준수

---

**최종 업데이트: STEP 13 완료**
**실행 버전: 1.0.0**
