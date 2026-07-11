# PAI-001 Fix Verification Checklist

**Document ID:** `PAI-001-FIX-VERIFICATION`  
**Linked Issue:** `BETA-ISSUE-001`  
**Linked Action:** `PAI-001` · `PRODUCTION_ACTION_ITEMS.md`  
**SoT:** `PRODUCTION_RUN_SHEET.md`  
**Status:** ▶ **CHECKLIST READY · Fix Pending**  
**(Fix 미배포 · Verification 미실행 · PASS/FAIL 미판정)**

> ❌ 원인 단정 금지 · ❌ “해결 완료” 사전 선언 금지 · ❌ Fix 없이 Release Notes에 배포 Fact 기록 금지  
> Official Fact(관측)와 Analysis(가설)를 분리한다.  
> **PASS/FAIL은 Fix 배포 Fact 기록 후 본 체크리스트 실행 결과로만 판정**한다.

---

## 0. Baseline (변경 금지 · Beta LOCK)

| 항목 | Official Fact |
|---|---|
| Issue | `BETA-ISSUE-001` · status **OPEN** |
| Impact | `parent_login_friction` |
| 재현 환경 | iPhone 14 Pro · iOS 17.5.1 · **카카오 인앱** · 알림톡 링크 |
| Week-2 | Day-08~12 **5/5일** iPhone 재현 · Android 미재현 |
| Parent Gate | 독립 사용 **N** × 5일 |
| Issue SoT | `../beta_ops/issues/BETA-ISSUE-001.json` |

**증상 (Official Fact):** 알림톡 링크로 진입 시 `/login` 페이지가 다시 요구됨.

---

## 1. 검증 목적

Fix 적용 후 아래를 **관측**으로 확인한다.

1. 카카오 인앱 + 알림톡 진입에서 로그인 재요구가 **재현되는지**
2. iPhone Safari 등 대조 환경에서의 동작
3. Android 대조(기존 미재현 패턴 유지 여부)
4. Parent 독립 사용 Gate 재검증 가능 여부 (`PAI-003` 연계)

---

## 2. 사전 조건

| # | 조건 | 확인 |
|---:|---|---|
| 1 | Fix 배포/반영 완료 (Release Notes에 Fact 기록) | ☐ |
| 2 | 테스트 계정 · Parent Report 링크(알림톡) 준비 | ☐ |
| 3 | 기기: iPhone (가능하면 Baseline과 동일 계열) | ☐ |
| 4 | 대조 기기: Android | ☐ |
| 5 | 검증자 · 일시 기록 | ☐ |

| 필드 | 값 |
|---|---|
| Fix / Release | `________________` |
| Verifier | `________________` |
| Verification Date | `________________` |
| Device (iPhone) | `________________` |
| OS | `________________` |
| Device (Android) | `________________` |

---

## 3. 환경별 체크리스트

### 3.1 iPhone · 카카오 인앱 (Primary · Baseline 재현 환경)

| # | Step | Expected (PASS 기준) | Result | Note |
|---:|---|---|---|---|
| 1 | 카카오톡에서 알림톡 링크 탭 | 인앱 브라우저로 진입 | ☐ Y / ☐ N | |
| 2 | 최초 로그인(필요 시) 후 Parent Report 열람 | Report 열람 가능 | ☐ Y / ☐ N | |
| 3 | 앱/인앱 종료 후 **동일 알림톡 링크 재진입** | `/login` **재요구 없음** (세션 유지·즉시 열람) | ☐ Y / ☐ N | |
| 4 | 재진입 시 비밀번호 재입력 필요 여부 | **불필요** | ☐ Y / ☐ N | |
| 5 | Report 내용 정상 표시 | 정상 | ☐ Y / ☐ N | |

**Primary 재현 여부:** ☐ 재현됨 (FAIL 후보) · ☐ 재현 안 됨 (PASS 후보)

### 3.2 iPhone · Safari (대조)

| # | Step | Expected (PASS 기준) | Result | Note |
|---:|---|---|---|---|
| 1 | Safari에서 동일 Report URL/링크 진입 | 열람 가능 | ☐ Y / ☐ N | |
| 2 | 종료 후 재진입 | `/login` 재요구 없음 (또는 정책상 허용된 동작) | ☐ Y / ☐ N | |
| 3 | 로그인 유지 | 유지 | ☐ Y / ☐ N | |

### 3.3 Android · 카카오 인앱 (대조 · Beta 미재현)

