import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db } from "@/lib/firebase";
import type { Sport } from "@/features/market/types";
import { createActivity } from "@/services/activity/activityFactory";

type CreateType = "sale" | "share" | "lost";

/**
 * 마켓 상품 저장 후 허브·피드용으로 `marketPosts` + `activities`(market_created) 동기화
 */
export async function publishMarketListingToHub(opts: {
  postId: string;
  author: User;
  sport: Sport;
  title: string;
  description: string;
  price: number;
  images: string[];
  createType: CreateType;
  locationLabel?: string | null;
}): Promise<void> {
  const { withMarketPostsIndexDefaults } = await import("@/utils/marketPostsIndexDefaults");
  const { cleanFirestoreData } = await import("@/utils/firestoreHelpers");

  const categoryForPosts = "equipment" as const;
  const rawPost = {
    id: opts.postId,
    sport: opts.sport,
    sportCategory: opts.sport,
    category: categoryForPosts,
    ...(opts.createType === "lost" ? { subType: "lost" as const } : {}),
    title: opts.title.trim(),
    description: opts.description.trim(),
    images: opts.images,
    thumbnailUrl: opts.images[0] || null,
    status: "active" as const,
    createdAt: serverTimestamp(),
    authorId: opts.author.uid,
    authorName: opts.author.displayName || "",
    price: opts.createType === "share" ? 0 : opts.price,
    location: opts.locationLabel ?? null,
    createType: opts.createType,
  };
  const payload = withMarketPostsIndexDefaults(
    cleanFirestoreData(rawPost) as Record<string, unknown>
  );
  await setDoc(doc(db, "marketPosts", opts.postId), payload);

  const summary =
    opts.createType === "share"
      ? "나눔"
      : Number.isFinite(opts.price) && opts.price > 0
        ? `${opts.price.toLocaleString()}원`
        : "";

  await createActivity({
    type: "market_created",
    refId: opts.postId,
    authorId: opts.author.uid,
    authorName: opts.author.displayName || undefined,
    title: opts.title.trim(),
    summary: summary || undefined,
    thumbnailUrl: opts.images[0] || undefined,
    sport: opts.sport,
  });
}
