# 🗄️ YAGO VIBE – Firestore 데이터 구조 설계 (실서비스용)

## 📋 목표
YAGO VIBE 서비스의 Firestore 데이터 구조를 명확히 정의하여 개발 속도를 향상시키고 데이터 일관성을 보장합니다.

---

## 1️⃣ users 컬렉션

### 경로
```
users/{uid}
```

### 스키마
```typescript
interface UserProfile {
  // 기본 정보
  uid: string;                    // Firebase Auth UID
  displayName?: string;           // 사용자 이름
  email?: string;                // 이메일
  photoURL?: string;             // 프로필 이미지 URL
  
  // 플랫폼 권한 (대문자)
  role?: "ADMIN" | "USER";       // 기본값: "USER"
  
  // 프로필 정보
  region?: string;               // 지역 (예: "서울", "경기")
  sport?: string;                // 주 종목 (예: "soccer")
  bio?: string;                  // 자기소개
  
  // 판매자 신뢰 점수 시스템
  trustScore?: number;           // 신뢰 점수 (0~100)
  ratingAvg?: number;            // 평균 평점 (0~5)
  completedSales?: number;        // 완료된 거래 수
  reviewCount?: number;           // 리뷰 수
  recentPosts?: number;           // 최근 게시글 수 (30일 이내)
  trustTier?: "guest" | "basic" | "verified" | "trusted" | "top";
  
  // 위험 관리
  riskScore?: number;            // 위험 점수 (0~100, default 0)
  riskFlags?: string[];          // 위험 플래그 배열
  riskTier?: "low" | "medium" | "high"; // 위험 등급
  
  // 메타데이터
  createdAt: Timestamp;          // 생성일시
  updatedAt?: Timestamp;         // 수정일시
  lastLoginAt?: Timestamp;       // 마지막 로그인
}
```

### Rules
```javascript
match /users/{userId} {
  // 읽기: 모든 인증된 사용자 (프로필 공개)
  allow read: if isAuthenticated();
  
  // 생성: 본인만 (회원가입 시)
  allow create: if isAuthenticated() && request.auth.uid == userId;
  
  // 수정/삭제: 본인만
  allow update, delete: if isAuthenticated() && request.auth.uid == userId;
}
```

### 인덱스
- `role` ASC + `createdAt` DESC (관리자 조회용)

---

## 2️⃣ teams 컬렉션

### 경로
```
teams/{teamId}
```

### 스키마
```typescript
interface Team {
  // 기본 정보
  name: string;                  // 팀 이름
  sport: string;                 // 종목 (예: "soccer", "basketball")
  region: string;                // 지역 (예: "서울", "경기")
  level?: string;                // 실력 수준 (예: "beginner", "intermediate", "advanced")
  
  // 소유자
  ownerUid: string;             // 팀 소유자 UID
  
  // 팀 정보
  logo?: string;                 // 팀 로고 URL
  description?: string;          // 팀 설명
  location?: {                   // 팀 위치
    lat: number;
    lng: number;
    address?: string;
  };
  
  // 메타데이터
  createdAt: Timestamp;          // 생성일시
  updatedAt?: Timestamp;         // 수정일시
}
```

### 서브컬렉션: members
```
teams/{teamId}/members/{memberId}
```

```typescript
interface TeamMember {
  userId: string;                // 사용자 UID
  role: "owner" | "admin" | "member"; // 팀 권한 (소문자)
  status: "active" | "inactive"; // 상태
  joinedAt: Timestamp;          // 가입일시
}
```

### Rules
```javascript
match /teams/{teamId} {
  // 읽기: 모든 인증된 사용자 (팀 정보 공개)
  allow read: if isAuthenticated();
  
  // 생성: 인증된 사용자만
  allow create: if isAuthenticated() &&
    request.resource.data.ownerUid == request.auth.uid;
  
  // 수정: 팀 소유자만
  allow update: if isTeamOwner(teamId);
  
  // 삭제: 팀 소유자만
  allow delete: if isTeamOwner(teamId);
}
```

### 인덱스
- `sport` ASC + `region` ASC + `createdAt` DESC
- `ownerUid` ASC + `createdAt` DESC

---

## 3️⃣ activities 컬렉션

### 경로
```
activities/{activityId}
```

