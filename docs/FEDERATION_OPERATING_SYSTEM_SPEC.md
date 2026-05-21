# Federation Operating System — 설계 지시문 (Cursor / 개발 착수용)

> **용도**: 이 문서를 Cursor 채팅에 붙여 넣거나 `@docs/FEDERATION_OPERATING_SYSTEM_SPEC.md` 로 참조해 **협회 운영(팀·회비·대회·회계)** 기능을 구현한다.  
> **범위**: 기존 YAGO 협회(Federation) 도메인 위에 **팀 기반 운영 + Transaction 중심 회계** 레이어를 추가한다.

---

## 목표

기존 콘텐츠/소개 중심 시스템 위에 다음을 구축한다.

- **팀 기반 협회 운영** (회원은 협회 직속이 아니라 **팀 소속**)
- **회비·대회·행사·위탁(프로그램)** 을 **하나의 회계 흐름**으로 묶기
- **모든 입출금은 `transactions` 로 통합** (누락 금지)
- Firestore는 **협회(slug) 단위 하위 서브컬렉션**으로 **flat**하게 유지 (깊은 중첩 지양)

---

## 핵심 설계 철학

1. 회원의 1차 소속은 **팀**이다.
2. 모든 돈의 기록은 **`FederationTransaction`** 한 컬렉션으로 수렴한다.
3. 회비·대회·행사·프로그램은 **도메인 필드 + relatedRef** 로 연결한다.
4. 금액은 **정수 `number` (원 단위)** 만 사용한다.
5. 상태값은 **문자열 enum** 으로 고정하고, 클라이언트/서버/규칙에서 동일하게 쓴다.

---

## 도메인 모델 (TypeScript)

### 1. Team

```ts
export type FederationTeamAgeGroup = "20_30" | "40" | "50" | "60" | "other";
export type FederationTeamCategory = "club" | "reserve";

export interface FederationTeam {
  id: string;
  name: string; // 예: 노원FC 40대
  ageGroup: FederationTeamAgeGroup;
  category: FederationTeamCategory;
  /** 기본 연회비 (원), 예: 2_500_000 */
  annualFeeAmount: number;
  isActive: boolean;
  createdAt: string; // ISO 8601 권장
}
```

### 2. Team Member

```ts
export type FederationTeamMemberRole = "player" | "coach" | "manager" | "staff";
export type FederationTeamMemberStatus = "active" | "inactive";

export interface FederationTeamMember {
  id: string;
  teamId: string;
  name: string;
  role: FederationTeamMemberRole;
  phone?: string;
  status: FederationTeamMemberStatus;
}
```

### 3. Team Fee Account (연도별 회비)

```ts
export type TeamFeePaymentPlan = "lump_sum" | "monthly";
export type TeamFeeAccountStatus = "unpaid" | "partial" | "paid";

export interface TeamFeeAccount {
  id: string;
  teamId: string;
  year: number;

  annualFeeAmount: number;
  paymentPlan: TeamFeePaymentPlan;

  /** lump_sum → 1, monthly → 12 */
  expectedInstallments: number;

  /** 청구·기대 금액 (운영 정책에 따라 annualFeeAmount 와 동일하거나 분할 합계) */
  billedAmount: number;
  paidAmount: number;

  status: TeamFeeAccountStatus;
}
```

### 4. Team Fee Payment

```ts
export type TeamFeePaymentMethod = "cash" | "bank_transfer" | "card";

export interface TeamFeePayment {
  id: string;
  teamId: string;
  year: number;

  /** 월납일 때 1~12, 일시불이면 생략 또는 1 */
  installmentNo?: number;

  amount: number;
  paidAt: string; // ISO 8601
  method?: TeamFeePaymentMethod;

  memo?: string;
  createdByUid: string;
}
```

### 5. Competition

```ts
export type FederationCompetitionKind = "regular" | "league" | "friendly";
export type FederationCompetitionStatus = "planned" | "open" | "closed" | "settled";

export interface FederationCompetition {
  id: string;
  name: string;
  year: number;

  kind: FederationCompetitionKind;

  /** 첫 참가 기본료 (원), 예: 200_000 */
  teamBaseFee: number;
  /** 추가 참가당 (원), 예: 100_000 */
  extraTeamFee: number;

  status: FederationCompetitionStatus;
}
```

