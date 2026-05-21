# Federation Operating System — Firestore 복합 인덱스 설계

> **용도**: 협회 운영 쿼리용 복합 인덱스 설명.  
> **프로젝트 반영**: 동일 항목이 **[firestore.indexes.json](mdc:../firestore.indexes.json)** 에 **병합**됨. 배포: `firebase deploy --only firestore:indexes`.  
> **경로**: 모든 컬렉션은 `federations/{federationSlug}/…` 아래 **동일 서브컬렉션 이름**을 쓰므로, 쿼리는 **`collection()` 단일 협회** 또는 나중 **collectionGroup** 확장 모두를 고려한다.

---

## 쿼리 패턴 → 인덱스

| 화면/기능 | 쿼리 개요 | 인덱스 (collectionGroup) |
|-----------|-----------|---------------------------|
| 회계 대시보드 (기간) | `transactions` `where type == 'income'` + `orderBy occurredAt desc` | `type` ASC + `occurredAt` DESC |
| 회계 (도메인별) | `where domain == 'team_fee'` + `orderBy occurredAt desc` | `domain` ASC + `occurredAt` DESC |
| 연도별 회비 현황 | `teamFeeAccounts` `where year == 2026` + `orderBy status` / `teamId` | `year` ASC + `status` ASC (+ 필요 시 `teamId`) |
| 팀별 회비 계정 | `where teamId == x` + `orderBy year desc` | `teamId` ASC + `year` DESC |
| 팀 납부 내역 | `teamFeePayments` `where teamId == x` + `where year == y` + `orderBy paidAt desc` | `teamId` ASC + `year` ASC + `paidAt` DESC |
| 대회별 참가 목록 | `competitionEntries` `where competitionId == c` + `orderBy teamId` | `competitionId` ASC + `teamId` ASC |
| 팀 목록 (활성만) | `teams` `where isActive == true` + `orderBy name` | `isActive` ASC + `name` ASC |

단일 필드 `where`/`orderBy` 만 쓰는 경우는 Firestore **자동 단일 필드 인덱스**로 충분한 경우가 많다. 위 표는 **복합**이 필요한 조합만 나열한다.

---

## `firestore.indexes.json` 에 추가할 조각

기존 `"indexes": [ ... ]` 배열 **안에** 아래 객체들을 **추가**한다. (`collectionGroup` 은 서브컬렉션 **이름**만 적는다.)

```json
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "type", "order": "ASCENDING" },
        { "fieldPath": "occurredAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "transactions",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "domain", "order": "ASCENDING" },
        { "fieldPath": "occurredAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teamFeeAccounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "year", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "teamFeeAccounts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "teamFeePayments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "teamId", "order": "ASCENDING" },
        { "fieldPath": "year", "order": "ASCENDING" },
        { "fieldPath": "paidAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "competitionEntries",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "competitionId", "order": "ASCENDING" },
        { "fieldPath": "teamId", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "teams",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isActive", "order": "ASCENDING" },
        { "fieldPath": "name", "order": "ASCENDING" }
      ]
    }
```

### 배포

```bash
firebase deploy --only firestore:indexes
```

콘솔에서 링크된 인덱스 빌드가 끝난 뒤 쿼리를 실행한다.

---

## collectionGroup 쿼리로 확장할 때

플랫폼 전체 “모든 협회 합산” 대시보드가 필요하면 `queryScope` 를 `COLLECTION_GROUP` 으로 바꾼 **별도 인덱스 항목**을 추가하고, 클라이언트에서 `collectionGroup(db, "transactions")` + `where('…')` 조합에 맞춰 인덱스를 다시 맞춘다. 1차 구현은 **협회 slug 고정 경로** 쿼리만으로도 충분하다.

---

## 관련 문서

- [FEDERATION_OPERATING_SYSTEM_SPEC.md](mdc:FEDERATION_OPERATING_SYSTEM_SPEC.md)
- [FEDERATION_OPERATING_SYSTEM_RULES.md](mdc:FEDERATION_OPERATING_SYSTEM_RULES.md)
