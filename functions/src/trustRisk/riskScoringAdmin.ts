/**
 * 위험 점수 계산 (클라 riskScoring.ts 기준 Admin 버전)
 */
import type { Firestore } from "firebase-admin/firestore";
import { DEFAULT_RISK_RULES, EXTERNAL_CONTACT_PATTERNS, type RiskRuleConfig } from "./riskRulesStatic";

export type UserRiskTier = "low" | "medium" | "high";
export type RiskFlag =
  | "new_account_high_price_external_contact"
  | "duplicate_posts"
  | "excessive_posts_no_sales"
  | "no_history_high_price_external_contact"
  | "external_contact_detected";

export type RiskPost = {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  images?: string[];
  status?: string;
  createdAt?: unknown;
  authorId?: string;
};

function detectExternalContact(text: string): boolean {
  if (!text) return false;
  return EXTERNAL_CONTACT_PATTERNS.some((pattern) => pattern.test(text));
}

function detectPostFlags(post: RiskPost, config: RiskRuleConfig = DEFAULT_RISK_RULES): RiskFlag[] {
  const flags: RiskFlag[] = [];
  const text = `${post.title || ""} ${post.description || ""}`.toLowerCase();
  if (detectExternalContact(text)) {
    flags.push("external_contact_detected");
  }
  return flags;
}

function toDate(v: unknown): Date {
  if (v && typeof (v as { toDate?: () => Date }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date(0);
}

function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));
  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

export async function calcPostRiskScoreAdmin(
  db: Firestore,
  post: RiskPost,
  authorId: string,
  config: RiskRuleConfig = DEFAULT_RISK_RULES
): Promise<{ score: number; flags: RiskFlag[] }> {
  let score = 0;
  const flags: RiskFlag[] = [];

  const postFlags = detectPostFlags(post, config);
  flags.push(...postFlags);

  if (postFlags.includes("external_contact_detected")) {
    score += config.externalContactScore;
  }

  try {
    const userSnap = await db.doc(`users/${authorId}`).get();
    if (userSnap.exists) {
      const userData = userSnap.data() ?? {};
      const createdAt = toDate(userData.createdAt);
      const accountAgeDays = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);

      if (
        accountAgeDays <= config.newAccountDays &&
        post.price &&
        post.price >= config.highPriceThreshold &&
        postFlags.includes("external_contact_detected")
      ) {
        score += config.externalContactScore;
        flags.push("new_account_high_price_external_contact");
      }

      const completedSales = Number(userData.completedSales ?? 0) || 0;
      const reviewCount = Number(userData.reviewCount ?? 0) || 0;

      if (
        completedSales === 0 &&
        reviewCount === 0 &&
        post.price &&
        post.price >= config.highPriceThreshold &&
        postFlags.includes("external_contact_detected")
      ) {
        score += config.noHistoryHighPriceScore;
        flags.push("no_history_high_price_external_contact");
      }
    }
  } catch {
    /* ignore */
  }

  try {
    const windowStart = new Date();
    windowStart.setHours(windowStart.getHours() - config.duplicatePostWindowHours);

    const recentPostsSnap = await db
      .collection("marketPosts")
      .where("authorId", "==", authorId)
      .where("status", "in", ["active", "open"])
      .orderBy("createdAt", "desc")
      .limit(config.duplicatePostThreshold + 1)
      .get();

    const recentPosts = recentPostsSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as RiskPost))
      .filter((p) => {
        if (!p.createdAt) return false;
        return toDate(p.createdAt) >= windowStart;
      });

    if (recentPosts.length >= config.duplicatePostThreshold) {
      const sameImageCount = recentPosts.filter((p) => {
        return (
          p.images &&
          post.images &&
          p.images.length > 0 &&
          post.images.length > 0 &&
          p.images[0] === post.images[0]
        );
      }).length;

      const similarTitleCount = recentPosts.filter((p) => {
        const similarity = calculateTitleSimilarity(p.title || "", post.title || "");
        return similarity > 0.8;
      }).length;

      if (
        sameImageCount >= config.duplicatePostThreshold ||
        similarTitleCount >= config.duplicatePostThreshold
      ) {
        score += config.duplicatePostScore;
        flags.push("duplicate_posts");
      }
    }
  } catch {
    /* ignore */
  }

  return { score: Math.min(score, 100), flags: [...new Set(flags)] };
}

export function getUserRiskTier(score: number, config: RiskRuleConfig = DEFAULT_RISK_RULES): UserRiskTier {
  if (score >= config.highRiskThreshold) return "high";
  if (score >= config.mediumRiskThreshold) return "medium";
  return "low";
}

export async function calcUserRiskScoreAdmin(
  db: Firestore,
  userId: string,
  config: RiskRuleConfig = DEFAULT_RISK_RULES
): Promise<{ score: number; flags: RiskFlag[]; tier: UserRiskTier }> {
  let score = 0;
  const flags: RiskFlag[] = [];

  try {
    const userSnap = await db.doc(`users/${userId}`).get();
    if (!userSnap.exists) {
      return { score: 0, flags: [], tier: "low" };
    }

    const userData = userSnap.data() ?? {};
    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - config.excessivePostWindowDays);

    const recentPostsSnap = await db
      .collection("marketPosts")
      .where("authorId", "==", userId)
      .where("status", "in", ["active", "open", "reserved", "completed"])
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const recentPosts = recentPostsSnap.docs
      .map((doc) => ({ id: doc.id, ...(doc.data() as Record<string, unknown>) } as RiskPost))
      .filter((p) => {
        if (!p.createdAt) return false;
        return toDate(p.createdAt) >= windowStart;
      });

    const completedSales = Number(userData.completedSales ?? 0) || 0;
    if (recentPosts.length >= config.excessivePostThreshold && completedSales === 0) {
      score += config.excessivePostScore;
      flags.push("excessive_posts_no_sales");
    }

    const postScores = await Promise.all(
      recentPosts.slice(0, 5).map((post) => calcPostRiskScoreAdmin(db, post, userId, config))
    );

    const avgPostScore =
      postScores.length > 0
        ? postScores.reduce((sum, p) => sum + p.score, 0) / postScores.length
        : 0;

    score += Math.round(avgPostScore * 0.3);
    postScores.forEach((p) => flags.push(...p.flags));
  } catch {
    /* ignore */
  }

  const tier = getUserRiskTier(Math.min(score, 100), config);
  return {
    score: Math.min(score, 100),
    flags: [...new Set(flags)],
    tier,
  };
}
