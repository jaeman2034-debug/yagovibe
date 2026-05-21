/**
 * 회원별 납부 상태 관리 페이지 (Admin 전용)
 * /association/:associationId/admin/fees/status
 * 
 * 자동 분류: 🟢 납부 완료 / 🟡 기한 임박 / 🔴 미납
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, getDocs, Timestamp, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";

interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  grade?: string;
}

interface FeePayment {
  memberId: string;
  feeTypeId: string;
  feeTypeName: string;
  amount: number;
  paid: boolean;
  paidAt?: Timestamp;
  dueDate: Timestamp;
  status: "paid" | "pending" | "overdue"; // 🟢 / 🟡 / 🔴
}

interface MemberFeeStatus extends Member {
  payments: FeePayment[];
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  overallStatus: "paid" | "pending" | "overdue";
}

export default function MemberFeeStatusPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [members, setMembers] = useState<MemberFeeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "overdue">("all");
  const [dateFilter, setDateFilter] = useState({
    start: "",
    end: "",
  });

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 회원 납부 상태 조회
  useEffect(() => {
    if (!associationId || !isAdmin) return;

    const loadMemberStatus = async () => {
      try {
        setLoading(true);
        
        // 회원 목록 조회
        const membersRef = collection(db, `associations/${associationId}/members`);
        const membersSnapshot = await getDocs(membersRef);
        
        const membersData: MemberFeeStatus[] = [];

        for (const memberDoc of membersSnapshot.docs) {
          const member = { id: memberDoc.id, ...memberDoc.data() } as Member;

          // 회원별 납부 내역 조회
          const paymentsRef = collection(
            db,
            `associations/${associationId}/members/${memberDoc.id}/feePayments`
          );
          const paymentsSnapshot = await getDocs(paymentsRef);

          const payments: FeePayment[] = paymentsSnapshot.docs.map((doc) => {
            const data = doc.data();
            const dueDate = data.dueDate as Timestamp;
            const now = Timestamp.now();
            const daysUntilDue = Math.ceil(
              (dueDate.toMillis() - now.toMillis()) / (1000 * 60 * 60 * 24)
            );

            let status: "paid" | "pending" | "overdue" = "pending";
            if (data.paid) {
              status = "paid";
            } else if (daysUntilDue < 0) {
              status = "overdue";
            } else if (daysUntilDue <= 7) {
              status = "pending"; // 기한 임박
            }

            return {
              memberId: memberDoc.id,
              feeTypeId: data.feeTypeId,
              feeTypeName: data.feeTypeName,
              amount: data.amount,
              paid: data.paid || false,
              paidAt: data.paidAt,
              dueDate,
              status,
            };
          });

          const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0);
          const paidAmount = payments
            .filter((p) => p.paid)
            .reduce((sum, p) => sum + p.amount, 0);
          const unpaidAmount = totalAmount - paidAmount;

          // 전체 상태 결정
          let overallStatus: "paid" | "pending" | "overdue" = "paid";
          if (unpaidAmount > 0) {
            const hasOverdue = payments.some((p) => !p.paid && p.status === "overdue");
            overallStatus = hasOverdue ? "overdue" : "pending";
          }

          membersData.push({
            ...member,
            payments,
            totalAmount,
            paidAmount,
            unpaidAmount,
            overallStatus,
          });
        }

        setMembers(membersData);
      } catch (error) {
        console.error("회원 납부 상태 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadMemberStatus();
  }, [associationId, isAdmin]);

  // 필터링된 회원 목록
  const filteredMembers = members.filter((member) => {
    if (statusFilter === "all") return true;
    return member.overallStatus === statusFilter;
  });

  // 통계
  const stats = {
    total: members.length,
    paid: members.filter((m) => m.overallStatus === "paid").length,
    pending: members.filter((m) => m.overallStatus === "pending").length,
    overdue: members.filter((m) => m.overallStatus === "overdue").length,
    totalUnpaidAmount: members.reduce((sum, m) => sum + m.unpaidAmount, 0),
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">🟢 납부 완료</span>;
      case "pending":
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs">🟡 기한 임박</span>;
      case "overdue":
        return <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">🔴 미납</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">회원 납부 상태</h1>
          <button
            onClick={() => navigate(`/association/${associationId}/admin/fees`)}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            회비 설정
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">전체 회원</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">🟢 납부 완료</p>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">🟡 기한 임박</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">🔴 미납</p>
            <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* 미납 금액 합계 */}
        {stats.totalUnpaidAmount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-600 mb-1">총 미납 금액</p>
            <p className="text-2xl font-bold text-red-700">
              {stats.totalUnpaidAmount.toLocaleString()}원
            </p>
          </div>
        )}

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">상태:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">전체</option>
                <option value="paid">🟢 납부 완료</option>
                <option value="pending">🟡 기한 임박</option>
                <option value="overdue">🔴 미납</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">기간:</span>
              <input
                type="date"
                value={dateFilter.start}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, start: e.target.value })
                }
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
              <span className="text-gray-500">~</span>
              <input
                type="date"
                value={dateFilter.end}
                onChange={(e) =>
                  setDateFilter({ ...dateFilter, end: e.target.value })
                }
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* 회원 목록 테이블 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">회원명</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">상태</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">총액</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">납부액</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">미납액</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    회원이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredMembers.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {member.name}
                    </td>
                    <td className="px-4 py-3 text-sm">{getStatusBadge(member.overallStatus)}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {member.totalAmount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm text-green-600">
                      {member.paidAmount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm text-red-600">
                      {member.unpaidAmount > 0
                        ? `${member.unpaidAmount.toLocaleString()}원`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => {
                          // TODO: 상세 보기 또는 알림 발송
                          alert("상세 보기 기능 준비중");
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        상세
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
  );
}

