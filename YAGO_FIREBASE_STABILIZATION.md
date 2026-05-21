# 🚀 YAGO VIBE – Firebase 운영 안정화 작업 지시문

## 📋 현재 서비스 상태

✅ **완료된 작업**:
- Vite build 완료
- Firebase Hosting 배포 완료
- Firebase Authentication 설정 정상
- Authorized Domains 설정 정상
- console.log 정리 완료 (devLog/devWarn/devError 적용)
- Google OAuth 로그인 동작 가능 (모바일/PC 분기 처리 완료)

---

## 1️⃣ Firestore Security Rules 강화 확인

### 현재 상태
`firestore.rules` 파일을 확인한 결과, 이미 상당히 강화된 규칙이 적용되어 있습니다:
- ✅ 인증 체크 (`isAuthenticated()`)
- ✅ 작성자 체크 (`isAuthor()`)
- ✅ 팀 권한 체크 (`isTeamMember()`, `isTeamAdmin()`)
- ✅ 컬렉션별 세밀한 권한 제어

### 추가 확인 사항
다음 컬렉션의 Rules가 올바르게 설정되어 있는지 확인:

**activities 컬렉션**:
```javascript
match /activities/{activityId} {
  // 읽기: 공개 활동은 모든 인증된 사용자
  allow read: if isAuthenticated() &&
    (resource.data.visibility == 'public' ||
     resource.data.authorId == request.auth.uid ||
     (resource.data.visibility == 'team' && 
      resource.data.teamId != null &&
      isTeamMember(resource.data.teamId)));

  // 생성: 인증된 사용자만
  allow create: if isAuthenticated();

  // 수정/삭제: 작성자만
  allow update, delete: if isAuthor(resource.data.authorId);
}
```

**marketPosts 컬렉션** (Rules 파일에 없으면 추가 필요):
```javascript
match /marketPosts/{postId} {
  // 읽기: 모든 인증된 사용자 (공개)
  allow read: if isAuthenticated();

  // 생성: 인증된 사용자만
  allow create: if isAuthenticated() &&
    request.resource.data.authorId == request.auth.uid;

  // 수정/삭제: 작성자만
  allow update, delete: if isAuthenticated() &&
    resource.data.authorId == request.auth.uid;
}
```

**recruitPosts, matchPosts 컬렉션**도 동일한 패턴으로 Rules 추가 필요.

---

## 2️⃣ Firebase Storage Rules 확인

### 현재 상태
`storage.rules` 파일을 확인한 결과, 적절한 규칙이 설정되어 있습니다:
- ✅ 읽기: 공개 이미지는 `allow read: if true`
- ✅ 쓰기: 로그인 사용자만 `allow write: if request.auth != null`
- ✅ 사용자 프로필: 본인만 수정 가능

### 추가 권장 사항
파일 크기 제한 추가 (선택사항):
```javascript
match /market/{allPaths=**} {
  allow read: if true;
  allow write: if request.auth != null &&
    request.resource.size < 5 * 1024 * 1024; // 5MB 제한
}
```

---

## 3️⃣ Firestore 비용 보호 (쿼리 최적화)

### 현재 상태 확인
대부분의 쿼리에서 `limit()`을 사용하고 있으나, 일부 쿼리에서 큰 limit 값을 사용하고 있습니다.

### 수정 필요 사항

#### 3-1. MarketPage.tsx
**현재**: `limit(100)` 사용
**수정**: `limit(20)` 또는 `limit(30)`으로 변경

**파일**: `src/pages/market/MarketPage.tsx`
**위치**: 약 728줄, 732줄, 738줄

```typescript
// ❌ 현재
q = query(baseQuery, orderBy("price", "asc"), limit(100));

// ✅ 수정
q = query(baseQuery, orderBy("price", "asc"), limit(20));
```

#### 3-2. PublicLandingPage.tsx
**현재**: 모든 팀을 조회한 후 각 팀의 블로그 포스트를 조회
**수정**: 팀 조회에도 limit 추가

**파일**: `src/pages/public/PublicLandingPage.tsx`
**위치**: 약 36줄

