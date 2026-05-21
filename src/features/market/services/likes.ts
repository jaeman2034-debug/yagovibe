import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";

export async function checkIfLiked(postId: string, userId: string): Promise<boolean> {
  if (!postId || !userId) return false;
  const q = query(
    collection(db, "likes"),
    where("postId", "==", postId),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

export async function toggleLike(postId: string, userId: string): Promise<boolean> {
  if (!postId || !userId) return false;
  const q = query(
    collection(db, "likes"),
    where("postId", "==", postId),
    where("userId", "==", userId)
  );
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // 이미 찜됨 → 삭제
    const likeDoc = snapshot.docs[0];
    await deleteDoc(doc(db, "likes", likeDoc.id));
    await updateDoc(doc(db, "posts", postId), {
      likesCount: increment(-1),
    });
    return false;
  } else {
    // 찜 추가
    await addDoc(collection(db, "likes"), {
      postId,
      userId,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "posts", postId), {
      likesCount: increment(1),
    });
    return true;
  }
}

