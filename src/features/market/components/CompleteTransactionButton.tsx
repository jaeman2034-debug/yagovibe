/**
 * 🔥 거래 완료 처리 버튼 (판매자 전용)
 * 
 * 판매자가 거래를 완료했을 때 클릭하여 상태를 "completed"로 변경
 */

import { useState } from "react";
import { CheckCircle } from "lucide-react";
import { collection, query, where, getDocs, addDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { db, functions } from "@/lib/firebase";
import type { MarketPost } from "../types";

interface CompleteTransactionButtonProps {
  post: MarketPost;
  onComplete?: (updatedPost: MarketPost) => void;
  className?: string;
}

export default function CompleteTransactionButton({
  post,
  onComplete,
  className = "",
}: CompleteTransactionButtonProps) {
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    if (!post.id || completing) return;

    const confirmed = window.confirm(
      "거래를 완료 처리하시겠습니까?\n\n" +
      "• 거래 완료 후에는 상태를 변경할 수 없습니다.\n" +
      "• 구매자에게 거래 완료 알림이 전송됩니다.\n" +
      "• 향후 리뷰 작성이 가능합니다."
    );

    if (!confirmed) return;

    setCompleting(true);
    try {
      const fn = httpsCallable<
        { postId: string; buyerId?: string | null },
        { ok: boolean; alreadyComplete?: boolean }
      >(functions, "completeMarketTransaction");
      await fn({
        postId: post.id,
        ...(post.reservedBy ? { buyerId: post.reservedBy } : {}),
      });

      // 🔥 Optimistic UI 업데이트
      const updatedPost: MarketPost = {
        ...post,
        status: "completed",
        completedAt: new Date() as any,
        sellerId: post.authorId,
      };
      onComplete?.(updatedPost);

      console.log("✅ 거래 완료 처리 완료:", { postId: post.id });
      
      // 🔥 거래 완료 트래킹
      import("@/lib/analytics").then(({ trackMarket }) => {
        trackMarket.completeTransaction({
          postId: post.id,
          price: post.price,
          sellerId: post.authorId,
        });
      }).catch((err) => {
        console.warn("⚠️ 트래킹 실패 (무시):", err);
      });
      
      // 🔥 거래 완료 알림 생성 (구매자에게) + 채팅방 시스템 메시지 생성
      Promise.resolve().then(async () => {
        const chatRoomsQuery = query(
          collection(db, "chatRooms"),
          where("productId", "==", post.id),
          where("type", "==", "trade")
        );
        getDocs(chatRoomsQuery).then(async (snap) => {
          if (!snap.empty) {
            const chatRoomDoc = snap.docs[0];
            const chatRoomId = chatRoomDoc.id;
            const chatRoom = chatRoomDoc.data();
            const buyerId = chatRoom.buyerId || (chatRoom.members?.find((id: string) => id !== post.authorId));
            
            // 🔥 1. 채팅방에 시스템 메시지 생성 (거래 완료 알림)
            try {
              const messagesRef = collection(db, "chatRooms", chatRoomId, "messages");
              
              // 🔥 중복 방지: 같은 시스템 메시지가 이미 있는지 확인
              const existingSystemMsgQuery = query(
                messagesRef,
                where("type", "==", "system"),
                where("systemType", "==", "deal_confirmed")
              );
              const existingSnap = await getDocs(existingSystemMsgQuery);
              
              if (existingSnap.empty) {
                // 🔥 시스템 메시지 생성
                await addDoc(messagesRef, {
                  text: "거래가 완료되었습니다. 🎉",
                  type: "system",
                  systemType: "deal_confirmed",
                  createdAt: serverTimestamp(),
                  metadata: {
                    postId: post.id,
                    postTitle: post.title,
                    sellerId: post.authorId,
                    buyerId: buyerId,
                  },
                });
                
                // 🔥 채팅방 lastMessage 업데이트
                await updateDoc(chatRoomDoc.ref, {
                  lastMessage: "거래가 완료되었습니다. 🎉",
                  lastMessageAt: serverTimestamp(),
                  // 🔥 상대방 unreadCount 증가 (시스템 메시지도 읽음 처리 필요)
                  [`unreadCount.${buyerId}`]: increment(1),
                  // 🔥 productSnapshot 상태도 업데이트
                  "productSnapshot.status": "SOLD",
                });
                
                console.log("✅ [CompleteTransactionButton] 채팅방 시스템 메시지 생성 완료:", chatRoomId);
              } else {
                console.log("ℹ️ [CompleteTransactionButton] 시스템 메시지 이미 존재 (중복 방지):", chatRoomId);
              }
            } catch (msgError: any) {
              console.warn("⚠️ [CompleteTransactionButton] 채팅방 시스템 메시지 생성 실패 (무시):", msgError);
            }
            
            // 🔥 2. 구매자에게 알림 생성
            if (buyerId && buyerId !== post.authorId) {
              import("@/services/marketNotificationService").then(({ notifyTransactionComplete }) => {
                notifyTransactionComplete({
                  buyerId,
                  sellerId: post.authorId,
                  postId: post.id,
                  postTitle: post.title,
                }).catch((err) => {
                  console.warn("⚠️ 거래 완료 알림 생성 실패 (무시):", err);
                });
              }).catch((err) => {
                console.warn("⚠️ 알림 서비스 로드 실패 (무시):", err);
              });
            }
          }
        }).catch((err) => {
          console.warn("⚠️ 채팅방 조회 실패 (무시):", err);
        });
      }).catch((err) => {
        console.warn("⚠️ 채팅/알림 후속 처리 실패 (무시):", err);
      });

      alert("거래가 완료 처리되었습니다.");
    } catch (error: any) {
      console.error("❌ 거래 완료 처리 실패:", error);
      
      let errorMessage = "거래 완료 처리 중 오류가 발생했습니다.";
      if (error.code === "permission-denied") {
        errorMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (error.code === "not-found") {
        errorMessage = "게시글을 찾을 수 없습니다.";
      } else if (error.message) {
        errorMessage += `\n${error.message}`;
      }
      
      alert(errorMessage);
    } finally {
      setCompleting(false);
    }
  };

  // 거래 완료된 글은 버튼 숨김
  if (post.status === "completed" || post.status === "done") {
    return null;
  }

  // 예약중이 아니면 버튼 표시 (예약중일 때만 거래 완료 가능)
  const canComplete = post.status === "reserved" || post.status === "active" || post.status === "open";

  if (!canComplete) {
    return null;
  }

  return (
    <button
      onClick={handleComplete}
      disabled={completing}
      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed ${className}`}
    >
      <CheckCircle className="w-5 h-5" />
      {completing ? "처리 중..." : "거래 완료"}
    </button>
  );
}