### 6. Competition Entry

```ts
export type CompetitionEntryStatus = "unpaid" | "partial" | "paid";

export interface CompetitionEntry {
  id: string;
  competitionId: string;
  teamId: string;

  /** 참가 횟/팀 수 등 정책에 맞는 카운트 */
  entryCount: number;

  baseFeeAmount: number;
  extraFeeAmount: number;
  totalFeeAmount: number;

  paidAmount: number;
  status: CompetitionEntryStatus;
}
```

### 7. Event

```ts
export type FederationEventType = "kickoff" | "closing" | "outing" | "event";
export type FederationEventStatus = "planned" | "done" | "settled";

export interface FederationEvent {
  id: string;
  name: string;
  type: FederationEventType;
  date: string; // ISO date
  status: FederationEventStatus;
}
```

### 8. Program (유소년·위탁 등)

```ts
export type FederationProgramType = "youth_class" | "government";
export type FederationProgramStatus = "planned" | "running" | "closed";

export interface FederationProgram {
  id: string;
  name: string;
  type: FederationProgramType;
  sponsorOrg?: string;
  year: number;
  status: FederationProgramStatus;
}
```

### 9. Transaction (핵심)

```ts
export type FederationTransactionType = "income" | "expense";

export type FederationTransactionDomain =
  | "team_fee"
  | "competition"
  | "event"
  | "league"
  | "program"
  | "sponsor"
  | "donation";

export type FederationTransactionRelatedKind =
  | "team"
  | "fee_payment"
  | "competition"
  | "competition_entry"
  | "event"
  | "program";

export interface FederationTransaction {
  id: string;

  type: FederationTransactionType;
  domain: FederationTransactionDomain;

  /** UI·리포트용 세부 분류 (자유 문자열이되 팀 내부 합의된 코드 권장) */
  category: string;

  amount: number; // 원, 정수, income 양수 / expense 양수(표시 시 부호만 UI에서) 등 정책 통일
  occurredAt: string; // ISO 8601

  relatedRef?: {
    kind: FederationTransactionRelatedKind;
    id: string;
  };

  memo?: string;
  createdByUid: string;
}
```

---

## Firestore 경로 (서브컬렉션)

모든 운영 데이터는 **동일 협회 문서** 아래에 둔다.

```text
federations/{federationSlug}/teams/{teamId}
federations/{federationSlug}/teamMembers/{memberId}
federations/{federationSlug}/teamFeeAccounts/{accountId}
federations/{federationSlug}/teamFeePayments/{paymentId}
federations/{federationSlug}/competitions/{competitionId}
federations/{federationSlug}/competitionEntries/{entryId}
federations/{federationSlug}/events/{eventId}
federations/{federationSlug}/programs/{programId}
federations/{federationSlug}/transactions/{txId}
```

**문서 ID 권장**

- `teamFeeAccounts`: `{teamId}_{year}` (멱등 생성·조회 용이) 또는 자동 ID + 필드로 `teamId`+`year` 유니크 제약은 Rules/Cloud Function에서 보강.
- 그 외: 기본적으로 Firestore 자동 ID.

---

## 핵심 로직

### 1. 연초 회비 계정 자동 생성

```ts
function generateYearlyFeeAccounts(
  teams: FederationTeam[],
  year: number,
  defaultAnnualFee = 2_500_000
): Omit<TeamFeeAccount, "id">[] {
  return teams
    .filter((t) => t.isActive)
    .map((team) => ({
      teamId: team.id,
      year,
      annualFeeAmount: team.annualFeeAmount ?? defaultAnnualFee,
      paymentPlan: "lump_sum",
      expectedInstallments: 1,
      billedAmount: team.annualFeeAmount ?? defaultAnnualFee,
      paidAmount: 0,
      status: "unpaid",
    }));
}
```

(실제 구현 시 `paymentPlan` 이 `monthly` 이면 `expectedInstallments: 12`, `billedAmount` 정책 합의 필요.)

### 2. 회비 납부 시 Transaction 필수 생성

