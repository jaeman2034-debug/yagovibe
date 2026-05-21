# Phase 2 아키텍처 감리 실행 템플릿

**목적**: Cursor 결과물 도착 시 즉시 실행할 감리 체크리스트

**원칙**: 추가 해석 ❌ / 감정 ❌ / 위반 여부만 확인 ⭕

---

## 🔍 Compliance Review Template

### [STRUCTURE] 구조 체크

**질문**: Phase 1 MVP 구조를 침범했는가?

- [ ] **New Page Added?** → `YES / NO`
- [ ] **New Section Added?** → `YES / NO`
- [ ] **Header Modified?** → `YES / NO`

**위반 기준**: `YES`가 하나라도 있으면 → **FAIL**

---

### [AUTHORITY] 권한 체크

**질문**: Edit Mode가 관리자 전용이고, public 화면은 MVP와 동일한가?

- [ ] **Edit Mode Admin Only?** → `YES / NO`
- [ ] **Public = MVP Same?** → `YES / NO`

**위반 기준**: `Edit Mode Admin Only?` = `NO` 이거나 `Public = MVP Same?` = `NO` → **FAIL**

---

### [FACILITY / 대관] 대관 기능 체크 (최중요)

**질문**: 신청/승인 플로우 없이 잠금/해제만 있는가?

- [ ] **Apply Flow Exists?** → `YES / NO` ❌ (YES면 위반)
- [ ] **Approval Flow Exists?** → `YES / NO` ❌ (YES면 위반)
- [ ] **Lock / Unlock Only?** → `YES / NO` ⭕ (YES여야 통과)
- [ ] **Tournament Priority?** → `YES / NO` ⭕ (YES여야 통과)

**위반 기준**: 
- `Apply Flow Exists?` = `YES` → **FAIL**
- `Approval Flow Exists?` = `YES` → **FAIL**
- `Lock / Unlock Only?` = `NO` → **FAIL**
- `Tournament Priority?` = `NO` → **FAIL**

---

### [UI SIGNAL] UI 체크

**질문**: 관리자 버튼이 hover-only이고, 관리자 페이지 느낌이 없는가?

- [ ] **Hover-only Controls?** → `YES / NO`
- [ ] **Admin Page Feeling?** → `YES / NO` ❌ (YES면 위반)

**위반 기준**: 
- `Hover-only Controls?` = `NO` → **FAIL**
- `Admin Page Feeling?` = `YES` → **FAIL**

---

### [FINAL JUDGEMENT] 최종 판정

**질문**: Phase 1 IA를 침범했는가?

- [ ] **Phase 1 IA Violated?** → `YES / NO`

**최종 판정 기준**: 위 모든 체크리스트에서 위반(FAIL)이 하나라도 있으면 → `YES`

---

## ⚠️ 자동 판정 로직 (감정 제거)

```typescript
// 판정 알고리즘
function complianceReview(result: ReviewChecklist): Judgement {
  const violations = [
    result.structure.newPageAdded,
    result.structure.newSectionAdded,
    result.structure.headerModified,
    !result.authority.editModeAdminOnly,
    !result.authority.publicEqualsMVP,
    result.facility.applyFlowExists,
    result.facility.approvalFlowExists,
    !result.facility.lockUnlockOnly,
    !result.facility.tournamentPriority,
    !result.ui.hoverOnlyControls,
    result.ui.adminPageFeeling
  ];
  
  if (violations.some(v => v === true)) {
    return {
      result: "FAIL",
      action: "ROLLBACK + FIX ORDER"
    };
  } else {
    return {
      result: "PASS",
      action: "Phase 2 COMPLETE"
    };
  }
}
```

**판정 원칙**:
- "대체로 괜찮음" ❌
- "의도는 이해됨" ❌
- **위반 여부만 본다** ⭕

---

## ❌ FAIL 시 즉시 실행 명령 (토론 없음)

### ROLLBACK DIRECTIVE

1. **Revert to Phase 1 IA**
   - Phase 1 MVP 구조로 복원
   - 새로 추가된 페이지/섹션 제거

2. **Remove Added Structure**
   - Edit Mode 관련 구조 제거 (필요시)
   - 권한 체크 로직은 유지 (다음 시도용)

3. **Restore Read-only Scope**
   - 모든 섹션을 읽기 전용으로 복원
   - 관리자 편집 기능 제거

4. **Re-submit under same directive**
   - 동일한 Phase 2 지시문 하에 재제출
   - 위반 사항 명시 후 수정 요청

**원칙**: 
- 토론 없음 ❌
- 설득 없음 ❌
- 수정 후 재감리 ⭕

---

## ✅ PASS 시 자동 전이 (미리 정의)

### Phase 2 COMPLETE 선언

```
PHASE: 2
STATUS: COMPLETE
RESULT: PASS
ARCHITECTURE: COMPLIANT
```

### Phase 3 준비 (별도 선언 필요)

**⚠️ Phase 3는 별도 선언 후 시작** (지금은 접근 ❌)

```
PHASE: 3 (NOT STARTED)
MODE: OPERATIONAL EXTENSION
SCOPE: 
  - Club Management
  - Accounting
  - Workflow Automation
```

---

## 📋 감리 실행 절차

1. **Cursor 결과물 수령**
2. **코드/구조 검토**
3. **템플릿 체크리스트 작성** (위 질문에 YES/NO 답변)
4. **자동 판정 로직 실행**
5. **판정 결과 선언** (FAIL 또는 PASS)
6. **조치 실행** (ROLLBACK 또는 Phase 2 COMPLETE)

---

**이 템플릿은 Cursor 결과물 도착 시 즉시 실행한다.**


