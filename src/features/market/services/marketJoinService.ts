/**
 * 🔥 축구 마켓 참여하기 서비스
 * 모집/매칭 참여 로직
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  type DocumentReference,
  type DocumentSnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost } from "../types";

/**
 * 🔥 참여 신청 상태 타입 (대회급 안정성)
 * 
 * 상태 전이 규칙:
 * - pending → approved / rejected / cancelled_by_user / expired
 * - approved → cancelled_by_user / cancelled_by_author / completed / no_show
 * - rejected → (재신청 가능)
 * - cancelled_by_user → (재신청 가능)
 * - cancelled_by_author → (재신청 가능)
 * - expired → (재신청 가능)
 * - completed → (최종 상태)
 * - no_show → (최종 상태)
 */
export type JoinStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled_by_user"
  | "cancelled_by_author"
  | "expired"
  | "completed"
  | "no_show";

/** 종목 마켓 글이 `market` 또는 `marketPosts` 어디에 있든 동일 postId로 조회 */
export async function resolveMarketPostDoc(postId: string): Promise<{
  ref: DocumentReference;
  snap: DocumentSnapshot;
}> {
  const marketRef = doc(db, "market", postId);
  const marketSnap = await getDoc(marketRef);
  if (marketSnap.exists()) {
    return { ref: marketRef, snap: marketSnap };
  }
  const postsRef = doc(db, "marketPosts", postId);
  const postsSnap = await getDoc(postsRef);
  if (postsSnap.exists()) {
    return { ref: postsRef, snap: postsSnap };
  }
  throw new Error("게시글을 찾을 수 없습니다.");
}

export interface MarketJoin {
  id: string;
  postId: string;
  userId: string;
  postAuthorId: string; // 🔥 게시글 작성자 ID (Rules에서 사용)
  userName?: string;
  category: "recruit" | "match";
  status: JoinStatus;
  createdAt: any;
  updatedAt?: any;
  position?: string;
  message?: string;
  // 🔥 운영급 필드
  rejectedReason?: string; // 거절 사유
  cancelledAt?: any; // 취소 시각
  expiredAt?: any; // 만료 시각
  completedAt?: any; // 완료 시각
  noShowAt?: any; // 노쇼 시각
}

/**
 * 참여하기 (모집/매칭)
 */
