/**
 * 협회 관리자 첫 진입 체크리스트
 * 
 * Sprint 8: 공식 시스템화 & 첫 접속 UX
 * 
 * 원칙:
 * - Admin 첫 접속 시 상단 안내
 * - 링크 제공
 * - 완료 시 자동 숨김
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface AdminFirstEntryChecklistProps {
  associationId: string;
}

export function AdminFirstEntryChecklist({ associationId }: AdminFirstEntryChecklistProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const [isVisible, setIsVisible] = useState(false);
  const [completed, setCompleted] = useState({
    notice: false,
    tournament: false,
    facility: false,
  });

  useEffect(() => {
    if (adminLoading || !isAdmin || !user) return;

    const checkCompletion = async () => {
      try {
        // 첫 접속 체크
        const checklistKey = `adminChecklist_${associationId}_${user.uid}`;
        const hasCompletedChecklist = localStorage.getItem(checklistKey);
        if (hasCompletedChecklist) {
          setIsVisible(false);
          return;
        }

        // 공지 1건 체크
        const noticesRef = doc(db, `associations/${associationId}/notices`);
        // 간단히 공지 컬렉션 존재 여부만 체크 (실제로는 count 쿼리 필요)
        // 임시로 항상 false로 설정하고, 사용자가 직접 완료 표시 가능하도록

        setIsVisible(true);
      } catch (error) {
        console.error("체크리스트 확인 오류:", error);
      }
    };

    checkCompletion();
  }, [associationId, isAdmin, adminLoading, user]);

  const handleComplete = () => {
    if (!user) return;
    const checklistKey = `adminChecklist_${associationId}_${user.uid}`;
    localStorage.setItem(checklistKey, "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-yellow-900 mb-2">시작하기</h3>
          <ol className="text-sm text-yellow-800 space-y-1 list-decimal list-inside">
            <li>
              <button
                onClick={() => navigate(`/association/${associationId}/admin/notices/new`)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                공지 1건 등록
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate(`/association/${associationId}/admin/tournaments/new`)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                대회 1건 등록
              </button>
            </li>
            <li>
              <button
                onClick={() => navigate(`/association/${associationId}/admin/facility`)}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                대관 상태 설정
              </button>
            </li>
          </ol>
        </div>
        <button
          onClick={handleComplete}
          className="text-yellow-700 hover:text-yellow-900 text-sm font-medium ml-4"
        >
          완료
        </button>
      </div>
    </div>
  );
}

