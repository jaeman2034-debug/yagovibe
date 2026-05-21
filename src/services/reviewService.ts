import { db, functions } from "@/lib/firebase";
import { httpsCallable } from "firebase/functions";
import { addDoc, collection, getDocs, query, serverTimestamp, where } from "firebase/firestore";

export interface CreateReviewInput {
	postId: string | null;
	chatId: string;
	reviewerId: string;
	targetUserId: string;
	rating: number; // 1~5
	comment: string;
}

export async function hasUserReviewed(params: { chatId: string; reviewerId: string }): Promise<boolean> {
	const { chatId, reviewerId } = params;
	const q = query(
		collection(db, "reviews"),
		where("chatId", "==", chatId),
		where("reviewerId", "==", reviewerId)
	);
	const snap = await getDocs(q);
	return !snap.empty;
}

export async function createReview(input: CreateReviewInput): Promise<string> {
	const { postId, chatId, reviewerId, targetUserId, rating, comment } = input;

	// 저장
	const ref = await addDoc(collection(db, "reviews"), {
		postId,
		chatId,
		reviewerId,
		targetUserId,
		rating,
		comment,
		createdAt: serverTimestamp(),
	});

	const aggregate = httpsCallable<{ reviewId: string }, { ok: boolean }>(
		functions,
		"applyReviewRatingAggregate"
	);
	await aggregate({ reviewId: ref.id });

	return ref.id;
}
