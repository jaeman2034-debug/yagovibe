# Federation Operating System — Firestore Security Rules 초안

> **용도**: 협회 운영 서브컬렉션·원장 규칙 설명 및 구현 시 참고.  
> **프로젝트 반영**: 아래 블록은 **[firestore.rules](mdc:../firestore.rules)** 의 `match /federations/{fedId}` 안에 **이미 병합**되어 있다 (헬퍼 함수는 해당 블록 **상단**, `match /executives` 직전). 배포: `firebase deploy --only firestore:rules`.

> **전제**: `isFederationManager(fedId)` / `isFederationAdminOnly(fedId)` 가 상위에 정의되어 있다.

## Cloud Function (회비 → 원장)

- **`onFederationTeamFeePaymentCreate`**: [functions/src/federation/onTeamFeePaymentCreate.ts](mdc:../functions/src/federation/onTeamFeePaymentCreate.ts) — `teamFeePayments` 생성 시 `transactions/teamFee_{paymentId}` 멱등 생성 + `teamFeeAccounts/{teamId}_{year}` 집계.
- 배포: `firebase deploy --only functions:onFederationTeamFeePaymentCreate` (또는 전체 functions).
- **클라이언트**는 `domain==team_fee` + `type==income` + `relatedRef.kind==fee_payment` 인 `transactions` 를 **생성할 수 없음** (Rules). 동일 기록은 **Function(Admin SDK)** 만 생성한다.

---

## Cursor에 같이 넣을 지시 (한 줄)

이 구현은 기존 콘텐츠/AI 기능을 건드리지 말고, `services`, `types`, `hooks`, `components`, `pages`를 분리해 점진적으로 추가하라. 특히 회비 납부 생성 시 `transactions` 문서가 반드시 함께 생성되도록 하고, 같은 납부 이벤트가 중복 기록되지 않도록 **멱등성**을 보장하라 (권장: `transactions` 문서 ID를 `teamFee_${paymentId}` 등 **결정적 ID**로 두거나, Cloud Function에서 단일 경로로만 기록).

---

## 권한 정책 (1차)

| 구분 | 읽기 | 생성 | 수정 | 삭제 |
|------|------|------|------|------|
| 운영 서브컬렉션 (팀·회비·대회·행사·프로그램) | `isFederationManager(fedId)` | 동일 | 동일 | **원칙적으로 금지** 또는 관리자만 (아래 참고) |
| `transactions` | `isFederationManager(fedId)` | `isFederationManager(fedId)` + 필드 검증 | **금지** | **금지** (append-only 원장) |
| `teamFeePayments` | 매니저 | 매니저 | **금지** (정정은 역분개 트랜잭션으로) | **금지** |
| `teamFeeAccounts` | 매니저 | 매니저 | 매니저 (집계 필드만 서버/배치 권장) | 관리자만 또는 금지 |

**삭제 정책**: 회계·감사를 위해 1차에서는 **소프트 삭제 필드(`voidedAt`, `isVoided`)** 를 타입에 추가하고 Rules에서는 `delete: false` 를 권장한다. 팀 비활성은 `FederationTeam.isActive == false`.

**공개 조회**: 팀 디렉터리를 일반 회원에게 열 경우, `teams` 만 `allow read: if true` 로 완화하고 `teamMembers`·회비·회계는 계속 매니저 전용으로 둔다.

---

## 멱등성 (회비 납부 ↔ Transaction) — 현재 구현

1. **적용됨 (서버 단일 경로)**: `onFederationTeamFeePaymentCreate` 가 `teamFeePayments` `onCreate` 시 `transactions/teamFee_{paymentId}` 를 **트랜잭션 내에서** 없을 때만 `set` 한다. 재시도·중복 실행에도 **동일 ID** 로 멱등.

2. **클라이언트 배치**로 회비+원장을 동시에 쓰는 방식은 **사용하지 않음** (해당 원장 패턴은 Rules 로 클라이언트 차단).

3. `teamFeeAccounts/{teamId}_{year}` 가 없으면 **원장만 생성**하고 집계는 스킵하며 경고 로그를 남긴다. 운영 전 연도별 계정을 먼저 생성하는 것을 권장한다.

---

## 필드 검증 개요 (요청 본문)

운영 문서 공통:

- `createdByUid` 가 있으면 `request.auth.uid` 와 일치 (또는 생략 시 Rules에서 강제 set 불가하므로 클라이언트에서만 세팅).

`FederationTransaction` (생성 시):

- 필수: `type`, `domain`, `category`, `amount`, `occurredAt`, `createdByUid`
- `type` ∈ `income` | `expense`
- `domain` ∈ 스펙의 enum 집합
- `amount` 는 **int** 이고 `> 0` (지출도 양수 저장, UI에서 부호 처리하는 정책과 맞출 것)
- `relatedRef` 가 있으면 `kind`, `id` 문자열 존재
- `team_fee` + `income` + `relatedRef.kind == fee_payment` 인 **원장 생성은 클라이언트 불가** — Cloud Function 전용

---

## `firestore.rules`에 붙일 블록 (초안)

