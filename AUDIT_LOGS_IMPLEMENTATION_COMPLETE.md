# 🔥 AuditLogs 고도화 완료 (운영 스케일의 핵심)

## ✅ 구현 완료 사항

### 1️⃣ AuditLogs 타입 정의 (`src/types/audit.ts`)
- ✅ `AuditAction`: 모든 액션 타입 정의
- ✅ `AuditLog`: 로그 구조 정의
- ✅ `CreateAuditLogParams`: 기록 파라미터 타입

### 2️⃣ 서버 전용 기록 유틸 (`functions/src/utils/auditLog.ts`)
- ✅ `writeAuditLog()`: 서버에서만 기록
- ✅ `extractRequestInfo()`: IP, UserAgent 추출
- ✅ append-only (수정/삭제 없음)
- ✅ 실패해도 비즈니스 로직 영향 없음 (에러 로깅만)

### 3️⃣ 주요 액션에 Hook 연결

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

### 4️⃣ 조회 훅 (`src/hooks/useAuditLogs.ts`)
- ✅ 최근 50개 조회 (기본)
- ✅ 페이지네이션 지원
- ✅ admin만 조회 가능 (Firestore Rules)

### 5️⃣ Firestore Rules (이미 완료)
```javascript
match /teams/{teamId}/auditLogs/{logId} {
  allow read: if isAdmin(teamId);
  allow write: if false; // 서버 only
}
```

### 6️⃣ Firestore 인덱스
- ✅ `auditLogs` 컬렉션에 `createdAt DESC` 인덱스 추가

## 📐 Firestore 구조

```
/teams/{teamId}/auditLogs/{logId}
  - action: "TEAM_CREATED" | "MEMBER_ADDED" | ...
  - actorUid: string
  - actorRole: "admin" | "member"
  - targetUid?: string
  - meta?: { ... }
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

## 🎯 액션 타입 정본

```typescript
type AuditAction =
  | "TEAM_CREATED"
  | "TEAM_UPDATED"
  | "MEMBER_ADDED"
  | "MEMBER_REMOVED"
  | "ROLE_CHANGED"
  | "PLAN_CHANGED"
  | "LOGIN"
  | "LOGOUT"
  | "SETTINGS_UPDATED"
  | "FEE_CREATED"
  | "FEE_PAID"
  | "ATTENDANCE_RECORDED"
  | "REPORT_GENERATED";
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

## 📋 다음 단계 (추가 연결 가능 액션)

- [ ] 팀 설정 변경 (TEAM_UPDATED)
- [ ] 멤버 제거 (MEMBER_REMOVED)
- [ ] 플랜 변경 (PLAN_CHANGED) - 결제 시
- [ ] 회비 생성/납부 (FEE_CREATED, FEE_PAID)
- [ ] 출석 기록 (ATTENDANCE_RECORDED)

## 🔗 파생 기능 (나중에)

1. **Slack 알림**
   - AuditLogs 기반 실시간 알림

2. **Email 리포트**
   - 주간/월간 AuditLogs 요약

3. **Admin Dashboard**
   - AuditLogs 통계 및 분석

---

**구현 완료**: 운영 가능한 SaaS 백본 완성! 🎉

**상태**: "운영 가능한 SaaS 백본" 완성 직전 → 완성 ✅
