/**
 * 🔥 하단 고정 액션 바 (판매자/구매자 구분)
 * 
 * 역할:
 * - 판매자: 수정 + 거래완료 버튼
 * - 구매자: 채팅하기 + 찜하기 버튼
 * - fixed bottom으로 항상 하단에 고정
 */

import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import type { MarketPost } from "../types";

interface BottomActionBarProps {
  post: MarketPost;
  isSeller: boolean;
  currentUserId?: string;
  onStatusChange?: (status: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onChat?: () => Promise<void>;
  onLike?: () => Promise<void>;
  liked?: boolean;
  chatting?: boolean;
  liking?: boolean;
  updating?: boolean;
}

export default function BottomActionBar({
  post,
  isSeller,
  currentUserId,
  onStatusChange,
  onDelete,
  onChat,
  onLike,
  liked = false,
  chatting = false,
  liking = false,
  updating = false,
}: BottomActionBarProps) {
  const navigate = useNavigate();
  const statusNorm = String(post.status || "").toLowerCase();
  const isReserved = statusNorm === "reserved" || statusNorm === "holding";
  const isAvailable =
    statusNorm === "active" || statusNorm === "open" || statusNorm === "available";
  const isSold =
    statusNorm === "sold" ||
    statusNorm === "done" ||
    statusNorm === "completed" ||
    statusNorm === "closed" ||
    statusNorm === "hidden";
  const isReservedByMe = !!currentUserId && post.reservedBy === currentUserId;
  // 타입 파생: used|share|lost → sale|share|lost
  const rawType = (post as any)?.type as string | undefined;
  const pType = rawType === "share" ? "share" : rawType === "lost" ? "lost" : "sale";
  const renderPrice = () => {
    if (pType !== "sale" || typeof post.price !== "number") return null;
    return new Intl.NumberFormat("ko-KR").format(post.price) + "원";
  };
  const getCTA = () => {
    if (isSold) return "거래 완료됨";
    if (isReserved) return "예약중";
    if (pType === "share") return "나눔 요청하기";
    if (pType === "lost") return "제보하기";
    return "채팅으로 구매하기";
  };

  const renderSellerActions = () => {
    if (isAvailable) {
      return (
        <>
          <button
            onClick={() => {
              if (!post.id) {
                console.error("❌ 수정하기: id가 undefined입니다!");
                return;
              }
              const sport = (post as any).sport || "soccer";
              navigate(`/sports/${sport}/market/edit/${post.id}`);
            }}
            disabled={isSold || updating}
            className="flex-1 border border-gray-300 rounded-xl py-3 font-medium text-gray-700 hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>✏️</span>
            <span>수정</span>
          </button>
          <button
            onClick={async () => {
              if (!onDelete || updating) return;
              await onDelete();
            }}
            disabled={updating}
            className="flex-1 bg-red-600 text-white rounded-xl py-3 font-medium hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>🗑️</span>
            <span>삭제</span>
          </button>
        </>
      );
    }

    if (isReserved) {
      return (
        <>
          <button
            onClick={async () => {
              if (!post.id || !onStatusChange) return;
              const confirmed = window.confirm(
                "예약 상태를 해제하시겠습니까?\n\n해제하면 다시 거래 가능 상태가 됩니다."
              );
              if (!confirmed) return;
              await onStatusChange("active");
            }}
            disabled={updating}
            className="flex-1 bg-gray-600 text-white rounded-xl py-3 font-medium hover:bg-gray-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>🔓</span>
            <span>예약 해제</span>
          </button>
          <button
            onClick={async () => {
              if (!post.id || !onStatusChange) return;
              const confirmed = window.confirm(
                "이 상품을 판매 완료로 변경하시겠습니까?\n\n판매 완료 후에는 일반 사용자에게 노출되지 않습니다."
              );
              if (!confirmed) return;
              await onStatusChange("done");
            }}
            disabled={updating}
            className="flex-1 bg-green-600 text-white rounded-xl py-3 font-medium hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>✅</span>
            <span>판매 완료</span>
          </button>
        </>
      );
    }

    return (
      <button
        disabled
        className="flex-1 bg-gray-300 text-gray-600 rounded-xl py-3 font-medium disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span>✅</span>
        <span>판매 완료</span>
      </button>
    );
  };

  const renderBuyerActions = () => {
    if (pType === "sale") {
      return (
        <>
          <div className="min-w-[110px] flex items-center justify-start">
            <div className="font-bold text-lg text-gray-900">{renderPrice()}</div>
          </div>
          {isAvailable && (
            <button
              onClick={async () => {
                if (onChat) {
                  await onChat();
                } else {
                  console.log("채팅하기 클릭");
                }
              }}
              disabled={chatting}
              className="flex-1 rounded-xl py-3 font-medium active:scale-95 transition-all flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <span>💬</span>
              <span>{chatting ? "채팅방 준비 중..." : "채팅으로 구매하기"}</span>
            </button>
          )}
          {isReserved && !isReservedByMe && (
            <button
              disabled
              className="flex-1 rounded-xl py-3 font-medium flex items-center justify-center gap-2 bg-gray-300 text-gray-600 disabled:cursor-not-allowed"
            >
              <span>🔒</span>
              <span>예약된 상품</span>
            </button>
          )}
          {isReservedByMe && (
            <button
              onClick={async () => {
                if (onChat) {
                  await onChat();
                } else {
                  console.log("채팅 계속하기 클릭");
                }
              }}
              disabled={chatting}
              className="flex-1 rounded-xl py-3 font-medium active:scale-95 transition-all flex items-center justify-center gap-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <span>💬</span>
              <span>{chatting ? "채팅방 준비 중..." : "채팅 계속하기"}</span>
            </button>
          )}
          {isSold && (
            <button
              disabled
              className="flex-1 rounded-xl py-3 font-medium flex items-center justify-center gap-2 bg-gray-300 text-gray-600 disabled:cursor-not-allowed"
            >
              <span>✅</span>
              <span>거래 완료</span>
            </button>
          )}
          <button
            onClick={async () => {
              if (onLike) {
                await onLike();
              } else {
                console.log("찜하기 클릭");
              }
            }}
            disabled={liking}
            className={`w-12 h-12 border rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 ${
              liked
                ? "bg-red-50 border-red-300 text-red-600"
                : "border-gray-300 text-gray-600"
            }`}
          >
            <span>{liked ? "❤️" : "🤍"}</span>
          </button>
        </>
      );
    }

    return (
      <>
        <button
          onClick={async () => {
            if (onChat) {
              await onChat();
            } else {
              console.log("채팅하기 클릭");
            }
          }}
          disabled={chatting || isSold || isReserved}
          className="flex-1 bg-blue-600 text-white rounded-xl py-3 font-medium hover:bg-blue-700 active:scale-95 transition-all disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <span>💬</span>
          <span>{chatting ? "채팅방 준비 중..." : getCTA()}</span>
        </button>
        <button
          onClick={async () => {
            if (onLike) {
              await onLike();
            } else {
              console.log("찜하기 클릭");
            }
          }}
          disabled={liking}
          className={`w-12 h-12 border rounded-xl flex items-center justify-center hover:bg-gray-50 active:scale-95 transition-all disabled:opacity-50 ${
            liked
              ? "bg-red-50 border-red-300 text-red-600"
              : "border-gray-300 text-gray-600"
          }`}
        >
          <span>{liked ? "❤️" : "🤍"}</span>
        </button>
      </>
    );
  };

  return createPortal(
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999]"
      style={{
        position: "fixed",
        bottom: "0",
        left: "0",
        right: "0",
        width: "100vw",
      }}
    >
      {/* 🔥 내부 컨테이너: max-width 제한 + 배경색 (페이지와 동일한 width로 정렬) */}
      <div 
        className="max-w-[720px] mx-auto px-4 bg-white border-t border-gray-200 shadow-lg flex gap-3 p-3" 
        style={{ pointerEvents: 'auto' }}
      >
        {isSeller ? renderSellerActions() : renderBuyerActions()}
      </div>
    </div>,
    document.body
  );
}
