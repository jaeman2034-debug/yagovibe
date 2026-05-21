/**
 * 🔥 작성자 전용 액션 패널
 * 권한 레이어: 작성자만 접근 가능한 관리 기능
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  doc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketPost } from "../types";
import { canTransitionMarketPostStatus } from "@/utils/marketPostStatusTransition";
import StatusBadge from "./StatusBadge";

const MAX_STATUS_HISTORY = 20;

interface OwnerActionsProps {
  post: MarketPost;
  onPostUpdate?: (updatedPost: MarketPost) => void;
}

export default function OwnerActions({ post, onPostUpdate }: OwnerActionsProps) {
  const navigate = useNavigate();
  const [updating, setUpdating] = useState(false);

  // 🔥 상태 변경 핸들러 (도메인 규칙: 상태 전이 검증)
  const handleStatusChange = async (newStatus: MarketPost["status"]) => {
    if (!post.id || updating) return;

    // 🔥 상태 전이 검증
    const canTransition = canTransitionMarketPostStatus(post.status, newStatus);
    if (!canTransition) {
      alert("이 상태로 변경할 수 없습니다.");
      return;
    }

    setUpdating(true);
    try {
      const historyEntry = {
        from: post.status,
        to: newStatus,
        changedAt: new Date().toISOString(),
      };
      const currentHistory = Array.isArray((post as any)?.statusHistory)
        ? ((post as any).statusHistory as unknown[])
        : [];
      const nextHistory = [...currentHistory, historyEntry].slice(-MAX_STATUS_HISTORY);
      const baseUpdate: Record<string, unknown> = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        lastStatusChangeAt: serverTimestamp(),
        statusHistory: nextHistory,
      };
      if (newStatus === "done") {
        baseUpdate.soldAt = serverTimestamp();
      }
      if (newStatus === "open" || newStatus === "active") {
        baseUpdate.soldAt = deleteField();
      }

      const postRef = doc(db, "market", post.id);
      await updateDoc(postRef, baseUpdate);

      try {
        await updateDoc(doc(db, "marketPosts", post.id), baseUpdate);
      } catch {
        /* marketPosts 없음·권한 등은 무시 */
      }

      const cat = post.category;
      if (cat === "recruit") {
        try {
          await updateDoc(doc(db, "recruitPosts", post.id), {
            status: newStatus,
            updatedAt: serverTimestamp(),
          });
        } catch {
          /* 무시 */
        }
      }
      if (cat === "match") {
        try {
          await updateDoc(doc(db, "matchPosts", post.id), {
            status: newStatus,
            updatedAt: serverTimestamp(),
          });
        } catch {
          /* 무시 */
        }
      }

      // 🔥 로컬 상태 업데이트 (optimistic update)
      const updatedPost = { ...post, status: newStatus };
      onPostUpdate?.(updatedPost);

      console.log("✅ 상태 변경 완료:", { from: post.status, to: newStatus });
    } catch (error: any) {
      console.error("❌ 상태 변경 오류:", error);
      alert("상태 변경 중 오류가 발생했습니다.\n" + (error.message || "알 수 없는 오류"));
    } finally {
      setUpdating(false);
    }
  };

  // 🔥 삭제 핸들러 (실제 문서 삭제)
  const handleDelete = async () => {
    if (!post.id) return;

    const confirmed = window.confirm(
      "이 상품을 삭제하시겠습니까?\n\n" +
      "• 삭제 후에는 복구할 수 없습니다.\n" +
      "• 관련 활동 피드도 함께 삭제됩니다."
    );

    if (!confirmed) return;

    setUpdating(true);
    try {
      // 🔥 1. Firestore market 문서 삭제
      const marketRef = doc(db, "market", post.id);
      await deleteDoc(marketRef);
      console.log("✅ Market 문서 삭제 완료:", { postId: post.id, sport: post.sport });

      // 🔥 2. marketPosts 문서 삭제 (랭킹 시스템용 동기화 컬렉션)
      try {
        const marketPostsRef = doc(db, "marketPosts", post.id);
        await deleteDoc(marketPostsRef);
        console.log("✅ MarketPosts 문서 삭제 완료:", { postId: post.id });
      } catch (marketPostsError: any) {
        // 🔥 marketPosts 삭제 실패해도 메인 삭제는 계속 진행
        console.warn("⚠️ MarketPosts 삭제 실패 (무시):", marketPostsError);
      }

      for (const col of ["recruitPosts", "matchPosts"] as const) {
        try {
          await deleteDoc(doc(db, col, post.id));
        } catch {
          /* 없으면 무시 */
        }
      }

      // 🔥 3. activities 문서 삭제 (refId로 찾아서)
      try {
        const activitiesQuery = query(
          collection(db, "activities"),
          where("refId", "==", post.id)
        );
        const activitiesSnapshot = await getDocs(activitiesQuery);
        
        // 🔥 일괄 삭제
        const deletePromises = activitiesSnapshot.docs.map((activityDoc) =>
          deleteDoc(activityDoc.ref)
        );
        await Promise.all(deletePromises);
        
        console.log("✅ Activities 문서 삭제 완료:", { count: activitiesSnapshot.size });
      } catch (activityError: any) {
        // 🔥 activities 삭제 실패해도 메인 삭제는 계속 진행
        console.warn("⚠️ Activities 삭제 실패 (무시):", activityError);
      }

      // 🔥 4. 삭제 후 해당 종목 마켓으로 이동
      const targetSport = post.sport || "soccer";
      navigate(`/sports/${targetSport}/market`);
    } catch (error: any) {
      console.error("❌ 삭제 오류:", error);
      
      // 🔥 상세 에러 메시지
      let errorMessage = "삭제 중 오류가 발생했습니다.";
      if (error.code === "permission-denied") {
        errorMessage = "권한이 없습니다. 로그인 상태를 확인해주세요.";
      } else if (error.code === "not-found") {
        errorMessage = "게시글을 찾을 수 없습니다.";
      } else if (error.message) {
        errorMessage += `\n${error.message}`;
      }
      
      alert(errorMessage);
      setUpdating(false);
    }
  };

  // 🔥 수정 핸들러
  const handleEdit = () => {
    if (!post.id) return;
    navigate(`/app/market/edit/${post.id}`);
  };

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-blue-900">📋 작성자 관리 패널</span>
          <StatusBadge status={post.status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {/* 수정 버튼 */}
        <button
          onClick={handleEdit}
          disabled={post.status === "done" || updating}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            post.status === "done" || updating
              ? "bg-gray-200 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"
          }`}
        >
          ✏️ 수정
        </button>

        {/* 상태 변경 버튼 (상태에 따라 동적 표시) */}
        {(post.status === "active" || post.status === "open") && (
          <button
            onClick={() => {
              const confirmed = window.confirm(
                "이 상품을 예약중으로 변경하시겠습니까?\n\n예약중으로 변경하면 다른 사용자가 구매할 수 없습니다."
              );
              if (confirmed) {
                handleStatusChange("reserved");
              }
            }}
            disabled={updating}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-500 text-white hover:bg-yellow-600 active:scale-95 transition-all disabled:opacity-50"
          >
            🔒 예약중으로 변경
          </button>
        )}

        {post.status === "reserved" && (
          <>
            <button
              onClick={() => {
                const confirmed = window.confirm(
                  "이 상품을 거래완료로 변경하시겠습니까?\n\n거래완료로 변경하면 더 이상 수정할 수 없습니다."
                );
                if (confirmed) {
                  handleStatusChange("done");
                }
              }}
              disabled={updating}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50"
            >
              ✅ 거래완료로 변경
            </button>

            <button
              onClick={() => {
                const confirmed = window.confirm(
                  "이 상품을 다시 판매중으로 변경하시겠습니까?"
                );
                if (confirmed) {
                  handleStatusChange("open");
                }
              }}
              disabled={updating}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
            >
              🔓 다시 판매중으로 변경
            </button>
          </>
        )}

        {/* 삭제 버튼 */}
        <button
          onClick={handleDelete}
          disabled={updating}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 active:scale-95 transition-all disabled:opacity-50"
        >
          🗑️ 삭제
        </button>
      </div>
    </div>
  );
}