### 스키마
```typescript
interface Activity {
  // 타입 정보
  type: ActivityType;            // 활동 타입
  refType: ActivityRefType;      // 참조 컬렉션 타입
  refId: string;                  // 참조 문서 ID
  
  // 작성자 정보
  authorId: string;              // 작성자 UID
  teamId?: string;                // 팀 ID (팀 관련 활동인 경우)
  
  // 콘텐츠
  title: string;                 // 제목
  summary?: string;              // 요약
  thumbnailUrl?: string;          // 썸네일 이미지 URL
  
  // 가시성
  visibility: "public" | "team" | "private";
  
  // 통계
  likeCount: number;             // 좋아요 수 (기본값: 0)
  commentCount: number;          // 댓글 수 (기본값: 0)
  
  // 메타데이터
  sport?: string;                // 종목 (예: "soccer")
  category?: string;             // 카테고리 (예: "equipment", "recruit")
  createdAt: Timestamp;          // 생성일시
  updatedAt?: Timestamp;        // 수정일시
}
```

### ActivityType
```typescript
type ActivityType =
  | "team_created"      // 팀 생성
  | "team_notice"       // 팀 공지
  | "team_event"        // 팀 이벤트
  | "market_created"    // 거래 글 생성
  | "equipment_created" // 장비 거래 생성
  | "recruit_created"   // 모집 생성
  | "match_created";    // 경기 매칭 생성
```

### ActivityRefType
```typescript
type ActivityRefType =
  | "teams"      // 팀 관련
  | "notices"    // 공지 관련
  | "events"     // 이벤트 관련
  | "market"     // 거래 관련
  | "recruit"    // 모집 관련
  | "match"      // 경기 매칭 관련
  | "equipment"; // 장비 관련
```

### Rules
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

### 인덱스
- `sport` ASC + `createdAt` DESC
- `visibility` ASC + `createdAt` DESC
- `sport` ASC + `visibility` ASC + `createdAt` DESC
- `refType` ASC + `createdAt` DESC

---

## 4️⃣ marketPosts 컬렉션

### 경로
```
marketPosts/{postId}
```

### 스키마
```typescript
interface MarketPost {
  // 기본 정보
  title: string;                 // 제목
  description?: string;           // 설명
  price: number;                 // 가격
  category: "equipment";          // 카테고리 (장비 거래)
  
  // 작성자 정보
  authorId: string;              // 작성자 UID
  
  // 상품 정보
  sport: string;                  // 종목 (예: "soccer")
  images?: string[];              // 이미지 URL 배열 (최대 5장)
  location?: {                    // 위치
    lat: number;
    lng: number;
    address?: string;
  };
  
  // 상태
  status: "active" | "reserved" | "done"; // 거래 상태
  
  // 메타데이터
  createdAt: Timestamp;          // 생성일시
  updatedAt?: Timestamp;         // 수정일시
  viewCount?: number;            // 조회수
}
```

### Rules
```javascript
match /marketPosts/{postId} {
  // 읽기: 모든 인증된 사용자 (공개)
  allow read: if isAuthenticated();
  
  // 생성: 인증된 사용자만
  allow create: if isAuthenticated() &&
    request.resource.data.authorId == request.auth.uid &&
    request.resource.data.status in ["active", "reserved", "done"];
  
  // 수정/삭제: 작성자만
  allow update, delete: if isAuthor(resource.data.authorId);
}
```

### 인덱스
- `sport` ASC + `status` ASC + `createdAt` DESC
- `status` ASC + `sport` ASC + `category` ASC + `createdAt` DESC
- `authorId` ASC + `createdAt` DESC

---

## 5️⃣ recruitPosts 컬렉션

### 경로
```
recruitPosts/{postId}
```

### 스키마
```typescript
interface RecruitPost {
  // 기본 정보
  title?: string;                 // 제목 (선택사항)
  description?: string;           // 설명
  
  // 팀 정보
  teamId: string;                // 팀 ID
  teamName: string;              // 팀 이름
  
  // 모집 정보
  position: string[];             // 포지션 배열 (예: ["공격수", "수비수"])
  slots: number;                  // 모집 인원
  level?: string;                 // 실력 수준
  
  // 작성자 정보
  authorId: string;              // 작성자 UID
  
  // 상태
  status: "open" | "closed";     // 모집 상태
  
  // 메타데이터
  sport: string;                 // 종목
  region?: string;               // 지역
  createdAt: Timestamp;          // 생성일시
  updatedAt?: Timestamp;        // 수정일시
}
```

