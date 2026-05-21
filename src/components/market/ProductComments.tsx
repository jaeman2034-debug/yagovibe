import { useState } from "react";
import { Button } from "@/components/ui/button";
import { collection, addDoc, query, orderBy, getDocs, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import dayjs from "dayjs";
import { devError } from "@/lib/utils/dev";
import type { User } from "firebase/auth";

interface Review {
  id: string;
  rating: number;
  text: string;
  createdAt?: any;
}

interface ProductCommentsProps {
  productId: string | undefined;
  user: User | null;
  isOwner: boolean;
  reviews: Review[];
  reviewsLoading: boolean;
  onReviewAdded: () => void;
}

export default function ProductComments({
  productId,
  user,
  isOwner,
  reviews,
  reviewsLoading,
  onReviewAdded,
}: ProductCommentsProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewText, setReviewText] = useState<string>("");

  const handleReviewSubmit = async () => {
    if (!productId || !user || !reviewText.trim()) {
      alert("후기 내용을 입력해주세요.");
      return;
    }

    try {
      const reviewsRef = collection(db, "marketProducts", productId, "reviews");
      const reviewRef = await addDoc(reviewsRef, {
        userId: user.uid,
        userName: user.displayName || "익명",
        rating: reviewRating,
        text: reviewText.trim(),
        createdAt: serverTimestamp(),
      });

      try {
        const grantXp = httpsCallable(functions, "grantUserXpBonus");
        await grantXp({
          source: "marketProductReview",
          productId,
          reviewId: reviewRef.id,
          deltaXp: 3,
        });
      } catch (xpErr) {
        devError("후기 XP(Callable) 실패:", xpErr);
      }

      // 후기 목록 새로고침
      onReviewAdded();

      setShowReviewModal(false);
      setReviewText("");
      setReviewRating(5);
    } catch (err) {
      devError("후기 작성 실패:", err);
      alert("후기 작성에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            후기 ({reviews.length})
          </h3>
          {user && !isOwner && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviewModal(true)}
              className="text-xs"
            >
              ✍️ 후기 작성
            </Button>
          )}
        </div>

        {reviewsLoading ? (
          <div className="text-center py-8 text-gray-500">후기를 불러오는 중...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-gray-200 dark:border-neutral-700 rounded-xl">
            아직 후기가 없습니다.
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="border border-gray-200 dark:border-neutral-700 p-4 rounded-xl bg-white dark:bg-neutral-800"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-yellow-500 text-lg">
                    {"⭐".repeat(review.rating || 5)}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {review.createdAt?.toDate
                      ? dayjs(review.createdAt.toDate()).format("YYYY.MM.DD")
                      : ""}
                  </span>
                </div>
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  {review.text || "후기 내용이 없습니다."}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 후기 작성 모달 */}
      {showReviewModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">후기 작성</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                평점
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((rating) => (
                  <button
                    key={rating}
                    type="button"
                    onClick={() => setReviewRating(rating)}
                    className={`text-2xl ${
                      rating <= reviewRating
                        ? "text-yellow-500"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  >
                    ⭐
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                후기 내용
              </label>
              <textarea
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                placeholder="후기를 작성해주세요..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReviewModal(false);
                  setReviewText("");
                  setReviewRating(5);
                }}
                className="flex-1 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700"
              >
                취소
              </button>
              <button
                onClick={handleReviewSubmit}
                disabled={!reviewText.trim()}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                등록
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
