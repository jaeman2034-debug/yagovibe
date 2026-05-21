# 🔥 공지 권한 설계 문서 (Firestore Rules + UX 정합성)

## 📋 목표

UI에서 보이는 옵션 = 실제로 저장 가능한 권한

"눌렀는데 안 됨 / 왜 안 보임" 상황 완전 제거

## 1️⃣ 현재 시스템 구조

### 권한 모델

- **일반 사용자**: 공지 조회만 가능
- **Admin (협회 관리자)**: `associations/{associationId}.adminUids` 배열에 포함된 사용자
  - `draft` 상태 저장 가능
  - `published` 상태 저장 가능
  - 모든 필드 수정 가능

### 데이터 구조

```typescript
associations/{associationId} {
  adminUids: string[]  // 관리자 uid 배열
}

notices/{noticeId} {
  title: string
  content: string
  status: 'draft' | 'published'  // 2단계
  associationId: string
  createdBy: string (uid)
  publishedAt?: Timestamp
}
```

## 2️⃣ Firestore Rules (현재 구조 기준)

```javascript
// Helper Function
function isAssociationAdmin(associationId) {
  return request.auth != null &&
    exists(/databases/$(database)/documents/associations/$(associationId)) &&
    request.auth.uid in get(/databases/$(database)/documents/associations/$(associationId)).data.adminUids;
}

match /notices/{noticeId} {
  // 읽기: 모두 허용 (공개 공지)
  allow read: if true;
  
  // 생성: 관리자만 가능 (status 제한 없음)
  allow create: if isSignedIn() && 
    isAssociationAdmin(request.resource.data.associationId);
  
  // 수정: 관리자는 모든 수정 가능
  allow update: if isSignedIn() && (
    isAssociationAdmin(resource.data.associationId) ||
    // 일반 유저는 draft 상태이고 pinned/status 변경 없을 때만
    (
      resource.data.status == 'draft' &&
      request.resource.data.status == 'draft' &&
      resource.data.isPinned == request.resource.data.isPinned
    )
  );
  
  // 삭제: 관리자만
  allow delete: if isSignedIn() && 
    isAssociationAdmin(resource.data.associationId);
}
```

## 3️⃣ 프론트엔드 권한 체크 (UX와 Rule 일치)

```typescript
// Hook: useIsAssociationAdmin
const { isAdmin: canPublish, loading: adminLoading } = useIsAssociationAdmin(associationId);

// canPublish 계산 (Rules와 동일한 로직)
const canPublish = 
  isAdmin &&  // adminUids 배열에 포함
  title.trim().length > 0 &&  // 필수 필드
  content.trim().length > 0;  // 필수 필드
```

## 4️⃣ UX 규칙 (Rules와 1:1 일치)

### ✅ 정상 동작

- `canPublish === true` → 게시 라디오 버튼 활성화 + 게시하기 버튼 활성화
- `canPublish === false` → 게시 라디오 버튼 비활성화 + 게시하기 버튼 비활성화 + 사유 표시

### ❌ 비정상 동작 (확인이 필요한 케이스)

- `canPublish === true`인데 게시 버튼이 안 보임
  → `adminUids` 배열 또는 Hook 오류
- `canPublish === true`인데 클릭 시 Firestore 에러
  → Rules와 프론트엔드 권한 체크 불일치

## 5️⃣ 확인 체크리스트

### ① Firestore 데이터

```
associations/assoc-nowon-football {
  "adminUids": ["내 uid"]  // 배열 형태로 확인
}
```

### ② 콘솔 로그

```javascript
console.log({
  canPublish,
  isAdmin,
  adminLoading,
  hasTitle,
  hasContent,
});
```

### ③ Rules 에러 확인

- `FirebaseError: Missing or insufficient permissions`
  → 권한 설계가 UI보다 엄격한 경우
  → `adminUids` 배열에 UID가 정확히 포함되어 있는지 확인

## 6️⃣ 핵심 원칙

1. **UI와 Rules 일치**: 프론트엔드의 `canPublish` 로직과 Firestore Rules가 동일해야 함
2. **명확한 피드백**: 권한이 없을 때 이유를 반드시 표시
3. **단일 진실 소스**: 권한 판단은 `adminUids` 배열 기준으로만 수행

## 7️⃣ 다음 단계 (선택사항)

제안된 설계 (SuperAdmin 개념 추가):
- `adminUids`: 일반 관리자 (draft만)
- `superAdmins`: 최종 관리자 (published 가능)

현재 시스템에서는 모든 관리자가 `published` 가능하므로, 제안 설계로 전환하려면:
1. `superAdmins` 필드 추가
2. Rules 수정 (published는 superAdmin만)
3. UI 수정 (SuperAdmin 체크 추가)
4. 기존 데이터 마이그레이션

