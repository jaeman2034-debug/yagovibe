import { useState, useEffect, useRef } from "react";
import { useNavigate, type NavigateFunction } from "react-router-dom";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ChatRoomDoc {
  type?: "recruit_group" | "trade" | "team" | "match";
  teamId?: string;
  members?: string[];
  roles?: { [uid: string]: "host" | "admin" | "member" | "seller" | "buyer" };
  banned?: { [uid: string]: boolean };
  status?: "closed" | "active" | null;
  recruitStatus?: "OPEN" | "CLOSED";
  productId?: string;
  buyerId?: string;
  sellerId?: string;
  participants?: string[];
  postId?: string;
  authorId?: string;
  lastMessage?: string;
  unreadCount?: { [uid: string]: number };
  productSnapshot?: {
    productId?: string;
    title?: string;
    price?: number;
    imageUrl?: string;
    status?: "ACTIVE" | "SOLD" | "DELETED" | "RESERVED";
  };
  [key: string]: unknown;
}

export interface ProductDoc {
  title?: string;
  name?: string;
  price?: number;
  images?: string[];
  imageUrl?: string;
  status?: "selling" | "reserved" | "sold";
}

interface UseChatRoomOptions {
  chatRoomId: string | undefined;
  myUid: string;
  navigate: NavigateFunction;
}

export interface UseChatRoomReturn {
  room: ChatRoomDoc | null;
  product: ProductDoc | null;
  productMissing: boolean;
  productStatus: "ACTIVE" | "SOLD" | "DELETED" | "RESERVED" | undefined;
  isRoomLoading: boolean;
}

/**
 * 채팅방 구독 훅
 * - room onSnapshot
 * - productSnapshot 처리
 * - unread 초기화
 * - room 접근 검증
 */