```typescript
// ❌ 현재
const teamsRef = collection(db, "teams");
const teamsSnap = await getDocs(teamsRef);

// ✅ 수정
const teamsRef = collection(db, "teams");
const teamsQuery = query(teamsRef, limit(50)); // 최대 50개 팀만 조회
const teamsSnap = await getDocs(teamsQuery);
```

#### 3-3. ActivityFeed.tsx
**확인 필요**: `limit()` 사용 여부 확인

**파일**: `src/features/activity/ActivityFeed.tsx`
**확인 사항**: 
- `limit(30)` 이상 사용하는지 확인
- 권장: `limit(20)` 또는 `limit(30)`

### 쿼리 최적화 원칙

1. **항상 limit 사용**: 전체 데이터 조회 금지
2. **적절한 limit 값**: 
   - 리스트 페이지: `limit(20)` ~ `limit(30)`
   - 무한 스크롤: `limit(20)` + `startAfter()` 사용
3. **인덱스 활용**: `where()` + `orderBy()` 조합 시 인덱스 필수

---

## 4️⃣ Firestore Index 확인 및 추가

### 현재 상태
`firestore.indexes.json` 파일을 확인한 결과, `activities` 컬렉션에 대한 인덱스가 **없습니다**.

### 추가 필요 인덱스

**파일**: `firestore.indexes.json`

다음 인덱스를 추가:

```json
{
  "collectionGroup": "activities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sport", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "activities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "visibility", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "activities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "sport", "order": "ASCENDING" },
    { "fieldPath": "visibility", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "activities",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "refType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

### 인덱스 배포 방법

```bash
firebase deploy --only firestore:indexes
```

또는 Firebase Console에서 수동 생성:
1. Firebase Console → Firestore Database → Indexes
2. "Create Index" 클릭
3. 위 인덱스 정보 입력

---

## 5️⃣ Production 로그 최소화 확인

### 현재 상태
✅ `src/lib/firebase.ts`에서 `devLog`, `devWarn`, `devError` 적용 완료

### 추가 확인 사항

다음 파일들도 확인하여 `console.log`를 `devLog`로 교체:

1. **ActivityFeed.tsx**
   - `console.log` → `devLog`로 교체

2. **MarketPage.tsx**
   - `console.log` → `devLog`로 교체

3. **기타 주요 컴포넌트**
   - 프로덕션에서 불필요한 로그 제거

### 로그 정리 원칙

```typescript
// ✅ 개발 환경에서만 로그 출력
import { devLog, devWarn, devError } from "@/lib/utils/dev";

devLog("디버깅 정보");
devWarn("경고 메시지");
devError("에러 메시지");
```

---

## 6️⃣ Activity 시스템 안정화

### 현재 구조 확인
Activity 문서의 `type` 및 `refType` 구조를 통일합니다.

### 권장 구조

**refType** (컬렉션 타입):
- `market` - 거래 관련
- `teams` - 팀 관련
- `events` - 이벤트 관련
- `recruit` - 모집 관련 (선택사항: `teams`로 통일 가능)
- `match` - 경기 매칭 관련 (선택사항: `teams`로 통일 가능)

**type** (활동 타입):
- `team_created` - 팀 생성
- `team_notice` - 팀 공지
- `team_event` - 팀 이벤트
- `market_created` - 거래 글 생성
- `equipment_created` - 장비 거래 생성
- `recruit_created` - 모집 생성
- `match_created` - 경기 매칭 생성

### ActivityFactory 확인

**파일**: `src/services/activity/activityFactory.ts`

다음 함수들이 올바른 `refType`을 사용하는지 확인:

```typescript
// ✅ 올바른 refType 매핑
export async function createTeamRecruitActivity(...) {
  return createActivity(data.type, { ...data, refType: "teams" });
}

