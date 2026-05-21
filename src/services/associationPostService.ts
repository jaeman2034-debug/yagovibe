import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { calcScore } from "@/utils/calcScore";

export type AssociationPostType = "notice" | "schedule" | "recruit" | "free";

export interface AssociationPost {
  id: string;
  associationId: string;
  uid: string;
  type: AssociationPostType;
  title: string;
  content: string;
  createdAt?: any;
  isPinned?: boolean;
  likesCount?: number;
  commentsCount?: number;
  score?: number;
}

export interface GlobalFeedPage {
  items: AssociationPost[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function createAssociationPost(input: Omit<AssociationPost, "id" | "createdAt">) {
  const ref = await addDoc(collection(db, "posts"), {
    ...input,
    isPinned: input.isPinned ?? false,
    likesCount: 0,
    commentsCount: 0,
    score: 0,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listAssociationPosts(
  associationId: string,
  type: AssociationPostType,
  sortBy: "latest" | "hot" = "latest"
): Promise<AssociationPost[]> {
  let items: AssociationPost[] = [];
  try {
    const isNoticeLatest = type === "notice" && sortBy === "latest";
    const q = query(
      collection(db, "posts"),
      where("associationId", "==", associationId),
      where("type", "==", type),
      ...(isNoticeLatest
        ? [orderBy("isPinned", "desc"), orderBy("createdAt", "desc")]
        : [orderBy(sortBy === "hot" ? "score" : "createdAt", "desc")])
    );
    const snap = await getDocs(q);
    items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AssociationPost, "id">),
    }));
  } catch (error) {
    // hot 인덱스/필드가 아직 없을 때를 위한 폴백
    const fallbackQ = query(
      collection(db, "posts"),
      where("associationId", "==", associationId),
      where("type", "==", type),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(fallbackQ);
    items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AssociationPost, "id">),
    }));
    if (sortBy === "hot") {
      items.sort((a, b) => calcScore(b) - calcScore(a));
    }
    console.warn("[listAssociationPosts] hot query fallback:", error);
  }
  // 최신 탭에서만 공지 고정 우선 정렬 유지
  if (sortBy === "latest") {
    return items.sort((a, b) => {
      const pa = a.isPinned ? 1 : 0;
      const pb = b.isPinned ? 1 : 0;
      return pb - pa;
    });
  }
  return items;
}

export async function getAssociationPostById(postId: string): Promise<AssociationPost | null> {
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) return null;
  return {
    id: snap.id,
    ...(snap.data() as Omit<AssociationPost, "id">),
  };
}

export async function isPostLikedByUser(postId: string, uid: string): Promise<boolean> {
  const likeRef = doc(db, "posts", postId, "likes", uid);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

export async function togglePostLike(postId: string, uid: string): Promise<boolean> {
  const postRef = doc(db, "posts", postId);
  const likeRef = doc(db, "posts", postId, "likes", uid);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(postRef, {
      likesCount: increment(-1),
      score: increment(-1),
    });
    return false;
  }

  await setDoc(likeRef, { uid, createdAt: serverTimestamp() });
  await updateDoc(postRef, {
    likesCount: increment(1),
    score: increment(1),
  });
  return true;
}

export async function toggleAssociationPostPinned(postId: string, nextPinned: boolean): Promise<void> {
  const postRef = doc(db, "posts", postId);
  await updateDoc(postRef, { isPinned: nextPinned });
}

export async function updateAssociationPostType(
  postId: string,
  type: AssociationPostType,
  options?: { isPinned?: boolean }
): Promise<void> {
  const postRef = doc(db, "posts", postId);
  const payload: Record<string, unknown> = { type };
  if (typeof options?.isPinned === "boolean") {
    payload.isPinned = options.isPinned;
  }
  await updateDoc(postRef, payload);
}

export async function deleteAssociationPost(postId: string): Promise<void> {
  await deleteDoc(doc(db, "posts", postId));
}

export async function isCommentLikedByUser(postId: string, commentId: string, uid: string): Promise<boolean> {
  const likeRef = doc(db, "posts", postId, "comments", commentId, "likes", uid);
  const snap = await getDoc(likeRef);
  return snap.exists();
}

export async function toggleCommentLike(postId: string, commentId: string, uid: string): Promise<boolean> {
  const commentRef = doc(db, "posts", postId, "comments", commentId);
  const likeRef = doc(db, "posts", postId, "comments", commentId, "likes", uid);
  const likeSnap = await getDoc(likeRef);

  if (likeSnap.exists()) {
    await deleteDoc(likeRef);
    await updateDoc(commentRef, { likesCount: increment(-1) });
    return false;
  }

  await setDoc(likeRef, { uid, createdAt: serverTimestamp() });
  await updateDoc(commentRef, { likesCount: increment(1) });
  return true;
}

export async function listGlobalFeedPosts(options?: {
  sortBy?: "latest" | "hot";
  pageSize?: number;
  afterDoc?: QueryDocumentSnapshot<DocumentData> | null;
}): Promise<GlobalFeedPage> {
  const sortBy = options?.sortBy ?? "latest";
  const pageSize = options?.pageSize ?? 20;
  const afterDoc = options?.afterDoc ?? null;

  const constraints: any[] = [orderBy(sortBy === "hot" ? "score" : "createdAt", "desc"), limit(pageSize)];
  if (afterDoc) {
    constraints.push(startAfter(afterDoc));
  }

  try {
    const q = query(collection(db, "posts"), ...constraints);
    const snap = await getDocs(q);
    const items = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<AssociationPost, "id">),
    }));
    const lastDoc = snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;
    return { items, lastDoc, hasMore: snap.docs.length === pageSize };
  } catch (error) {
    // hot 인덱스 미구성 대비 폴백
    if (sortBy === "hot") {
      const fallbackConstraints: any[] = [orderBy("createdAt", "desc"), limit(pageSize)];
      if (afterDoc) {
        fallbackConstraints.push(startAfter(afterDoc));
      }
      const fallbackQ = query(collection(db, "posts"), ...fallbackConstraints);
      const fallbackSnap = await getDocs(fallbackQ);
      const items = fallbackSnap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<AssociationPost, "id">),
        }))
        .sort((a, b) => calcScore(b) - calcScore(a));
      const lastDoc = fallbackSnap.docs.length > 0 ? fallbackSnap.docs[fallbackSnap.docs.length - 1] : null;
      console.warn("[listGlobalFeedPosts] hot query fallback:", error);
      return { items, lastDoc, hasMore: fallbackSnap.docs.length === pageSize };
    }
    throw error;
  }
}
