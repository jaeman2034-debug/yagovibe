# Phase 2 결과물 요구 명세 (Cursor → 감리자 전달용)

## 🎯 Cursor 결과물의 정확한 정의

**결론 한 줄**: Cursor 결과물은 **"감리자가 YES/NO로 판정할 수 있는 최소 단위의 증거 세트"**다.

- 설명 ❌ / 해설 ❌ / 의도 ❌
- 구조·코드·파일만 ⭕

**핵심 원칙**: Cursor 결과물이란 '잘 만들었다'는 말이 아니라, **'PASS/FAIL을 판정할 수 있는 증거'**다.

---

## ✅ Cursor가 반드시 제출해야 하는 4종 세트 (필수)

### 1️⃣ 변경 파일 목록 (가장 중요 · 없으면 감리 불가)

**형식**:
```
src/pages/AssociationOfficialPage.tsx
src/components/association/FacilitySection.tsx
src/components/association/NoticeSection.tsx
src/hooks/useAdminMode.ts
src/hooks/useAssociationAdmin.ts
```

**이걸로 판단하는 것**:
- ❓ 새 페이지 생겼는가?
- ❓ 새 섹션 생겼는가?
- ❓ Header 수정됐는가?

**👉 구조 위반 판정용 1차 증거**

**⚠️ 이 목록 없으면 감리 시작 불가**

---

### 2️⃣ 컴포넌트 트리 요약 (IA 침범 판정용)

**형식**:
```
AssociationOfficialPage
 ├─ Header
 ├─ HeroSection
 ├─ NoticeSection (editable)
 ├─ TournamentSection (editable)
 ├─ FacilitySection (lock/unlock only)
 ├─ StorySection
 └─ ClubSummarySection
```

**이걸로 판단하는 것**:
- ❓ Phase 1의 6개 섹션이 유지됐는가?
- ❓ 섹션이 하나라도 추가됐는가?

**👉 IA 침범 여부 즉시 판정**

---

### 3️⃣ Edit Mode / 권한 처리 코드 (관리자 전용 여부 판정)

**형식** (일부 코드만 있으면 충분):

```typescript
const isAdmin = user.role === 'association_admin';
const isEditMode = isAdmin && query.mode === 'admin';
```

**이걸로 판단하는 것**:
- ❓ Edit Mode가 관리자 전용인가?
- ❓ Public 화면은 MVP와 동일한가?

**👉 권한 주입만 했는지 확인**

---

### 4️⃣ FacilitySection (대관) 핵심 로직 코드 (최중요)

**허용되는 코드**:
```typescript
updateSlotStatus(slotId, 'blocked');
updateSlotStatus(slotId, 'available');
lockSlotForTournament(slotId, tournamentId);
unlockSlot(slotId);
```

**즉시 FAIL 코드**:
```typescript
applyReservation()
approveReservation()
requestSlot()
submitBooking()
processBookingRequest()
```

**이걸로 판단하는 것**:
- ❓ 신청 플로우 있는가? (FAIL)
- ❓ 승인 워크플로우 있는가? (FAIL)
- ❓ 잠금/해제만 있는가? (PASS)

**👉 Phase 2 성공/실패의 핵심 기준**

---

### 5️⃣ 라우팅 변경 내용 (선택 · 있다면)

**형식**:
```typescript
<Route path="/association/:id" />
```

**FAIL 조건**:
```typescript
<Route path="/admin" />
<Route path="/association/:id/admin" />
```

**이걸로 판단하는 것**:
- ❓ 관리자 전용 페이지 생성 여부 확인

**👉 별도 관리자 페이지 생성 시 즉시 FAIL**

---

## ❌ Cursor가 주면 안 되는 것 (절대 금지)

- ❌ "이렇게 설계했습니다" 설명
- ❌ "의도는 이렇습니다"
- ❌ 디자인 스크린샷
- ❌ 향후 확장 아이디어
- ❌ README 업데이트
- ❌ 주석 처리된 코드 (Phase 2 범위 외)
- ❌ TODO 처리된 코드
- ❌ 향후 사용 예정 코드

**👉 이건 감리를 방해하는 노이즈**

**원칙**: 코드 / 구조 / 파일만 필요

---

## ✅ Cursor 제출 형식 약속 (필수)

### 1️⃣ 단일 제출 약속 (Split 제출 금지)

**문제**: 변경 파일 목록 따로, 코드 조각 나중에, 트리 요약 다시 이렇게 분할 제출되면 감리 효율이 깨진다.

**약속**: Phase 2 결과물은 **1회 메시지로, 모든 필수 항목을 함께 제출**합니다.

**효과**: 이 약속 하나로 감리 속도 2배 올라간다.

---

### 2️⃣ 추가 설명 미첨부 약속 (노이즈 차단)

**문제**: "아래 코드는 이런 의도입니다…" 같은 설명이 포함되면 감리자가 설득당할 위험이 생긴다.

**약속**: 결과물에는 **설명, 의도, 배경 문장을 포함하지 않습니다.** 요청된 코드/구조만 제공합니다.

**효과**: 이걸 받아두면 PASS/FAIL이 흔들리지 않는다.

---

### 3️⃣ Phase 2 범위 외 코드 미포함 약속

**문제**: 나중에 쓸 admin route, TODO 처리된 신청 함수, 주석 처리된 승인 플로우 등이 포함되면 FAIL 사유가 된다.

**약속**: Phase 2 범위 외 기능, 주석 처리된 코드, 향후 사용 예정 코드도 결과물에 포함하지 않습니다.

**효과**: 이 약속이 없으면 의도치 않은 FAIL이 생길 수 있다.

---

## 📋 Cursor에게 던질 최종 문장 (확정본)

### Step 1: 요구사항 전달

```
Phase 2 결과물 전달해 주세요.

필수:
1) 변경 파일 목록
2) 컴포넌트 트리 요약
3) Edit Mode 권한 처리 코드
4) FacilitySection 슬롯 잠금/해제 로직 코드

선택:
5) 라우팅 변경 내용

설명은 필요 없습니다.

추가로 아래 3가지를 약속해 주세요:
1) Phase 2 결과물은 1회 메시지로 일괄 제출
2) 설명/의도 문장 없이 코드·구조만 제출
3) Phase 2 범위 외 코드(주석 포함) 미포함
```

### Step 2: 명시적 약속 확인 요구 (필수)

**⚠️ 이 확인 응답을 받지 않으면 감리 시작 불가**

```
위 Phase 2 결과물 요구 명세와
3가지 추가 약속(단일 제출 / 설명 미첨부 / 범위 외 코드 미포함)을
모두 확인했고,
해당 조건을 준수하여 결과물을 제출하겠습니다.
```

**이 문장이 오면**: ✅ 100% 무결 상태 완성 (사고 가능성 0%)

**이 문장이 없으면**: ❌ 명시적 약속 없음 → FAIL 시 변명 가능성 존재

---

## 🔍 감리 실행 프로세스

1. **위 5개 항목 수령**
2. **템플릿 기반 YES/NO 체크** (`PHASE2_COMPLIANCE_REVIEW_TEMPLATE.md` 사용)
3. **이진 판정** (PASS / FAIL)
4. **FAIL 시**: 즉시 ROLLBACK 지시
5. **PASS 시**: Phase 2 완료 선언 + Phase 3 진입 준비

---

**이 명세를 Cursor에게 전달하면, 감리 가능한 형태로 결과물이 제공됩니다.**

