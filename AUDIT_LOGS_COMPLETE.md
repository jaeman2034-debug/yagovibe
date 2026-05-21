# 🔥 AuditLogs 고도화 완료 (운영 스케일의 핵심)

## ✅ 구현 완료 사항

### 1️⃣ AuditLogs 타입 정의 (`src/types/audit.ts`)
- ✅ `AuditAction`: 모든 액션 타입 정의
- ✅ `AuditLog`: 로그 구조 정의
- ✅ `AuditRole`: "admin" | "manager" | "member"

### 2️⃣ 서버 전용 기록 유틸 (`functions/src/utils/auditLog.ts`)
- ✅ `writeAuditLog()`: 서버에서만 기록
- ✅ `extractRequestInfo()`: IP, UserAgent 추출
- ✅ append-only (수정/삭제 없음)
- ✅ 실패해도 비즈니스 로직 영향 없음 (에러 로깅만)

### 3️⃣ 주요 액션에 Hook 연결 ✅

#### ✅ createTeam (팀 생성)
```typescript
await writeAuditLog({
  teamId,
  action: "TEAM_CREATED",
  actorUid: uid,
  actorRole: "admin",
  meta: { teamName, sportType, region },
});
```

#### ✅ joinTeam (팀 가입)
```typescript
await writeAuditLog({
  teamId,
  action: "MEMBER_ADDED",
  actorUid: uid,
  actorRole: "member",
  targetUid: uid,
});
```

#### ✅ updateMemberRole (역할 변경)
```typescript
await writeAuditLog({
  teamId,
  action: "ROLE_CHANGED",
  actorUid: callerUid,
  actorRole: callerRole,
  targetUid,
  meta: { oldRole, newRole },
});
```

#### ✅ stripeWebhook (플랜 변경)
```typescript
await writeAuditLog({
  teamId,
  action: "PLAN_CHANGED",
  actorUid: adminUid,
  actorRole: "admin",
  meta: { oldPlan, newPlan, stripeEvent },
});
```

### 4️⃣ 조회 훅 (`src/hooks/useAuditLogs.ts`)
- ✅ 최근 50개 조회 (기본)
- ✅ 페이지네이션 지원
- ✅ admin만 조회 가능 (Firestore Rules)

### 5️⃣ Firestore Rules ✅ (이미 완료)
```javascript
match /teams/{teamId}/auditLogs/{logId} {
  allow read: if isAdmin(teamId);
  allow write: if false; // 서버 only
}
```

### 6️⃣ Firestore 인덱스 ✅
- ✅ `auditLogs` 컬렉션에 `createdAt DESC` 인덱스 추가

## 📐 Firestore 구조 (정본)

```
/teams/{teamId}/auditLogs/{logId}
  - action: "TEAM_CREATED" | "MEMBER_ADDED" | ...
  - actorUid: string              // 누가
  - actorRole: "admin" | "member" // 역할
  - targetUid?: string            // 대상 유저 (있을 때만)
  - meta?: { ... }                // 가변 메타데이터 (얕게)
  - ip?: string
  - userAgent?: string
  - createdAt: Timestamp
```

## 🔑 설계 원칙 (불변 규칙)

1. **append-only** (수정/삭제 없음)
2. **팀 단위 분리** (크로스 팀 조회 ❌)
3. **meta는 얕게** (중첩 깊이 ❌)
4. **사실만 기록** (문장/감정/UI 문구 ❌)
5. **서버에서만 기록** (클라이언트 직접 기록 ❌)

## 🎯 액션 타입 정본 (초기 셋)

```typescript
type AuditAction =
  | "TEAM_CREATED"        // ✅ 연결 완료
  | "TEAM_UPDATED"
  | "MEMBER_ADDED"        // ✅ 연결 완료
  | "MEMBER_REMOVED"
  | "ROLE_CHANGED"        // ✅ 연결 완료
  | "PLAN_CHANGED"        // ✅ 연결 완료
  | "LOGIN"
  | "LOGOUT"
  | "SETTINGS_UPDATED"
  | "FEE_CREATED"
  | "FEE_PAID"
  | "ATTENDANCE_RECORDED"
  | "REPORT_GENERATED";
```

## 🚀 사용 예제

### 서버 함수에서 기록
```typescript
import { writeAuditLog, extractRequestInfo } from "./utils/auditLog";

await writeAuditLog({
  teamId,
  action: "MEMBER_ADDED",
  actorUid: adminUid,
  actorRole: "admin",
  targetUid: newMemberUid,
  meta: { memberName: "홍길동" },
  ...extractRequestInfo(req),
});
```

### 클라이언트에서 조회
```typescript
import { useAuditLogs } from "@/hooks/useAuditLogs";

function AuditLogsPage() {
  const { teamId } = useParams();
  const { logs, loading, hasMore, loadMore } = useAuditLogs({ teamId });

  if (loading) return <Loading />;

  return (
    <div>
      {logs.map((log) => (
        <AuditLogItem key={log.id} log={log} />
      ))}
      {hasMore && <button onClick={loadMore}>더 보기</button>}
    </div>
  );
}
```

## ⚡ 최적화 포인트

### 1. Firestore Read 최소화
- ✅ 기본 조회: 최근 50개
- ✅ 페이지네이션: 필요한 만큼만
- ✅ 인덱스: createdAt DESC

### 2. 비용 통제
- ✅ 사용자 액션만 기록
- ✅ 렌더/조회/자동 작업 ❌
- ✅ 팀 단위 분리 (크로스 팀 조회 불가)

### 3. 운영 효율
- ✅ 사실만 기록 (분석 가능)
- ✅ meta 얕게 (쿼리 최적화)
- ✅ append-only (무결성 보장)

## 📋 완료 체크리스트

- [x] auditLogs 구조 생성
- [x] 서버 유틸 함수 하나로 통일
- [x] Rules read-only(admin)
- [x] 주요 액션에 hook 연결
  - [x] TEAM_CREATED (createTeam)
  - [x] MEMBER_ADDED (joinTeam)
  - [x] ROLE_CHANGED (updateMemberRole)
  - [x] PLAN_CHANGED (stripeWebhook)
- [x] Firestore 인덱스 추가
- [x] 조회 훅 (useAuditLogs)

## 🔗 다음 단계 (추가 연결 가능 액션)

- [ ] 팀 설정 변경 (TEAM_UPDATED)
- [ ] 멤버 제거 (MEMBER_REMOVED)
- [ ] 회비 생성/납부 (FEE_CREATED, FEE_PAID)
- [ ] 출석 기록 (ATTENDANCE_RECORDED)
- [ ] 리포트 생성 (REPORT_GENERATED)

## 🧠 고급 팁 (천재 포인트)

1. **AuditLogs는 "사실"만 기록**
   - 문장 ❌
   - 감정 ❌
   - UI 문구 ❌
   → action + meta 조합

2. **알림/감사는 나중에**
   - Slack / Email / Admin Dashboard
   → 전부 AuditLogs 기반 파생

3. **비용 폭발 방지**
   - 사용자 액션만 기록
   - 렌더/조회/자동 작업 ❌

---

**구현 완료**: 운영 가능한 SaaS 백본 완성! 🎉

**상태**: "운영 가능한 SaaS 백본" 완성 직전 → **완성 ✅**