export function useChatRoom({
  chatRoomId,
  myUid,
  navigate,
}: UseChatRoomOptions): UseChatRoomReturn {
  const [room, setRoom] = useState<ChatRoomDoc | null>(null);
  const [product, setProduct] = useState<ProductDoc | null>(null);
  const [productMissing, setProductMissing] = useState(false);
  const [productStatus, setProductStatus] = useState<
    "ACTIVE" | "SOLD" | "DELETED" | "RESERVED" | undefined
  >(undefined);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const unreadInitializedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!chatRoomId || !myUid) {
      setIsRoomLoading(false);
      return;
    }

    unreadInitializedRef.current = new Set();
    const roomRef = doc(db, "chatRooms", chatRoomId);
    let isUnmounted = false;

    const unsub = onSnapshot(
      roomRef,
      async (snap) => {
        if (isUnmounted) return;

        if (!snap.exists()) {
          try {
            const tradeSnap = await getDoc(doc(db, "chats", chatRoomId));
            if (tradeSnap.exists()) {
              console.warn(
                "[useChatRoom] chatRooms 문서 없음 → 거래 1:1(chats) 경로로 이동:",
                chatRoomId
              );
              navigate(`/app/chat/${chatRoomId}`, { replace: true });
              setIsRoomLoading(false);
              return;
            }
          } catch {
            /* ignore */
          }

          if (chatRoomId.startsWith("match_")) {
            const mid = chatRoomId.slice("match_".length);
            console.warn(
              "[useChatRoom] chatRooms 문서 없음(매칭) — 상세에서 채팅 열기를 다시 시도하세요.",
              { chatRoomId }
            );
            navigate(mid ? `/match/${mid}` : "/match", { replace: true });
            setIsRoomLoading(false);
            return;
          }

          console.error("❌ [useChatRoom] 채팅방이 존재하지 않습니다:", chatRoomId);
          setRoom(null);
          setProduct(null);
          setProductMissing(true);
          setProductStatus(undefined);

          let postId = chatRoomId;
          if (chatRoomId.startsWith("teamRecruit_")) {
            postId = chatRoomId.replace("teamRecruit_", "");
          } else if (chatRoomId.startsWith("recruit_")) {
            postId = chatRoomId.replace("recruit_", "");
          }

          try {
            const postRef = doc(db, "market", postId);
            const postSnap = await getDoc(postRef);

            if (postSnap.exists()) {
              const joinRef = doc(db, "marketJoins", `${postId}_${myUid}`);
              const joinSnap = await getDoc(joinRef);

              if (joinSnap.exists()) {
                const joinData = joinSnap.data();
                if (joinData?.status === "pending") {
                  alert("아직 승인되지 않았습니다.\n참여 신청 후 작성자의 승인을 기다려주세요.");
                } else if (joinData?.status === "rejected") {
                  alert("참여 신청이 거절되었습니다.");
                } else if (joinData?.status === "approved") {
                  alert("승인되었습니다.\n채팅방이 생성되는 중입니다. 잠시 후 다시 시도해주세요.");
                } else {
                  alert("채팅방을 찾을 수 없습니다.");
                }
              } else {
                alert("아직 참여 신청을 하지 않았습니다.\n참여 신청 후 작성자의 승인을 기다려주세요.");
              }
            } else {
              alert("채팅방을 찾을 수 없습니다.");
            }
          } catch (err) {
            console.error("❌ [useChatRoom] 게시글 확인 실패:", err);
            alert("채팅방을 찾을 수 없습니다.");
          }

          navigate("/app/market");
          setIsRoomLoading(false);
          return;
        }

        const data = snap.data() as ChatRoomDoc;

        setRoom((prevRoom) => {
          if (prevRoom) {
            const prevKey = JSON.stringify({
              type: prevRoom.type,
              participants: prevRoom.participants?.sort().join(","),
              members: prevRoom.members?.sort().join(","),
              productId: prevRoom.productId,
              buyerId: prevRoom.buyerId,
              sellerId: prevRoom.sellerId,
              postId: prevRoom.postId,
            });
            const dataKey = JSON.stringify({
              type: data.type,
              participants: data.participants?.sort().join(","),
              members: data.members?.sort().join(","),
              productId: data.productId,
              buyerId: data.buyerId,
              sellerId: data.sellerId,
              postId: data.postId,
            });
            if (prevKey === dataKey) return prevRoom;
          }
          return data;
        });

        if (data && myUid) {
          const initKey = `${chatRoomId}_${myUid}`;
          const currentUnread = data.unreadCount?.[myUid] ?? 0;

          if (currentUnread > 0 && !unreadInitializedRef.current.has(initKey)) {
            unreadInitializedRef.current.add(initKey);
            updateDoc(roomRef, { [`unreadCount.${myUid}`]: 0 }).catch((error) => {
              console.error("❌ [useChatRoom] unread 초기화 실패:", error);
              unreadInitializedRef.current.delete(initKey);
            });
          }

          if (!unreadInitializedRef.current.has(`${initKey}_read`)) {
            unreadInitializedRef.current.add(`${initKey}_read`);
            const { markRoomRead } = await import("@/lib/chat/markRoomRead");
            markRoomRead(chatRoomId, myUid).catch((error) => {
              console.warn("⚠️ [useChatRoom] 입장 시 읽음 처리 실패:", error);
              unreadInitializedRef.current.delete(`${initKey}_read`);
            });
          }
        }

        if (data.productSnapshot) {
          const snapshot = data.productSnapshot;
          setProduct({
            title: snapshot.title,
            price: snapshot.price,
            imageUrl: snapshot.imageUrl,
            images: snapshot.imageUrl ? [snapshot.imageUrl] : undefined,
            status: snapshot.status === "ACTIVE" ? "selling" : snapshot.status === "SOLD" ? "sold" : "selling",
          } as ProductDoc);
          setProductMissing(snapshot.status !== "ACTIVE" && snapshot.status !== "RESERVED");
          setProductStatus(snapshot.status);
        } else {
          setProduct(null);
          setProductMissing(true);
          setProductStatus(undefined);
        }

        setIsRoomLoading(false);
      },
      (error: { code?: string }) => {
        if (error.code === "unavailable" || error.code === "deadline-exceeded") {
          return;
        }
        if (error.code === "permission-denied") {
          console.error("❌ [useChatRoom] 채팅방 접근 권한 없음");
          if (chatRoomId.startsWith("match_")) {
            const mid = chatRoomId.slice("match_".length);
            navigate(mid ? `/match/${mid}` : "/match", { replace: true });
          } else {
            navigate("/app/market");
          }
        }
        setIsRoomLoading(false);
      }
    );

    return () => {
      isUnmounted = true;
      unsub();
    };
  }, [chatRoomId, myUid, navigate]);

  return {
    room,
    product,
    productMissing,
    productStatus,
    isRoomLoading,
  };
}
