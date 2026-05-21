/**
 * 공지 삭제(보관) 모달 컴포넌트
 * 
 * 원칙:
 * - 즉시 삭제 ❌
 * - 보관(archive)만 허용 ⭕
 * - 사유 입력 강제
 * - 로그 기록
 */

import { useState } from "react";
import { doc, updateDoc, serverTimestamp, addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthProvider";

interface NoticeDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  associationId: string;
  noticeId: string;
  noticeTitle: string;
}

export function NoticeDeleteModal({
  isOpen,
  onClose,
  onSuccess,
  associationId,
  noticeId,
  noticeTitle,
}: NoticeDeleteModalProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleArchive = async () => {
    if (!reason.trim()) {
      alert("공지 보관 사유를 입력해주세요.");
      return;
    }

    if (!user) return;

    try {
      setSaving(true);

      // status를 archived로 변경 (서브컬렉션)
      const noticeRef = doc(db, `associations/${associationId}/notices/${noticeId}`);
      await updateDoc(noticeRef, {
        status: "archived",
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      // 공식 로그 기록
      try {
        await addDoc(collection(db, `associations/${associationId}/audit_logs`), {
          action: "NOTICE_ARCHIVED",
          noticeId,
          adminId: user.uid,
          title: noticeTitle,
          reason: reason.trim(),
          timestamp: serverTimestamp(),
        });
      } catch (logError) {
        console.error("로그 기록 실패:", logError);
      }

      alert("공지가 보관되었습니다.");
      onSuccess();
      onClose();
      setReason("");
    } catch (error) {
      console.error("공지 보관 오류:", error);
      alert("보관 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md rounded-lg p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-gray-900">공지 보관</h2>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <p className="text-sm text-yellow-800">
            공지는 완전히 삭제되지 않으며, 보관(archived) 상태로 변경됩니다.
            <br />
            일반 사용자에게는 표시되지 않지만, 행정 기록으로 남습니다.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            보관 사유 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="보관 사유를 입력해주세요"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleArchive}
            disabled={saving || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "보관 중..." : "보관"}
          </button>
        </div>
      </div>
    </div>
  );
}