아래를 `match /federations/{fedId} { ... }` **내부**, 기존 `match /executives` 등과 **동위**에 추가한다.

```javascript
      // ----- Federation Operating System (teams, fees, ledger) -----
      function fedOpTxType() {
        return request.resource.data.type in ["income", "expense"];
      }
      function fedOpTxDomain() {
        return request.resource.data.domain in [
          "team_fee",
          "competition",
          "event",
          "league",
          "program",
          "sponsor",
          "donation"
        ];
      }
      function fedOpRelatedOk() {
        return !request.resource.data.keys().hasAny(["relatedRef"]) ||
          (
            request.resource.data.relatedRef is map &&
            request.resource.data.relatedRef.keys().hasAll(["kind", "id"]) &&
            request.resource.data.relatedRef.kind is string &&
            request.resource.data.relatedRef.id is string
          );
      }
      /** 회비 수입 + 납부 연결은 클라이언트에서 생성 불가 (Cloud Function 전용) */
      function fedOpClientTeamFeeIncomeFromPayment() {
        return request.resource.data.domain == "team_fee" &&
          request.resource.data.type == "income" &&
          request.resource.data.keys().hasAny(["relatedRef"]) &&
          request.resource.data.relatedRef is map &&
          request.resource.data.relatedRef.keys().hasAny(["kind"]) &&
          request.resource.data.relatedRef.kind == "fee_payment";
      }

      match /teams/{teamId} {
        allow read: if isFederationManager(fedId);
        allow create, update: if isFederationManager(fedId);
        allow delete: if isFederationAdminOnly(fedId);
      }

      match /teamMembers/{memberId} {
        allow read: if isFederationManager(fedId);
        allow create, update: if isFederationManager(fedId);
        allow delete: if isFederationAdminOnly(fedId);
      }

      match /teamFeeAccounts/{accountId} {
        allow read: if isFederationManager(fedId);
        allow create, update: if isFederationManager(fedId);
        allow delete: if false;
      }

      match /teamFeePayments/{paymentId} {
        allow read: if isFederationManager(fedId);
        allow create: if isFederationManager(fedId) &&
          request.resource.data.keys().hasAll(["teamId", "year", "amount", "paidAt", "createdByUid"]) &&
          request.resource.data.teamId is string &&
          request.resource.data.year is int &&
          request.resource.data.amount is int &&
          request.resource.data.amount > 0 &&
          request.resource.data.paidAt is string &&
          request.resource.data.createdByUid == request.auth.uid;
        allow update, delete: if false;
      }

      match /competitions/{competitionId} {
        allow read: if isFederationManager(fedId);
        allow create, update: if isFederationManager(fedId);
        allow delete: if isFederationAdminOnly(fedId);
      }

      match /competitionEntries/{entryId} {
        allow read: if isFederationManager(fedId);
        allow create, update: if isFederationManager(fedId);
        allow delete: if false;
      }

      match /events/{eventId} {
        allow read: if isFederationManager(fedId);
        allow create, update: if isFederationManager(fedId);
        allow delete: if isFederationAdminOnly(fedId);
      }

      match /programs/{programId} {
        allow read: if isFederationManager(fedId);
        allow create, update: if isFederationManager(fedId);
        allow delete: if isFederationAdminOnly(fedId);
      }

      match /transactions/{txId} {
        allow read: if isFederationManager(fedId);
        allow create: if isFederationManager(fedId) &&
          request.resource.data.keys().hasAll(["type", "domain", "category", "amount", "occurredAt", "createdByUid"]) &&
          fedOpTxType() &&
          fedOpTxDomain() &&
          request.resource.data.category is string &&
          request.resource.data.amount is int &&
          request.resource.data.amount > 0 &&
          request.resource.data.occurredAt is string &&
          request.resource.data.createdByUid == request.auth.uid &&
          fedOpRelatedOk() &&
          !fedOpClientTeamFeeIncomeFromPayment();
        allow update, delete: if false;
      }
```

### 적용 시 주의

1. **회비 수입 원장**은 **오직** `onFederationTeamFeePaymentCreate` 가 만든다. 클라이언트가 동일 패턴으로 `create` 하면 Rules 에서 거절된다.

2. **수동/기타 원장** (후원, 잡수입, 지출 등)은 `relatedRef` 가 없거나 `kind != "fee_payment"` 이면 매니저가 `transactions` 를 직접 `create` 할 수 있다 (필드 검증은 동일).

3. **프로덕션 전**: 에뮬레이터에서 팀 생성 → `teamFeeAccounts` 생성 → `teamFeePayments` 생성 → `transactions` 자동 생성·`teamFeeAccounts` 갱신을 확인한다.

---

## 관련 문서

- [FEDERATION_OPERATING_SYSTEM_SPEC.md](mdc:FEDERATION_OPERATING_SYSTEM_SPEC.md) — 도메인·경로·로직
- [FEDERATION_OPERATING_SYSTEM_INDEXES.md](mdc:FEDERATION_OPERATING_SYSTEM_INDEXES.md) — 복합 인덱스
- (예정) `FEDERATION_OPERATING_SYSTEM_UI_MAP.md` — 화면·라우트