| # | Step | Expected (PASS 기준) | Result | Note |
|---:|---|---|---|---|
| 1 | 알림톡 링크 → 인앱 진입 | 열람 가능 | ☐ Y / ☐ N | |
| 2 | 재진입 | `/login` 재요구 없음 (Beta와 동일 패턴 유지) | ☐ Y / ☐ N | |
| 3 | 신규로 `/login` 재요구 관측 | **없어야 함** (신규 악화 시 Escalation) | ☐ 없음 / ☐ 있음 | |

---

## 4. 관측 요약 (Official Fact)

| 항목 | 값 |
|---|---|
| 알림톡 진입 | ☐ 정상 · ☐ 실패 |
| 카카오 인앱 로그인 유지 | ☐ 유지 · ☐ `/login` 재요구 |
| iPhone Safari 로그인 유지 | ☐ 유지 · ☐ `/login` 재요구 · ☐ N/A |
| Android 로그인 유지 | ☐ 유지 · ☐ `/login` 재요구 · ☐ N/A |
| 재로그인 필요 | ☐ 예 · ☐ 아니오 |
| 시도 횟수 (Primary) | `___` / `___` |
| 재현율 (Primary) | `___` / `___` (예: 0/3 = 미재현) |

**Official Fact 한 줄:**

> `________________________________________________`

**Analysis (Official Fact 아님):**

> `________________________________________________`

---

## 5. 판정 기준 (PASS / FAIL)

| 판정 | 조건 (모두 충족) |
|---|---|
| **PASS** | Primary(카카오 인앱 + 알림톡 재진입)에서 `/login` 재요구 **미재현** · 재현율 목표 충족(권장 **0/N**, N≥3) · Android **신규 악화 없음** · Release Notes에 Fix Fact 기록 |
| **FAIL** | Primary에서 `/login` 재요구 **재현** · 또는 Android 신규 재현 · 또는 Report 열람 불가 |
| **INCONCLUSIVE** | 환경 미비 · 시도 횟수 부족 · Fix 미배포 |

```text
[ ] PASS
[ ] FAIL
[ ] INCONCLUSIVE
```

| 필드 | 값 |
|---|---|
| **최종 판정** | `________________` |
| **판정일** | `________________` |
| **승인자** | `________________` |

---

## 6. 판정 후 Action

### PASS 시

1. `BETA-ISSUE-001` 상태 갱신 후보 → PM 승인 후 **CLOSED (Verified)**
2. `PAI-001` → ✅ CLOSED
3. `PAI-003` → Action Items·Tracker에서 **ACTIVE로 상태 전환** 후 Parent Gate 재검증 **개시** (자동 완료 선언 금지)
4. `PRODUCTION_RELEASE_NOTES.md` · `PRODUCTION_INCIDENTS.md` 반영
5. Tracker / Action Items / Ledger 갱신
6. Production Day-01 KPI 시작 (상태 전환 반영 후)

### FAIL 시

1. `BETA-ISSUE-001` **OPEN 유지**
2. Official Fact를 Incident에 추가
3. Fix 재작업 · 본 체크리스트 재실행
4. Production 운영은 **GO with Open Issue** 유지

### INCONCLUSIVE 시

1. 사전 조건 보완 후 재검증
2. ISSUE 상태 변경 금지

---

## 7. Parent Gate 연계 (`PAI-003`)

Fix Verification **PASS 이후에만** 실행한다.

| Gate | 질문 의도 | Result |
|---|---|---|
| 이해 | 리포트 이해 | ☐ Y / ☐ N |
| 자녀 이해 | 자녀 상태 이해 | ☐ Y / ☐ N |
| 재사용 | 다시 볼 의향 | ☐ Y / ☐ N |
| 독립 사용 | 설명 없이 사용 가능 | ☐ Y / ☐ N |

**목표:** 독립 사용 **Y** (Beta Week-2는 N)

---

## 8. 관련 문서

| 문서 | 역할 |
|---|---|
| `../beta_ops/issues/BETA-ISSUE-001.json` | Issue SoT |
| `PRODUCTION_ACTION_ITEMS.md` | PAI-001 / PAI-003 |
| `PRODUCTION_RUN_SHEET.md` | Known Issues · Escalation |
| `PRODUCTION_RELEASE_NOTES.md` | Fix 배포 Fact |
| `PRODUCTION_INCIDENTS.md` | 재현/실패 로그 |

---

**Prepared:** Engineering Track A  
**Updated:** 2026-07-21  
**Gate:** Fix Pending → Release Notes(배포 Fact) → Verification 실행 → PASS/FAIL  
**Blocked until:** Fix 배포 Official Fact 확보  
**Next (Fix 후):** Release Notes 기록 → §2~§5 실행 → 판정 → PAI-003 또는 OPEN 유지
