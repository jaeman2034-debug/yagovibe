# 🗄️ YAGO VIBE – Firestore 데이터 구조 표준 설계 지시문

## 📋 목표
서비스 확장성과 유지보수를 위해 Firestore 데이터 구조를 표준화합니다.

### 핵심 목표
- ✅ Activity 시스템 안정화
- ✅ 쿼리 성능 최적화
- ✅ Firestore 비용 절감
- ✅ 데이터 구조 일관성 유지

---

## 1️⃣ users 컬렉션

### 컬렉션 경로
```
users/{userId}
```

### 필수 필드
```typescript
{
  uid: string;                    // Firebase Auth UID
  displayName: string;            // 사용자 이름
  email: string;                  // 이메일
  photoURL?: string;              // 프로필 이미지 URL
  createdAt: Timestamp;           // 생성일시
}
```

### 선택 필드
```typescript
{
  favoriteSports?: string[];      // 관심 종목 배열
  teamIds?: string[];             // 가입한 팀 ID 배열
  region?: string;                // 지역
  bio?: string;                   // 자기소개
  role?: "ADMIN" | "USER";        // 플랫폼 권한 (기본값: "USER")
}
```

### Rules
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() && request.auth.uid == userId;
  allow update, delete: if isAuthenticated() && request.auth.uid == userId;
}
```

---

## 2️⃣ teams 컬렉션

### 컬렉션 경로
```
teams/{teamId}
```

### 필수 필드
```typescript
{
  name: string;                   // 팀 이름
  sport: string;                   // 종목 (예: "soccer")
  location: string;                // 지역 (예: "서울")
  description?: string;            // 팀 설명
  ownerId: string;                // 팀 소유자 UID
  memberCount: number;             // 멤버 수 (기본값: 1)
  logoUrl?: string;                // 팀 로고 URL
  createdAt: Timestamp;           // 생성일시
}
```

### Rules
```javascript
match /teams/{teamId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() &&
    request.resource.data.ownerId == request.auth.uid;
  allow update, delete: if isTeamOwner(teamId);
}
```

### 인덱스
- `sport` ASC + `location` ASC + `createdAt` DESC
- `ownerId` ASC + `createdAt` DESC

---

## 3️⃣ teamMembers 서브컬렉션

### 컬렉션 경로
```
teams/{teamId}/members/{memberId}
```

### 필수 필드
```typescript
{
  userId: string;                 // 사용자 UID
  role: "owner" | "admin" | "member"; // 팀 권한 (소문자)
  joinedAt: Timestamp;           // 가입일시
  status?: "active" | "inactive"; // 상태 (기본값: "active")
}
```

### role 값 표준
- `"owner"` - 팀 소유자 (1명)
- `"admin"` - 팀 관리자
- `"member"` - 일반 멤버

### Rules
```javascript
match /teams/{teamId}/members/{memberId} {
  allow read: if isTeamMember(teamId);
  allow create: if isAuthenticated() &&
    (isTeamOwner(teamId) || request.resource.data.userId == request.auth.uid);
  allow update: if isTeamAdmin(teamId);
  allow delete: if isTeamAdmin(teamId) || 
    (isAuthenticated() && memberId == request.auth.uid);
}
```

---

## 4️⃣ market 컬렉션

### 컬렉션 경로
```
market/{productId}
```

### 필수 필드
```typescript
{
  title: string;                  // 제목
  description?: string;            // 설명
  price: number;                  // 가격
  sellerId: string;                // 판매자 UID
  sport: string;                   // 종목 (예: "soccer")
  imageUrls?: string[];            // 이미지 URL 배열 (최대 5장)
  status: "active" | "reserved" | "done"; // 거래 상태
  createdAt: Timestamp;           // 생성일시
}
```

### status 값 표준
- `"active"` - 판매 중
- `"reserved"` - 예약 중
- `"done"` - 거래 완료

### Rules
```javascript
match /market/{productId} {
  allow read: if isAuthenticated();
  allow create: if isAuthenticated() &&
    request.resource.data.sellerId == request.auth.uid &&
    request.resource.data.status == "active";
  allow update, delete: if isAuthenticated() &&
    resource.data.sellerId == request.auth.uid;
}
```

### 인덱스
- `sport` ASC + `status` ASC + `createdAt` DESC
- `sellerId` ASC + `createdAt` DESC

---

## 5️⃣ activities 컬렉션

### 컬렉션 경로
```
activities/{activityId}
```

### 필수 필드
```typescript
{
  type: ActivityType;             // 활동 타입
  refType: ActivityRefType;        // 참조 컬렉션 타입
  refId: string;                   // 참조 문서 ID
  actorId: string;                // 활동 주체 UID (작성자)
  sport: string;                   // 종목 (예: "soccer")
  title: string;                   // 제목
  summary?: string;                // 요약
  thumbnailUrl?: string;            // 썸네일 이미지 URL
  visibility: "public" | "team" | "private"; // 가시성
  likeCount: number;                // 좋아요 수 (기본값: 0)
  commentCount: number;            // 댓글 수 (기본값: 0)
  createdAt: Timestamp;           // 생성일시
}
```

### Rules
```javascript
match /activities/{activityId} {
  allow read: if isAuthenticated() &&
    (resource.data.visibility == 'public' ||
     resource.data.actorId == request.auth.uid);
  allow create: if isAuthenticated();
  allow update, delete: if isAuthenticated() &&
    resource.data.actorId == request.auth.uid;
}
```

### 인덱스
- `sport` ASC + `createdAt` DESC
- `visibility` ASC + `createdAt` DESC
- `sport` ASC + `visibility` ASC + `createdAt` DESC
- `refType` ASC + `createdAt` DESC

---

## 6️⃣ activity type 표준

### type 값 정의
```typescript
type ActivityType =
  | "team_created"      // 팀 생성
  | "team_recruit"      // 팀 모집
  | "team_join"         // 팀 가입
  | "market_post"       // 거래 글 작성
  | "market_comment"    // 거래 댓글
  | "event_created"     // 이벤트 생성
  | "event_join";       // 이벤트 참가
