import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { DocumentData, Firestore } from "firebase-admin/firestore";
import { DEFAULT_RISK_RULES } from "./riskRulesStatic";
import { calcPostRiskScoreAdmin, type RiskPost } from "./riskScoringAdmin";

function docToRiskPost(postId: string, data: DocumentData | undefined): RiskPost | null {
  if (!data) return null;
  const authorId = typeof data.authorId === "string" ? data.authorId : typeof data.userId === "string" ? data.userId : "";
  if (!authorId) return null;
  return {
    id: postId,
    title: typeof data.title === "string" ? data.title : "",
    description: typeof data.description === "string" ? data.description : typeof data.desc === "string" ? data.desc : "",
    price: typeof data.price === "number" ? data.price : undefined,
    images: Array.isArray(data.images) ? data.images : undefined,
    status: typeof data.status === "string" ? data.status : undefined,
    createdAt: data.createdAt,
    authorId,
  };
}

export async function applyPostRiskForMarketDoc(db: Firestore, postId: string): Promise<void> {
  const marketRef = db.doc(`market/${postId}`);
  const snap = await marketRef.get();
  if (!snap.exists) return;

  const post = docToRiskPost(postId, snap.data());
  if (!post || !post.authorId) return;

  const { score, flags } = await calcPostRiskScoreAdmin(db, post, post.authorId);
  const isShadowBanned = score >= DEFAULT_RISK_RULES.shadowBanThreshold;
  const patch = {
    riskScore: score,
    riskFlags: flags,
    isShadowBanned,
    updatedAt: FieldValue.serverTimestamp(),
  };

  await marketRef.set(patch, { merge: true });

  const mpRef = db.doc(`marketPosts/${postId}`);
  const mpSnap = await mpRef.get();
  if (mpSnap.exists) {
    await mpRef.set(patch, { merge: true });
  }
}

export async function applyPostRiskForMarketDocById(postId: string): Promise<void> {
  await applyPostRiskForMarketDoc(getFirestore(), postId);
}
