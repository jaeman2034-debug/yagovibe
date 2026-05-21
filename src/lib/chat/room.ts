/**
 * 🔥 AI 비서 지도: 채팅방 관리 유틸리티
 * 
 * 역할:
 * - chatRoomId 생성 (deterministic)
 * - 채팅방 자동 생성/재사용
 * - 중복 방 생성 방지
 */

import { 
  doc, 
  getDoc, 
  serverTimestamp, 
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export function buildChatRoomId(params: {
  productId: string;
  buyerId: string;
  sellerId: string;
}) {
  const { productId, buyerId, sellerId } = params;
  // 🔥 정석 구조: user ID 정렬하여 중복 방 생성 절대 방지
  // 형식: trade_${productId}_${sortedUserIds}
  const sortedUserIds = [buyerId, sellerId].sort().join("_");
  return `trade_${productId}_${sortedUserIds}`;
}

export async function ensureChatRoom(params: {
  chatRoomId: string;
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
}) {
  const { chatRoomId, productId, buyerId, sellerId, productSnapshot } = params;

  const ref = doc(db, "chatRooms", chatRoomId);
  
  // 🔥 채팅방 존재 여부 확인 (방이 없어도 에러 없음 - read 규칙 완화됨)
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (readError: any) {
    // 🔥 read 권한 오류는 무시하고 생성 시도 (방이 없을 때 정상)
    if (readError.code === "permission-denied") {
      console.log("⚠️ [chat/room] 방 읽기 권한 없음 (정상 - 새로 생성):", chatRoomId);
      snap = { exists: () => false } as any;
    } else {
      throw readError;
    }
  }
  
  // 🔥 운영급 Firestore 직렬화 헬퍼 (undefined 완전 차단)
  const sanitize = {
    string: (v?: any): string => {
      if (typeof v === "string" && v.length > 0) return v;
      return "";
    },
    number: (v?: any): number => {
      if (typeof v === "number" && !isNaN(v)) return v;
      return 0;
    },
    nullable: <T,>(v?: T): T | null => {
      if (v === undefined || v === null) return null;
      return v as T;
    },
    array: <T,>(v?: T[]): T[] => {
      if (Array.isArray(v)) return v;
      return [];
    },
  };

  // 🔥 기존 채팅방이 있으면 재사용 및 하위 호환 업데이트
  if (snap.exists()) {
    console.log("✅ [chat/room] 기존 채팅방 재사용:", chatRoomId);
    
    // 🔥 기존 채팅방 업데이트 (하위 호환 보장)
    const existingData = snap.data();
    
    // 🔥 통합 모델: type 필드가 없으면 "trade"로 설정 (하위 호환)
    const updates: any = {};
    if (!existingData.type) {
      updates.type = "trade";
    }
    
    // 🔥 통합 모델: members 필드가 없으면 participants에서 생성 (하위 호환)
    if (!existingData.members && existingData.participants) {
      updates.members = existingData.participants;
    }
    
    // 🔥 통합 모델: roles 필드가 없으면 buyerId/sellerId 기반으로 생성 (하위 호환)
    if (!existingData.roles && existingData.buyerId && existingData.sellerId) {
      updates.roles = {
        [existingData.sellerId]: "seller",
        [existingData.buyerId]: "buyer",
      };
    }
    
    // 🔥 하위 호환 업데이트 적용
    if (Object.keys(updates).length > 0) {
      await setDoc(ref, updates, { merge: true });
      console.log("✅ [chat/room] 하위 호환 필드 업데이트:", { chatRoomId, updates });
    }
    
    // 🔥 기존 채팅방이지만 productSnapshot이 없으면 업데이트
    if (!existingData.productSnapshot && productSnapshot) {
      const snapshotData = {
        productId, // 🔥 상품 ID도 저장
        title: sanitize.string(productSnapshot.title || productSnapshot.name) || "무제",
        price: sanitize.nullable(productSnapshot.price) ?? 0, // 🔥 undefined/null → 0
        imageUrl: sanitize.nullable(
          productSnapshot.images?.[0] || productSnapshot.imageUrl
        ) ?? "",
        location: "", // 🔥 기본값 보장
        category: "", // 🔥 기본값 보장
        status: "ACTIVE" as const,
      };

      console.log("🔥 [chat/room] 스냅샷 업데이트 데이터 검증:", {
        chatRoomId,
        price: snapshotData.price,
        priceType: typeof snapshotData.price,
      });

      await setDoc(
        ref,
        {
          productSnapshot: snapshotData,
        },
        { merge: true }
      );
      console.log("✅ [chat/room] 상품 스냅샷 업데이트:", chatRoomId);
    }
  } else {
    // 🔥 새 채팅방 생성 (상품 정보 스냅샷 포함)
    // 🔥 핵심: undefined 필드는 절대 저장하지 않음 (Firestore 금기)
    const chatRoomData: any = {
      productId,
      buyerId,
      sellerId,
      // 🔥 통합 모델: type 필드로 모집/거래 구분
      type: "trade", // 🔥 중고거래 채팅방 구분
      // 🔥 통합 모델: members 배열 (모집 단체방과 공통)
      members: [buyerId, sellerId],
      // 🔥 통합 모델: roles 객체 (모집 단체방과 공통)
      roles: {
        [sellerId]: "seller",
        [buyerId]: "buyer",
      },
      // 🔥 하위 호환: 기존 participants 필드 유지
      participants: [buyerId, sellerId],
      lastMessage: "",
      lastMessageAt: serverTimestamp(), // 🔥 null 대신 serverTimestamp() 사용 (rules 호환성)
      createdAt: serverTimestamp(),
      // 🔥 unreadCount 초기값 설정 (QA 필수)
      unreadCount: {
        [buyerId]: 0,
        [sellerId]: 0,
      },
    };

    // 🔥 상품 정보 스냅샷 저장 (삭제되어도 표시 가능)
    // 🔥 운영급: undefined 필드 완전 차단 (Firestore invalid data 에러 영구 종결)
    // 🔥 절대 안전 구조: 모든 필드에 기본값 보장
    if (productSnapshot) {
      chatRoomData.productSnapshot = {
        productId, // 🔥 상품 ID도 저장 (참조용)
        title: sanitize.string(productSnapshot.title || productSnapshot.name) || "무제",
        price: sanitize.nullable(productSnapshot.price) ?? 0, // 🔥 undefined/null → 0
        imageUrl: sanitize.nullable(
          productSnapshot.images?.[0] || productSnapshot.imageUrl
        ) ?? "",
        location: "", // 🔥 기본값 보장
        category: "", // 🔥 기본값 보장
        status: "ACTIVE" as const, // 🔥 생성 시점에는 ACTIVE
      };
    } else {
      chatRoomData.productSnapshot = null;
    }

    console.log("🔥 [chat/room] 채팅방 데이터 검증:", {
      chatRoomId,
      hasProductSnapshot: !!chatRoomData.productSnapshot,
      price: chatRoomData.productSnapshot?.price,
      priceType: typeof chatRoomData.productSnapshot?.price,
      participants: chatRoomData.participants,
      participantsSize: chatRoomData.participants?.length,
      type: chatRoomData.type,
    });

    try {
      await setDoc(ref, chatRoomData);
      console.log("✅ [chat/room] 새 채팅방 생성 성공:", chatRoomId);
      
      // 🔥 랭킹 점수 갱신 (marketPosts 컬렉션)
      // Cloud Functions의 onChatRoomCreated와 중복되지 않도록 확인:
      // - Cloud Functions는 chatRooms 컬렉션의 onCreate 트리거
      // - 여기서는 클라이언트 사이드에서 즉시 갱신 (선택적)
      // 주의: Cloud Functions가 이미 처리하므로 중복 방지를 위해 주석 처리
      // 필요시 활성화: await incrementPostChatCount(productId);
    } catch (createError: any) {
      console.error("❌ [chat/room] 채팅방 생성 실패:", {
        chatRoomId,
        error: createError.message,
        code: createError.code,
        chatRoomData: {
          type: chatRoomData.type,
          productId: chatRoomData.productId,
          buyerId: chatRoomData.buyerId,
          sellerId: chatRoomData.sellerId,
          participants: chatRoomData.participants,
          participantsSize: chatRoomData.participants?.length,
        },
      });
      throw createError;
    }
  }

  return chatRoomId;
}

/**
 * 🔥 모집 단체방 생성/확인 (teamRecruit_${postId} 형식)
 * 
 * 역할:
 * - 모집 단체방이 없으면 생성
 * - 있으면 재사용 (중복 방 생성 절대 방지)
 * - 멤버 추가 (중복 방지)
 * 
 * 규칙:
 * - 같은 모집글 → 같은 채팅방 (deterministic)
 * - 새로 들어와도 기존 방 입장
 * - 중복 방 생성 금지 (실서비스 안정성)
 */
export async function ensureRecruitRoom(params: {
  postId: string;
  userId: string;
  authorId: string;
  postTitle?: string;
  postSnapshot?: {
    title?: string;
    images?: string[];
    imageUrl?: string;
  };
}): Promise<string> {
  const { postId, userId, authorId, postTitle, postSnapshot } = params;
  
  // 🔥 모집 단체방 ID: teamRecruit_${postId} (deterministic, 중복 방지)
  // 🔥 핵심 규칙: 같은 모집글 = 같은 채팅방
  const chatRoomId = `teamRecruit_${postId}`;
  const ref = doc(db, "chatRooms", chatRoomId);
  
  // 🔥 채팅방 존재 여부 확인
  let snap;
  try {
    snap = await getDoc(ref);
  } catch (readError: any) {
    if (readError.code === "permission-denied") {
      console.log("⚠️ [chat/room] 모집방 읽기 권한 없음 (정상 - 새로 생성):", chatRoomId);
      snap = { exists: () => false } as any;
    } else {
      throw readError;
    }
  }
  
  // 🔥 운영급 Firestore 직렬화 헬퍼
  const sanitize = {
    string: (v?: any): string => {
      if (typeof v === "string" && v.length > 0) return v;
      return "";
    },
    array: <T,>(v?: T[]): T[] => {
      if (Array.isArray(v)) return v;
      return [];
    },
  };
  
  if (snap.exists()) {
    // 🔥 기존 채팅방이 있으면 재사용 (중복 방 생성 절대 방지)
    console.log("✅ [chat/room] 기존 모집방 재사용 (중복 방지):", chatRoomId);
    
    const existingData = snap.data();
    const existingMembers = existingData.members || existingData.participants || [];
    
    // 🔥 멤버가 없으면 추가 (중복 방지)
    if (!existingMembers.includes(userId)) {
      await setDoc(
        ref,
        {
          recruitId: postId,
          members: [...existingMembers, userId],
          participants: [...existingMembers, userId], // 하위 호환
          roles: {
            ...(existingData.roles || {}),
            [userId]: "member",
          },
          updatedAt: serverTimestamp(), // 마지막 업데이트 시간
        },
        { merge: true }
      );
      console.log("✅ [chat/room] 멤버 추가 (기존 방 재사용):", { chatRoomId, userId });
    } else {
      console.log("✅ [chat/room] 멤버 이미 존재 (중복 방지):", { chatRoomId, userId });
      if (!existingData.recruitId) {
        await setDoc(ref, { recruitId: postId }, { merge: true });
      }
    }
  } else {
    // 🔥 새 모집 단체방 생성 (첫 참여자 기준)
    console.log("✅ [chat/room] 새 모집방 생성 (첫 참여자):", chatRoomId);
    
    const chatRoomData: any = {
      postId,
      recruitId: postId,
      type: "recruit_group", // 모집 단체방 (기존 가드·ChatPage 호환)
      authorId,
      // 🔥 핵심: members 배열로 접근 제어 (실서비스 안정성)
      members: [authorId, userId],
      participants: [authorId, userId], // 하위 호환
      roles: {
        [authorId]: "host", // 작성자 = 호스트
        [userId]: "member", // 참여자 = 멤버
      },
      lastMessage: "",
      lastMessageAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      // 🔥 읽지 않은 메시지 수 추적 (멤버별)
      unreadCount: {
        [authorId]: 0,
        [userId]: 0,
      },
    };
    
    // 🔥 게시글 스냅샷 저장 (삭제되어도 표시 가능)
    if (postSnapshot || postTitle) {
      chatRoomData.postSnapshot = {
        postId,
        title: sanitize.string(postSnapshot?.title || postTitle) || "모집글",
        imageUrl: sanitize.string(postSnapshot?.imageUrl || postSnapshot?.images?.[0]) || "",
        images: sanitize.array(postSnapshot?.images) || [],
      };
    }
    
    try {
      await setDoc(ref, chatRoomData);
      console.log("✅ [chat/room] 새 모집방 생성 성공:", chatRoomId);
    } catch (createError: any) {
      console.error("❌ [chat/room] 모집방 생성 실패:", {
        chatRoomId,
        error: createError.message,
        code: createError.code,
      });
      throw createError;
    }
  }
  
  return chatRoomId;
}
