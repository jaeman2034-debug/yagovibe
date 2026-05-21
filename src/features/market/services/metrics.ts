import { db } from "@/lib/firebase";
import { doc, getDoc, increment, updateDoc } from "firebase/firestore";

function computeScore(likesCount = 0, chatsCount = 0, viewsCount = 0): number {
  return likesCount * 3 + chatsCount * 5 + viewsCount * 1;
}

export async function increaseViews(postId: string): Promise<void> {
  if (!postId) return;
  const ref = doc(db, "posts", postId);
  await updateDoc(ref, { viewsCount: increment(1) });

  // 최신 값으로 score 재계산
  const snap = await getDoc(ref);
  const d = snap.data() as any;
  if (!d) return;
  const score = computeScore(d.likesCount ?? 0, d.chatsCount ?? 0, (d.viewsCount ?? 0));
  await updateDoc(ref, { score });
}

export async function incrementChats(postId: string): Promise<void> {
  if (!postId) return;
  const ref = doc(db, "posts", postId);
  await updateDoc(ref, { chatsCount: increment(1) });

  const snap = await getDoc(ref);
  const d = snap.data() as any;
  if (!d) return;
  const score = computeScore(d.likesCount ?? 0, (d.chatsCount ?? 0), d.viewsCount ?? 0);
  await updateDoc(ref, { score });
}

export async function updateScore(postId: string): Promise<void> {
  if (!postId) return;
  const ref = doc(db, "posts", postId);
  const snap = await getDoc(ref);
  const d = snap.data() as any;
  if (!d) return;
  const score = computeScore(d.likesCount ?? 0, d.chatsCount ?? 0, d.viewsCount ?? 0);
  await updateDoc(ref, { score });
}

