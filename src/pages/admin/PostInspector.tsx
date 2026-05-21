/**
 * 🔥 방 상세 관리 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 게시글 상세 정보 조회
 * - 참여자 목록 관리
 * - 강제 승인/롤백
 */

import { useEffect, useState } from "react";
import { collection, doc, query, where, onSnapshot } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import { forcePromote, forceRollback } from "./actions";

export default function PostInspector() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<any>(null);
  const [joins, setJoins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // 🔥 게시글 조회
  useEffect(() => {
    if (!postId) return;

    const unsubscribe = onSnapshot(
      doc(db, "market", postId),
      (snapshot) => {
        if (snapshot.exists()) {
          setPost({
            id: snapshot.id,
            ...snapshot.data(),
            updatedAt: snapshot.data().updatedAt?.toDate(),
          });
        } else {
          setPost(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("❌ [PostInspector] 게시글 조회 실패:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [postId]);

  // 🔥 참여자 목록 조회
  useEffect(() => {
    if (!postId) return;

    const q = query(
      collection(db, "marketJoins"),
      where("postId", "==", postId)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setJoins(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
            createdAt: d.data().createdAt?.toDate(),
            updatedAt: d.data().updatedAt?.toDate(),
          }))
        );
      },
      (error) => {
        console.error("❌ [PostInspector] 참여자 조회 실패:", error);
      }
    );

    return () => unsubscribe();
  }, [postId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
        <div className="container mx-auto px-4 py-8">
          <p className="text-red-600">게시글을 찾을 수 없습니다.</p>
          <button
            onClick={() => navigate("/admin")}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            대시보드로 돌아가기
          </button>
        </div>
      );
  }

  const isFull = post.people && post.currentPeople && post.currentPeople >= post.people;
  const isOver = post.people && post.currentPeople && post.currentPeople > post.people;

  const approvedCount = joins.filter((j) => j.status === "approved").length;
  const pendingCount = joins.filter((j) => j.status === "pending").length;
  const rejectedCount = joins.filter((j) => j.status === "rejected").length;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-4">
        <button
          onClick={() => navigate("/admin")}
          className="text-blue-600 hover:text-blue-800 text-sm"
        >
          ← 대시보드로 돌아가기
        </button>
      </div>

      <h1 className="text-3xl font-bold mb-6">{post.title || "제목 없음"}</h1>

      {/* 🔥 게시글 정보 */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">인원</div>
            <div className={`text-lg font-semibold ${isOver ? "text-red-600" : ""}`}>
              {post.currentPeople || 0} / {post.people || 0}
              {isOver && " ⚠️ 초과"}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">상태</div>
            <div className="text-lg font-semibold">{post.status || "open"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">승인</div>
            <div className="text-lg font-semibold text-green-600">{approvedCount}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">대기</div>
            <div className="text-lg font-semibold text-yellow-600">{pendingCount}</div>
          </div>
        </div>

        {/* 🔥 무결성 체크 */}
        {post.currentPeople !== approvedCount && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
            <div className="text-red-700 dark:text-red-300 font-semibold">
              ⚠️ 무결성 불일치 감지
            </div>
            <div className="text-sm text-red-600 dark:text-red-400 mt-1">
              currentPeople: {post.currentPeople || 0} ≠ approved: {approvedCount}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 참여자 목록 */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">참여자 목록</h2>
        <div className="space-y-2">
          {joins.length === 0 ? (
            <p className="text-gray-500">참여자가 없습니다.</p>
          ) : (
            joins.map((join) => (
              <div
                key={join.id}
                className="border border-gray-200 dark:border-neutral-700 rounded p-4 flex justify-between items-center"
              >
                <div className="flex-1">
                  <div className="font-medium">
                    {join.userId}
                    {join.userName && ` (${join.userName})`}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    상태:{" "}
                    <span
                      className={`font-semibold ${
                        join.status === "approved"
                          ? "text-green-600"
                          : join.status === "pending"
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {join.status}
                    </span>
                    {join.createdAt && (
                      <span className="ml-2">
                        신청: {join.createdAt.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  {join.status === "pending" && (
                    <button
                      onClick={async () => {
                        if (!postId) return;
                        setProcessing(join.id);
                        try {
                          await forcePromote(postId, join.userId);
                          alert("강제 승인 완료");
                        } catch (error: any) {
                          alert("강제 승인 실패: " + error.message);
                        } finally {
                          setProcessing(null);
                        }
                      }}
                      disabled={processing === join.id}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === join.id ? "처리 중..." : "강제 승인"}
                    </button>
                  )}

                  {join.status === "approved" && (
                    <button
                      onClick={async () => {
                        if (!postId) return;
                        setProcessing(join.id);
                        try {
                          await forceRollback(postId, join.userId);
                          alert("강제 취소 완료");
                        } catch (error: any) {
                          alert("강제 취소 실패: " + error.message);
                        } finally {
                          setProcessing(null);
                        }
                      }}
                      disabled={processing === join.id}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {processing === join.id ? "처리 중..." : "강제 취소"}
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
