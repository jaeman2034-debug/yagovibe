/**
 * 기부/후원 관리 페이지 (Admin 전용)
 * /association/:associationId/admin/donations
 * 
 * 중요: 회비와 절대 섞지 않음, 별도 모듈
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";

interface Donation {
  id: string;
  amount: number;
  donorName?: string; // 선택 (익명 가능)
  type: "donation" | "sponsorship" | "tournament-sponsorship"; // 기부금 / 찬조금 / 대회 후원금
  purpose?: string; // 목적 (선택)
  paymentDate: Timestamp;
  tournamentId?: string; // 대회 연결 시
  tournamentName?: string;
  isAnonymous: boolean;
  receiptIssued: boolean;
  receiptIssuedAt?: Timestamp;
  createdAt: Timestamp;
  createdBy: string;
}

export default function DonationManagementPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<"all" | "donation" | "sponsorship" | "tournament-sponsorship">("all");

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 기부/후원 목록 조회
  useEffect(() => {
    if (!associationId || !isAdmin) return;

    const fetchDonations = async () => {
      try {
        setLoading(true);
        const donationsRef = collection(db, `associations/${associationId}/donations`);
        const q = query(donationsRef, orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);

        const donationsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Donation[];

        setDonations(donationsData);
      } catch (error) {
        console.error("기부/후원 목록 조회 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDonations();
  }, [associationId, isAdmin]);

  // 필터링된 목록
  const filteredDonations = donations.filter((donation) => {
    if (typeFilter === "all") return true;
    return donation.type === typeFilter;
  });

  // 통계
  const stats = {
    total: donations.reduce((sum, d) => sum + d.amount, 0),
    donation: donations.filter((d) => d.type === "donation").reduce((sum, d) => sum + d.amount, 0),
    sponsorship: donations.filter((d) => d.type === "sponsorship").reduce((sum, d) => sum + d.amount, 0),
    tournament: donations.filter((d) => d.type === "tournament-sponsorship").reduce((sum, d) => sum + d.amount, 0),
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "donation":
        return "기부금";
      case "sponsorship":
        return "찬조금";
      case "tournament-sponsorship":
        return "대회 후원금";
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">기부/후원 관리</h1>
            <p className="text-sm text-gray-500 mt-1">
              모든 후원금·찬조금·기부금은 협회 수입으로 귀속됩니다.
            </p>
          </div>
          <button
            onClick={() => navigate(`/association/${associationId}/admin/donations/new`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            + 새 기부/후원 등록
          </button>
        </div>

        {/* 통계 카드 */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">총 기부/후원</p>
            <p className="text-2xl font-bold">{stats.total.toLocaleString()}원</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">기부금</p>
            <p className="text-2xl font-bold text-blue-600">{stats.donation.toLocaleString()}원</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">찬조금</p>
            <p className="text-2xl font-bold text-green-600">{stats.sponsorship.toLocaleString()}원</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-4">
            <p className="text-sm text-gray-600 mb-1">대회 후원금</p>
            <p className="text-2xl font-bold text-purple-600">{stats.tournament.toLocaleString()}원</p>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">구분:</span>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">전체</option>
                <option value="donation">기부금</option>
                <option value="sponsorship">찬조금</option>
                <option value="tournament-sponsorship">대회 후원금</option>
              </select>
            </div>
          </div>
        </div>

        {/* 목록 테이블 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">후원자</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">구분</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">금액</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">목적</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">입금일</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">영수증</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    기부/후원 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                filteredDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {donation.isAnonymous
                        ? "익명"
                        : donation.donorName || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                        {getTypeLabel(donation.type)}
                      </span>
                      {donation.tournamentName && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({donation.tournamentName})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {donation.amount.toLocaleString()}원
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {donation.purpose || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {donation.paymentDate?.toDate().toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {donation.receiptIssued ? (
                        <span className="text-green-600">✓ 발급됨</span>
                      ) : (
                        <span className="text-gray-400">미발급</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        {donation.receiptIssued ? (
                          <button
                            onClick={() => {
                              // TODO: 영수증 재발급
                              alert("영수증 재발급 기능 준비중");
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            재발급
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              // TODO: 영수증 발급
                              alert("영수증 발급 기능 준비중");
                            }}
                            className="text-green-600 hover:text-green-800"
                          >
                            발급
                          </button>
                        )}
                        <button
                          onClick={() =>
                            navigate(`/association/${associationId}/admin/donations/${donation.id}/edit`)
                          }
                          className="text-gray-600 hover:text-gray-800"
                        >
                          편집
                        </button>
                      </div>
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