export async function joinMarketPost({
  postId,
  userId,
  userName,
  position,
  message,
}: {
  postId: string;
  userId: string;
  userName?: string;
  position?: string;
  message?: string;
}): Promise<string> {
  // 1. 게시글 조회 (market / marketPosts)
  const { ref: postRef, snap: postSnap } = await resolveMarketPostDoc(postId);
  const post = postSnap.data() as MarketPost;

  // 2. 모집/매칭만 참여 가능
  if (post.category !== "recruit" && post.category !== "match") {
    throw new Error("참여할 수 없는 게시글입니다.");
  }

  // 3. 작성자 본인은 참여 불가
  if (post.authorId === userId) {
    throw new Error("본인이 작성한 게시글에는 참여할 수 없습니다.");
  }

  // 4. 중복 참여 확인 (docId 고정 방식)
  const joinDocId = `${postId}_${userId}`;
  const existingJoinRef = doc(db, "marketJoins", joinDocId);
  const existingJoinSnap = await getDoc(existingJoinRef);

  if (existingJoinSnap.exists()) {
    const existingData = existingJoinSnap.data();
    const existingStatus = existingData.status;
    
    console.log("🔍 [joinMarketPost] 기존 참여 신청 확인:", {
      joinId: joinDocId,
      existingStatus,
      userId,
      postId,
    });
    
    // 🔥 재신청 불가능한 상태
    if (
      existingStatus === "pending" ||
      existingStatus === "approved" ||
      existingStatus === "completed"
    ) {
      throw new Error("이미 참여 신청하셨습니다.");
    }
    
    // 🔥 재신청 가능한 상태
    if (
      existingStatus === "rejected" ||
      existingStatus === "cancelled_by_user" ||
      existingStatus === "cancelled_by_author" ||
      existingStatus === "expired" ||
      existingStatus === "no_show"
    ) {
      console.log("✅ [joinMarketPost] 재신청 허용:", {
        joinId: joinDocId,
        previousStatus: existingStatus,
      });
    }
  }

  // 5. 인원수 체크
  if (post.people && post.currentPeople && post.currentPeople >= post.people) {
    throw new Error("모집 인원이 마감되었습니다.");
  }

  // 6. 트랜잭션으로 참여 신청 + 인원수 증가
  return await runTransaction(db, async (transaction) => {
    // 게시글 재조회 (최신 상태 확인)
    const currentPostSnap = await transaction.get(postRef);
    if (!currentPostSnap.exists()) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    const currentPost = currentPostSnap.data() as MarketPost;
    
    // 인원수 재확인
    if (currentPost.people && currentPost.currentPeople && currentPost.currentPeople >= currentPost.people) {
      throw new Error("모집 인원이 마감되었습니다.");
    }

    // 참여 신청 생성 (docId 고정: postId_userId)
    const joinDocId = `${postId}_${userId}`;
    const joinRef = doc(db, "marketJoins", joinDocId);
    
    // 🔥 authorId 검증
    if (!currentPost.authorId) {
      throw new Error("게시글 작성자 정보가 없습니다.");
    }

    // 🔥 Firestore는 undefined 필드를 저장할 수 없으므로, 값이 있을 때만 필드 추가
    // 🔥 category는 반드시 string이어야 함 (Rules 검증)
    const categoryValue = String(post.category || currentPost.category || "");
    if (categoryValue !== "recruit" && categoryValue !== "match") {
      throw new Error(`유효하지 않은 카테고리입니다: ${categoryValue}`);
    }
    
    const joinData: any = {
      postId: String(postId),
      userId: String(userId),
      postAuthorId: String(currentPost.authorId), // 🔥 게시글 작성자 ID (Rules에서 사용)
      category: categoryValue, // 🔥 반드시 string 타입
      status: "pending" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    console.log("🔥 [joinMarketPost] joinData 생성:", {
      postId: joinData.postId,
      userId: joinData.userId,
      postAuthorId: joinData.postAuthorId,
      category: joinData.category,
      categoryType: typeof joinData.category,
      status: joinData.status,
      joinId: joinDocId,
    });

    // 선택 필드만 조건부 추가 (undefined 방지)
    if (userName) joinData.userName = userName;
    if (position) joinData.position = position;
    if (message) joinData.message = message;

    transaction.set(joinRef, joinData);

    // 🔥 인원수 업데이트 제거 - Cloud Function 트리거가 처리
    // onMarketJoinStatusChanged가 status 변경을 감지하여 currentPeople 자동 업데이트
    // 승인 시에만 currentPeople 증가 (pending 상태에서는 증가하지 않음)

    // 🔥 로깅 (트랜잭션 완료 후)
    const { logJoinAction } = await import("./marketJoinLogger");
    logJoinAction({
      postId,
      joinId: joinDocId,
      userId,
      action: "JOIN_CREATED",
      status: "pending",
      metadata: {
        currentPeople: currentPost.currentPeople || 0,
        maxPeople: currentPost.people,
      },
    }).catch((err) => {
      console.warn("⚠️ [joinMarketPost] 로그 기록 실패 (무시):", err);
    });

    return joinDocId;
  });
}

/**
 * 참여 취소 (delete로 처리, docId 고정 방식)
 */
export async function cancelMarketJoin({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Promise<void> {
  // 참여 신청 찾기 (docId 고정 방식)
  const joinDocId = `${postId}_${userId}`;
  const joinRef = doc(db, "marketJoins", joinDocId);
  const joinSnap = await getDoc(joinRef);

  if (!joinSnap.exists()) {
    throw new Error("참여 신청을 찾을 수 없습니다.");
  }

  const joinData = joinSnap.data();
  
  // pending 또는 approved 상태만 취소 가능
  if (joinData.status !== "pending" && joinData.status !== "approved") {
    throw new Error("취소할 수 없는 참여 신청입니다.");
  }

  const { ref: postRefResolved } = await resolveMarketPostDoc(postId);

  // 🔥 트랜잭션으로 삭제 + 인원수 감소
  await runTransaction(db, async (transaction) => {
    // 🔥 참여 신청 재조회 (트랜잭션 내부에서 최신 상태 확인)
    const joinSnapInTx = await transaction.get(joinRef);
    
    if (!joinSnapInTx.exists()) {
      throw new Error("참여 신청을 찾을 수 없습니다.");
    }

    const joinDataInTx = joinSnapInTx.data();
    const currentStatusInTx = joinDataInTx.status;

    // 🔥 취소 가능 상태 재확인 (트랜잭션 내부에서)
    if (currentStatusInTx !== "pending" && currentStatusInTx !== "approved") {
      throw new Error("취소할 수 없는 참여 신청입니다.");
    }

    const postSnap = await transaction.get(postRefResolved);

    if (!postSnap.exists()) {
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    const post = postSnap.data() as MarketPost;
    const beforeCurrentPeople = post.currentPeople || 0;

    // 🔥 취소 처리: pending/approved 모두 cancelled_by_user 상태로 변경
    // 🔥 인원수 업데이트는 Cloud Function 트리거(onMarketJoinStatusChanged)가 처리
    // 🔥 삭제 대신 상태 변경으로 통일하여 Cloud Function 트리거가 동작하도록 함
    transaction.update(joinRef, {
      status: "cancelled_by_user",
      updatedAt: serverTimestamp(),
      cancelledAt: serverTimestamp(),
    });

    // 🔥 인원수 업데이트 제거 - Cloud Function 트리거가 처리
    // onMarketJoinStatusChanged가 status 변경을 감지하여 currentPeople 자동 업데이트

    console.log("✅ [cancelMarketJoin] 취소 완료 (인원수는 Cloud Function이 처리):", {
      joinId: joinDocId,
      status: currentStatusInTx,
    });
  }).then(async () => {
    // 🔥 로깅 (트랜잭션 완료 후)
    const { logJoinAction } = await import("./marketJoinLogger");
    logJoinAction({
      postId,
      joinId: joinDocId,
      userId,
      action: "JOIN_CANCELLED",
      status: "cancelled",
      metadata: {
        previousStatus: joinData.status,
      },
    }).catch((err) => {
      console.warn("⚠️ [cancelMarketJoin] 로그 기록 실패 (무시):", err);
    });
  }).catch(async (error) => {
    console.error("❌ [cancelMarketJoin] 취소 실패:", error);
    
    // 🔥 에러 로깅
    const { logJoinError } = await import("./marketJoinLogger");
    logJoinError({
      postId,
      joinId: joinDocId,
      userId,
      action: "CANCEL_JOIN",
      error: error.message,
      code: error.code,
    }).catch((err) => {
      console.warn("⚠️ [cancelMarketJoin] 에러 로그 기록 실패 (무시):", err);
    });
    
    throw error;
  });
}

/**
 * 참여 상태 확인 (docId 고정 방식)
 */
export async function getMarketJoinStatus({
  postId,
  userId,
}: {
  postId: string;
  userId: string;
}): Promise<"none" | JoinStatus> {
  try {
    const joinDocId = `${postId}_${userId}`;
    const joinRef = doc(db, "marketJoins", joinDocId);
    const joinSnap = await getDoc(joinRef);

    if (!joinSnap.exists()) {
      return "none";
    }

    const joinData = joinSnap.data();
    return (joinData.status as JoinStatus) || "none";
  } catch (error: any) {
    // 권한 오류 시 "none" 반환 (로그인 안 한 경우 등)
    if (error.code === "permission-denied") {
      console.warn("⚠️ [getMarketJoinStatus] 권한 없음 (로그인 필요):", error);
      return "none";
    }
    console.error("❌ [getMarketJoinStatus] 조회 실패:", error);
    return "none";
  }
}

/**
 * 게시글의 참여자 목록 조회
 */
export async function getMarketJoinList(postId: string): Promise<MarketJoin[]> {
  const joinQuery = query(
    collection(db, "marketJoins"),
    where("postId", "==", postId),
    where("status", "in", ["pending", "approved"])
  );
  const joinSnap = await getDocs(joinQuery);

  return joinSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as MarketJoin[];
}

/**
 * 참여 신청 승인/거절 (작성자 전용)
 */
export async function updateJoinStatus({
  joinId,
  status,
  postId,
}: {
  joinId: string;
  status: "approved" | "rejected";
  postId: string;
}): Promise<void> {
  console.log("🔥 [updateJoinStatus] 시작:", { joinId, status, postId });
  
  // 🔥 트랜잭션 밖에서 데이터 조회 (스코프 문제 해결)
  const joinRef = doc(db, "marketJoins", joinId);
  const [joinSnap, resolvedPost] = await Promise.all([
    getDoc(joinRef),
    resolveMarketPostDoc(postId),
  ]);
  const postRef = resolvedPost.ref;
  const postSnap = resolvedPost.snap;

    if (!joinSnap.exists()) {
      console.error("❌ [updateJoinStatus] 참여 신청 없음:", joinId);
      throw new Error("참여 신청을 찾을 수 없습니다.");
    }

    if (!postSnap.exists()) {
      console.error("❌ [updateJoinStatus] 게시글 없음:", postId);
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    const joinData = joinSnap.data() as MarketJoin;
    const post = postSnap.data() as MarketPost;
  const beforeCurrentPeople = post.currentPeople || 0;
  
  return await runTransaction(db, async (transaction) => {
    // 🔥 트랜잭션 내부에서 재조회 (최신 데이터 보장)
    const [joinSnapTx, postSnapTx] = await Promise.all([
      transaction.get(joinRef),
      transaction.get(postRef),
    ]);

    if (!joinSnapTx.exists()) {
      console.error("❌ [updateJoinStatus] 참여 신청 없음:", joinId);
      throw new Error("참여 신청을 찾을 수 없습니다.");
    }

    if (!postSnapTx.exists()) {
      console.error("❌ [updateJoinStatus] 게시글 없음:", postId);
      throw new Error("게시글을 찾을 수 없습니다.");
    }

    const joinDataTx = joinSnapTx.data() as MarketJoin;
    const postTx = postSnapTx.data() as MarketPost;
    const currentStatus = joinDataTx.status;
    
    console.log("📋 [updateJoinStatus] 현재 상태:", {
      joinId,
      currentStatus,
      userId: joinDataTx.userId,
      postAuthorId: joinDataTx.postAuthorId,
    });

    // 🔥 상태 머신 검증: pending 상태만 승인/거절 가능
    if (currentStatus !== "pending") {
      console.warn("⚠️ [updateJoinStatus] 이미 처리됨:", { joinId, currentStatus });
      throw new Error("이미 처리된 참여 신청입니다.");
    }

    // 🔥 상태 전이 검증 (대회급 안정성)
    const { validateStatusTransition } = await import("./marketJoinStateMachine");
    try {
      validateStatusTransition(currentStatus, status);
    } catch (validationError: any) {
      console.error("❌ [updateJoinStatus] 상태 전이 검증 실패:", {
        from: currentStatus,
        to: status,
        error: validationError.message,
      });
      throw new Error(`상태 전이가 불가능합니다: ${validationError.message}`);
    }

    const beforeCurrentPeople = post.currentPeople || 0;
    
    console.log("📊 [updateJoinStatus] 게시글 현재 인원:", {
      postId,
      beforeCurrentPeople,
      maxPeople: post.people,
    });

    // 참여 신청 상태 업데이트
    transaction.update(joinRef, {
      status: status,
      updatedAt: serverTimestamp(),
    });
    
    console.log("✅ [updateJoinStatus] join 문서 업데이트 예약:", {
      joinId,
      newStatus: status,
    });

    // 🔥 승인/거절 시 인원수 처리 (운영급 경쟁 상태 방어)
    if (status === "rejected") {
      // 🔥 거절 시: currentPeople 업데이트 제거
      // pending 생성 시 currentPeople을 증가시키지 않으므로, 거절 시에도 감소 불필요
      // Cloud Function이 승인 시에만 currentPeople 증가 처리
      console.log("📉 [updateJoinStatus] 거절 → 인원수 변경 없음 (pending에서 증가하지 않았으므로):", {
        currentPeople: beforeCurrentPeople,
      });
    } else {
      // 🔥 승인 시: 최대 인원 초과 완전 방어 (트랜잭션 내부에서 재확인)
      // 🔥 핵심: 동시 승인 레이스 컨디션 완전 차단
      const maxPeople = post.people || 999; // maxPeople이 없으면 무제한
      const currentPeople = beforeCurrentPeople || 0;
      
      // 🔥 1차 방어: 정원 초과 체크
      if (currentPeople >= maxPeople) {
        console.warn("⚠️ [updateJoinStatus] 최대 인원 초과 방지 (자동 거절):", {
          currentPeople,
          maxPeople,
          joinId,
          userId: joinDataTx.userId,
        });
        
        // 🔥 운영급: 정원 초과 시 자동 거절 처리
        transaction.update(joinRef, {
          status: "rejected",
          updatedAt: serverTimestamp(),
          rejectedReason: "FULL_AUTO", // 🔥 자동 거절 사유 기록
          rejectedAt: serverTimestamp(),
        });
        
        // 🔥 로깅 (트랜잭션 내부에서 로그 문서 생성)
        const { logJoinAction } = await import("./marketJoinLogger");
        logJoinAction({
          postId,
          joinId,
          userId: joinDataTx.userId,
          action: "JOIN_AUTO_REJECTED",
          status: "rejected",
          actorId: "system",
          reason: "FULL_AUTO",
          metadata: {
            currentPeople,
            maxPeople,
            autoBy: "transaction_guard",
          },
        }).catch((err) => {
          console.warn("⚠️ [updateJoinStatus] 자동 거절 로그 기록 실패 (무시):", err);
        });
        
        // 🔥 알림 발송 (트랜잭션 완료 후)
        const { notifyJoinAutoRejected } = await import("./marketJoinNotification");
        notifyJoinAutoRejected(
          joinDataTx.userId,
          postId,
          postTx.title || "매칭"
        ).catch((err) => {
          console.warn("⚠️ [updateJoinStatus] 자동 거절 알림 발송 실패 (무시):", err);
        });
        
        throw new Error("모집 인원이 이미 마감되었습니다.");
      }
      
      // 🔥 2차 방어: 중복 승인 방지 (트랜잭션 내부에서 상태 재확인)
      // 이미 위에서 currentStatus !== "pending" 체크했지만, 이중 방어
      if (currentStatus !== "pending") {
        console.warn("⚠️ [updateJoinStatus] 중복 승인 방지:", {
          joinId,
          currentStatus,
        });
        throw new Error("이미 처리된 참여 신청입니다.");
      }
      
      // 🔥 승인 시: currentPeople 업데이트 제거 (보안 강화)
      // Cloud Function(onMarketJoinStatusChanged)이 승인 시 currentPeople 증가 처리
      // Rules에서 클라이언트의 currentPeople 변경을 차단하므로 서버만 처리 가능
      console.log("📈 [updateJoinStatus] 승인 → 인원수는 Cloud Function이 처리:", {
        currentPeople,
        maxPeople,
        remaining: maxPeople - currentPeople,
        joinId,
      });
    }
  }).then(async () => {
    console.log("✅ [updateJoinStatus] 트랜잭션 완료:", { joinId, status });
    console.log("🔥 [updateJoinStatus] 승인 시 채팅방 생성 로직 진입:", { status, willCreateChatRoom: status === "approved" });
    
    // 🔥 트랜잭션 완료 후 최신 게시글 데이터 다시 읽기 (채팅방 생성에 필요)
    let postAfter: MarketPost;
    try {
      const { snap: postSnapAfter } = await resolveMarketPostDoc(postId);
      if (!postSnapAfter.exists()) {
        console.error("❌ [updateJoinStatus] 트랜잭션 후 게시글 없음:", postId);
        return;
      }
      postAfter = postSnapAfter.data() as MarketPost;
    } catch {
      console.error("❌ [updateJoinStatus] 트랜잭션 후 게시글 조회 실패:", postId);
      return;
    }
    console.log("🔥 [updateJoinStatus] 트랜잭션 후 게시글 데이터:", {
      postId,
      category: postAfter.category,
      type: (postAfter as any).type,
      title: postAfter.title,
      authorId: postAfter.authorId,
    });
    
    // 🔥 로깅 (트랜잭션 완료 후)
    const { logJoinAction } = await import("./marketJoinLogger");
    const actionType = status === "approved" ? "JOIN_APPROVED" : "JOIN_REJECTED";
    
    logJoinAction({
      postId,
      joinId,
      userId: joinData.userId,
      action: actionType,
      status: status,
      actorId: joinData.postAuthorId, // 작성자가 승인/거절
      reason: status === "rejected" && beforeCurrentPeople >= (postAfter.people || 999) 
        ? "FULL_AUTO" 
        : undefined,
      metadata: {
        currentPeople: beforeCurrentPeople,
        maxPeople: postAfter.people,
      },
    }).catch((err) => {
      console.warn("⚠️ [updateJoinStatus] 로그 기록 실패 (무시):", err);
    });

    // 🔥 알림 발송 (트랜잭션 완료 후)
    const { notifyJoinApproved, notifyJoinRejected } = await import("./marketJoinNotification");
    
    // 🔥 승인 시: 채팅방 생성 (클라이언트에서도 즉시 생성)
    console.log("🔥 [updateJoinStatus] 승인 체크:", { status, isApproved: status === "approved", postId });
    
    if (status === "approved") {
      console.log("✅ [updateJoinStatus] 승인 상태 확인됨, 채팅방 생성 로직 시작");
      try {
        // 🔥 모집 단체방인지 확인 (category RAW 값 확인 - 강화된 로깅)
        // 🔥 핵심: 트랜잭션 후 최신 데이터 사용
        const categoryRaw = postAfter.category;
        const typeRaw = (postAfter as any).type;
        const postTitle = postAfter.title;
        
        console.log("🔥 [updateJoinStatus] category RAW:", {
          category: categoryRaw,
          categoryType: typeof categoryRaw,
          categoryValue: JSON.stringify(categoryRaw),
          postId,
          postIdType: typeof postId,
          postIdValue: String(postId),
          postData: {
            category: categoryRaw,
            type: typeRaw,
            title: postTitle,
          },
          fullPostKeys: Object.keys(postAfter),
        });
        
        // 🔥 핵심: 모집 단체방 판정 (다양한 조건 체크)
        // 1. category가 "recruit" 또는 "match"
        // 2. type이 "recruit"
        // 3. recruit 필드가 true
        const isRecruitByCategory = categoryRaw === "recruit" || categoryRaw === "match";
        const isRecruitByType = typeRaw === "recruit";
        const isRecruitByField = (postAfter as any).recruit === true;
        
        // 🔥 응급 패치: category가 명시적으로 중고거래가 아닌 경우 모집으로 처리
        // (중고거래는 클라이언트에서 buildChatRoomId로 처리하므로 서버에서는 모집만 처리)
        // category가 undefined이거나 빈 문자열이면 모집으로 처리
        const categoryStr = String(categoryRaw || "");
        const isTradeCategory = categoryStr === "trade" || categoryStr === "used" || categoryStr === "equipment" || 
                                categoryStr === "product" || categoryStr === "market";
        
        // 🔥 최종 판정: 명시적으로 중고거래가 아니면 모집으로 처리
        // 또는 category가 없으면 모집으로 처리 (기본값)
        const isRecruit = isRecruitByCategory || isRecruitByType || isRecruitByField || !isTradeCategory || !categoryRaw;
        
        // 🔥 디버깅: 조건 상세 로그
        console.log("🔥 [updateJoinStatus] isRecruit 판정 상세:", {
          categoryRaw,
          categoryStr,
          typeRaw,
          recruitField: (postAfter as any).recruit,
          isRecruitByCategory,
          isRecruitByType,
          isRecruitByField,
          isTradeCategory,
          isRecruit, // 🔥 최종 판정
        });
        
        console.log("🔥 [updateJoinStatus] recruit 판정 (상세):", {
          category: categoryRaw,
          categoryValue: JSON.stringify(categoryRaw),
          type: typeRaw,
          recruitField: (post as any).recruit,
          isRecruitByCategory,
          isRecruitByType,
          isRecruitByField,
          isRecruit, // 🔥 최종 판정 결과
          postId,
          postIdString: String(postId),
          postIdType: typeof postId,
          userId: joinData.userId,
          authorId: post.authorId,
        });
        
        // 🔥 응급 디버깅: isRecruit가 false면 경고
        if (!isRecruit) {
          console.warn("⚠️ [updateJoinStatus] isRecruit = false → 채팅방 생성 스킵됨!", {
            category: categoryRaw,
            type: typeRaw,
            postId,
            note: "채팅방 생성 로직이 실행되지 않습니다. category 또는 type을 확인하세요.",
            suggestion: "응급 패치: 위의 isRecruit = true 주석을 해제하세요.",
          });
        }
        
        // 🔥 P0-1: Recruit 방 생성은 서버(Cloud Function)에서만 처리
        // 클라이언트에서는 생성하지 않고 서버 트리거에 위임
        if (isRecruit) {
          console.log("ℹ️ [updateJoinStatus] Recruit 방 생성은 서버(Cloud Function)에서 처리됩니다:", {
            postId,
            userId: joinData.userId,
            note: "onMarketJoinStatusChanged 트리거가 자동으로 채팅방을 생성합니다.",
          });
        } else {
          console.warn("⚠️ [updateJoinStatus] recruit가 아님, 채팅방 생성 스킵:", {
            category: post.category,
            isRecruit,
            postId,
          });
        }
      } catch (chatRoomError: any) {
        // 🔥 채팅방 생성 실패해도 메인 로직은 계속 진행 (서버 트리거가 백업)
        console.error("❌ [updateJoinStatus] 채팅방 생성 실패:", {
          error: chatRoomError.message,
          errorCode: chatRoomError.code,
          errorStack: chatRoomError.stack,
          postId,
          userId: joinData.userId,
          category: post.category,
        });
        // 🔥 에러를 다시 throw하지 않음 (메인 로직은 계속 진행)
      }
    } else {
      console.log("ℹ️ [updateJoinStatus] 승인이 아니므로 채팅방 생성 스킵:", {
        status,
        postId,
      });
    }
    
    // 🔥 클라이언트에서 즉시 생성 + 서버 트리거 백업 (이중 보장)
    console.log("✅ [updateJoinStatus] 상태 변경 완료:", {
      joinId,
      status,
      postId,
      chatRoomCreated: status === "approved",
    });
  }).catch(async (error) => {
    console.error("❌ [updateJoinStatus] 트랜잭션 실패:", {
      joinId,
      status,
      error: error.message,
      code: error.code,
    });
    
    // 🔥 에러 로깅
    const { logJoinError } = await import("./marketJoinLogger");
    logJoinError({
      postId,
      joinId,
      userId: joinData.userId,
      action: `UPDATE_JOIN_STATUS_${status.toUpperCase()}`,
      error: error.message,
      code: error.code,
      metadata: {
        currentPeople: beforeCurrentPeople,
        maxPeople: post.people,
      },
    }).catch((err) => {
      console.warn("⚠️ [updateJoinStatus] 에러 로그 기록 실패 (무시):", err);
    });
    
    throw error;
  });
}
