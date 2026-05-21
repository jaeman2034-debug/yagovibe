/**
 * 🔥 통합 채팅방 연결 진입점 (Trade + Recruit 통합)
 * 
 * 역할:
 * - 타입별 채팅방 연결 함수 분기
 * - 기존 코드와의 호환성 유지
 * - 중고거래/모집 단체방 공존
 */

/**
 * 🔥 Trade 채팅방 연결 (1:1) — `chats/{chatId}`만 사용 (chatRooms/trade_* 미생성)
 */
async function connectTradeRoom(params: {
  productId: string;
  buyerId: string;
  sellerId: string;
  productSnapshot?: {
    title?: string;
    name?: string;
    price?: number;
    images?: string[];
    imageUrl?: string;
  };
}): Promise<string> {
  const { getOrCreateChat } = await import("@/features/chat/services/chatService");
  const title = params.productSnapshot?.title || params.productSnapshot?.name || "상품";
  const postImage = params.productSnapshot?.images?.[0] || params.productSnapshot?.imageUrl;
  const { chatId } = await getOrCreateChat({
    postId: params.productId,
    postTitle: title,
    postImage,
    sellerId: params.sellerId,
    buyerId: params.buyerId,
    productPrice: params.productSnapshot?.price,
  });
  return chatId;
}

/**
 * 🔥 Recruit 단체방 연결 (서버에서 처리, 클라이언트는 확인만)
 */
async function connectRecruitGroupRoom(params: {
  postId: string;
  userId: string;
  authorId: string;
}): Promise<string> {
  // 🔥 모집 단체방 ID 분리 (trade와 충돌 방지)
  // roomId = recruit_${postId} 형식
  return `recruit_${params.postId}`;
}

/**
 * 🔥 통합 채팅방 연결 진입점
 */
export async function connectChatRoom(
  params:
    | {
        type: "trade";
        productId: string;
        buyerId: string;
        sellerId: string;
        productSnapshot?: {
          title?: string;
          name?: string;
          price?: number;
          images?: string[];
          imageUrl?: string;
        };
      }
    | {
        type: "recruit_group";
        postId: string;
        userId: string;
        authorId: string;
      }
): Promise<string> {
  if (params.type === "trade") {
    return await connectTradeRoom({
      productId: params.productId,
      buyerId: params.buyerId,
      sellerId: params.sellerId,
      productSnapshot: params.productSnapshot,
    });
  } else {
    return await connectRecruitGroupRoom({
      postId: params.postId,
      userId: params.userId,
      authorId: params.authorId,
    });
  }
}
