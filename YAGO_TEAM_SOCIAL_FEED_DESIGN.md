# 🔥 YAGO VIBE SPORTS - Team Social Feed (팀 SNS 피드) 설계

> **작성일**: 2024년  
> **목적**: Strava + Discord + TeamSnap을 합친 핵심 UX 설계

---

## 📋 목차

1. [Team Social Feed 개념](#1-team-social-feed-개념)
2. [Firestore 구조](#2-firestore-구조)
3. [Feed 타입 정의](#3-feed-타입-정의)
4. [UI 구조](#4-ui-구조)
5. [실제 구현 코드](#5-실제-구현-코드)

---

## 1️⃣ Team Social Feed 개념

### Team Social Feed란?

**팀의 모든 활동을 하나의 소셜 피드로 보여주는 시스템**입니다.

참고 서비스:
- **Strava**: 운동 기록 피드
- **Discord**: 서버 활동 피드
- **TeamSnap**: 팀 활동 피드

### Feed에 표시되는 내용

```
팀 SNS 피드

📅 이벤트 생성
⚽ 경기 결과 등록
📢 공지 작성
👤 멤버 가입
💬 채팅 활성화
📷 사진 업로드
🏆 수상 기록
```

---

## 2️⃣ Firestore 구조

### 2-1. Team Feed 컬렉션

```
teams/{teamId}/feed/{feedId}
```

**문서 스키마**:
```typescript
{
  type: "event" | "notice" | "match" | "member_join" | "media" | "achievement";
  title: string;
  content?: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  referenceId: string; // 이벤트/공지/경기 ID
  metadata?: {
    eventDate?: Timestamp;
    matchScore?: string;
    memberName?: string;
    mediaUrl?: string;
  };
  likes: number;
  comments: number;
  shares: number;
}
```

### 2-2. Feed Comments 서브컬렉션

```
teams/{teamId}/feed/{feedId}/comments/{commentId}
```

**문서 스키마**:
```typescript
{
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp;
}
```

### 2-3. Feed Likes 서브컬렉션

```
teams/{teamId}/feed/{feedId}/likes/{userId}
```

**문서 스키마**:
```typescript
{
  userId: string;
  createdAt: Timestamp;
}
```

---

## 3️⃣ Feed 타입 정의

### 3-1. Feed 타입

```typescript
// src/types/feed.ts
import { Timestamp } from "firebase/firestore";

export type FeedType = 
  | "event"           // 이벤트 생성
  | "notice"          // 공지 작성
  | "match"           // 경기 생성/완료
  | "member_join"     // 멤버 가입
  | "media"           // 사진/영상 업로드
  | "achievement";    // 수상 기록

export interface TeamFeed {
  id: string;
  type: FeedType;
  title: string;
  content?: string;
  authorId: string;
  authorName: string;
  createdAt: Timestamp;
  referenceId: string;
  metadata?: {
    eventDate?: Timestamp;
    matchScore?: string;
    memberName?: string;
    mediaUrl?: string;
  };
  likes: number;
  comments: number;
  shares: number;
}

export interface FeedComment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Timestamp;
}
```

---

## 4️⃣ UI 구조

### 4-1. Team Social Feed 페이지

```
/teams/{teamId}/feed
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 팀 피드                                   │
│                                          │
│ [ 필터 ] [ 정렬 ]                        │
├─────────────────────────────────────────┤
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ 📅 이벤트 생성                       │ │
│ │ 홍길동 · 2시간 전                    │ │
│ │                                     │ │
│ │ 팀 훈련 이벤트 생성                  │ │
│ │ 📅 2024-03-20 15:00                │ │
│ │                                     │ │
│ │ 👍 5  💬 2  🔗 0                    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ ⚽ 경기 결과 등록                     │ │
│ │ 김철수 · 5시간 전                    │ │
│ │                                     │ │
│ │ 노원FC 3 : 2 상계FC 승리             │ │
│ │                                     │ │
│ │ 👍 12  💬 8  🔗 3                   │ │
│ └─────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

### 4-2. Feed Card 컴포넌트

```typescript
// src/components/team/feed/FeedCard.tsx
interface FeedCardProps {
  feed: TeamFeed;
  onLike?: (feedId: string) => void;
  onComment?: (feedId: string) => void;
  onShare?: (feedId: string) => void;
}

export function FeedCard({ feed, onLike, onComment, onShare }: FeedCardProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
      {/* Feed Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar userId={feed.authorId} />
        <div>
          <div className="font-semibold">{feed.authorName}</div>
          <div className="text-sm text-gray-500">
            {formatDistanceToNow(feed.createdAt.toDate(), { addSuffix: true })}
          </div>
        </div>
        <FeedIcon type={feed.type} />
      </div>
      
      {/* Feed Content */}
      <div className="mb-4">
        <h3 className="font-semibold mb-2">{feed.title}</h3>
        {feed.content && (
          <p className="text-gray-700">{feed.content}</p>
        )}
        {feed.metadata?.eventDate && (
          <div className="mt-2 text-sm text-gray-500">
            📅 {feed.metadata.eventDate.toDate().toLocaleDateString()}
          </div>
        )}
        {feed.metadata?.matchScore && (
          <div className="mt-2 text-sm text-gray-500">
            ⚽ {feed.metadata.matchScore}
          </div>
        )}
      </div>
      
      {/* Feed Actions */}
      <div className="flex items-center gap-4 text-sm text-gray-500">
        <button onClick={() => onLike?.(feed.id)} className="flex items-center gap-1">
          👍 {feed.likes}
        </button>
        <button onClick={() => onComment?.(feed.id)} className="flex items-center gap-1">
          💬 {feed.comments}
        </button>
        <button onClick={() => onShare?.(feed.id)} className="flex items-center gap-1">
          🔗 {feed.shares}
        </button>
      </div>
    </div>
  );
}
```

---

## 5️⃣ 실제 구현 코드

### 5-1. Feed Service

```typescript
// src/services/feedService.ts
export async function createFeed(params: {
  teamId: string;
  type: FeedType;
  title: string;
  content?: string;
  authorId: string;
  authorName: string;
  referenceId: string;
  metadata?: any;
}): Promise<string> {
  const feedRef = await addDoc(
    collection(db, "teams", params.teamId, "feed"),
    {
      type: params.type,
      title: params.title,
      content: params.content,
      authorId: params.authorId,
      authorName: params.authorName,
      referenceId: params.referenceId,
      metadata: params.metadata,
      likes: 0,
      comments: 0,
      shares: 0,
      createdAt: serverTimestamp(),
    }
  );
  
  return feedRef.id;
}

export async function likeFeed(
  teamId: string,
  feedId: string,
  userId: string
): Promise<void> {
  const likeRef = doc(db, "teams", teamId, "feed", feedId, "likes", userId);
  const likeSnap = await getDoc(likeRef);
  
  if (likeSnap.exists()) {
    // 이미 좋아요한 경우 취소
    await deleteDoc(likeRef);
    await updateDoc(doc(db, "teams", teamId, "feed", feedId), {
      likes: increment(-1),
    });
  } else {
    // 좋아요 추가
    await setDoc(likeRef, {
      userId,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "teams", teamId, "feed", feedId), {
      likes: increment(1),
    });
  }
}
```

### 5-2. Feed Hook

```typescript
// src/hooks/useTeamFeed.ts
export function useTeamFeed(teamId: string) {
  const [feeds, setFeeds] = useState<TeamFeed[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!teamId) return;
    
    const feedRef = collection(db, "teams", teamId, "feed");
    const q = query(
      feedRef,
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamFeed[];
      setFeeds(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [teamId]);
  
  return { feeds, loading };
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Feed 타입 정의
- [ ] Feed Service 구현
- [ ] Feed Hook 구현
- [ ] FeedCard 컴포넌트
- [ ] Feed 페이지

### Phase 2 (다음)
- [ ] Feed Comments
- [ ] Feed Likes
- [ ] Feed Shares
- [ ] Feed 필터

---

**작성일**: 2024년  
**상태**: ✅ Team Social Feed 설계 완료
