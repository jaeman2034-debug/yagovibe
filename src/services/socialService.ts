/**
 * 🔥 Social Service - Social 기능 서비스 레이어
 * 
 * 역할:
 * - Like, Comment, Share, Follow CRUD
 * - Social Stats 조회
 */

import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type {
  Like,
  Comment,
  Share,
  Follow,
  SocialEntityType,
  FollowTargetType,
} from "@/types/social";

/**
 * Like 생성
 */
export async function createLike(
  userId: string,
  entityType: SocialEntityType,
  entityId: string
): Promise<Like> {
  const likeId = `${userId}_${entityType}_${entityId}`;
  const likeRef = doc(db, "likes", likeId);

  // 이미 좋아요가 있는지 확인
  const existingLike = await getDoc(likeRef);
  if (existingLike.exists()) {
    return { id: likeId, ...existingLike.data() } as Like;
  }

  const likeData: Omit<Like, "id"> = {
    userId,
    entityType,
    entityId,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(likeRef, likeData);

  return {
    id: likeId,
    ...likeData,
  } as Like;
}

/**
 * Like 삭제
 */
export async function deleteLike(
  userId: string,
  entityType: SocialEntityType,
  entityId: string
): Promise<void> {
  const likeId = `${userId}_${entityType}_${entityId}`;
  const likeRef = doc(db, "likes", likeId);
  await deleteDoc(likeRef);
}

/**
 * Like 여부 확인
 */
export async function checkLike(
  userId: string,
  entityType: SocialEntityType,
  entityId: string
): Promise<boolean> {
  const likeId = `${userId}_${entityType}_${entityId}`;
  const likeRef = doc(db, "likes", likeId);
  const likeSnap = await getDoc(likeRef);
  return likeSnap.exists();
}

/**
 * Entity의 Like 목록 조회
 */
export async function getLikesByEntity(
  entityType: SocialEntityType,
  entityId: string,
  options?: { limitCount?: number }
): Promise<Like[]> {
  let q = query(
    collection(db, "likes"),
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    orderBy("createdAt", "desc")
  );

  if (options?.limitCount) {
    q = query(q, limit(options.limitCount));
  }

  const snapshot = await getDocs(q);
  const likes: Like[] = [];

  snapshot.forEach((doc) => {
    likes.push({
      id: doc.id,
      ...doc.data(),
    } as Like);
  });

  return likes;
}

/**
 * 사용자의 Like 목록 조회
 */
export async function getLikesByUser(
  userId: string,
  options?: { limitCount?: number }
): Promise<Like[]> {
  let q = query(
    collection(db, "likes"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  if (options?.limitCount) {
    q = query(q, limit(options.limitCount));
  }

  const snapshot = await getDocs(q);
  const likes: Like[] = [];

  snapshot.forEach((doc) => {
    likes.push({
      id: doc.id,
      ...doc.data(),
    } as Like);
  });

  return likes;
}

/**
 * Comment 생성
 */
export async function createComment(
  entityType: SocialEntityType,
  entityId: string,
  userId: string,
  text: string,
  parentId?: string | null
): Promise<Comment> {
  const commentData: Omit<Comment, "id"> = {
    entityType,
    entityId,
    userId,
    text,
    parentId: parentId || null,
    likesCount: 0,
    repliesCount: 0,
    createdAt: serverTimestamp() as any,
  };

  const docRef = await addDoc(collection(db, "comments"), commentData);

  return {
    id: docRef.id,
    ...commentData,
  } as Comment;
}

/**
 * Comment 수정
 */
export async function updateComment(
  commentId: string,
  text: string
): Promise<void> {
  const commentRef = doc(db, "comments", commentId);
  await updateDoc(commentRef, {
    text,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Comment 삭제 (소프트 삭제)
 */
export async function deleteComment(commentId: string): Promise<void> {
  const commentRef = doc(db, "comments", commentId);
  await updateDoc(commentRef, {
    deletedAt: serverTimestamp(),
    text: "[삭제된 댓글입니다]",
  });
}

/**
 * Entity의 Comment 목록 조회
 */
export async function getCommentsByEntity(
  entityType: SocialEntityType,
  entityId: string,
  options?: { limitCount?: number; startAfterDoc?: DocumentSnapshot }
): Promise<{ comments: Comment[]; lastDoc: DocumentSnapshot | null }> {
  let q = query(
    collection(db, "comments"),
    where("entityType", "==", entityType),
    where("entityId", "==", entityId),
    where("parentId", "==", null), // 부모 댓글만 (대댓글 제외)
    orderBy("createdAt", "asc")
  );

  if (options?.startAfterDoc) {
    q = query(q, startAfter(options.startAfterDoc));
  }

  if (options?.limitCount) {
    q = query(q, limit(options.limitCount));
  } else {
    q = query(q, limit(20)); // 기본 20개
  }

  const snapshot = await getDocs(q);
  const comments: Comment[] = [];
  let lastDoc: DocumentSnapshot | null = null;

  snapshot.forEach((doc) => {
    const data = doc.data();
    // 삭제되지 않은 댓글만
    if (!data.deletedAt) {
      comments.push({
        id: doc.id,
        ...data,
      } as Comment);
    }
    lastDoc = doc;
  });

  return { comments, lastDoc };
}

/**
 * 대댓글 조회
 */
export async function getRepliesByComment(
  parentId: string
): Promise<Comment[]> {
  const q = query(
    collection(db, "comments"),
    where("parentId", "==", parentId),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);
  const replies: Comment[] = [];

  snapshot.forEach((doc) => {
    const data = doc.data();
    if (!data.deletedAt) {
      replies.push({
        id: doc.id,
        ...data,
      } as Comment);
    }
  });

  return replies;
}

/**
 * Share 생성
 */
export async function createShare(
  userId: string,
  entityType: SocialEntityType,
  entityId: string,
  shareType: "internal" | "external",
  platform?: "twitter" | "facebook" | "kakao" | "link"
): Promise<Share> {
  const shareData: Omit<Share, "id"> = {
    userId,
    entityType,
    entityId,
    shareType,
    platform,
    createdAt: serverTimestamp() as any,
  };

  const docRef = await addDoc(collection(db, "shares"), shareData);

  return {
    id: docRef.id,
    ...shareData,
  } as Share;
}

/**
 * Entity의 Share 수 조회
 */
export async function getSharesCountByEntity(
  entityType: SocialEntityType,
  entityId: string
): Promise<number> {
  const q = query(
    collection(db, "shares"),
    where("entityType", "==", entityType),
    where("entityId", "==", entityId)
  );

  const snapshot = await getDocs(q);
  return snapshot.size;
}

/**
 * Follow 생성
 */
export async function createFollow(
  followerId: string,
  targetType: FollowTargetType,
  targetId: string
): Promise<Follow> {
  const followId = `${followerId}_${targetType}_${targetId}`;
  const followRef = doc(db, "follows", followId);

  // 이미 팔로우 중인지 확인
  const existingFollow = await getDoc(followRef);
  if (existingFollow.exists()) {
    return { id: followId, ...existingFollow.data() } as Follow;
  }

  const followData: Omit<Follow, "id"> = {
    followerId,
    targetType,
    targetId,
    createdAt: serverTimestamp() as any,
  };

  await setDoc(followRef, followData);

  return {
    id: followId,
    ...followData,
  } as Follow;
}

/**
 * Follow 삭제
 */
export async function deleteFollow(
  followerId: string,
  targetType: FollowTargetType,
  targetId: string
): Promise<void> {
  const followId = `${followerId}_${targetType}_${targetId}`;
  const followRef = doc(db, "follows", followId);
  await deleteDoc(followRef);
}

/**
 * Follow 여부 확인
 */
export async function checkFollow(
  followerId: string,
  targetType: FollowTargetType,
  targetId: string
): Promise<boolean> {
  const followId = `${followerId}_${targetType}_${targetId}`;
  const followRef = doc(db, "follows", followId);
  const followSnap = await getDoc(followRef);
  return followSnap.exists();
}

/**
 * 사용자가 팔로우한 목록 조회
 */
export async function getFollowsByUser(
  followerId: string,
  targetType?: FollowTargetType
): Promise<Follow[]> {
  let q = query(
    collection(db, "follows"),
    where("followerId", "==", followerId),
    orderBy("createdAt", "desc")
  );

  if (targetType) {
    q = query(q, where("targetType", "==", targetType));
  }

  const snapshot = await getDocs(q);
  const follows: Follow[] = [];

  snapshot.forEach((doc) => {
    follows.push({
      id: doc.id,
      ...doc.data(),
    } as Follow);
  });

  return follows;
}

/**
 * 대상의 팔로워 목록 조회
 */
export async function getFollowersByTarget(
  targetType: FollowTargetType,
  targetId: string,
  options?: { limitCount?: number }
): Promise<Follow[]> {
  let q = query(
    collection(db, "follows"),
    where("targetType", "==", targetType),
    where("targetId", "==", targetId),
    orderBy("createdAt", "desc")
  );

  if (options?.limitCount) {
    q = query(q, limit(options.limitCount));
  }

  const snapshot = await getDocs(q);
  const followers: Follow[] = [];

  snapshot.forEach((doc) => {
    followers.push({
      id: doc.id,
      ...doc.data(),
    } as Follow);
  });

  return followers;
}

/**
 * Social Stats 조회 (Like, Comment, Share 수)
 */
export async function getSocialStats(
  entityType: SocialEntityType,
  entityId: string
): Promise<{
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
}> {
  const [likesSnap, commentsSnap, sharesSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "likes"),
        where("entityType", "==", entityType),
        where("entityId", "==", entityId)
      )
    ),
    getDocs(
      query(
        collection(db, "comments"),
        where("entityType", "==", entityType),
        where("entityId", "==", entityId),
        where("parentId", "==", null) // 부모 댓글만 카운트
      )
    ),
    getDocs(
      query(
        collection(db, "shares"),
        where("entityType", "==", entityType),
        where("entityId", "==", entityId)
      )
    ),
  ]);

  return {
    likesCount: likesSnap.size,
    commentsCount: commentsSnap.size,
    sharesCount: sharesSnap.size,
  };
}
