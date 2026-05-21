/**
 * 회비 관리 페이지 (Admin 전용)
 * /association/:associationId/admin/fees
 * 
 * 기능:
 * - 회원별 회비 리스트
 * - 필터: 미납 / 납부
 * - 납부 처리 토글
 * - 기부금/찬조금 등록
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";
import { MembershipFee, FeeType } from "@/types/fee";
import { logAdminAction } from "@/lib/logAdminAction";

export default function FeeManagementPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [fees, setFees] = useState<MembershipFee[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unpaid" | "paid">("all");
  const [saving, setSaving] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 회비 조회
  useEffect(() => {
    if (!associationId || !isAdmin) return;

    const fetchFees = async () => {
      try {
        setLoading(true);
        const feesRef = collection(db, `associations/${associationId}/membership_fees`);
        const q = query(feesRef, orderBy("dueDate", "desc"));
        const snapshot = await getDocs(q);

        const feesData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as MembershipFee[];

        setFees(feesData);
      } catch (error) {
        console.error("회비 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFees();
  }, [associationId, isAdmin]);

  // 납부 처리
  const handleTogglePayment = async (feeId: string, currentStatus: string) => {
    if (!associationId || !user) return;

    try {
      setSaving(true);
      const feeRef = doc(db, `associations/${associationId}/membership_fees/${feeId}`);
      const newStatus = currentStatus === "paid" ? "unpaid" : "paid";
      
      await updateDoc(feeRef, {
        status: newStatus,
        paidAt: newStatus === "paid" ? serverTimestamp() : null,
        updatedAt: serverTimestamp(),
      });

      setFees((prev) =>
        prev.map((fee) =>
          fee.id === feeId ? { ...fee, status: newStatus as "paid" | "unpaid", paidAt: newStatus === "paid" ? Timestamp.now() : undefined } : fee
        )
      );

      await logAdminAction("MEMBERSHIP_FEE_UPDATED", `회비 납부 상태 변경: ${newStatus}`, {
        feeId,
        status: newStatus,
      });
    } catch (error) {
      console.error("납부 처리 오류:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const filteredFees = fees.filter((fee) => {
    if (filter === "all") return true;
    return fee.status === filter;
  });

  const getFeeTypeLabel = (type: FeeType) => {
    switch (type) {
      case "annual":
        return "연회비";
      case "monthly":
        return "월회비";
      case "temporary":
        return "임시회비";
      case "donation":
        return "기부금";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate(`/association/${associationId}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 text-sm"
          >
            ← 협회 페이지로 돌아가기
          </button>
          <h1 className="text-2xl font-bold text-gray-900">회비 관리</h1>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">필터:</span>
            <button
              onClick={() => setFilter("all")}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setFilter("unpaid")}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === "unpaid"
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              미납
            </button>
            <button
              onClick={() => setFilter("paid")}
              className={`px-4 py-2 rounded-md text-sm ${
                filter === "paid"
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              납부
            </button>
          </div>
        </div>

        {/* 회비 리스트 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    회원명
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    유형
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    금액
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    기한
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    조치
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      회비 정보가 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{fee.memberName}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getFeeTypeLabel(fee.type)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {fee.amount.toLocaleString()}원
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {fee.dueDate.toDate().toLocaleDateString("ko-KR")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            fee.status === "paid"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {fee.status === "paid" ? "납부" : "미납"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleTogglePayment(fee.id, fee.status)}
                          disabled={saving}
                          className={`px-3 py-1 rounded text-sm ${
                            fee.status === "paid"
                              ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          } disabled:opacity-50`}
                        >
                          {fee.status === "paid" ? "미납 처리" : "납부 처리"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