```

### type 사용 규칙
- **prefix 기반 구조 유지**: `{컬렉션}_{동작}` 형식
- **소문자 + 언더스코어 사용**: `team_created`, `market_post`
- **일관성 유지**: 동일한 패턴으로 명명

---

## 7️⃣ refType 표준

### refType 값 정의
```typescript
type ActivityRefType =
  | "teams"      // 팀 관련
  | "market"     // 거래 관련
  | "events";    // 이벤트 관련
```

### refType 사용 규칙
- **복수형 사용**: `teams`, `market`, `events`
- **소문자 사용**: 대문자 금지
- **일관성 유지**: 동일한 컬렉션은 동일한 refType 사용

### refType 매핑 규칙
```typescript
// type → refType 매핑
const refTypeMap = {
  "team_created": "teams",
  "team_recruit": "teams",
  "team_join": "teams",
  "market_post": "market",
  "market_comment": "market",
  "event_created": "events",
  "event_join": "events",
};
```

---

## 8️⃣ ActivityFeed 쿼리 표준

### 기본 쿼리 (전체 피드)
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

### 스포츠 필터 쿼리
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", sport),  // 예: "soccer"
  orderBy("createdAt", "desc"),
  limit(20)
)
```

### refType 필터 쿼리
```typescript
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("refType", "==", "market"),  // 거래 탭
  orderBy("createdAt", "desc"),
  limit(20)
)
```

### 쿼리 최적화 원칙
1. **항상 limit 사용**: 전체 데이터 조회 금지
2. **인덱스 활용**: `where()` + `orderBy()` 조합 시 인덱스 필수
3. **클라이언트 필터링 최소화**: 서버에서 가능한 필터링 수행

---

## 9️⃣ Firestore Index 필수 인덱스

### activities 컬렉션 인덱스

#### 인덱스 1: 스포츠별 피드
```
Collection: activities
Fields:
  - sport → Ascending
  - createdAt → Descending
```

#### 인덱스 2: 가시성별 피드
```
Collection: activities
Fields:
  - visibility → Ascending
  - createdAt → Descending
```

#### 인덱스 3: 스포츠 + 가시성 피드
```
Collection: activities
Fields:
  - sport → Ascending
  - visibility → Ascending
  - createdAt → Descending
```

#### 인덱스 4: refType별 피드
```
Collection: activities
Fields:
  - refType → Ascending
  - createdAt → Descending
```

### 인덱스 배포
```bash
firebase deploy --only firestore:indexes
```

---

## 🔟 데이터 생성 규칙

### 팀 생성 시
```typescript
// 1. teams 문서 생성
const teamRef = await addDoc(collection(db, "teams"), {
  name: teamName,
  sport: "soccer",
  location: "서울",
  ownerId: userId,
  memberCount: 1,
  createdAt: serverTimestamp(),
});

// 2. teams/{teamId}/members/{userId} 생성
await setDoc(doc(db, "teams", teamRef.id, "members", userId), {
  userId: userId,
  role: "owner",
  joinedAt: serverTimestamp(),
});

// 3. activities → team_created 생성
await addDoc(collection(db, "activities"), {
  type: "team_created",
  refType: "teams",
  refId: teamRef.id,
  actorId: userId,
  sport: "soccer",
  title: `${teamName} 팀이 생성되었습니다`,
  visibility: "public",
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
});
```

### 거래 글 작성 시
```typescript
// 1. market 문서 생성
const marketRef = await addDoc(collection(db, "market"), {
  title: title,
  description: description,
  price: price,
  sellerId: userId,
  sport: "soccer",
  imageUrls: imageUrls,
  status: "active",
  createdAt: serverTimestamp(),
});

// 2. activities → market_post 생성
await addDoc(collection(db, "activities"), {
  type: "market_post",
  refType: "market",
  refId: marketRef.id,
  actorId: userId,
  sport: "soccer",
  title: title,
  summary: `${price.toLocaleString()}원`,
  thumbnailUrl: imageUrls[0],
  visibility: "public",
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
});
```

