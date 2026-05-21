/**
 * 공지 이력 로그 섹션 컴포넌트
 * 
 * 원칙:
 * - 행정 모드에서만 표시
 * - audit_logs 컬렉션 조회
 * - 읽기 전용 (수정/삭제 불가)
 */

import { useState, useEffect } from "react";
import { collection, query, where, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDate } from "@/utils/dateUtils";

interface NoticeLogSectionProps {
  associationId: string;
  noticeId: string;
}

interface NoticeLog {
  id: string;
  action: string;
  adminId: string;
  title?: string;
  reason?: string;
  timestamp: Timestamp;
}

export function NoticeLogSection({ associationId, noticeId }: NoticeLogSectionProps) {
  const [logs, setLogs] = useState<NoticeLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!associationId || !noticeId) return;

    const fetchLogs = async () => {
      try {
        setLoading(true);
        const logsRef = collection(db, `associations/${associationId}/audit_logs`);
        const q = query(
          logsRef,
          where("noticeId", "==", noticeId),
          orderBy("timestamp", "desc")
        );

        const snapshot = await getDocs(q);
        const logsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as NoticeLog[];

        setLogs(logsData);
      } catch (error) {
        console.error("이력 로그 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [associationId, noticeId]);

  const getActionLabel = (action: string) => {
    switch (action) {
      case "NOTICE_SAVED":
        return "생성";
      case "NOTICE_PUBLISHED":
        return "게시";
      case "NOTICE_ARCHIVED":
        return "보관";
      default:
        return action.replace("NOTICE_", "");
    }
  };


  if (loading) {
    return (
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-medium text-gray-700 mb-3">이력</h3>
        <p className="text-sm text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-6 border-t border-gray-200">
      <h3 className="text-sm font-medium text-gray-700 mb-3">이력</h3>
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="text-xs text-gray-600">
            <span className="font-medium">
              {formatDate(log.timestamp)} {getActionLabel(log.action)}
            </span>
            {log.reason && (
              <>
                {" "}
                <span className="text-gray-500">(사유: {log.reason})</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

