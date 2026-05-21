/**
 * 🔥 리뷰 작성 버튼
 * 거래 완료 후 표시
 */

import { useState, useEffect } from "react";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { canUserWriteReview } from "@/services/marketReviewService";
import ReviewModal from "@/components/market/ReviewModal";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost } from "../types";

interface WriteReviewButtonProps {
  post: MarketPost;
  className?: string;
  onReviewSubmitted?: () => void;
}

export default function WriteReviewButton({
  post,
  className = "",
  onReviewSubmitted,
}: WriteReviewButtonProps) {
  const { user } = useAuth();
  const [canWrite, setCanWrite] = useState(false);
  const [checking, setChecking] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    const checkCanWrite = async () => {
      if (!user?.uid || post.status !== "completed" && post.status !== "done") {
        setCanWrite(false);
        setChecking(false);
        return;
      }

      try {
        // 🔥 sellerId 확인
        const sellerIdValue = post.authorId || post.sellerId || "";
        setSellerId(sellerIdValue);

        // 🔥 buyerId 확인: 채팅방에서 가져오기
        // 채팅방 ID 패턴: trade_{postId}_{sortedUserIds}
        // 또는 chatRooms에서 postId로 검색
        let buyerIdValue = "";
        
        try {
          // chatRooms 컬렉션에서 postId로 검색
          const { query: firestoreQuery, collection: firestoreCollection, where: firestoreWhere, getDocs: firestoreGetDocs } = await import("firebase/firestore");
          const chatRoomsQuery = firestoreQuery(
            firestoreCollection(db, "chatRooms"),
            firestoreWhere("postId", "==", post.id),
            firestoreWhere("type", "==", "trade")
          );
          
          const chatRoomsSnap = await firestoreGetDocs(chatRoomsQuery);
          
          if (!chatRoomsSnap.empty) {
            const chatRoom = chatRoomsSnap.docs[0].data();
            // buyerId 또는 sellerId 중 현재 사용자가 아닌 쪽
            if (chatRoom.buyerId && chatRoom.buyerId !== user.uid) {
              buyerIdValue = chatRoom.buyerId;
            } else if (chatRoom.sellerId && chatRoom.sellerId !== user.uid) {
              buyerIdValue = chatRoom.sellerId;
            } else if (chatRoom.members && chatRoom.members.length === 2) {
              buyerIdValue = chatRoom.members.find((id: string) => id !== user.uid) || "";
            }
          }
        } catch (err) {
          console.warn("⚠️ 채팅방에서 buyerId 조회 실패:", err);
        }

        // buyerId가 없으면 현재 사용자가 buyer라고 가정
        if (!buyerIdValue) {
          buyerIdValue = user.uid === sellerIdValue ? "" : user.uid;
        }

        setBuyerId(buyerIdValue || user.uid);

        // 🔥 리뷰 작성 가능 여부 확인
        const result = await canUserWriteReview(post.id, user.uid);
        setCanWrite(result.canWrite);
      } catch (err) {
        console.error("❌ 리뷰 작성 가능 여부 확인 실패:", err);
        setCanWrite(false);
      } finally {
        setChecking(false);
      }
    };

    checkCanWrite();
  }, [user?.uid, post.id, post.status, post.authorId, post.sellerId]);

  if (checking || !canWrite) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 active:scale-95 transition-all ${className}`}
      >
        <MessageSquare className="w-5 h-5" />
        리뷰 남기기
      </button>

      {isModalOpen && sellerId && buyerId && (
        <ReviewModal
          postId={post.id}
          sellerId={sellerId}
          buyerId={buyerId}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            onReviewSubmitted?.();
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
}
