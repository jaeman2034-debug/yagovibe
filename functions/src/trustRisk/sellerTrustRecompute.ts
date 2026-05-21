/**
 * 판매자 신뢰 스냅샷 — Admin SDK 전용 (클라 trustScoreService와 동일 공식)
 */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

const DEFAULT_CONFIG = {
  ratingWeight: 20,
  salesWeight: 5,
  salesMax: 50,
  postsWeight: 2,
  postsMax: 20,
};

function calculateTrustScore(params: {
  ratingAvg?: number;
  completedSales?: number;
  recentPosts?: number;
}): number {
  const ratingAvg = params.ratingAvg ?? 0;
  const completedSales = params.completedSales ?? 0;
  const recentPosts = params.recentPosts ?? 0;
  const ratingScore = ratingAvg * DEFAULT_CONFIG.ratingWeight;
  const salesScore = Math.min(completedSales * DEFAULT_CONFIG.salesWeight, DEFAULT_CONFIG.salesMax);
  const postsScore = Math.min(recentPosts * DEFAULT_CONFIG.postsWeight, DEFAULT_CONFIG.postsMax);
  const totalScore = ratingScore + salesScore + postsScore;
  return Math.min(Math.round(totalScore * 10) / 10, 100);
}

export type TrustTier = "guest" | "basic" | "verified" | "trusted" | "top";

export function getSellerTrustTier(trustScore: number): TrustTier {
  if (trustScore >= 80) return "top";
  if (trustScore >= 60) return "trusted";
  if (trustScore >= 40) return "verified";
  if (trustScore >= 20) return "basic";
  return "guest";
}

export async function recomputeSellerTrustSnapshot(
  db: Firestore,
  sellerId: string
): Promise<void> {
  const userRef = db.doc(`users/${sellerId}`);
  const userSnap = await userRef.get();
  if (!userSnap.exists) return;

  const reviewsSnap = await db.collection("marketReviews").where("sellerId", "==", sellerId).get();

  const totalReviews = reviewsSnap.size;
  let averageRating = 0;
  if (totalReviews > 0) {
    let sum = 0;
    reviewsSnap.forEach((d) => {
      sum += Number(d.data()?.rating) || 0;
    });
    averageRating = sum / totalReviews;
  }

  const completedSnap = await db
    .collection("market")
    .where("authorId", "==", sellerId)
    .where("status", "in", ["completed", "done"])
    .get();
  const completedSales = completedSnap.size;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const postsSnap = await db
    .collection("market")
    .where("authorId", "==", sellerId)
    .where("status", "in", ["active", "open", "reserved", "completed"])
    .get();

  let recentPosts = 0;
  postsSnap.forEach((d) => {
    const c = d.data()?.createdAt;
    const dt =
      c && typeof (c as { toDate?: () => Date }).toDate === "function"
        ? (c as { toDate: () => Date }).toDate()
        : new Date(0);
    if (dt >= thirtyDaysAgo) recentPosts++;
  });

  const trustScore = calculateTrustScore({
    ratingAvg: averageRating,
    completedSales,
    recentPosts,
  });
  const trustTier = getSellerTrustTier(trustScore);

  await userRef.set(
    {
      trustScore,
      ratingAvg: averageRating,
      completedSales,
      reviewCount: totalReviews,
      recentPosts,
      trustTier,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export async function recomputeSellerTrustSnapshotById(sellerId: string): Promise<void> {
  await recomputeSellerTrustSnapshot(getFirestore(), sellerId);
}
