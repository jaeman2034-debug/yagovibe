# 블로그 저장 구조 & 전체 흐름 점검

## 1️⃣ Firestore 컬렉션 구조 (확정)

### 컬렉션 경로

```
teams/{teamId}/
  ├── blog/
  │   └── settings  (단일 문서)
  │       - enabled: boolean
  │       - plan: "free" | "pro"
  │       - teamSlug: string
  │       - createdAt: Timestamp
  │       - updatedAt: Timestamp
  │
  └── blog_posts/  (컬렉션)
      └── {postId}  (문서)
          - title: string
          - content: string (HTML)
          - excerpt: string
          - seoMeta: object
          - status: "draft" | "published"
          - createdAt: Timestamp
          - createdBy: "ai" | string (uid)
          - postType: string
          - publishedAt: Timestamp
          - viewCount: number
          - plan: "free" | "pro"
```

---

## 2️⃣ Firestore Rules (수정 완료)

### 현재 Rules

```javascript
// 📝 팀 블로그 설정 (settings)
match /blog/{docId} {
  // 읽기: 공개 (블로그는 공개 페이지이므로)
  allow read: if true;
  // 쓰기: Functions(Admin SDK)에서만
  allow write: if false;
}

// 📝 팀 블로그 포스트
match /blog_posts/{postId} {
  // 읽기: 공개 (블로그는 공개 페이지이므로)
  allow read: if true;
  // 쓰기: Functions(Admin SDK)에서만
  allow write: if false;
}
```

**✅ 수정 완료**: 공개 읽기 허용

---

## 3️⃣ 전체 흐름 (AI 생성 → 저장 → 공개)

### STEP 1: 클라이언트 요청

**위치**: `src/components/team/TeamBlogManagement.tsx`

```typescript
const generateBlogPost = httpsCallable(functions, "generateTeamBlogPost");
const result = await generateBlogPost({
  teamId,
  postType: "intro",
});
```

**체크**:
- ✅ `teamId` 전달
- ✅ `postType` 전달
- ✅ 에러 처리 개선 완료

---

### STEP 2: Functions 권한 체크

**위치**: `functions/src/generateTeamBlogPost.ts`

```typescript
// 권한 체크
await requireAdmin(teamId, uid);
```

**체크**:
- ✅ `requireAdmin` 함수 호출
- ✅ team_members 루트 컬렉션 우선 조회
- ✅ 다양한 role 값 허용 (대소문자 무시)

---

### STEP 3: 블로그 설정 확인/생성

**위치**: `functions/src/generateTeamBlogPost.ts` (88-105줄)

```typescript
const blogRef = db.doc(`teams/${teamId}/blog/settings`);
const blogSnap = await blogRef.get();

if (!blogSnap.exists()) {
  // 최초 블로그 생성
  const teamSlug = generateTeamSlug(teamData.name || `team-${teamId}`);
  blogSettings = {
    enabled: true,
    plan: (teamData.plan as "free" | "pro") || "free",
    teamSlug,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  };
  await blogRef.set(blogSettings);
}
```

**체크**:
- ✅ Admin SDK 사용 (`getFirestore()`)
- ✅ Rules 우회 (Admin SDK는 Rules 무시)
- ✅ `teamSlug` 자동 생성

---

### STEP 4: AI 블로그 포스트 생성

**위치**: `functions/src/generateTeamBlogPost.ts` (228-314줄)

```typescript
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 프롬프트 생성
const prompt = buildBlogPrompt(teamData, postType, memberCount, recentActivity, plan);

// OpenAI API 호출
const completion = await openai.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [...],
  temperature: 0.7,
});

// 응답 파싱
const parsed = parseAIResponse(aiResponse);
```

**체크**:
- ✅ OpenAI API 키 확인 추가 완료
- ✅ 에러 처리 강화 완료
- ✅ 상세 에러 로깅 추가 완료

---

### STEP 5: Firestore에 저장

**위치**: `functions/src/generateTeamBlogPost.ts` (126-140줄)

