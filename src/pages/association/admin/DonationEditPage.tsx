/**
 * 기부/후원 등록/수정 페이지 (Admin 전용)
 * /association/:associationId/admin/donations/new
 * /association/:associationId/admin/donations/:donationId/edit
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";

interface Tournament {
  id: string;
  title: string;
}

export default function DonationEditPage() {
  const { associationId, donationId } = useParams<{
    associationId: string;
    donationId?: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);
  const isEditMode = !!donationId;

  const [amount, setAmount] = useState(0);
  const [donorName, setDonorName] = useState("");
  const [type, setType] = useState<"donation" | "sponsorship" | "tournament-sponsorship">("donation");
  const [purpose, setPurpose] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [tournamentId, setTournamentId] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 대회 목록 조회
  useEffect(() => {
    if (!associationId || !isAdmin) return;

    const loadTournaments = async () => {
      try {
        const tournamentsRef = collection(db, `associations/${associationId}/tournaments`);
        const snapshot = await getDocs(tournamentsRef);
        const tournamentsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Tournament[];
        setTournaments(tournamentsData);
      } catch (error) {
        console.error("대회 목록 조회 오류:", error);
      }
    };

    loadTournaments();
  }, [associationId, isAdmin]);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (!isEditMode || !associationId || !donationId || !isAdmin) return;

    const loadDonation = async () => {
      try {
        setLoading(true);
        const donationRef = doc(db, `associations/${associationId}/donations/${donationId}`);
        const donationSnap = await getDoc(donationRef);

        if (donationSnap.exists()) {
          const data = donationSnap.data();
          setAmount(data.amount || 0);
          setDonorName(data.donorName || "");
          setType(data.type || "donation");
          setPurpose(data.purpose || "");
          setPaymentDate(
            data.paymentDate?.toDate().toISOString().slice(0, 10) ||
              new Date().toISOString().slice(0, 10)
          );
          setTournamentId(data.tournamentId || "");
          setIsAnonymous(data.isAnonymous || false);
        }
      } catch (error) {
        console.error("기부/후원 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDonation();
  }, [isEditMode, associationId, donationId, isAdmin]);

  const handleSave = async () => {
    if (!amount || amount <= 0) {
      alert("금액을 입력해주세요.");
      return;
    }

    if (!user || !associationId) return;

    try {
      setSaving(true);

      const paymentDateObj = new Date(paymentDate);
      const tournament = tournaments.find((t) => t.id === tournamentId);

      const donationData = {
        amount,
        donorName: isAnonymous ? "" : donorName.trim(),
        type,
        purpose: purpose.trim() || null,
        paymentDate: Timestamp.fromDate(paymentDateObj),
        tournamentId: tournamentId || null,
        tournamentName: tournament?.title || null,
        isAnonymous,
        receiptIssued: false,
        createdBy: user.uid,
        updatedAt: serverTimestamp(),
        ...(isEditMode ? {} : { createdAt: serverTimestamp() }),
      };

      const docId = donationId || doc(collection(db, "temp")).id;
      const donationRef = doc(db, `associations/${associationId}/donations/${docId}`);
      await setDoc(donationRef, donationData);

      alert("기부/후원 정보가 저장되었습니다.");
      navigate(`/association/${associationId}/admin/donations`);
    } catch (error) {
      console.error("기부/후원 저장 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">
          {isEditMode ? "기부/후원 수정" : "새 기부/후원 등록"}
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* 중요 안내 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>중요:</strong> 모든 후원금·찬조금·기부금은 협회 수입으로 귀속됩니다.
              개인/특정 운영자/대회 담당자 귀속은 불가합니다.
            </p>
          </div>

          {/* 기본 정보 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              구분 <span className="text-red-500">*</span>
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="donation">기부금</option>
              <option value="sponsorship">찬조금</option>
              <option value="tournament-sponsorship">대회 후원금</option>
            </select>
          </div>

          {type === "tournament-sponsorship" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                연결 대회
              </label>
              <select
                value={tournamentId}
                onChange={(e) => setTournamentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">선택 안 함</option>
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              금액 (원) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="금액을 입력하세요"
            />
          </div>

          <div>
            <label className="flex items-center mb-2">
              <input
                type="checkbox"
                checked={isAnonymous}
                onChange={(e) => setIsAnonymous(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm font-medium text-gray-700">익명</span>
            </label>
            {!isAnonymous && (
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mt-2"
                placeholder="후원자명 (선택)"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              목적 (선택)
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="예: 대회 후원, 시설 개선 등"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              입금일 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* 하단 액션 */}
          <div className="flex items-center justify-end gap-3 border-t pt-6">
            <button
              onClick={() => navigate(`/association/${associationId}/admin/donations`)}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

