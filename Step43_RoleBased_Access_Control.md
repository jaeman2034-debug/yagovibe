# Step 43: 역할 기반 UI/권한 제어 + 활동 로그 (Audit Trail)

역할 기반 접근 제어와 모든 사용자 액션을 기록하는 감사 로그 시스템을 구현합니다.

## 📋 개요

### 주요 기능

1. **역할 기반 권한 제어**
   - Owner: 모든 권한 (편집, 삭제, 역할 관리)
   - Coach: 읽기 및 코치 권한
   - Editor: 읽기 및 편집 권한
   - Viewer: 읽기 전용

2. **활동 로그 (Audit Trail)**
   - 모든 사용자 액션 기록
   - 누가, 언제, 어떤 액션을 실행했는지 추적
   - 관리자만 로그 열람 가능

3. **Firestore 구조**
   ```
   reports/{reportId}
     ├── roles/{uid} → { role: "owner" | "coach" | "editor" | "viewer" }
     └── auditLogs/{timestamp} → { uid, email, action, target, createdAt }
   ```

## 🚀 구현 파일

### 1. `src/hooks/useRoleAccess.ts`

역할 기반 권한 체크 Hook:

```typescript
import { useRoleAccess } from "@/hooks/useRoleAccess";

const { role, loading, isOwner, isEditor, canEdit, canView } = useRoleAccess(reportId);
```

**반환값:**
- `role`: 사용자 역할 ("owner" | "coach" | "editor" | "viewer" | null)
- `loading`: 로딩 상태
- `isOwner`: Owner 여부
- `isEditor`: Editor 또는 Owner 여부
- `isCoach`: Coach 여부
- `isViewer`: Viewer 이상 권한 여부
- `canEdit`: 편집 가능 여부
- `canView`: 조회 가능 여부

### 2. `src/utils/auditLog.ts`

활동 로그 기록 Helper:

```typescript
import { logUserAction, isAdminUser } from "@/utils/auditLog";

// 액션 로그 기록
await logUserAction(reportId, "generate PDF", "report.pdf");

// 관리자 권한 확인
if (isAdminUser()) {
  // 관리자만 접근 가능
}
```

### 3. `src/components/AuditLogTable.tsx`

감사 로그 테이블 컴포넌트:

```tsx
import AuditLogTable from "@/components/AuditLogTable";

<AuditLogTable reportId={reportId} />
```

## 📊 Firestore 데이터 구조

### 역할 설정

```typescript
// reports/{reportId}/roles/{uid}
{
  role: "owner" | "coach" | "editor" | "viewer"
}
```

### 활동 로그

```typescript
// reports/{reportId}/auditLogs/{timestamp}
{
  uid: string,
  email: string,
  action: string,      // 예: "generate PDF", "sync to Sheets"
  target: string,      // 예: "report.pdf", "reportId"
  createdAt: Timestamp
}
```

## 🔧 사용 방법

### 1. Dashboard에서 역할 체크

```tsx
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { logUserAction, isAdminUser } from "@/utils/auditLog";
import AuditLogTable from "@/components/AuditLogTable";

export default function AIInsightsDashboard({ reportId }: { reportId: string }) {
  const { role, loading, isOwner, isEditor, canEdit, canView } = useRoleAccess(reportId);
  const isAdmin = isAdminUser();

  if (loading) return <div>로딩 중...</div>;
  
  if (!canView) {
    return <div>접근 권한이 없습니다.</div>;
  }

  if (!canEdit) {
    return (
      <div>
        <div>읽기 전용 모드입니다.</div>
        {isAdmin && <AuditLogTable reportId={reportId} />}
      </div>
    );
  }

  return (
    <div>
      {isAdmin && <AuditLogTable reportId={reportId} />}
      {/* 대시보드 내용 */}
    </div>
  );
}
```

### 2. 액션 버튼에 로그 기록

```tsx
import { logUserAction } from "@/utils/auditLog";

<Button
  onClick={async () => {
    await logUserAction(reportId, "generate PDF", "report.pdf");
    window.open(`${origin}/generateReportPdf?reportId=${reportId}`);
  }}
>
  PDF 내보내기
</Button>
```

### 3. 역할별 조건부 렌더링

```tsx
const { isOwner, isEditor, canEdit } = useRoleAccess(reportId);

{isOwner && (
  <Button onClick={handleDelete}>삭제</Button>
)}

{canEdit && (
  <Button onClick={handleEdit}>편집</Button>
)}
```

## 🎯 역할 권한 매트릭스

| 권한 | Owner | Coach | Editor | Viewer |
|------|-------|-------|--------|--------|
| 읽기 | ✅ | ✅ | ✅ | ✅ |
| 편집 | ✅ | ❌ | ✅ | ❌ |
| 삭제 | ✅ | ❌ | ❌ | ❌ |
| 역할 관리 | ✅ | ❌ | ❌ | ❌ |
| 로그 열람 | ✅ (관리자) | ❌ | ❌ | ❌ |

