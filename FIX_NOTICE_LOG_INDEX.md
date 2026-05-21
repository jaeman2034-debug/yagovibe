# NoticeLogSection 인덱스 생성 가이드

## 🔴 문제 확인

**에러 메시지:**
```
이력 로그 조회 오류: FirebaseError: The query requires an index.
```

**원인:**
`NoticeLogSection.tsx`에서 다음 쿼리를 사용하고 있습니다:

```typescript
const q = query(
  logsRef,
  where("noticeId", "==", noticeId),
  orderBy("timestamp", "desc")
);
```

Firestore는 `where` 절과 다른 필드의 `orderBy`를 함께 사용할 때 **복합 인덱스**를 요구합니다.

---

## ✅ 해결 방법

### 방법 1: Firebase Console에서 인덱스 생성 (권장)

1. **콘솔 에러 메시지에서 링크 클릭**
   - 브라우저 콘솔에 표시된 링크를 클릭하면 Firebase Console로 이동합니다.
   - 예: `https://console.firebase.google.com/v1/r/project/yago-vibe-spt/firestore/indexes/...`

2. **또는 수동으로 생성**
   - Firebase Console → Firestore Database → Indexes 탭
   - "Create Index" 버튼 클릭
   - 다음 정보 입력:
     - **Collection ID**: `audit_logs`
     - **Fields to index**:
       - `noticeId` (Ascending)
       - `timestamp` (Descending)
     - **Query scope**: Collection (기본값)

3. **인덱스 생성 대기**
   - 인덱스 생성에는 몇 분이 소요될 수 있습니다.
   - 생성 완료 후 자동으로 쿼리가 작동합니다.

---

### 방법 2: 코드 수정 (임시 해결책)

인덱스를 생성할 수 없는 경우, 클라이언트 측에서 정렬할 수 있습니다:

```typescript
// ❌ 인덱스 필요 (서버 측 정렬)
const q = query(
  logsRef,
  where("noticeId", "==", noticeId),
  orderBy("timestamp", "desc")
);

// ✅ 인덱스 불필요 (클라이언트 측 정렬)
const q = query(
  logsRef,
  where("noticeId", "==", noticeId)
);
const snapshot = await getDocs(q);
const logsData = snapshot.docs
  .map((doc) => ({ id: doc.id, ...doc.data() }))
  .sort((a, b) => b.timestamp.toMillis() - a.timestamp.toMillis());
```

**단점:**
- 모든 문서를 클라이언트로 가져와야 함
- 문서가 많을 경우 성능 저하
- 권장하지 않음 (인덱스 생성 권장)

---

## 📋 인덱스 스펙

**Collection:** `associations/{associationId}/audit_logs`

**Fields:**
- `noticeId` (Ascending)
- `timestamp` (Descending)

**Query scope:** Collection

---

## 🧪 테스트 확인

인덱스 생성 후:
1. 페이지 새로고침
2. 콘솔 에러 확인 (인덱스 에러가 사라져야 함)
3. 이력 로그 섹션이 정상적으로 표시되는지 확인

---

## 💡 추가 참고사항

- 인덱스 생성은 **무료**이며, 쿼리 성능을 크게 향상시킵니다.
- 인덱스는 한 번 생성하면 계속 사용할 수 있습니다.
- 비슷한 쿼리 패턴이 있으면 같은 인덱스를 재사용할 수 있습니다.