### Rules
```javascript
match /recruitPosts/{postId} {
  // 읽기: 모든 인증된 사용자 (공개)
  allow read: if isAuthenticated();
  
  // 생성: 인증된 사용자만 (팀 소속은 앱에서 체크)
  allow create: if isAuthenticated() &&
    request.resource.data.authorId == request.auth.uid &&
    request.resource.data.teamId is string &&
    request.resource.data.status == "open";
  
  // 수정/삭제: 작성자만
  allow update, delete: if isAuthor(resource.data.authorId);
}
```

### 인덱스
- `sport` ASC + `status` ASC + `createdAt` DESC
- `teamId` ASC + `status` ASC + `createdAt` DESC
- `authorId` ASC + `createdAt` DESC

---

## 6️⃣ matchPosts 컬렉션

### 경로
```
matchPosts/{postId}
```

### 스키마
```typescript
interface MatchPost {
  // 기본 정보
  title?: string;                 // 제목 (선택사항)
  description?: string;           // 설명
  
  // 팀 정보
  teamId: string;                // 팀 ID
  teamName: string;              // 팀 이름
  
  // 경기 정보
  date: Timestamp;               // 경기 날짜
  time?: string;                 // 경기 시간
  location?: {                   // 경기 장소
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
  };
  level?: string;                // 실력 수준
  
  // 작성자 정보
  authorId: string;              // 작성자 UID
  
  // 상태
  status: "open" | "matched" | "finished"; // 매칭 상태
  
  // 메타데이터
  sport: string;                 // 종목
  region?: string;               // 지역
  createdAt: Timestamp;         // 생성일시
  updatedAt?: Timestamp;        // 수정일시
}
```

### Rules
```javascript
match /matchPosts/{postId} {
  // 읽기: 모든 인증된 사용자 (공개)
  allow read: if isAuthenticated();
  
  // 생성: 인증된 사용자만 (팀 소속은 앱에서 체크)
  allow create: if isAuthenticated() &&
    request.resource.data.authorId == request.auth.uid &&
    request.resource.data.teamId is string &&
    request.resource.data.status == "open";
  
  // 수정/삭제: 작성자만
  allow update, delete: if isAuthor(resource.data.authorId);
}
```

### 인덱스
- `sport` ASC + `status` ASC + `createdAt` DESC
- `teamId` ASC + `status` ASC + `createdAt` DESC
- `date` ASC + `status` ASC

---

## 7️⃣ notifications 컬렉션

### 경로
```
notifications/{notificationId}
```

### 스키마
```typescript
interface Notification {
  // 수신자
  userId: string;                // 수신자 UID
  
  // 알림 정보
  type: string;                   // 알림 타입
  title: string;                  // 제목
  message: string;                // 메시지
  link?: string;                  // 링크 URL
  
  // 상태
  isRead: boolean;                // 읽음 여부 (기본값: false)
  
  // 메타데이터
  createdAt: Timestamp;          // 생성일시
  readAt?: Timestamp;            // 읽은 시각
}
```

### Rules
```javascript
match /notifications/{notiId} {
  // 읽기: 본인만
  allow read: if isAuthenticated() &&
    resource.data.userId == request.auth.uid;
  
  // 생성: 인증된 사용자만 (앱 또는 Cloud Functions)
  allow create: if isAuthenticated();
  
  // 수정: 본인만 (읽음 처리)
  allow update: if isAuthenticated() &&
    resource.data.userId == request.auth.uid;
  
  // 삭제: 본인만
  allow delete: if isAuthenticated() &&
    resource.data.userId == request.auth.uid;
}
```

### 인덱스
- `userId` ASC + `isRead` ASC + `createdAt` DESC

---

## 8️⃣ 데이터 관계도

### Activity와 다른 컬렉션의 관계

```
Activity (activities/{activityId})
  ├─ type: "team_created"
  │   └─ refId → teams/{teamId}
  │
  ├─ type: "recruit_created"
  │   └─ refId → recruitPosts/{postId}
  │
  ├─ type: "match_created"
  │   └─ refId → matchPosts/{postId}
  │
  └─ type: "equipment_created"
      └─ refId → marketPosts/{postId}
```

### 팀과 관련 컬렉션의 관계

```
Team (teams/{teamId})
  ├─ members (teams/{teamId}/members/{memberId})
  ├─ recruitPosts (recruitPosts/{postId} where teamId == teamId)
  └─ matchPosts (matchPosts/{postId} where teamId == teamId)
```

