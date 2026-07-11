# PAI-001 Fix 배포 접수 템플릿 (Waiting)

**Document ID:** `PAI-001-FIX-INTAKE`  
**Status:** ▶ **WAITING** · `ENG_PAI_001_FIX_PENDING`  
**SoT:** `PRODUCTION_RUN_SHEET.md` · `PAI_001_FIX_VERIFICATION.md`

> ❌ 예시 값을 Official Fact로 승격 금지  
> ❌ Fix 미확인 상태에서 Release Notes / PASS / CLOSED / KPI 확정 금지  
> 본 템플릿은 **실제 배포 로그·커밋·릴리스에서 확인된 값만** 기입한다.

---

## 0. 현재 게이트

| 항목 | 상태 |
|---|---|
| `ENG_PAI_001_FIX_PENDING` | ✅ 유지 (Production 배포 Fact 대기) |
| Fix **코드** 반영 | ▶ **로컬/브랜치 반영** · Prod 배포 전 |
| `BETA-ISSUE-001` | ⚠️ OPEN |
| Release Notes | ⏳ Pending (**Prod 배포 Fact 후**) |
| Verification | ⏳ Blocked |
| PASS / FAIL | ⏳ 미판정 |
| PAI-003 | ⏳ PASS 후 상태 전환 절차로 개시 |
| Production Day-01 KPI | ⏳ 미시작 |

### Fix 코드 범위 (구현 Fact · 배포 Fact 아님)

| 변경 | 파일 |
|---|---|
| iOS 카카오 `kakaotalk://web/openExternal` 우선 | `src/utils/openExternalBrowser.ts` |
| Auth persistence IndexedDB 우선 정렬 | `src/utils/authHelpers.ts` |
| `/login?next=` 보존 (AuthProvider) | `src/context/AuthProvider.tsx` |
| 카카오 인앱 Safari CTA 강화 | `src/pages/LoginPage.tsx` |

> 위는 **코드 변경 Fact**다. Production Release Notes·PASS는 **배포 로그 4항목** 확인 후에만 확정한다.

---

## 1. Fix 배포 Official Fact 접수란

**아래 칸은 비워 둔다. 실제 확인 값만 기입.**

| # | 항목 | 실제 값 (기입) | 확인 출처 |
|---:|---|---|---|
| 1 | 배포 일시 (타임존 포함) | `________________` | 배포 로그 / CI |
| 2 | 수정 범위 | `________________` | PR / 변경 설명 |
| 3 | 커밋 식별자 | `________________` | git / 배포 로그 |
| 4 | 릴리스 식별자 | `________________` | 태그 / 릴리스 노트 |
| 5 | 배포 환경 | `________________` | Production / Staging 등 |

**금지 예시 (Official Fact 아님 · 기입 금지):**

- `2026-08-05 14:30 KST`
- `abc1234`
- `v2.1.3`

위와 같은 **플레이스홀더·가상 값**은 접수란에 넣지 않는다.

---

## 2. 접수 후 진행 순서

§1의 1~5가 **모두 실제 값으로 채워진 뒤에만** 진행한다.

```text
실제 Fix 배포 Fact 확인 (§1 완료)
        ↓
Release Notes 기록
        ↓
실기기 Verification (`PAI_001_FIX_VERIFICATION.md`)
        ↓
PASS / FAIL 판정
        ↓
PASS → BETA-ISSUE-001 CLOSED (Verified)
       → PAI-003 ACTIVE (상태 전환 절차 · 문서/Tracker 반영 후)
FAIL → BETA-ISSUE-001 OPEN 유지
       → 추가 Fix Action
        ↓
Production Day-01 KPI
```

---

## 3. PAI-003 개시 규칙

| 규칙 | 내용 |
|---|---|
| **개시 조건** | PAI-001 Verification **PASS** |
| **개시 방식** | Action Items · Tracker에 **ACTIVE로 상태 전환**한 뒤 재검증 절차 시작 |
| **금지** | PASS 선언만으로 PAI-003 **자동 완료/자동 개시 완료**로 기록하지 않음 |
| **완료** | Parent 독립 사용 Gate 재검증 Official Fact 확보 후 DONE |

---

## 4. PASS 판정 문장 템플릿 (Verification 완료 후)

> PAI-001 Verification 결과, Release `{실제_릴리스}` 배포 후 정의된 검증 항목에서 `/login` 재요구 현상이 재현되지 않았다. 이에 따라 PAI-001 Verification을 PASS로 판정하고 종료(CLOSED)한다.

`{실제_릴리스}`는 §1에서 확인된 값만 사용한다.

---

## 5. 체크리스트 (접수 시)

- [ ] §1 배포 일시 — 실제 값
- [ ] §1 수정 범위 — 실제 값
- [ ] §1 커밋 — 실제 값
- [ ] §1 릴리스 — 실제 값
- [ ] §1 환경 — 실제 값
- [ ] 예시/가상 값 미사용 확인
- [ ] Release Notes · Verification · PASS — **아직 미실행** (접수 전)

---

**Updated:** 2026-07-11  
**Next:** 개발팀 배포 로그의 §1 실제 값 기입 → 다음 게이트 진행
