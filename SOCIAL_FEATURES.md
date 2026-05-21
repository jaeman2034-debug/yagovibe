# 🔥 Social Features 설계 문서

## 📋 개요

Sports Platform에 Social 기능을 추가하여 **데이터 플랫폼 → 커뮤니티 플랫폼**으로 확장합니다.

---

## 🎯 목표

### 핵심 기능
- ✅ Like (좋아요)
- ✅ Comment (댓글)
- ✅ Share (공유)
- ✅ Follow (팔로우)
- ✅ Notification (알림 연동)

### 적용 대상
- Media (사진/영상)
- Match (경기)
- Team (팀)
- Player (선수)
- Event (대회)

---

## 📊 Firestore 컬렉션 구조

### likes/{likeId}

```typescript
{
  id: string; // userId_entityType_entityId
  userId: string;
  entityType: "media" | "match" | "team" | "player" | "event" | "post";
  entityId: string;
  createdAt: Timestamp;
}
```

**Unique Like 방지**: `likeId = userId_entityType_entityId` 형식으로 중복 방지

### comments/{commentId}

```typescript
{
  id: string;
  entityType: SocialEntityType;
  entityId: string;
  userId: string;
  userName?: string;
  userPhotoURL?: string;
  text: string;
  parentId?: string | null; // 대댓글 지원
  likesCount?: number;
  repliesCount?: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp; // 소프트 삭제
}
```

### shares/{shareId}

```typescript
{
  id: string;
  userId: string;
  entityType: SocialEntityType;
  entityId: string;
  shareType: "internal" | "external";
  platform?: "twitter" | "facebook" | "kakao" | "link";
  createdAt: Timestamp;
}
```

### follows/{followId}

```typescript
{
  id: string; // followerId_targetType_targetId
  followerId: string;
  targetType: "team" | "player" | "user" | "event";
  targetId: string;
  createdAt: Timestamp;
}
```

---

## 🔍 쿼리 패턴

### Like 조회

```typescript
// Entity의 Like 목록
query(
  collection(db, "likes"),
  where("entityType", "==", "media"),
  where("entityId", "==", mediaId),
  orderBy("createdAt", "desc")
)

// 사용자의 Like 목록
query(
  collection(db, "likes"),
  where("userId", "==", userId),
  orderBy("createdAt", "desc")
)
```

### Comment 조회

```typescript
// Entity의 댓글 목록 (부모 댓글만)
query(
  collection(db, "comments"),
  where("entityType", "==", "media"),
  where("entityId", "==", mediaId),
  where("parentId", "==", null),
  orderBy("createdAt", "asc")
)

// 대댓글 조회
query(
  collection(db, "comments"),
  where("parentId", "==", parentCommentId),
  orderBy("createdAt", "asc")
)
```

### Follow 조회

```typescript
// 사용자가 팔로우한 목록
query(
  collection(db, "follows"),
  where("followerId", "==", userId),
  where("targetType", "==", "team"),
  orderBy("createdAt", "desc")
)

// 대상의 팔로워 목록
query(
  collection(db, "follows"),
  where("targetType", "==", "team"),
  where("targetId", "==", teamId),
  orderBy("createdAt", "desc")
)
```

---

## ⚡ 성능 최적화

### Counter Fields

Entity에 직접 counter 저장:

```typescript
media.likesCount
media.commentsCount
media.sharesCount
team.followersCount
```

**장점:**
- 매번 count 쿼리 불필요
- 빠른 읽기 성능

**Cloud Functions:**
- `onLikeCreated` → `likesCount += 1`
- `onLikeDeleted` → `likesCount -= 1`
- `onCommentCreated` → `commentsCount += 1`
- `onFollowCreated` → `followersCount += 1`

---

## 🔔 Notification 연동

### Like 알림

```typescript
{
  type: "LIKE_RECEIVED",
  title: "좋아요",
  message: "누군가님이 사진에 좋아요를 눌렀습니다",
  target: { screen: "media", id: mediaId }
}
```

### Comment 알림

```typescript
{
  type: "COMMENT_RECEIVED",
  title: "댓글",
  message: "누군가님이 댓글을 남겼습니다",
  target: { screen: "media", id: mediaId }
}
```

### Follow 알림

```typescript
{
  type: "FOLLOW_RECEIVED",
  title: "팔로우",
  message: "누군가님이 팀을 팔로우했습니다",
  target: { screen: "team", id: teamId }
}
```

---

## 🧩 React 컴포넌트 구조

### SocialBar

```typescript
<SocialBar
  entityType="media"
  entityId={mediaId}
  showStats={true}
/>
```

**기능:**
- LikeButton, CommentButton, ShareButton 통합
- Social Stats 표시 (좋아요 수, 댓글 수, 공유 수)

### LikeButton

```typescript
<LikeButton
  entityType="media"
  entityId={mediaId}
  onLikeChange={() => {}}
/>
```

**기능:**
- 좋아요 토글
- 좋아요 상태 표시 (빨간 하트)
- 실시간 업데이트

### CommentButton

