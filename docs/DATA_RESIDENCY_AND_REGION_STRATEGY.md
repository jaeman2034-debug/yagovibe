# 🔥 데이터 주권 & 리전 분리 전략 (M단계 LOCK v1)

## M-0) 핵심 철학

- **리전은 팀 단위**: 한 팀의 데이터는 한 리전에만 저장
- **Auth는 글로벌, 데이터는 로컬**: Firebase Auth는 글로벌, Firestore는 리전별
- **초기엔 코드 안 나누고, 구조만 나눈다**: 점진적 마이그레이션

## M-1) Team → Region 단일 진실

### teams/{teamId} 스키마

```typescript
{
  name: string,
  plan: "free" | "pro" | "enterprise",
  seatLimit: number,
  seatUsed: number,
  
  region: string,        // 지역명 (서울, 부산 등)
  dataRegion: "us" | "eu" | "kr",  // 🔒 핵심 필드 (데이터 리전)
}
```

### 규칙

- 팀 생성 시 `dataRegion` 설정 (절대 변경 불가)
- 엔터프라이즈 계약 시 region 선택 가능
- 초기: 모든 팀 `dataRegion: "us"`

## M-2) Firestore 리전 분리 전략

### 권장 구조

```
projects/
  app-core (auth, billing, metadata, teams 메타)
  app-us   (teams(us), members, invites, logs)
  app-eu   (teams(eu), members, invites, logs)
  app-kr   (teams(kr), members, invites, logs)
```

### 초기 전략

- **초기**: `app-core` + `app-default` 하나 (모든 데이터)
- **확장 시**: 신규 팀부터 region 선택
- **기존 팀**: 그대로 유지 (필요 시 팀 단위 마이그레이션)

## M-3) Cloud Functions — Region Router

### 사용 패턴

```typescript
// joinTeam 예시
const teamSnap = await coreDb.collection("teams").doc(teamId).get();
const region = teamSnap.data()!.dataRegion;

const db = dbByRegion(region);
// 이후 모든 tx는 db 기준
```

### 함수

- `getCoreDb()`: Core Database (Auth, Billing, Teams 메타)
- `dbByRegion(region)`: Region별 Database
- `getDbForTeam(teamId)`: 팀의 리전 DB 자동 선택

## M-4) Auth & Invite 처리 원칙

### Firebase Auth

- **글로벌**: 모든 리전 공통 사용

### Invite 처리

1. `inviteId`는 리전 독립적 ID
2. `invite` lookup:
   - `coreDB` → `teamId` / `dataRegion` 확인
   - 해당 `region DB`에서 `invite` 처리
3. QR / 링크 구조 변경 없음

## M-5) 감사 로그 & 이벤트 로그 리전 처리

### auditLogs / inviteEvents

- **팀 리전 DB에 저장**: `{region}Db.collection("auditLogs")`
- **coreDB에는 요약 메타만**: `coreDb.collection("auditIndex")`

### auditIndex 스키마

```typescript
auditIndex/{indexId}
{
  teamId: string,
  region: "us" | "eu" | "kr",
  action: string,
  lastEventAt: Timestamp,
  summary: string, // 요약만 (100자)
}
```

## M-6) 데이터 주권 질문 대응

### 질문: "우리 데이터는 어디에 저장되나요?"

**답변 템플릿:**

> "귀사 팀 데이터는 {region} 리전 Firestore에만 저장되며,
> 인증 정보만 글로벌 Auth에 존재합니다.
> 
> 구체적으로:
> - 팀 정보, 멤버 데이터, 초대 토큰, 감사 로그: {region} 리전
> - 인증 정보 (이메일, 비밀번호 해시): 글로벌 Auth
> - 결제 정보: {billing_region} 리전
> 
> 데이터 복제나 크로스 리전 전송은 없습니다."

### 엔터프라이즈 계약 시

- 계약서에 `dataRegion` 명시
- 팀 생성 시 `dataRegion` 선택 가능
- 마이그레이션 서비스 제공 (필요 시)

## M-7) 점진적 마이그레이션 전략

### Phase 1: 초기 (현재)

- 모든 팀 `dataRegion: "us"`
- 단일 Firestore Database
- Region Router 코드 준비 (실제 분리 전)

### Phase 2: 확장 준비

- 신규 팀부터 `dataRegion` 선택 가능
- `createTeam`에 `dataRegion` 파라미터 추가
- 엔터프라이즈 계약 시 region 지정

### Phase 3: 실제 분리

- Firestore Database 다중 리전 생성
- `dbByRegion()` 실제 분리 구현
- 기존 팀은 그대로 유지

### Phase 4: 마이그레이션 (필요 시)

- 팀 단위 마이그레이션 서비스
- 다운타임 최소화
- 데이터 무결성 검증

## 데이터 보존 정책 (리전별)

| 데이터 | 보존 기간 | 리전 |
|--------|----------|------|
| auditLogs | 1~3년 | 팀 리전 |
| inviteEvents | 90일 | 팀 리전 |
| auth logs | Firebase 기본 | 글로벌 |
| billing | 법적 요구사항 | billing 리전 |

## 보안/법무 질문 대응

### ❓ "EU 데이터는 EU에만 있나요?"

**답변:** "네. EU 리전 팀의 모든 데이터는 EU Firestore에만 저장되며, 다른 리전으로 전송되지 않습니다."

### ❓ "데이터 복제는 어떻게 되나요?"

**답변:** "리전 간 데이터 복제는 없습니다. 각 팀의 데이터는 지정된 리전에만 존재합니다."

### ❓ "마이그레이션은 가능한가요?"

**답변:** "네. 팀 단위로 리전 마이그레이션 서비스를 제공할 수 있습니다. 다운타임을 최소화하며 진행합니다."

## 최종 체크리스트

- [x] 팀에 `dataRegion` 필드 추가
- [x] Region Router 유틸 생성
- [x] Audit Log 리전별 저장 구조
- [x] 데이터 주권 대응 문서화
- [x] 점진적 마이그레이션 전략 수립

## 다음 단계 (필요 시)

1. Firestore Database 다중 리전 실제 생성
2. `dbByRegion()` 실제 분리 구현
3. 엔터프라이즈 계약 시 `dataRegion` 선택 UI
4. 마이그레이션 서비스 구현

