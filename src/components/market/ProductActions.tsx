import { createPortal } from "react-dom";
import { doc, deleteDoc, setDoc, updateDoc, serverTimestamp, increment } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketProduct } from "@/types/market";
import type { User } from "firebase/auth";
import { devError, devWarn } from "@/lib/utils/dev";

interface ProductActionsProps {
  product: MarketProduct;
  productId: string | undefined;
  isOwner: boolean;
  user: User | null;
  liked: boolean;
  onLikedChange: (liked: boolean) => void;
  onChat: () => void;
  onEdit: () => void;
  onStatusChange: (status: "reserved" | "done" | "open") => Promise<void>;
}

export default function ProductActions({
  product,
  productId,
  isOwner,
  user,
  liked,
  onLikedChange,
  onChat,
  onEdit,
  onStatusChange,
}: ProductActionsProps) {
  if (!product || product.status === "done" || typeof document === "undefined") {
    return null;
  }

  const handleLike = async () => {
    if (!productId) return;
    if (!user) {
      alert("로그인이 필요합니다.");
      return;
    }
    const favRef = doc(db, "users", user.uid, "favorites", productId);
    try {
      if (liked) {
        await deleteDoc(favRef);
        onLikedChange(false);
        if (productId) {
          const productRef = doc(db, "marketProducts", productId);
          updateDoc(productRef, {
            favorites: increment(-1),
          }).catch((err) => {
            devWarn("⚠️ favorites 감소 실패 (무시):", err);
          });
        }
      } else {
        await setDoc(favRef, {
          name: product.name,
          imageUrl: product.imageUrl ?? null,
          price: product.price ?? null,
          createdAt: serverTimestamp(),
        });
        onLikedChange(true);
        if (productId) {
          const productRef = doc(db, "marketProducts", productId);
          updateDoc(productRef, {
            favorites: increment(1),
          }).catch((err) => {
            devWarn("⚠️ favorites 증가 실패 (무시):", err);
          });
        }
      }
    } catch (err) {
      devError("즐겨찾기 처리 중 오류가 발생했습니다.", err);
    }
  };

  return createPortal(
    <div
      className="product-fab-bar"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 50,
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        backgroundColor: 'white',
        borderTop: '1px solid #e5e7eb',
        boxShadow: '0 -4px 6px -1px rgba(0, 0, 0, 0.1)',
        pointerEvents: 'auto',
      }}
    >
      <div className="max-w-[720px] mx-auto flex gap-3 p-3">
        {isOwner ? (
          <>
            {/* 판매자: 수정 + 거래완료 */}
            <button
              onClick={onEdit}
              disabled={product?.status === "done"}
              className="flex-1 border border-gray-300 rounded-lg py-3 text-gray-700 font-medium hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ✏️ 수정
            </button>
            {product.status === "reserved" ? (
              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    "이 상품을 거래완료로 변경하시겠습니까?\n\n거래완료로 변경하면 더 이상 수정할 수 없습니다."
                  );
                  if (confirmed) {
                    await onStatusChange("done");
                  }
                }}
                className="flex-1 bg-green-600 text-white rounded-lg py-3 font-medium hover:bg-green-700 active:scale-95 transition-all"
              >
                ✔ 거래 완료
              </button>
            ) : (
              <button
                onClick={async () => {
                  const confirmed = window.confirm(
                    "이 상품을 예약중으로 변경하시겠습니까?\n\n예약중으로 변경하면 다른 사용자가 구매할 수 없습니다."
                  );
                  if (confirmed) {
                    await onStatusChange("reserved");
                  }
                }}
                className="flex-1 bg-yellow-500 text-white rounded-lg py-3 font-medium hover:bg-yellow-600 active:scale-95 transition-all"
              >
                🔒 예약중
              </button>
            )}
          </>
        ) : (
          <>
            {/* 구매자: 채팅하기 + 찜하기 */}
            <button
              onClick={onChat}
              className="flex-1 bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 active:scale-95 transition-all"
            >
              💬 채팅하기
            </button>
            <button
              onClick={handleLike}
              className={`w-12 h-12 border rounded-lg flex items-center justify-center transition-all active:scale-95 ${
                liked
                  ? "bg-red-50 border-red-300 text-red-600"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {liked ? "❤️" : "🤍"}
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