---

## 9️⃣ 데이터 생성 패턴

### Activity 생성 패턴

#### 팀 생성 시
```typescript
await createTeamCreatedActivity({
  refId: teamId,
  authorId: userId,
  teamId: teamId,
  title: `${teamName} 팀이 생성되었습니다`,
  sport: "soccer",
  type: "team_created",
});
```

#### 모집 글 생성 시
```typescript
await createTeamRecruitActivity({
  refId: recruitPostId,
  authorId: userId,
  teamId: teamId,
  title: `${teamName} - ${position.join(", ")} 모집`,
  sport: "soccer",
  type: "recruit_created",
});
```

#### 거래 글 생성 시
```typescript
await createMarketActivity({
  refId: marketPostId,
  authorId: userId,
  title: title,
  summary: description,
  thumbnailUrl: images[0],
  sport: "soccer",
  category: "equipment",
  type: "equipment_created",
});
```

---

## 🔟 데이터 일관성 규칙

### 필수 필드
- 모든 문서는 `createdAt` 필수
- 작성자 관련 문서는 `authorId` 필수
- 팀 관련 문서는 `teamId` 필수

### 권한 필드 통일
- 플랫폼 권한: `users/{uid}.role` → `"ADMIN"` | `"USER"` (대문자)
- 팀 권한: `teams/{teamId}/members/{uid}.role` → `"owner"` | `"admin"` | `"member"` (소문자)

### sport 값 통일
- 영문 코드 사용: `"soccer"`, `"basketball"`, `"baseball"` 등
- 한글 값 사용 금지: `"축구"`, `"농구"` 등

### Activity refType 매핑
- `team_created` → `refType: "teams"`
- `recruit_created` → `refType: "teams"` (또는 `"recruit"`)
- `match_created` → `refType: "match"`
- `equipment_created` → `refType: "market"`

---

## 1️⃣1️⃣ 쿼리 패턴

### Activity Feed 조회
```typescript
// 전체 피드 (공개 활동만)
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  orderBy("createdAt", "desc"),
  limit(20)
)

// 종목별 피드
query(
  collection(db, "activities"),
  where("visibility", "==", "public"),
  where("sport", "==", "soccer"),
  orderBy("createdAt", "desc"),
  limit(20)
)

// 팀 피드
query(
  collection(db, "activities"),
  where("visibility", "in", ["public", "team"]),
  where("teamId", "==", teamId),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

### 거래 목록 조회
```typescript
// 종목별 거래 목록
query(
  collection(db, "marketPosts"),
  where("sport", "==", "soccer"),
  where("status", "==", "active"),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

### 모집 목록 조회
```typescript
// 종목별 모집 목록
query(
  collection(db, "recruitPosts"),
  where("sport", "==", "soccer"),
  where("status", "==", "open"),
  orderBy("createdAt", "desc"),
  limit(20)
)
```

---

## 1️⃣2️⃣ 데이터 마이그레이션 가이드

### 기존 데이터 정리

#### sport 값 통일
```typescript
// "축구" → "soccer" 변환
const sportMap = {
  "축구": "soccer",
  "야구": "baseball",
  "농구": "basketball",
  // ...
};
```

#### Activity refType 추가
```typescript
// 기존 Activity에 refType 추가
const refTypeMap = {
  "team_created": "teams",
  "recruit_created": "teams",
  "match_created": "match",
  "equipment_created": "market",
};
```

---

## 📝 참고 사항

### 컬렉션 명명 규칙
- 복수형 사용: `users`, `teams`, `activities`
- 카멜케이스 사용: `marketPosts`, `recruitPosts`, `matchPosts`
- 일관성 유지: 동일한 패턴으로 명명

### 타임스탬프 사용
- `createdAt`: 문서 생성 시각 (필수)
- `updatedAt`: 문서 수정 시각 (선택)
- Firestore `serverTimestamp()` 사용

### 이미지 URL
- Firebase Storage 경로 사용
- `https://firebasestorage.googleapis.com/...` 형식
- 배열로 저장: `images: string[]`

---

## 🔗 관련 파일

- 타입 정의: `src/types/`
- Rules: `firestore.rules`
- Indexes: `firestore.indexes.json`
- Activity Factory: `src/services/activity/activityFactory.ts`

---

**작성일**: 2024년
**버전**: 1.0
**상태**: 실서비스용 데이터 구조 설계
