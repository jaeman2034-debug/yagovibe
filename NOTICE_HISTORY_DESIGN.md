# 🔥 공지 히스토리 / 감사 로그 설계 문서 (최종)

## 📋 목표

누가 / 언제 / 무엇을 바꿨는지 100% 추적

"왜 게시됐는가 / 왜 반려됐는가" 설명 가능

사고 발생 시 롤백 가능

## 1️⃣ 데이터 구조

### 메인 공지 문서

```typescript
notices/{noticeId} {
  title: string
  content: string
  status: 'draft' | 'pending' | 'published' | 'rejected'
  createdBy?: string (uid)
  createdAt: Timestamp
  updatedAt: Timestamp
  updatedBy?: string (uid)
  publishedAt?: Timestamp
  approvedBy?: string (uid)
  rejectedAt?: Timestamp
  rejectedBy?: string (uid)
  rejectReason?: string
}
```

### 히스토리 서브컬렉션 (핵심)

```typescript
notices/{noticeId}/history/{historyId} {
  action: 'create' | 'update' | 'request' | 'approve' | 'reject' | 'rollback'
  before?: {
    title?: string
    content?: string
    status?: string
  }
  after: {
    title: string
    content: string
    status: string
  }
  reason?: string          // 반려 사유 / 수정 사유
  actorUid: string (uid)
  actorRole: 'admin' | 'superAdmin'
  createdAt: Timestamp
}
```

## 2️⃣ 언제 히스토리를 남기나?

| 이벤트 | action | 기록 내용 |
|--------|--------|-----------|
| 최초 생성 | create | after만 |
| 임시 저장 | update | before / after |
| 게시 요청 | request | status 변경 (draft → pending) |
| 승인 | approve | status 변경 (pending → published) |
| 반려 | reject | reason 필수 (pending → rejected) |
| 롤백 | rollback | 이전 상태 복원 |

## 3️⃣ 프론트엔드 구현

### 히스토리 저장 함수

```typescript
// src/utils/noticeHistory.ts
export async function saveNoticeHistory(
  noticeId: string,
  action: NoticeHistoryAction,
  afterData: { title: string; content: string; status: string },
  actorUid: string,
  actorRole: 'admin' | 'superAdmin',
  beforeData?: { title?: string; content?: string; status?: string },
  reason?: string
): Promise<void>
```

### 사용 예시

```typescript
// 업데이트
await saveNoticeHistory(
  noticeId,
  'update',
  { title, content, status },
  user.uid,
  isSuperAdmin ? 'superAdmin' : 'admin',
  { title: beforeData.title, content: beforeData.content, status: beforeData.status }
);

// 생성
await saveNoticeHistory(
  noticeId,
  'create',
  { title, content, status },
  user.uid,
  isSuperAdmin ? 'superAdmin' : 'admin'
);
```

## 4️⃣ Firestore Rules (히스토리 보호)

```javascript
match /notices/{noticeId}/history/{historyId} {
  // 읽기: 관리자만
  allow read: if isSignedIn() && 
    exists(/databases/$(database)/documents/notices/$(noticeId)) &&
    isAssociationAdmin(
      get(/databases/$(database)/documents/notices/$(noticeId)).data.associationId
    );
  
  // 생성: 인증된 사용자 모두 (애플리케이션에서 기록)
  allow create: if isSignedIn();
  
  // 수정/삭제: 금지 (히스토리는 불변 로그)
  allow update, delete: if false;
}
```

## 5️⃣ 롤백 기능

```typescript
// src/utils/noticeHistory.ts
export async function rollbackNotice(
  noticeId: string,
  snapshot: Partial<Notice>,
  adminId: string,
  isSuperAdmin: boolean,
  reason?: string
): Promise<void>
```

## 6️⃣ 현재 시스템 상태

### ✅ 완료된 작업

1. **NoticeStatus 타입 확장**: `draft | pending | published | rejected` 추가
2. **Notice 인터페이스 확장**: 승인 관련 필드 추가
3. **useIsAssociationSuperAdmin Hook**: 생성 완료
4. **saveNoticeHistory 함수**: 제안 설계에 맞게 확장 완료
5. **NoticeEditDrawer 통합**: 히스토리 저장 로직 추가

### ⚠️ 주의사항

- 현재 시스템은 `draft | published` 2단계만 사용 중 (pending/rejected는 추후 확장)
- `useIsAssociationSuperAdmin`은 현재 `adminUids`를 fallback으로 사용 (추후 `superAdminUids` 필드 추가 가능)

## 7️⃣ 다음 단계 (선택사항)

1. **히스토리 조회 UI**: 관리자 화면에 히스토리 리스트 표시
2. **롤백 UI**: 히스토리에서 롤백 버튼 추가
3. **승인/반려 워크플로우**: pending/rejected 상태 전환 구현
4. **알림 연동**: 게시 요청/승인/반려 시 알림 발송

