# 🔥 YAGO VIBE SPORTS - Team Social Feed (팀 SNS 피드) 완전 설계

> **작성일**: 2024년  
> **목적**: Strava + Discord + TeamSnap을 합친 핵심 UX 설계

---

## 📋 목차

1. [Team Social Feed 개념](#1-team-social-feed-개념)
2. [Feed 위치 및 통합](#2-feed-위치-및-통합)
3. [Firestore 구조](#3-firestore-구조)
4. [Feed 타입 정의](#4-feed-타입-정의)
5. [UI 구조](#5-ui-구조)
6. [React 컴포넌트 구조](#6-react-컴포넌트-구조)
7. [Activity Feed와 차이](#7-activity-feed와-차이)
8. [Notification 연결](#8-notification-연결)
9. [실제 구현 코드](#9-실제-구현-코드)

---

## 1️⃣ Team Social Feed 개념

### Team Social Feed란?

**팀 활동을 SNS처럼 보여주는 피드**입니다.

참고 서비스:
- **Strava**: 운동 기록 피드
- **Discord**: 서버 활동 피드
- **TeamSnap**: 팀 활동 피드
- **Facebook Groups**: 그룹 피드

### Feed에 표시되는 내용

```
팀 SNS 피드

📸 훈련 사진 업로드
⚽ 경기 결과 공유
📢 팀 공지
📅 이벤트 생성
👤 신규 멤버 가입
💬 경기 후기
🏆 수상 기록
```

### 팀 = 작은 SNS 커뮤니티

팀원들이 자유롭게 게시물을 올리고 소통할 수 있는 공간입니다.

---

## 2️⃣ Feed 위치 및 통합

### Team Workspace 안에 통합

```
/teams/{teamId}
```

**탭 구조**:
```
TEAM WORKSPACE

[ 활동 피드 ]  ← Activity Feed (자동 생성)
[ 소셜 피드 ]  ← Social Feed (사용자 생성) ⭐ 새로 추가
[ 채팅 ]
[ 공지 ]
[ 이벤트 ]
[ 경기 ]
[ 멤버 ]
```

### 두 피드의 차이

**Activity Feed** (자동 생성):
- 공지 작성
- 이벤트 생성
- 경기 생성
- 멤버 가입

**Social Feed** (사용자 생성):
- 사진 업로드
- 글 작성
- 영상 공유
- 경기 후기
- 훈련 일지

---

## 3️⃣ Firestore 구조

### 3-1. Posts 컬렉션

```
teams/{teamId}/posts/{postId}
```

**문서 스키마**:
```typescript
{
  authorId: string;
  authorName: string;
  content: string;
  images?: string[]; // 이미지 URL 배열
  videoUrl?: string; // 영상 URL
  type: "text" | "image" | "video" | "match_review" | "training_log";
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isPinned?: boolean; // 고정 게시물
}
```

### 3-2. Comments 서브컬렉션

```
teams/{teamId}/posts/{postId}/comments/{commentId}
```

**문서 스키마**:
```typescript
{
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

### 3-3. Likes 서브컬렉션

```
teams/{teamId}/posts/{postId}/likes/{userId}
```

**문서 스키마**:
```typescript
{
  userId: string;
  createdAt: Timestamp;
}
```

**참고**: 문서 ID = userId (중복 방지)

---

## 4️⃣ Feed 타입 정의

### 4-1. Post 타입

```typescript
// src/types/feed.ts
import { Timestamp } from "firebase/firestore";

export type PostType = 
  | "text"           // 텍스트 게시물
  | "image"          // 이미지 게시물
  | "video"          // 영상 게시물
  | "match_review"   // 경기 후기
  | "training_log";  // 훈련 일지

export interface TeamPost {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  images?: string[];
  videoUrl?: string;
  type: PostType;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  isPinned?: boolean;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  text: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}
```

---

## 5️⃣ UI 구조

### 5-1. Team Social Feed 페이지

```
/teams/{teamId}/feed
```

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 팀 소셜 피드                              │
│                                          │
│ [ 게시물 작성 ]                           │
├─────────────────────────────────────────┤
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ John                                │ │
│ │ 2시간 전                             │ │
│ │                                     │ │
│ │ 오늘 훈련 사진                        │ │
│ │                                     │ │
│ │ [사진 1] [사진 2] [사진 3]          │ │
│ │                                     │ │
│ │ 👍 5  💬 2  🔗 0                    │ │
│ └─────────────────────────────────────┘ │
│                                          │
│ ┌─────────────────────────────────────┐ │
│ │ Alex                                │ │
│ │ 5시간 전                             │ │
│ │                                     │ │
│ │ 경기 결과 공유                        │ │
│ │                                     │ │
│ │ Tigers 3 : 2 Lions 승리!             │ │
│ │ 오늘 경기 정말 멋졌습니다.            │ │
│ │                                     │ │
│ │ 👍 8  💬 3  🔗 1                    │ │
│ └─────────────────────────────────────┘ │
│                                          │
└─────────────────────────────────────────┘
```

### 5-2. 게시물 작성 모달

```
┌─────────────────────────────────────────┐
│ 게시물 작성                               │
├─────────────────────────────────────────┤
│                                          │
│ [텍스트 입력 영역]                        │
│                                          │
│ [사진 추가] [영상 추가]                   │
│                                          │
│ [ 업로드 ] [ 취소 ]                      │
│                                          │
└─────────────────────────────────────────┘
```

---

## 6️⃣ React 컴포넌트 구조

### 6-1. 컴포넌트 트리

```
components/team/feed/
  ├─ TeamFeed.tsx              # 메인 피드 컴포넌트
  ├─ FeedPostCard.tsx          # 게시물 카드
  ├─ FeedCommentList.tsx       # 댓글 목록
  ├─ FeedCommentItem.tsx       # 댓글 아이템
  ├─ CreatePostModal.tsx       # 게시물 작성 모달
  ├─ PostImageGrid.tsx         # 이미지 그리드
  └─ PostActions.tsx           # 좋아요/댓글/공유 버튼
```

### 6-2. TeamFeed 컴포넌트

```typescript
// src/components/team/feed/TeamFeed.tsx
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeamPost } from "@/types/feed";
import { FeedPostCard } from "./FeedPostCard";
import { CreatePostModal } from "./CreatePostModal";

interface TeamFeedProps {
  teamId: string;
}

export function TeamFeed({ teamId }: TeamFeedProps) {
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  useEffect(() => {
    if (!teamId) return;
    
    const postsRef = collection(db, "teams", teamId, "posts");
    const q = query(
      postsRef,
      orderBy("createdAt", "desc"),
      limit(20)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TeamPost[];
      setPosts(data);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [teamId]);
  
  if (loading) {
    return <div>로딩 중...</div>;
  }
  
  return (
    <div>
      <div className="mb-4">
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          게시물 작성
        </button>
      </div>
      
      <div className="space-y-4">
        {posts.map((post) => (
          <FeedPostCard key={post.id} post={post} teamId={teamId} />
        ))}
      </div>
      
      {showCreateModal && (
        <CreatePostModal
          teamId={teamId}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}
```

### 6-3. FeedPostCard 컴포넌트

```typescript
// src/components/team/feed/FeedPostCard.tsx
import { TeamPost } from "@/types/feed";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Avatar } from "@/components/ui/Avatar";
import { PostImageGrid } from "./PostImageGrid";
import { PostActions } from "./PostActions";
import { FeedCommentList } from "./FeedCommentList";
import { useState } from "react";

interface FeedPostCardProps {
  post: TeamPost;
  teamId: string;
}

export function FeedPostCard({ post, teamId }: FeedPostCardProps) {
  const [showComments, setShowComments] = useState(false);
  const timeAgo = formatDistanceToNow(post.createdAt.toDate(), {
    addSuffix: true,
    locale: ko,
  });
  
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
      {/* Post Header */}
      <div className="flex items-center gap-3 mb-4">
        <Avatar userId={post.authorId} />
        <div className="flex-1">
          <div className="font-semibold">{post.authorName}</div>
          <div className="text-sm text-gray-500">{timeAgo}</div>
        </div>
        {post.isPinned && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            고정
          </span>
        )}
      </div>
      
      {/* Post Content */}
      <div className="mb-4">
        <p className="text-gray-900 whitespace-pre-wrap">{post.content}</p>
        
        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="mt-4">
            <PostImageGrid images={post.images} />
          </div>
        )}
        
        {/* Video */}
        {post.videoUrl && (
          <div className="mt-4">
            <video
              src={post.videoUrl}
              controls
              className="w-full rounded-lg"
            />
          </div>
        )}
      </div>
      
      {/* Post Actions */}
      <PostActions
        post={post}
        teamId={teamId}
        onCommentClick={() => setShowComments(!showComments)}
      />
      
      {/* Comments */}
      {showComments && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <FeedCommentList postId={post.id} teamId={teamId} />
        </div>
      )}
    </div>
  );
}
```

### 6-4. CreatePostModal 컴포넌트

```typescript
// src/components/team/feed/CreatePostModal.tsx
import { useState } from "react";
import { useAuth } from "@/context/AuthProvider";
import { createPost } from "@/services/feedService";
import { uploadImages } from "@/services/storageService";

interface CreatePostModalProps {
  teamId: string;
  onClose: () => void;
}

export function CreatePostModal({ teamId, onClose }: CreatePostModalProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !content.trim()) return;
    
    setLoading(true);
    try {
      // 이미지 업로드
      let imageUrls: string[] = [];
      if (images.length > 0) {
        imageUrls = await uploadImages(images);
      }
      
      // 게시물 생성
      await createPost({
        teamId,
        authorId: user.uid,
        authorName: user.displayName || "익명",
        content: content.trim(),
        images: imageUrls,
        type: images.length > 0 ? "image" : "text",
      });
      
      onClose();
    } catch (error) {
      console.error("게시물 생성 실패:", error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4">
        <h2 className="text-xl font-bold mb-4">게시물 작성</h2>
        
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="무엇을 공유하고 싶으신가요?"
            className="w-full h-32 p-3 border border-gray-300 rounded-lg mb-4"
            required
          />
          
          <div className="mb-4">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setImages(Array.from(e.target.files || []))}
              className="text-sm"
            />
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "업로드 중..." : "게시"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              취소
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

---

## 7️⃣ Activity Feed와 차이

### Activity Feed (자동 생성)

**역할**: 시스템이 자동으로 생성하는 활동 기록

**타입**:
- `event` - 이벤트 생성
- `notice` - 공지 작성
- `match` - 경기 생성/완료
- `member_join` - 멤버 가입

**생성 방식**: Cloud Functions 자동 생성

**위치**: `/teams/{teamId}/activities`

---

### Social Feed (사용자 생성)

**역할**: 사용자가 직접 작성하는 게시물

**타입**:
- `text` - 텍스트 게시물
- `image` - 이미지 게시물
- `video` - 영상 게시물
- `match_review` - 경기 후기
- `training_log` - 훈련 일지

**생성 방식**: 사용자가 직접 작성

**위치**: `/teams/{teamId}/posts`

---

## 8️⃣ Notification 연결

### Feed 알림 타입

```typescript
// 새 게시물 알림
{
  type: "post_created",
  message: "John이 게시물을 작성했습니다",
  link: `/teams/${teamId}/feed`
}

// 댓글 알림
{
  type: "post_comment",
  message: "Alex가 게시물에 댓글을 남겼습니다",
  link: `/teams/${teamId}/feed#post-${postId}`
}

// 좋아요 알림 (선택적)
{
  type: "post_like",
  message: "5명이 게시물에 좋아요를 눌렀습니다",
  link: `/teams/${teamId}/feed#post-${postId}`
}
```

### Cloud Function 트리거

```typescript
// functions/src/feed/onPostCreated.ts
export const onPostCreated = onDocumentCreated(
  "teams/{teamId}/posts/{postId}",
  async (event) => {
    const { teamId, postId } = event.params;
    const postData = event.data?.data();
    
    // 팀 멤버들에게 알림 발송
    const membersRef = collection(db, "teams", teamId, "members");
    const membersSnap = await getDocs(membersRef);
    
    const notifications = membersSnap.docs
      .filter(doc => doc.id !== postData.authorId) // 작성자 제외
      .map(doc => ({
        userId: doc.id,
        type: "post_created",
        message: `${postData.authorName}이(가) 게시물을 작성했습니다`,
        link: `/teams/${teamId}/feed#post-${postId}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      }));
    
    // 배치로 알림 생성
    const batch = db.batch();
    notifications.forEach(notif => {
      const notifRef = db.collection("notifications").doc();
      batch.set(notifRef, notif);
    });
    await batch.commit();
  }
);
```

---

## 9️⃣ 실제 구현 코드

### 9-1. Feed Service

```typescript
// src/services/feedService.ts
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  increment,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeamPost, PostComment } from "@/types/feed";

export async function createPost(params: {
  teamId: string;
  authorId: string;
  authorName: string;
  content: string;
  images?: string[];
  videoUrl?: string;
  type: "text" | "image" | "video" | "match_review" | "training_log";
}): Promise<string> {
  const postsRef = collection(db, "teams", params.teamId, "posts");
  const postRef = await addDoc(postsRef, {
    authorId: params.authorId,
    authorName: params.authorName,
    content: params.content,
    images: params.images || [],
    videoUrl: params.videoUrl,
    type: params.type,
    likesCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    createdAt: serverTimestamp(),
  });
  
  return postRef.id;
}

export async function likePost(
  teamId: string,
  postId: string,
  userId: string
): Promise<void> {
  const likeRef = doc(db, "teams", teamId, "posts", postId, "likes", userId);
  const likeSnap = await getDoc(likeRef);
  
  const postRef = doc(db, "teams", teamId, "posts", postId);
  
  if (likeSnap.exists()) {
    // 좋아요 취소
    await deleteDoc(likeRef);
    await updateDoc(postRef, {
      likesCount: increment(-1),
    });
  } else {
    // 좋아요 추가
    await setDoc(likeRef, {
      userId,
      createdAt: serverTimestamp(),
    });
    await updateDoc(postRef, {
      likesCount: increment(1),
    });
  }
}

export async function addComment(params: {
  teamId: string;
  postId: string;
  authorId: string;
  authorName: string;
  text: string;
}): Promise<string> {
  const commentsRef = collection(
    db, 
    "teams", 
    params.teamId, 
    "posts", 
    params.postId, 
    "comments"
  );
  
  const commentRef = await addDoc(commentsRef, {
    authorId: params.authorId,
    authorName: params.authorName,
    text: params.text,
    createdAt: serverTimestamp(),
  });
  
  // 댓글 수 증가
  const postRef = doc(db, "teams", params.teamId, "posts", params.postId);
  await updateDoc(postRef, {
    commentsCount: increment(1),
  });
  
  return commentRef.id;
}
```

### 9-2. Feed Hook

```typescript
// src/hooks/useTeamFeed.ts
import { useEffect, useState } from "react";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { TeamPost } from "@/types/feed";

export function useTeamFeed(teamId: string, limitCount: number = 20) {
  const [posts, setPosts] = useState<TeamPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }
    
    try {
      const postsRef = collection(db, "teams", teamId, "posts");
      const q = query(
        postsRef,
        orderBy("createdAt", "desc"),
        limit(limitCount)
      );
      
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as TeamPost[];
          setPosts(data);
          setLoading(false);
          setError(null);
        },
        (err) => {
          console.error("Feed 구독 오류:", err);
          setError("피드를 불러오는 중 오류가 발생했습니다");
          setLoading(false);
        }
      );
      
      return () => unsubscribe();
    } catch (err: any) {
      console.error("Feed 초기화 오류:", err);
      setError("피드를 불러오는 중 오류가 발생했습니다");
      setLoading(false);
    }
  }, [teamId, limitCount]);
  
  return { posts, loading, error };
}
```

---

## ✅ 구현 체크리스트

### Phase 1 (즉시)
- [ ] Feed 타입 정의
- [ ] Feed Service 구현
- [ ] Feed Hook 구현
- [ ] TeamFeed 컴포넌트
- [ ] FeedPostCard 컴포넌트
- [ ] CreatePostModal 컴포넌트

### Phase 2 (다음)
- [ ] FeedCommentList 컴포넌트
- [ ] PostImageGrid 컴포넌트
- [ ] PostActions 컴포넌트
- [ ] Cloud Functions 트리거 (알림)

### Phase 3 (확장)
- [ ] Feed 필터 기능
- [ ] Feed 무한 스크롤
- [ ] 이미지/영상 업로드
- [ ] 게시물 수정/삭제

---

**작성일**: 2024년  
**상태**: ✅ Team Social Feed 완전 설계 완료