```typescript
<CommentButton
  entityType="media"
  entityId={mediaId}
  onCommentChange={() => {}}
/>
```

**기능:**
- 댓글 다이얼로그 열기
- 댓글 수 표시

### CommentDialog

**기능:**
- 댓글 목록 표시
- 댓글 작성
- 대댓글 지원
- 무한 스크롤 (향후)

### ShareButton

```typescript
<ShareButton
  entityType="media"
  entityId={mediaId}
  onShareChange={() => {}}
/>
```

**기능:**
- 링크 복사
- 외부 공유 (Twitter, Facebook, Kakao)

### FollowButton

```typescript
<FollowButton
  targetType="team"
  targetId={teamId}
  onFollowChange={() => {}}
/>
```

**기능:**
- 팔로우 토글
- 팔로우 상태 표시

---

## 📱 페이지 통합

### MediaGallery

```typescript
<MediaGallery entityType="match" entityId={matchId} />
// 내부에 SocialBar 자동 포함
```

### Team Page

```typescript
<FollowButton targetType="team" targetId={teamId} />
<SocialBar entityType="team" entityId={teamId} />
```

### Player Page

```typescript
<FollowButton targetType="player" targetId={playerId} />
<SocialBar entityType="player" entityId={playerId} />
```

### Match Page

```typescript
<SocialBar entityType="match" entityId={matchId} />
```

---

## 🔐 Firestore Security Rules

### Like

```javascript
match /likes/{likeId} {
  allow create: if request.auth != null 
    && request.auth.uid == request.resource.data.userId;
  allow read: if request.auth != null;
  allow delete: if request.auth != null 
    && request.auth.uid == resource.data.userId;
}
```

### Comment

```javascript
match /comments/{commentId} {
  allow create: if request.auth != null;
  allow read: if request.auth != null;
  allow update: if request.auth != null 
    && request.auth.uid == resource.data.userId;
  allow delete: if request.auth != null 
    && request.auth.uid == resource.data.userId;
}
```

### Follow

```javascript
match /follows/{followId} {
  allow create: if request.auth != null 
    && request.auth.uid == request.resource.data.followerId;
  allow read: if request.auth != null;
  allow delete: if request.auth != null 
    && request.auth.uid == resource.data.followerId;
}
```

---

## 🚀 Cloud Functions

### onLikeCreated

**트리거**: `likes/{likeId}` 생성 시

**역할:**
- Entity의 `likesCount` 증가
- Notification 생성 (좋아요 받은 사용자에게)

### onLikeDeleted

**트리거**: `likes/{likeId}` 삭제 시

**역할:**
- Entity의 `likesCount` 감소

### onCommentCreated (향후)

**트리거**: `comments/{commentId}` 생성 시

**역할:**
- Entity의 `commentsCount` 증가
- 부모 댓글의 `repliesCount` 증가 (대댓글인 경우)
- Notification 생성

### onFollowCreated (향후)

**트리거**: `follows/{followId}` 생성 시

**역할:**
- Target의 `followersCount` 증가
- Notification 생성

---

## ✅ 구현 완료 항목

- [x] Social 타입 정의 (Like, Comment, Share, Follow)
- [x] Social Service 레이어
- [x] Cloud Functions (Like 생성/삭제 트리거)
- [x] SocialBar 컴포넌트
- [x] LikeButton 컴포넌트
- [x] CommentButton / CommentDialog 컴포넌트
- [x] ShareButton 컴포넌트
- [x] FollowButton 컴포넌트
- [x] Notification 타입 확장

---

## 🎯 향후 확장

### Phase 2

- [ ] Comment Cloud Functions (counter 업데이트, 알림)
- [ ] Follow Cloud Functions (counter 업데이트, 알림)
- [ ] Share Cloud Functions (counter 업데이트)

### Phase 3

- [ ] Activity Feed (Social 활동 피드)
- [ ] 댓글 좋아요
- [ ] 댓글 수정/삭제
- [ ] 댓글 무한 스크롤
- [ ] 댓글 실시간 업데이트

### Phase 4

- [ ] Social Analytics
- [ ] 인기 콘텐츠 추천
- [ ] 팔로우 피드

---

## 📈 결과

Social Features 완료로 플랫폼은:

```
✅ 운영 플랫폼 (Admin / Stats / Realtime)
✅ 콘텐츠 플랫폼 (Media System)
✅ 커뮤니케이션 플랫폼 (Notifications + Email)
✅ 소셜 플랫폼 (Like / Comment / Share / Follow) ← 새로 완성!
```

**4개 레이어가 모두 구축된 상태**입니다.

이제 플랫폼은 **데이터 플랫폼**에서 **스포츠 커뮤니티 플랫폼**으로 확장되었습니다. 🎉

---

## 🚀 다음 단계

Social Features가 완료되면 자연스럽게 다음 단계는:

### Activity Feed System

- 사용자 활동 피드
- 팔로우한 팀/선수 활동
- 인기 콘텐츠 추천
- 실시간 피드 업데이트

이 기능이 들어가면 플랫폼이 **완전한 스포츠 SNS**가 됩니다.
