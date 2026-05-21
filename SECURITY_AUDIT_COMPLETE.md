# 🔐 보안 룰 최종 점검 완료

## ✅ 완료된 작업

### 1. Firestore Rules 강화

#### ✅ blog_posts 쓰기 차단
- **위치**: `firestore.rules` 91-97줄
- **상태**: 이미 `allow write: if false;`로 설정되어 있음
- **효과**: 클라이언트에서 직접 글 생성/수정 불가능 (Functions만 가능)

#### ✅ teams 문서 핵심 필드 수정 방지
- **위치**: `firestore.rules` 45-52줄
- **변경사항**:
  ```javascript
  // ❌ 기존: 단순 owner 체크만
  allow write: if request.auth.uid in resource.data.get('owners', []);

  // ✅ 수정: plan, ownerUid, ownerId 필드 수정 금지
  allow update: if request.auth.uid in resource.data.get('owners', []) &&
                   request.resource.data.get('plan', '') == resource.data.get('plan', '') &&
                   request.resource.data.get('ownerUid', '') == resource.data.get('ownerUid', '') &&
                   request.resource.data.get('ownerId', '') == resource.data.get('ownerId', '');
  ```
- **효과**: 클라이언트에서 플랜/소유자 정보 조작 불가능

---

### 2. Functions 보안 검증 강화

#### ✅ generateTeamBlogPostAPI (onRequest) - HTTP 엔드포인트

**위치**: `functions/src/generateTeamBlogPost.ts` 408-465줄

**추가된 검증**:
1. **인증 토큰 검증** (401)
   ```typescript
   const authHeader = req.headers.authorization || "";
   const match = authHeader.match(/^Bearer (.+)$/);
   if (!match) {
     res.status(401).json({ ok: false, error: "unauthenticated" });
     return;
   }
   const decoded = await admin.auth().verifyIdToken(match[1]);
   ```

2. **권한 체크: 관리자만** (403)
   ```typescript
   await requireAdmin(teamId, uid);
   ```

3. **플랜 체크: Pro만** (403)
   ```typescript
   const plan = teamData?.plan as "free" | "pro" | undefined;
   if (plan !== "pro") {
     res.status(403).json({ ok: false, error: "not-pro" });
     return;
   }
   ```

4. **Rate Limit: 팀당 1분 쿨타임** (429)
   ```typescript
   const cooldownMs = 60 * 1000; // 1분
   if (now - lastGeneratedAt < cooldownMs) {
     res.status(429).json({ ok: false, error: "rate-limit-exceeded" });
     return;
   }
   ```

#### ✅ generateTeamBlogPost (onCall) - Callable 엔드포인트

**위치**: `functions/src/generateTeamBlogPost.ts` 140-359줄

**추가된 검증**:
1. **플랜 체크: Pro만** (failed-precondition)
   ```typescript
   const plan = teamData?.plan as "free" | "pro" | undefined;
   if (plan !== "pro") {
     throw new HttpsError("failed-precondition", "Pro 플랜이 필요합니다.");
   }
   ```

2. **Rate Limit: 팀당 1분 쿨타임** (resource-exhausted)
   ```typescript
   const cooldownMs = 60 * 1000; // 1분
   if (now - lastGeneratedAt < cooldownMs) {
     throw new HttpsError("resource-exhausted", "너무 빈번한 요청입니다.");
   }
   ```

3. **권한 체크: 관리자만** (이미 있음)
   ```typescript
   await requireAdmin(teamId, uid);
   ```

---

### 3. 프론트엔드 인증 토큰 전달

#### ✅ httpsCallable 사용 (자동 토큰 전달)
- **위치**: `src/components/team/TeamBlogManagement.tsx` 312줄
- **상태**: 이미 `httpsCallable` 사용 중
- **효과**: Firebase SDK가 자동으로 ID 토큰을 전달하므로 별도 설정 불필요

#### ⚠️ HTTP 엔드포인트 사용 시 주의사항
만약 나중에 `fetch`로 HTTP 엔드포인트를 호출한다면:
```typescript
const token = await auth.currentUser?.getIdToken();
await fetch("/api/generateTeamBlogPost", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ teamId, postType: "next" }),
});
```

---

## 🛡️ 보안 검증 체크리스트

### ✅ Firestore Rules
- [x] `blog_posts` write: false (클라이언트 쓰기 차단)
- [x] `teams/{teamId}` plan 필드 수정 방지
- [x] `teams/{teamId}` ownerUid 필드 수정 방지

### ✅ Functions 검증
- [x] 인증 토큰 검증 (401)
- [x] 팀 존재 확인 (404)
- [x] 멤버십 확인 (403)
- [x] 관리자 권한 확인 (403)
- [x] Pro 플랜 확인 (403)
- [x] Rate Limit (429)

### ✅ 프론트엔드
- [x] `httpsCallable` 사용 (자동 토큰 전달)
- [x] 에러 처리 (403, 429 등)

---

## 🧪 테스트 시나리오

### 1. 일반 멤버로 호출 시
- **예상 결과**: 403 (permission-denied)
- **검증**: `requireAdmin` 함수가 `team_members` 또는 `members` 서브컬렉션에서 role 확인

### 2. 무료 플랜으로 호출 시
- **예상 결과**: 403 (not-pro)
- **검증**: `teamData.plan !== "pro"` 체크

### 3. 1분 이내 재호출 시
- **예상 결과**: 429 (rate-limit-exceeded)
- **검증**: `teams/{teamId}/blog/rateLimit` 문서의 `lastGeneratedAt` 확인

### 4. 존재하지 않는 팀으로 호출 시
- **예상 결과**: 404 (team-not-found)
- **검증**: `teamDoc.exists` 확인

### 5. 인증 토큰 없이 호출 시 (HTTP만)
- **예상 결과**: 401 (unauthenticated)
- **검증**: `Authorization: Bearer <token>` 헤더 확인

---

## 📊 Rate Limit 저장 위치

- **경로**: `teams/{teamId}/blog/rateLimit`
- **필드**:
  ```typescript
  {
    lastGeneratedAt: Timestamp,
    teamId: string,
    uid: string,
  }
  ```
- **쿨타임**: 60초 (1분)

---

## 🚀 다음 단계

1. **프로덕션 배포 체크리스트**
   - [ ] Firestore Rules 배포
   - [ ] Functions 배포
   - [ ] 에뮬레이터 테스트

2. **모니터링**
   - [ ] 403 에러 로그 모니터링
   - [ ] 429 에러 로그 모니터링
   - [ ] Rate limit 문서 생성 모니터링

3. **추가 보안 강화 (선택)**
   - [ ] Idempotency key 추가 (중복 요청 방지)
   - [ ] IP 기반 Rate Limit (DDoS 방지)
   - [ ] 팀당 일일 생성 한도 추가

---

## 📝 참고사항

- **onCall vs onRequest**: 
  - `onCall`: Firebase SDK가 자동으로 인증 토큰 전달 (권장)
  - `onRequest`: 수동으로 `Authorization: Bearer <token>` 헤더 필요

- **requireAdmin 함수**: 
  - `teams/{teamId}/members/{uid}` 서브컬렉션 확인
  - `team_members` 루트 컬렉션 확인 (레거시 지원)
  - `team.owners` 배열 확인
  - `team.ownerId` 또는 `team.ownerUid` 확인

- **플랜 체크 순서**:
  1. Functions에서 `teamData.plan` 확인 (Pro만 허용)
  2. 블로그 설정의 `blogSettings.plan` 확인 (이중 안전장치)

---

**완료일**: 2024년
**검증자**: AI Assistant
**상태**: ✅ 완료

