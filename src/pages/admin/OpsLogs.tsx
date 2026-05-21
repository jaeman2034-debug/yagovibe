/**
 * 🔥 보정 내역 뷰어 (프로덕션 배포 패키지)
 * 
 * 역할:
 * - 무결성 보정 로그 상세 조회
 * - 보정 내역 표시
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";

export default function OpsLogs() {
  const { logId } = useParams<{ logId: string }>();
  const navigate = useNavigate();
  const [log, setLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!logId) return;

    const unsubscribe = onSnapshot(
      doc(db, "ops_logs", logId),
      (snapshot) => {
        if (snapshot.exists()) {
          setLog({
            id: snapshot.id,
            ...snapshot.data(),
            startedAt: snapshot.data().startedAt?.toDate(),
            finishedAt: snapshot.data().finishedAt?.toDate(),
          });
        } else {
          setLog(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error("❌ [OpsLogs] 로그 조회 실패:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [logId]);

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

  if (!log) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-red-600">로그를 찾을 수 없습니다.</p>
        <button
          onClick={() => navigate("/admin")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  const fixes = log.fixes || [];

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

      <h1 className="text-3xl font-bold mb-6">보정 로그 상세</h1>

      {/* 🔥 로그 요약 */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">타입</div>
            <div className="text-lg font-semibold">{log.type || "INTEGRITY_FIX"}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">스캔</div>
            <div className="text-lg font-semibold">{log.scanned || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">보정</div>
            <div className="text-lg font-semibold text-red-600">{log.fixedCount || 0}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500 dark:text-gray-400">시작 시간</div>
            <div className="text-sm">
              {log.startedAt ? log.startedAt.toLocaleString() : "-"}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 보정 내역 */}
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-semibold mb-4">
          보정 내역 ({fixes.length}건)
        </h2>
        {fixes.length === 0 ? (
          <p className="text-gray-500">보정 내역이 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {fixes.map((fix: any, i: number) => (
              <div
                key={i}
                className="border border-gray-200 dark:border-neutral-700 rounded p-4"
              >
                <div className="font-medium mb-2">
                  게시글: {fix.postId}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  수정 필드: {fix.fixedFields?.join(", ") || "-"}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">이전:</span>{" "}
                    currentPeople = {fix.before?.currentPeople ?? "-"}
                  </div>
                  <div>
                    <span className="text-gray-500">이후:</span>{" "}
                    currentPeople = {fix.after?.currentPeople ?? "-"}
                  </div>
                </div>
                {fix.approvedCount !== undefined && (
                  <div className="text-sm text-gray-500 mt-1">
                    실제 승인 수: {fix.approvedCount}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
