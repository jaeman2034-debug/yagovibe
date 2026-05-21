# 📦 Functions 프로덕션 배포 체크리스트

## ✅ A) 배포 전 필수 점검 (완료)

### 1️⃣ 환경 변수
- ✅ **상태**: `secrets: ["OPENAI_API_KEY"]` 사용 중
- ✅ **위치**: `functions/src/generateTeamBlogPost.ts` 69, 416줄
- ⚠️ **배포 전 확인**: Secret Manager에 `OPENAI_API_KEY` 설정되어 있는지 확인

### 2️⃣ 지역(region) 고정
- ✅ **상태**: 모든 Functions에 `region: "asia-northeast3"` 명시됨
- ✅ **확인된 함수**:
  - `generateTeamBlogPost` (onCall)
  - `generateTeamBlogPostAPI` (onRequest)
  - `autoWeeklyTeamPost` (onSchedule)

### 3️⃣ Node 런타임
- ✅ **상태**: `package.json`에 `"engines": { "node": "20" }` 설정됨
- ✅ **firebase.json**: `"runtime": "nodejs20"` 설정됨

---

## 🚀 B) 배포 구성

### 4️⃣ 배포 대상 최소화

**배포 명령어 (복붙용)**:
```bash
# 프로젝트 루트에서 실행
cd C:\Users\samsung256g\Desktop\yago-vibe-spt

# Functions + Firestore Rules만 배포
firebase deploy --only functions,firestore:rules
```

**선택적 배포 (필요시)**:
```bash
# 특정 함수만 배포
firebase deploy --only functions:generateTeamBlogPost,functions:generateTeamBlogPostAPI,functions:autoWeeklyTeamPost

# Firestore Rules만 배포
firebase deploy --only firestore:rules
```

### 5️⃣ 함수 이름 정합성 재확인

**배포될 함수 목록**:
- ✅ `generateTeamBlogPost` (onCall) - 프론트에서 `httpsCallable(functions, "generateTeamBlogPost")` 호출
- ✅ `generateTeamBlogPostAPI` (onRequest) - HTTP 엔드포인트 (현재 미사용, 향후 확장용)
- ✅ `autoWeeklyTeamPost` (onSchedule) - 자동 주간 생성 (스케줄러)

**프론트엔드 호출 확인**:
- ✅ `src/components/team/TeamBlogManagement.tsx` 312줄: `httpsCallable(functions, "generateTeamBlogPost")`

---

## 🧪 C) 배포 후 검증 시나리오

### 6️⃣ 실환경 Smoke Test (관리자/Pro)

**테스트 순서**:
1. **프로덕션 환경 접속**
   - 관리자 계정으로 로그인
   - Pro 플랜 팀 선택
   - 팀 블로그 관리 페이지 진입

2. **"다음 글 생성하기" 버튼 클릭**
   - ✅ 성공 토스트 표시
   - ✅ Firestore에 `teams/{teamId}/blog_posts/{postId}` 1건만 생성
   - ✅ 중복 생성 없음 확인

3. **생성된 글 확인**
   - 제목/내용 정상 표시
   - `postType` 자동 결정 확인
   - `plan: "pro"` 필드 확인

**확인 명령어**:
```bash
# Firestore 콘솔에서 확인
# 경로: teams/{teamId}/blog_posts/{postId}
# 필드: title, content, postType, plan, createdAt
```

### 7️⃣ 차단 테스트 (보안 확인)

#### 테스트 1: 일반 멤버 → 403
```bash
# 1. 일반 멤버 계정으로 로그인
# 2. "다음 글 생성하기" 버튼 클릭
# 예상 결과: 403 (permission-denied)
```

#### 테스트 2: Free 플랜 → 403
```bash
# 1. Free 플랜 팀 선택
# 2. "다음 글 생성하기" 버튼 클릭
# 예상 결과: 403 (not-pro)
```

#### 테스트 3: 1분 이내 재호출 → 429
```bash
# 1. Pro 플랜 관리자로 첫 생성 성공
# 2. 즉시 다시 "다음 글 생성하기" 클릭
# 예상 결과: 429 (rate-limit-exceeded)
# 메시지: "너무 빈번한 요청입니다. X초 후 다시 시도해주세요."
```

