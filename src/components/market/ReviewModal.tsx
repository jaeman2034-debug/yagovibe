/**
 * 🔥 리뷰 작성 모달
 */

import { useState } from "react";
import { X, Star } from "lucide-react";
import { createMarketReview } from "@/services/marketReviewService";
import { useAuth } from "@/context/AuthProvider";

interface ReviewModalProps {
  postId: string;
  sellerId: string;
  buyerId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ReviewModal({
  postId,
  sellerId,
  buyerId,
  isOpen,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user?.uid) {
      setError("로그인이 필요합니다.");
      return;
    }

    if (rating < 1 || rating > 5) {
      setError("평점을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await createMarketReview({
        postId,
        sellerId,
        buyerId,
        rating,
        comment: comment.trim() || undefined,
        userId: user.uid,
      });

      // 🔥 리뷰 작성 트래킹
      import("@/lib/analytics").then(({ trackMarket }) => {
        trackMarket.writeReview({
          postId,
          rating,
          sellerId,
          hasComment: !!comment?.trim(),
        });
      }).catch((err) => {
        console.warn("⚠️ 트래킹 실패 (무시):", err);
      });

      // 성공
      onSuccess?.();
      onClose();
      
      // 상태 초기화
      setRating(5);
      setComment("");
    } catch (err: any) {
      console.error("❌ 리뷰 작성 실패:", err);
      setError(err.message || "리뷰 작성 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[20000] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
        {/* 헤더 */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">리뷰 작성</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* 평점 선택 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">평점</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 transition-transform active:scale-90"
                aria-label={`${star}점`}
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500">{rating}점 선택됨</p>
        </div>

        {/* 리뷰 내용 */}
        <div className="space-y-2">
          <label htmlFor="comment" className="text-sm font-medium text-gray-700">
            리뷰 내용 (선택)
          </label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="거래 경험을 공유해주세요..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            maxLength={500}
          />
          <p className="text-xs text-gray-500 text-right">
            {comment.length}/500
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={submitting || rating < 1}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {submitting ? "작성 중..." : "리뷰 작성"}
          </button>
        </div>
      </div>
    </div>
  );
}
