import { useState, useCallback } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface TradeRoomInfo {
  productId?: string;
  buyerId?: string;
  sellerId?: string;
  productSnapshot?: { status?: string };
}

interface UseTradeReservationOptions {
  chatRoomId: string | undefined;
  productId: string | undefined;
  room: TradeRoomInfo | null;
  myUid: string;
  isTrade: boolean;
  isBuyer: boolean;
}

/**
 * 중고거래 예약 관련 훅
 * - 예약 연결 (판매자 → 구매자)
 * - 예약 취소
 */
export function useTradeReservation({
  chatRoomId,
  productId,
  room,
  myUid,
  isTrade,
  isBuyer,
}: UseTradeReservationOptions) {
  const [isReserving, setIsReserving] = useState(false);

  const reserveProduct = useCallback(async () => {
    if (!room || !myUid || !isTrade || !productId || isReserving) return;

    if (isBuyer) {
      alert("구매자는 예약할 수 없습니다.");
      return;
    }

    const targetBuyerId = room.buyerId;
    if (!targetBuyerId) {
      alert("구매자 정보를 찾을 수 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      "이 구매자에게 예약을 연결하시겠습니까?\n\n" +
        "• 예약 후에는 다른 구매자가 구매할 수 없습니다.\n" +
        "• 예약은 취소할 수 있습니다."
    );

    if (!confirmed) return;

    setIsReserving(true);
    try {
      const productRef = doc(db, "market", productId);
      await updateDoc(productRef, {
        status: "reserved",
        buyerId: targetBuyerId,
        reservedBy: targetBuyerId,
        reservedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (room.productSnapshot && chatRoomId) {
        const roomRef = doc(db, "chatRooms", chatRoomId);
        await updateDoc(roomRef, {
          "productSnapshot.status": "RESERVED",
        });
      }

      console.log("✅ [useTradeReservation] 예약 완료:", {
        productId,
        buyerId: targetBuyerId,
        sellerId: myUid,
      });

      alert("예약이 완료되었습니다.\n\n구매자에게 예약 알림이 전송됩니다.");
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error("❌ [useTradeReservation] 예약 실패:", err);

      let errorMessage = "예약 중 오류가 발생했습니다.";
      if (err.code === "permission-denied") {
        errorMessage = "예약 권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (err.code === "not-found") {
        errorMessage = "상품을 찾을 수 없습니다.";
      } else if (err.message) {
        errorMessage += `\n${err.message}`;
      }
      alert(errorMessage);
    } finally {
      setIsReserving(false);
    }
  }, [chatRoomId, productId, room, myUid, isTrade, isBuyer, isReserving]);

  const cancelReservation = useCallback(async () => {
    if (!room || !myUid || !productId || isReserving) return;

    if (isBuyer) {
      alert("구매자는 예약을 취소할 수 없습니다.");
      return;
    }

    const confirmed = window.confirm(
      "예약을 취소하시겠습니까?\n\n" +
        "• 예약 취소 후에는 다시 판매중 상태로 변경됩니다.\n" +
        "• 다른 구매자도 구매할 수 있게 됩니다."
    );

    if (!confirmed) return;

    setIsReserving(true);
    try {
      const productRef = doc(db, "market", productId);
      await updateDoc(productRef, {
        status: "active",
        buyerId: null,
        reservedBy: null,
        reservedAt: null,
        updatedAt: serverTimestamp(),
      });

      if (room.productSnapshot && chatRoomId) {
        const roomRef = doc(db, "chatRooms", chatRoomId);
        await updateDoc(roomRef, {
          "productSnapshot.status": "ACTIVE",
        });
      }

      console.log("✅ [useTradeReservation] 예약 취소 완료:", {
        productId,
        sellerId: myUid,
      });

      alert(
        "예약이 취소되었습니다.\n\n상품이 다시 판매중 상태로 변경되었습니다."
      );
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string };
      console.error("❌ [useTradeReservation] 예약 취소 실패:", err);

      let errorMessage = "예약 취소 중 오류가 발생했습니다.";
      if (err.code === "permission-denied") {
        errorMessage =
          "예약 취소 권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (err.code === "not-found") {
        errorMessage = "상품을 찾을 수 없습니다.";
      } else if (err.message) {
        errorMessage += `\n${err.message}`;
      }
      alert(errorMessage);
    } finally {
      setIsReserving(false);
    }
  }, [chatRoomId, productId, room, myUid, isBuyer, isReserving]);

  return {
    reserveProduct,
    cancelReservation,
    isReserving,
  };
}
