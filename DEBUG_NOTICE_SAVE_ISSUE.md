# 공지 저장 후 목록에 안 보이는 문제 진단 가이드

## 🔴 현재 증상

- ✅ 권한: `isAdmin: true`, `canPublish: true` (정상)
- ✅ UI: 공지 등록 버튼 표시 (정상)
- ❌ 문제: 공지 저장 후 목록에 표시되지 않음

## 🔍 가능한 원인 3가지

### 원인 1: status가 "draft"로 저장됨 (가장 유력)

**증상:**
- 공지는 Firestore에 저장됨
- 하지만 `status: "draft"`
- `useNotices`는 `where("status", "==", "published")`로 조회
- 결과: draft 공지가 필터링됨

**확인 방법:**
1. Firestore Console → `notices` 컬렉션 확인
2. 저장된 공지 문서의 `status` 필드 확인
3. `status: "draft"`면 원인 1번

**해결 방법:**
- Drawer에서 "게시" 라디오 버튼 선택
- "게시하기" 버튼 클릭
- 또는 저장 로직에서 `saveType === "publish"`일 때 `status: "published"` 설정 확인

---

### 원인 2: 저장 경로와 조회 경로 불일치

**증상:**
- 공지는 저장됨
- 하지만 다른 컬렉션 경로에 저장됨
- 조회는 다른 경로에서 시도

**확인 방법:**
1. 저장 코드 확인: `collection(db, "notices", ...)` 또는 `collection(db, "associations", id, "notices", ...)`
2. 조회 코드 확인: `useNotices` 훅의 쿼리 경로
3. 두 경로가 일치하는지 확인

**현재 코드:**
- 저장: `collection(db, "notices")` (루트 컬렉션)
- 조회: `collection(db, "notices")` (루트 컬렉션)
- ✅ 경로 일치 (문제 없음)

---

### 원인 3: Firestore Rules에서 draft 읽기 차단

**증상:**
- `useNotices fetch error: Missing or insufficient permissions`
- 관리자도 draft 공지를 읽을 수 없음

**확인 방법:**
1. Firestore Rules 확인
2. `allow read` 규칙에서 draft 읽기 허용 여부 확인

**현재 Rules:**
```javascript
match /notices/{noticeId} {
  allow read: if true; // ✅ 모두 허용 (문제 없음)
}
```

---

## ✅ 즉시 확인 방법

### 1. Firestore Console에서 확인

1. Firebase Console → Firestore Database → Data 탭
2. `notices` 컬렉션 확인
3. 저장된 공지 문서 확인:
   - `status` 필드 값: `"draft"` 또는 `"published"`
   - `associationId` 필드: `"assoc-nowon-football"`
   - `title`, `content` 필드 존재 확인

### 2. 브라우저 콘솔에서 확인

```javascript
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 모든 공지 조회 (draft 포함)
const noticesRef = collection(db, 'notices');
const allQuery = query(noticesRef, where('associationId', '==', 'assoc-nowon-football'));
const allSnap = await getDocs(allQuery);

console.log('📋 모든 공지 (draft 포함):', allSnap.docs.map(d => ({
  id: d.id,
  title: d.data().title,
  status: d.data().status,
  associationId: d.data().associationId,
})));

// published만 조회
const publishedQuery = query(
  noticesRef,
  where('associationId', '==', 'assoc-nowon-football'),
  where('status', '==', 'published')
);
const publishedSnap = await getDocs(publishedQuery);

console.log('📋 Published 공지:', publishedSnap.docs.map(d => ({
  id: d.id,
  title: d.data().title,
  status: d.data().status,
})));
```

---

## 🎯 예상 원인 (가장 유력)

**원인 1번: status가 "draft"로 저장됨**

로그 기준:
- `status: "draft"`
- `saveType: "draft"`
- `hasTitle: false`
- `hasContent: false`

→ Drawer에서 "임시 저장"이 선택된 상태로 저장됨
→ `useNotices`는 `published`만 조회
→ 결과: 목록에 안 보임

---

## ✅ 해결 방법

### 방법 1: "게시" 라디오 버튼 선택 후 저장

1. "새 공지 등록" 버튼 클릭
2. Drawer 열림
3. 제목/내용 입력
4. **"게시" 라디오 버튼 선택** (중요!)
5. "게시하기" 버튼 클릭
6. 저장 성공 확인
7. 공지 목록에서 확인

### 방법 2: 저장 로직 확인 및 수정

`NoticeEditDrawer.tsx`에서:
```typescript
// 현재
let status: "draft" | "published" | "scheduled" = "draft";
if (saveType === "publish") {
  status = publishMode === "schedule" ? "scheduled" : "published";
}

// ✅ 이 로직이 정상 작동하는지 확인
```

---

## 📋 체크리스트

- [ ] Firestore Console에서 공지 문서 확인
- [ ] `status` 필드 값 확인 (`"draft"` vs `"published"`)
- [ ] Drawer에서 "게시" 라디오 버튼 선택 확인
- [ ] "게시하기" 버튼 클릭 확인
- [ ] 저장 후 공지 목록에서 확인

---

## 🎯 다음 단계

Firestore Console에서 실제 공지 문서 스크린샷을 보여주시면:
1. 정확한 원인 파악
2. 수정 코드 작성
3. 즉시 해결

**확인할 항목:**
- 공지 문서가 실제로 생성되었는지
- `status` 필드 값
- `associationId` 필드 값
- 컬렉션 경로 (`notices` vs `associations/{id}/notices`)

