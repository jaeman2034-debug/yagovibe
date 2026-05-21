# 🔥 블로그 생성 트랜잭션 가이드

## 목적

AI 생성 → Firestore 저장 → 공개 페이지 노출을 **원자적(atomic) 트랜잭션**으로 묶어서:
- ✅ 중간 실패 차단
- ✅ 중복 생성 차단
- ✅ 빈 글 차단
- ✅ 부분 성공 없음

---

## 1️⃣ 트랜잭션 구조

### 흐름도

```
1. AI 생성 (트랜잭션 밖)
   ↓
2. 결과 검증
   ↓
3. 트랜잭션 시작
   ├─ 블로그 설정 확인/생성
   ├─ 포스트 저장
   └─ 마지막 포스트 시간 업데이트
   ↓
4. 성공 → 공개 페이지 노출
```

### 핵심 규칙

**❌ 트랜잭션 안에서 AI 호출 금지**
- 외부 API 호출은 트랜잭션 밖에서 실행
- AI 생성 실패 시 아무것도 저장하지 않음

**⭕ 트랜잭션 내부 작업**
- 블로그 설정 확인/생성
- 포스트 저장
- 메타 정보 업데이트

---

## 2️⃣ 서버 코드 (Functions)

### 현재 구현

```typescript
// functions/src/generateTeamBlogPost.ts

// 1️⃣ AI 생성 (트랜잭션 밖)
const post = await generateBlogPostContent(teamId, teamData, postType, blogSettings.plan);

// AI 생성 실패 시 아무것도 저장하지 않음
if (!post || !post.title || !post.content) {
  throw new Error("AI 블로그 포스트 생성에 실패했습니다. 다시 시도해주세요.");
}

// 2️⃣ 트랜잭션으로 원자적 저장
await db.runTransaction(async (transaction) => {
  // 블로그 설정 확인 (트랜잭션 내부에서 재확인)
  const blogSnapInTx = await transaction.get(blogRef);
  
  if (!blogSnapInTx.exists() && isNewBlog) {
    // 최초 블로그 생성
    transaction.set(blogRef, blogSettings);
  } else if (blogSnapInTx.exists()) {
    // 마지막 포스트 시간 업데이트
    transaction.update(blogRef, {
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  // 포스트 저장
  transaction.set(postRef, blogPost);
});
```

---

## 3️⃣ 프론트엔드 버튼 연타 방지

### 현재 구현

```typescript
// src/components/team/TeamBlogManagement.tsx

// 🔥 버튼 연타 방지 (중복 생성 차단)
const isGeneratingRef = useRef(false);

const handleGenerateFirstPost = async () => {
  // 🔥 중복 생성 차단
  if (isGeneratingRef.current || generating) {
    console.warn("이미 생성 중입니다. 잠시만 기다려주세요.");
    return;
  }

  try {
    isGeneratingRef.current = true;
    setGenerating(true);
    // ... 생성 로직
  } finally {
    isGeneratingRef.current = false;
    setGenerating(false);
  }
};
```

---

## 4️⃣ 공개 페이지 쿼리

### 현재 구현

```typescript
// src/pages/team/TeamBlogPublicPage.tsx

const postsRef = collection(db, `teams/${foundTeamId}/blog_posts`);
const postsQuery = query(
  postsRef,
  where("status", "==", "published"),
  orderBy("publishedAt", "desc"),
  limit(10)
);
const postsSnap = await getDocs(postsQuery);
```

### 쿼리 규칙

1. **필터**: `status == "published"` (공개된 글만)
2. **정렬**: `publishedAt desc` (최신순)
3. **제한**: `limit(10)` (최대 10개)

---

## 5️⃣ 실패 시나리오 방어

### AI 생성 실패

**동작**:
- ❌ 아무것도 저장하지 않음
- ❌ blog 메타 생성하지 않음
- ✅ 사용자에게 명확한 에러 메시지 표시

**코드**:
```typescript
if (!post || !post.title || !post.content) {
  throw new Error("AI 블로그 포스트 생성에 실패했습니다. 다시 시도해주세요.");
}
```

### Firestore 실패

**동작**:
- ❌ 공개 페이지 변화 없음
- ❌ 부분 성공 없음
- ✅ 트랜잭션 롤백 자동 처리

**코드**:
```typescript
await db.runTransaction(async (transaction) => {
  // 모든 작업이 성공해야만 커밋
  // 하나라도 실패하면 전체 롤백
});
```

---

## 6️⃣ 중복 생성 방지

### 서버 측

**현재**: 트랜잭션으로 동시 요청 차단
- Firestore 트랜잭션은 동시성 제어를 자동 처리
- 같은 문서에 동시 쓰기 시 하나만 성공

### 클라이언트 측

**현재**: `isGeneratingRef`로 버튼 연타 차단
- `useRef`로 상태 관리
- `generating` state와 함께 이중 체크

---

## 7️⃣ 공개 페이지 UX 규칙

### 글 0개

```
"아직 기록이 없습니다"
```

### 글 1개

```
Hero 강조 (히어로 영역에 첫 글 표시)
```

### 글 ≥3개

```
리스트 형태로 표시
```

---

## 8️⃣ 트랜잭션 최적화 팁

### 읽기 최소화

**현재**: 트랜잭션 전에 블로그 설정 확인
```typescript
// 트랜잭션 전에 미리 확인
const blogSnap = await blogRef.get();
let isNewBlog = !blogSnap.exists();
```

**이유**: 트랜잭션 내부 읽기 최소화로 성능 향상

### 쓰기 최소화

**현재**: 필요한 경우에만 업데이트
```typescript
if (!blogSnapInTx.exists() && isNewBlog) {
  transaction.set(blogRef, blogSettings);
} else if (blogSnapInTx.exists()) {
  transaction.update(blogRef, { updatedAt: ... });
}
```

---

## 9️⃣ 테스트 체크리스트

- [ ] AI 생성 성공 → 포스트 저장 확인
- [ ] AI 생성 실패 → 아무것도 저장되지 않음 확인
- [ ] 버튼 연타 → 중복 생성 차단 확인
- [ ] 트랜잭션 실패 → 롤백 확인
- [ ] 공개 페이지 → 최신 글 표시 확인

---

## 🔟 다음 단계

1. ✅ 트랜잭션 코드 완성
2. ✅ 버튼 연타 방지 추가
3. ✅ 공개 페이지 쿼리 확인
4. 🔜 AI 생성 실패 대비 리트라이 설계
5. 🔜 주간 자동 글 생성 크론 설계

---

**마지막 업데이트**: 2025-01-XX