### 팀 모집 등록 시
```typescript
// 1. recruitPosts 문서 생성 (또는 기존 컬렉션 사용)
const recruitRef = await addDoc(collection(db, "recruitPosts"), {
  teamId: teamId,
  teamName: teamName,
  position: position,
  slots: slots,
  authorId: userId,
  sport: "soccer",
  status: "open",
  createdAt: serverTimestamp(),
});

// 2. activities → team_recruit 생성
await addDoc(collection(db, "activities"), {
  type: "team_recruit",
  refType: "teams",
  refId: recruitRef.id,
  actorId: userId,
  teamId: teamId,
  sport: "soccer",
  title: `${teamName} - ${position.join(", ")} 모집`,
  summary: `모집 인원: ${slots}명`,
  visibility: "public",
  likeCount: 0,
  commentCount: 0,
  createdAt: serverTimestamp(),
});
```

---

## 1️⃣1️⃣ 데이터 일관성 규칙

### 필수 필드 규칙
- 모든 문서는 `createdAt` 필수
- 작성자 관련 문서는 `actorId` 또는 `sellerId` 필수
- 팀 관련 문서는 `teamId` 필수

### 권한 필드 통일
- **플랫폼 권한**: `users/{uid}.role` → `"ADMIN"` | `"USER"` (대문자)
- **팀 권한**: `teams/{teamId}/members/{uid}.role` → `"owner"` | `"admin"` | `"member"` (소문자)

### sport 값 통일
- **영문 코드 사용**: `"soccer"`, `"basketball"`, `"baseball"` 등
- **한글 값 사용 금지**: `"축구"`, `"농구"` 등

### Activity refType 매핑
- `team_created` → `refType: "teams"`
- `team_recruit` → `refType: "teams"`
- `market_post` → `refType: "market"`
- `event_created` → `refType: "events"`

---

## 1️⃣2️⃣ 쿼리 성능 최적화

### 권장 쿼리 패턴
```typescript
// ✅ 올바른 패턴
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc"),
  limit(20)
)

// ❌ 잘못된 패턴 (인덱스 없음)
query(
  collection(db, "activities"),
  where("type", "==", "team_created"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc")
  // limit 없음
)
```

### 비용 절감 원칙
1. **limit 필수**: 모든 리스트 조회에 `limit(20)` 이상 사용
2. **필요한 필드만 조회**: 전체 문서 조회 최소화
3. **인덱스 활용**: 복합 쿼리 시 인덱스 필수
4. **클라이언트 필터링 최소화**: 서버에서 가능한 필터링 수행

---

## 1️⃣3️⃣ 데이터 마이그레이션

### 기존 데이터 정리

#### sport 값 통일
```typescript
// 마이그레이션 스크립트 예시
const sportMap = {
  "축구": "soccer",
  "야구": "baseball",
  "농구": "basketball",
  "배구": "volleyball",
  // ...
};

// 모든 컬렉션의 sport 필드 업데이트
await updateDoc(docRef, {
  sport: sportMap[oldSport] || oldSport,
});
```

#### Activity refType 추가
```typescript
// 기존 Activity에 refType 추가
const refTypeMap = {
  "team_created": "teams",
  "team_recruit": "teams",
  "market_post": "market",
  "event_created": "events",
};

await updateDoc(activityRef, {
  refType: refTypeMap[activity.type] || "market",
});
```

---

## ✅ 적용 체크리스트

### 필수 작업
- [ ] users 컬렉션 스키마 확인
- [ ] teams 컬렉션 스키마 확인
- [ ] market 컬렉션 스키마 확인
- [ ] activities 컬렉션 스키마 확인
- [ ] Activity type 표준 적용
- [ ] Activity refType 표준 적용
- [ ] Firestore Index 생성 및 배포
- [ ] 쿼리 limit 적용 확인
- [ ] 데이터 생성 규칙 적용

### 선택 작업
- [ ] 기존 데이터 마이그레이션
- [ ] 추가 인덱스 생성
- [ ] 쿼리 성능 모니터링

---

## 📝 참고 사항

### 컬렉션 명명 규칙
- 복수형 사용: `users`, `teams`, `activities`
- 카멜케이스 사용: `marketPosts`, `recruitPosts`
- 일관성 유지: 동일한 패턴으로 명명

### 타임스탬프 사용
- `createdAt`: 문서 생성 시각 (필수)
- `updatedAt`: 문서 수정 시각 (선택)
- Firestore `serverTimestamp()` 사용

### 이미지 URL
- Firebase Storage 경로 사용
- 배열로 저장: `imageUrls: string[]`
- 최대 5장 제한 (거래 글)

---

## 🔗 관련 파일

- 타입 정의: `src/types/`
- Rules: `firestore.rules`
- Indexes: `firestore.indexes.json`
- Activity Factory: `src/services/activity/activityFactory.ts`

---

**작성일**: 2024년
**버전**: 1.0
**상태**: 실서비스용 데이터 구조 표준