export async function createMatchActivity(...) {
  return createActivity(data.type, { ...data, refType: "match" });
}
```

---

## 7️⃣ 모바일 로그인 안정성 확인

### 현재 상태
✅ 모바일/PC 환경 분기 처리 완료

**파일**: 
- `src/pages/LoginPage.tsx`
- `src/pages/SignupPage.tsx`
- `src/utils/authHelpers.ts`

### 동작 확인

**PC 환경**:
- `signInWithPopup()` 사용
- 즉시 결과 반환

**모바일 환경**:
- `signInWithRedirect()` 사용
- `getRedirectResult()`로 결과 처리

**In-App Browser**:
- `signInWithRedirect()` 사용 (필수)

---

## 8️⃣ 배포 테스트 시나리오

### 필수 테스트 항목

#### 8-1. Google 로그인
- [ ] PC 환경에서 Google 로그인
- [ ] 모바일 환경에서 Google 로그인
- [ ] In-App Browser에서 Google 로그인 (카카오톡 등)

#### 8-2. 팀 생성
- [ ] 팀 생성 성공
- [ ] 팀 정보 수정
- [ ] 팀 삭제

#### 8-3. 팀 모집 등록
- [ ] 모집 글 작성
- [ ] 모집 글 수정
- [ ] 모집 글 삭제

#### 8-4. 거래 글 작성
- [ ] 거래 글 작성
- [ ] 이미지 업로드
- [ ] 거래 글 수정
- [ ] 거래 글 삭제

#### 8-5. ActivityFeed 표시
- [ ] 전체 탭 표시
- [ ] 거래 탭 표시
- [ ] 팀 탭 표시
- [ ] 이벤트 탭 표시
- [ ] 종목별 필터링

#### 8-6. 이미지 업로드
- [ ] 프로필 이미지 업로드
- [ ] 거래 글 이미지 업로드
- [ ] 팀 로고 업로드

---

## 9️⃣ Firebase Console 최종 확인

### 필수 확인 사항

1. **Firebase Console → Authentication → Settings**
   - Authorized Domains 확인
   - 다음 도메인 포함 확인:
     - `yago-vibe-spt.web.app`
     - `yago-vibe-spt.firebaseapp.com`
     - `localhost` (개발용)

2. **Firebase Console → Authentication → Sign-in method**
   - Google 제공자 "사용 설정됨" 확인
   - 웹 클라이언트 ID 확인

3. **Firebase Console → Firestore Database → Indexes**
   - `activities` 컬렉션 인덱스 생성 확인
   - 인덱스 생성 완료 대기 (몇 분 소요)

4. **Firebase Console → Storage → Rules**
   - Storage Rules 배포 확인

5. **Firebase Console → Firestore Database → Rules**
   - Firestore Rules 배포 확인

---

## 🔟 배포 및 테스트

### 배포 명령어

```bash
# Firestore Rules 및 Indexes 배포
firebase deploy --only firestore

# Storage Rules 배포
firebase deploy --only storage

# Hosting 배포
npm run build
firebase deploy --only hosting
```

### 배포 후 확인

1. **배포 URL 접속**: https://yago-vibe-spt.web.app
2. **Google 로그인 테스트**
3. **주요 기능 테스트** (위 8번 항목 참고)

---

## ✅ 완료 체크리스트

- [ ] Firestore Rules 확인 및 추가 (marketPosts, recruitPosts, matchPosts)
- [ ] Storage Rules 확인
- [ ] Firestore 쿼리 limit 최적화 (MarketPage.tsx, PublicLandingPage.tsx)
- [ ] Firestore Index 추가 (activities 컬렉션)
- [ ] console.log 정리 (ActivityFeed.tsx, MarketPage.tsx 등)
- [ ] Activity 시스템 구조 확인 (ActivityFactory)
- [ ] 모바일 로그인 안정성 확인
- [ ] 배포 테스트 시나리오 실행
- [ ] Firebase Console 최종 확인

---

## 📝 참고 링크

- Firebase Console: https://console.firebase.google.com/project/yago-vibe-spt
- 배포 URL: https://yago-vibe-spt.web.app
- Firestore Indexes: https://console.firebase.google.com/project/yago-vibe-spt/firestore/indexes

---

**작성일**: 2024년
**버전**: 1.0
**상태**: 실서비스 안정화 작업