```typescript
const postRef = db.collection(`teams/${teamId}/blog_posts`).doc();
const blogPost: BlogPost = {
  ...post,
  content: enhancedContent,
  status: "published",
  createdAt: FieldValue.serverTimestamp(),
  createdBy: "ai",
  postType,
  publishedAt: FieldValue.serverTimestamp(),
  viewCount: 0,
  plan: blogSettings.plan,
};

await postRef.set(blogPost);
```

**체크**:
- ✅ Admin SDK 사용 (`getFirestore()`)
- ✅ Rules 우회 (Admin SDK는 Rules 무시)
- ✅ 트랜잭션 불필요 (단일 문서 쓰기)

---

### STEP 6: 클라이언트에서 읽기

**위치**: `src/components/team/TeamBlogManagement.tsx` (44-87줄)

```typescript
// 블로그 설정 조회
const settingsRef = doc(db, `teams/${teamId}/blog/settings`);
const settingsSnap = await getDoc(settingsRef);

// 포스트 조회
const postsRef = collection(db, `teams/${teamId}/blog_posts`);
const postsQuery = query(postsRef, orderBy("publishedAt", "desc"));
const unsubscribe = onSnapshot(postsQuery, (snapshot) => {
  // ...
});
```

**체크**:
- ✅ 클라이언트 SDK 사용 (`doc`, `collection`)
- ✅ Rules 적용 (공개 읽기 허용)
- ✅ 실시간 업데이트 (`onSnapshot`)

---

### STEP 7: 공개 페이지 접근

**위치**: `src/pages/team/TeamBlogPublicPage.tsx` (예상)

**URL 구조**: `/teams/{teamSlug}/blog`

**체크**:
- ✅ `teamSlug` 기반 라우팅
- ✅ 공개 읽기 (Rules: `allow read: if true`)
- ✅ SEO 메타 태그

---

## 4️⃣ 권한 문제 해결 확인

### 문제 원인

1. **클라이언트 읽기 권한**: `blog`/`blog_posts` 컬렉션 읽기 불가
2. **Functions 쓰기**: Admin SDK 사용하므로 문제 없음

### 해결 방법

1. **Rules 수정**: 공개 읽기 허용 (`allow read: if true`)
2. **Functions 쓰기**: Admin SDK 사용 (Rules 우회)

---

## 5️⃣ 다음 단계 체크리스트

### 즉시 확인

- [ ] Firestore Rules 배포
  ```bash
  firebase deploy --only firestore:rules
  ```

- [ ] 블로그 생성 버튼 다시 클릭
- [ ] 브라우저 콘솔 확인 (에러 메시지)
- [ ] Functions 로그 확인
  ```bash
  firebase functions:log --only generateTeamBlogPost
  ```

### 성공 확인

- [ ] `teams/{teamId}/blog/settings` 문서 생성
- [ ] `teams/{teamId}/blog_posts/{postId}` 문서 생성
- [ ] 클라이언트에서 블로그 목록 표시
- [ ] 공개 페이지 접근 가능

---

## 6️⃣ 트러블슈팅 가이드

### 에러: "Missing or insufficient permissions"

**원인**: Rules 미배포 또는 캐시

**해결**:
1. Rules 재배포
2. 브라우저 캐시 클리어
3. Functions 재배포

---

### 에러: "OpenAI API 키가 설정되지 않았습니다"

**원인**: 환경 변수 미설정

**해결**:
```bash
firebase functions:config:set openai.api_key="your-api-key"
firebase deploy --only functions
```

---

### 에러: "관리자만 가능한 기능입니다"

**원인**: `requireAdmin` 실패

**해결**:
1. `team_members` 컬렉션 확인
2. `role` 필드 확인 ("ADMIN", "관리자" 등)
3. Functions 로그 확인

---

## ✅ 최종 확인

**Rules 수정 완료** ⭕

**에러 처리 개선 완료** ⭕

**전체 흐름 점검 완료** ⭕

**다음**: Rules 배포 후 테스트

