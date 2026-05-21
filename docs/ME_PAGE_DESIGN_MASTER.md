# 🔥 마이페이지(/me) 1장 요약 설계본

**기획 · 디자인 · 개발 공용 기준 문서 (Single Source of Truth)**

이 문서 하나로 "왜 이렇게 만들었는지", "어디까지가 정상인지", "어디서부터 확장인지"를 논쟁 없이 고정한다.

---

## 1️⃣ /me의 한 문장 정의 (절대 변경 금지)

**마이페이지(/me)는 '이 유저가 이 플랫폼에서 누구인지와 지금 할 수 있는 선택지'를 보여주는 개인 허브다.**

- ❌ 대회 참가 현황 페이지 아님
- ❌ 팀 생성 유도 페이지 아님
- ✅ **개인 정체성 + 선택지** 중심

---

## 2️⃣ 핵심 개념 구분 (이거 안 지키면 다시 망가짐)

| 개념 | 의미 | 사용 위치 |
|------|------|-----------|
| **Role** | 권한 (ADMIN / USER) | Firestore Rules |
| **Persona** | 사용자 상태 | 프론트 UI |
| **State** | 데이터 유무 | 훅 내부 |

**👉 /me는 Persona 기준으로만 동작**

- Rules는 Role로 판단
- UI는 Persona로 판단
- 훅은 State로 판단

---

## 3️⃣ Persona 정의 (최종)

| Persona | 설명 |
|---------|------|
| **P0** | 프로필 미완성 신규 |
| **P1** | 개인 체육인 (팀·대회 없음, 정상) |
| **P2** | 팀 소속 선수 |
| **P3** | 팀장 |
| **P4** | 협회 관리자 |

**📌 P1은 빈 상태가 아니라 핵심 사용자**

---

## 4️⃣ /me UI 고정 구조 (3 Layer)

```
┌─────────────────────────┐
│   IdentityHeader        │   ← 항상 있음 (Empty 불가)
├─────────────────────────┤
│   PersonaSection        │   ← Persona별 메인
├─────────────────────────┤
│   OpportunitySection    │   ← 선택적 행동 (CTA)
└─────────────────────────┘
```

---

## 5️⃣ 각 Layer의 책임 (명확)

### 🟦 IdentityHeader

**나에 대한 정보**

- 데이터 없으면 기본값
- 에러 ❌ / 분기 ❌
- 항상 렌더링 (Empty 불가)

**구성 요소:**
- 프로필 정보
- 계정 유형 배지
- 활동 요약 (팀 수 / 대회 수 / 기록 수)
- 설정 / 로그아웃

---

### 🟩 PersonaSection

**"너는 이런 사람이다"**

- CTA ❌
- Empty State ❌
- Persona별로 다른 컴포넌트

**P1 최소 카드 세트 (4개):**
- `MySportProfile` (info)
- `MonthlySummary` (summary)
- `RecommendedContent` (info)
- `ActivityHint` (hint)

**원칙:**
- 데이터 없어도 항상 렌더링
- "없음" 언급 ❌
- "곧 쌓여요" 같은 긍정적 메시지

---

### 🟨 OpportunitySection

**"이런 것도 할 수 있다"**

- CTA는 여기만 허용
- 버튼 최대 1개
- Persona별로 다른 CTA

**Persona별 CTA:**
- P1: "팀에 소속되기" (1개)
- P3: "대회 참가" (1개)
- P0, P2, P4: null (PersonaSection에서 처리)

**원칙:**
- "해야 합니다" 금지
- "할 수 있어요"만 허용
- 강요 ❌ / 선택 ⭕

---

## 6️⃣ 허용되는 Card Variant (4개 고정)

| Variant | 용도 | 사용 위치 |
|---------|------|-----------|
| **info** | 정보 | PersonaSection |
| **summary** | 요약 | PersonaSection |
| **hint** | 안내 | PersonaSection |
| **action** | 선택 유도 (CTA) | OpportunitySection 전용 |

**❌ 새로운 variant 추가 금지**

### Variant별 특징

- **info**: 기본 정보, 중립적, CTA 없음
- **summary**: 상태 요약, 숫자 강조, 행동 유도 없음
- **hint**: 안내/맥락 제공, 배경 연함, 버튼 없음
- **action**: 선택 유도, 버튼 1개만, OpportunitySection 전용

---

## 7️⃣ 기술 규칙 (재발 방지 핵심)

### 데이터 훅

```typescript
// ✅ 올바른 패턴
const enabled = !!userId;
if (!enabled) {
  return { data: [], loading: false, error: null };
}

try {
  // 쿼리 실행
  return { data: result ?? [], loading: false, error: null };
} catch (err) {
  console.warn("[Hook] 조회 실패 (정상 상태로 처리):", err);
  return { data: [], loading: false, error: null }; // 빈 배열 = 정상
}
```