## 📝 역할 설정 방법

### Firestore Console에서 수동 설정

1. Firestore Console 열기
2. `reports/{reportId}/roles/{uid}` 경로로 이동
3. 문서 생성:
   ```json
   {
     "role": "editor"
   }
   ```

### Cloud Function으로 자동 설정 (선택)

```typescript
// functions/src/setReportRole.ts
import { onCall } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

export const setReportRole = onCall(
  { region: "asia-northeast3" },
  async (request) => {
    const { reportId, userId, role } = request.data;
    const callerId = request.auth?.uid;

    // Owner만 역할 설정 가능
    const callerRole = await getRole(reportId, callerId);
    if (callerRole !== "owner") {
      throw new Error("권한이 없습니다.");
    }

    await admin.firestore()
      .collection("reports")
      .doc(reportId)
      .collection("roles")
      .doc(userId)
      .set({ role });

    return { success: true };
  }
);
```

## 🔍 관리자 권한 확인

### 이메일 기반 관리자 체크

```typescript
// src/utils/auditLog.ts
export function isAdminUser(): boolean {
  const user = auth.currentUser;
  if (!user || !user.email) return false;

  const ADMIN_EMAILS = [
    "admin@yagovibe.com",
    "admin@yago-vibe.com",
  ];

  return ADMIN_EMAILS.includes(user.email) || user.email.includes("admin");
}
```

### 커스텀 클레임 사용 (선택)

```typescript
// Firebase Functions에서 설정
await admin.auth().setCustomUserClaims(uid, { admin: true });

// 프론트엔드에서 확인
const token = await user.getIdTokenResult();
if (token.claims.admin) {
  // 관리자
}
```

## 📊 활동 로그 예시

### 로그 기록 예시

```typescript
// PDF 생성
await logUserAction(reportId, "generate PDF", "report.pdf");

// EPUB 생성
await logUserAction(reportId, "generate EPUB", "report.epub");

// Sheets 동기화
await logUserAction(reportId, "sync to Sheets", "");

// 배치 처리
await logUserAction(reportId, "enqueue batch processing", reportId);
```

### 로그 테이블 출력

```
시간                    | 사용자              | 액션                      | 대상
----------------------|-------------------|--------------------------|----------
2024-01-15 14:30:25  | user@example.com  | generate PDF            | report.pdf
2024-01-15 14:28:10  | user@example.com  | sync to Sheets          | -
2024-01-15 14:25:00  | admin@yagovibe.com| enqueue batch processing| abc123
```

## 🛡️ 보안 고려사항

### 1. 서버 사이드 검증

- 클라이언트에서만 권한 체크하지 않기
- Firebase Functions에서도 역할 확인
- Firestore Security Rules 설정

### 2. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 역할 읽기: 자신의 역할만 읽기 가능
    match /reports/{reportId}/roles/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Cloud Function에서만 쓰기
    }

    // 활동 로그: 관리자만 읽기 가능
    match /reports/{reportId}/auditLogs/{logId} {
      allow read: if request.auth != null && 
                     (request.auth.token.email.matches('.*@yagovibe\\.com$') ||
                      request.auth.token.email.matches('.*admin.*'));
      allow create: if request.auth != null;
      allow update, delete: if false;
    }
  }
}
```

## 🐛 문제 해결

### 역할이 로드되지 않을 때

1. **Firestore 데이터 확인**: `reports/{reportId}/roles/{uid}` 문서 존재 확인
2. **인증 상태 확인**: 사용자가 로그인되어 있는지 확인
3. **콘솔 확인**: 브라우저 개발자 도구에서 오류 메시지 확인

### 활동 로그가 기록되지 않을 때

1. **인증 확인**: `auth.currentUser`가 null이 아닌지 확인
2. **Firestore 권한 확인**: Security Rules에서 `create` 권한 확인
3. **네트워크 확인**: 브라우저 개발자 도구 Network 탭 확인

### 관리자 권한이 작동하지 않을 때

1. **이메일 확인**: `isAdminUser()` 함수의 이메일 목록 확인
2. **로그인 상태**: 사용자가 다시 로그인했는지 확인 (토큰 갱신 필요)
3. **커스텀 클레임**: 사용 시 토큰 갱신 필요 (`user.getIdToken(true)`)

## 📚 다음 단계

- Step 44: 역할 관리 UI (역할 추가/수정/삭제)
- Step 45: 실시간 협업 기능 (여러 사용자 동시 편집)
- Step 46: 알림 시스템 (역할 변경, 액션 완료 알림)