#### 테스트 4: 인증 토큰 제거 (HTTP만) → 401
```bash
# HTTP 엔드포인트 직접 호출 (개발자 도구)
fetch("https://asia-northeast3-yago-vibe-spt.cloudfunctions.net/generateTeamBlogPostAPI", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ teamId: "test" })
})
# 예상 결과: 401 (unauthenticated)
```

### 8️⃣ 로그 확인

**로그 확인 명령어**:
```bash
# 최근 로그 확인
firebase functions:log --only generateTeamBlogPost

# 실시간 로그 스트림
firebase functions:log --only generateTeamBlogPost --follow

# 특정 에러만 확인
firebase functions:log --only generateTeamBlogPost | grep -i "error\|403\|429\|500"
```

**확인할 로그 패턴**:
- ✅ `✅ [generateTeamBlogPost] 팀 {teamId} 블로그 포스트 생성 완료`
- ✅ `⚠️ [generateTeamBlogPost] 권한 체크 실패` (403 예상)
- ✅ `⚠️ [generateTeamBlogPost] 플랜 체크 실패` (403 예상)
- ✅ `⚠️ [generateTeamBlogPost] Rate limit 초과` (429 예상)
- ❌ `❌ [generateTeamBlogPost] 블로그 포스트 생성 실패` (500 - 문제 발생)

---

## 🛡️ D) 운영 안정화

### 9️⃣ 콜드스타트 완화

**현재 설정**:
- ✅ `generateTeamBlogPost`: `memory: "512MiB"` (69줄)
- ✅ `generateTeamBlogPostAPI`: `memory: "512MiB"` (416줄)
- ✅ `timeoutSeconds: 120` (AI 호출 대비)

**추가 최적화 (선택)**:
```typescript
// 최소 인스턴스 유지 (비용 증가 주의)
minInstances: 1
```

### 🔟 알림/모니터링

**Firebase Console에서 설정**:
1. **Functions > Monitoring**
   - 500 에러 알림 설정
   - 429 급증 알림 설정

2. **Cloud Logging에서 알림 설정**:
   ```bash
   # Cloud Console > Logging > 알림 정책 생성
   # 조건: severity >= ERROR
   # 채널: Slack / Email
   ```

3. **Rate Limit 모니터링**:
   - `teams/{teamId}/blog/rateLimit` 문서 생성 추적
   - 429 에러 빈도 확인

---

## ✅ 배포 완료 기준

### 체크리스트 (4개 모두 완료 시 배포 성공)

- [ ] **프로덕션에서 생성 성공**
  - 관리자/Pro 플랜으로 "다음 글 생성하기" 성공
  - Firestore에 정상적으로 글 생성됨

- [ ] **비권한/무료/과호출 전부 차단**
  - 일반 멤버 → 403 ✅
  - Free 플랜 → 403 ✅
  - 1분 이내 재호출 → 429 ✅
  - 인증 토큰 없음 → 401 ✅

- [ ] **중복 생성 없음**
  - 동시 요청 시 1건만 생성
  - Rate limit 정상 작동

- [ ] **로그/모니터링 정상**
  - 500 에러 없음
  - 403/429 로그 의도대로 발생
  - 성공 로그 정상 기록

---

## 🚨 문제 발생 시 롤백

**롤백 명령어**:
```bash
# 이전 버전으로 롤백
firebase functions:rollback

# 특정 함수만 롤백
firebase functions:rollback --only generateTeamBlogPost
```

---

## 📝 배포 후 체크리스트

배포 완료 후 다음을 확인:

1. **Firebase Console > Functions**
   - 함수 상태: "Active" ✅
   - 최근 호출: 성공률 확인

2. **Firebase Console > Firestore > Rules**
   - Rules 배포 상태 확인
   - 테스트 모드 해제 확인

3. **Secret Manager**
   - `OPENAI_API_KEY` 존재 확인
   - Functions에서 접근 가능 확인

---

**작성일**: 2024년
**상태**: ✅ 배포 준비 완료