**체크리스트:**
- ✅ `enabled: !!userId`
- ✅ `try/catch`
- ✅ `[] / null / 0` 기본값
- ❌ `throw` 금지
- ❌ `undefined` 반환 금지

---

### /me 페이지

```typescript
// ✅ 올바른 패턴
if (!user) return <LoginGuide />;  // 로그인 체크만
if (loading) return <MeSkeleton />;  // 로딩만

const persona = resolvePersona({ /* 정규화된 데이터 */ });

return (
  <MePageLayout>
    <IdentityHeader />
    <PersonaSection persona={persona} />
    <OpportunitySection persona={persona} />
  </MePageLayout>
);
```

**체크리스트:**
- ✅ 조건문 거의 없음 (로그인/로딩만)
- ❌ `if (data.length === 0)` 금지
- ❌ `if (error)` 금지
- ❌ ErrorBoundary 의존 금지

---

### Firestore Rules

```javascript
// ✅ 올바른 패턴
match /applications/{applicationId} {
  // list 허용: where 쿼리 가능
  allow read: if request.auth != null && (
    resource.data.createdBy == request.auth.uid
  );
  
  // 결과 없음 = 정상 (P0, P1)
  // 권한 에러 = UX 실패
}
```

**체크리스트:**
- ✅ `list` 허용
- ✅ 결과 없음 = 정상
- ❌ 권한 에러 = UX 실패

---

## 8️⃣ QA 기준 (이거 통과 못 하면 배포 ❌)

### 테스트 계정: 팀 ❌ / 대회 ❌ / 관리자 ❌

#### 필수 체크리스트

- [ ] `/me` 진입 시 에러 없음
- [ ] "아직 없습니다" 문구 없음
- [ ] 카드 항상 렌더링 ⭕
- [ ] 버튼은 하단 1개 ⭕
- [ ] 새로고침 / 시크릿 모드 정상
- [ ] 콘솔 에러 0개

**👉 이게 통과 못 하면 배포 ❌**

---

## 9️⃣ 이 설계의 진짜 가치

### 핵심 성과

1. **신규 유저 = 정상 사용자**
   - P0, P1도 1급 시민
   - "없음" = 에러 아님

2. **개인 체육인 = 핵심 사용자**
   - P1은 빈 상태가 아님
   - 플랫폼의 중심 사용자

3. **관리자 개발 환경에서도 UX 왜곡 없음**
   - Persona 기반 분기
   - Role과 Persona 분리

4. **같은 문제 다시 안 터짐**
   - 구조적 해결
   - 재발 방지 메커니즘

---

## 🔟 최종 한 문장 (천재 선언)

**"우리는 문제를 고친 게 아니라 플랫폼의 기준을 하나 세웠다."**

---

## 📌 확장 가이드

### 이 구조를 다른 페이지로 확장

```
[로그인]
   ↓
[Persona 판단]
   ↓
[정체성 UI]
   ↓
[선택적 행동]
```

**예시:**
- 팀 페이지 → "팀 없는 개인 체육인"
- 대회 페이지 → "참가 안 해도 정보 소비자"

**👉 /me만의 설계가 아니다**
**👉 플랫폼 설계 방식이 바뀐 것**

---

## 📚 관련 문서

- `docs/ME_PAGE_PERSONA_WIREFRAME.md` - 와이어프레임
- `docs/ME_PAGE_COMPONENT_STRUCTURE.md` - 컴포넌트 구조
- `docs/ME_PAGE_DESIGN_SYSTEM.md` - 디자인 시스템
- `docs/FIRESTORE_RULES_PERSONA_DESIGN.md` - Firestore Rules
- `docs/ME_PAGE_REFACTORING_CHECKLIST.md` - 리팩토링 체크리스트
- `docs/ME_PAGE_REFACTORING_STATUS.md` - 리팩토링 현황

---

## ✅ 검증 완료 항목

- [x] 데이터 훅 안전 구현
- [x] Persona 구조 명확
- [x] UI 구조 완성
- [x] Firestore Rules 정합
- [x] 디자인 시스템 고정
- [x] 리팩토링 체크리스트 작성
- [ ] QA 테스트 실행 (수동 테스트 대기)

---

## 🎯 다음 단계

1. **QA 테스트 실행** (신규 유저 시나리오)
2. **다른 페이지 확산** (팀/대회 페이지)
3. **기획/디자인 리뷰** (이 문서 기반)

---

**최종 업데이트: STEP 12 완료**
**문서 버전: 1.0.0**