```ts
function onTeamFeePaymentCreated(payment: TeamFeePayment): Omit<FederationTransaction, "id"> {
  return {
    type: "income",
    domain: "team_fee",
    category: "team_fee_payment",
    amount: payment.amount,
    occurredAt: payment.paidAt,
    relatedRef: { kind: "fee_payment", id: payment.id },
    memo: payment.memo,
    createdByUid: payment.createdByUid,
  };
}
```

- **Cloud Function** `onFederationTeamFeePaymentCreate`(`functions/src/federation/onTeamFeePaymentCreate.ts`)가 `teamFeePayments` 생성 시 `transactions` + `teamFeeAccounts` 집계를 처리한다. 클라이언트는 동일 원장 패턴을 직접 쓰지 않는다(Rules 차단).
- `teamFeeAccounts.paidAmount`·`status` 갱신은 **서버 단일 경로** 권장 (클라이언트만 믿지 않음).

### 3. 대회 참가비 계산

```ts
/** entryCount: 참가 단위 수 (정책에 따라 팀 수·부 수 등) */
function calculateCompetitionFee(
  entryCount: number,
  base = 200_000,
  extraPer = 100_000
): { baseFee: number; extraFee: number; total: number } {
  const safe = Math.max(1, entryCount);
  const baseFee = base;
  const extraFee = (safe - 1) * extraPer;
  return { baseFee, extraFee, total: baseFee + extraFee };
}
```

`CompetitionEntry` 생성 시 `FederationCompetition` 의 `teamBaseFee`/`extraTeamFee` 를 사용해 위와 동일한 식으로 채운다.

---

## 1차 UI 구현 범위

### 우선순위 1 — 팀 / 회비

- 팀 목록 / 생성·비활성
- 연도별 `teamFeeAccounts` 목록 (팀별 납부 상태)
- 납부 입력 (`teamFeePayments` + **transaction 연동**)
- 일시불 / 월납 선택 (`paymentPlan`, `expectedInstallments`)
- 미납·부분납 팀 강조

### 우선순위 2 — 대회

- 대회 생성 (`competitions`)
- 참가 팀 등록 (`competitionEntries`)
- 참가비 자동 계산
- 정산 상태 (`status`, `paidAmount`)

### 우선순위 3 — 회계 대시보드

- 기간별 `transactions` 집계: 총 수입 / 총 지출 / 잔액
- 팀 회비 수납률 (연도·팀 기준)

---

## 이번 단계에서 제외

- 세분 권한 (초기에는 **협회 사무국/ADMIN** 수준만)
- AI 자동화
- 고급 리포트·엑셀 대량 처리
- 부가세·복식부기 수준 회계

---

## 구현 순서 (권장)

1. 타입 정의 (`src/types/federationOperating.ts` 등)
2. 서비스 레이어 (`src/services/federationOperatingService.ts` — Firestore CRUD)
3. 팀 + 연도별 회비 계정
4. 회비 납부 → `transactions` + 계정 집계 (가능하면 Cloud Function)
5. 대회 + 참가 + 입금 반영
6. 회계 대시보드 (쿼리 + 단순 집계)

---

## 쿼리·성능 유의사항

- `transactions` 는 `occurredAt`, `domain`, `type` 조합으로 기간·도메인 필터가 잦다 → **복합 인덱스** 설계 필요.
- `teamFeeAccounts` 는 `year` + `teamId` 또는 `year` + `status` 조회가 잦다.
- `competitionEntries` 는 `competitionId` + `teamId` 유니크를 운영 규칙으로 강제.

---

## 관련 문서 (구현 시 함께 참조)

1. [FEDERATION_OPERATING_SYSTEM_RULES.md](mdc:FEDERATION_OPERATING_SYSTEM_RULES.md) — Firestore Rules 초안, 권한·멱등성·`transactions` 검증.
2. [FEDERATION_OPERATING_SYSTEM_INDEXES.md](mdc:FEDERATION_OPERATING_SYSTEM_INDEXES.md) — 쿼리 패턴별 복합 인덱스 (`firestore.indexes.json` 병합용).
3. (예정) **FEDERATION_OPERATING_SYSTEM_UI_MAP.md** — 화면 목록, 라우트/탭, 컴포넌트 구조.

---

## 한 줄 요약

> **팀·회비·대회·행사·프로그램은 도메인 문서로 관리하고, 모든 금액 이동은 `transactions` 에 남기는 협회 운영 ERP의 뼈대를 만든다.**
