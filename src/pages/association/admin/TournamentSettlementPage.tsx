/**
 * 대회 정산 페이지 (Admin 전용)
 * /association/:associationId/admin/tournaments/:tournamentId/settlement
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";

interface IncomeItem {
  id: string;
  name: string;
  amount: number;
  description?: string;
}

interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
  date: string;
  receiptUrl?: string;
  description?: string;
}

interface Settlement {
  tournamentId: string;
  participantFee: number;
  participantCount: number;
  incomes: IncomeItem[];
  expenses: ExpenseItem[];
  totalIncome: number;
  totalExpense: number;
  balance: number;
  updatedAt: Timestamp;
}

export default function TournamentSettlementPage() {
  const { associationId, tournamentId } = useParams<{
    associationId: string;
    tournamentId: string;
  }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 정산 데이터 로드
  useEffect(() => {
    if (!associationId || !tournamentId || !isAdmin) return;

    const loadSettlement = async () => {
      try {
        setLoading(true);
        const settlementRef = doc(
          db,
          `associations/${associationId}/tournaments/${tournamentId}/settlement`
        );
        const settlementSnap = await getDoc(settlementRef);

        if (settlementSnap.exists()) {
          setSettlement(settlementSnap.data() as Settlement);
        } else {
          // 초기 데이터 생성
          const initialSettlement: Settlement = {
            tournamentId: tournamentId,
            participantFee: 0,
            participantCount: 0,
            incomes: [],
            expenses: [],
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            updatedAt: Timestamp.now(),
          };
          setSettlement(initialSettlement);
        }
      } catch (error) {
        console.error("정산 데이터 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettlement();
  }, [associationId, tournamentId, isAdmin]);

  // 자동 계산
  const calculateTotals = (incomes: IncomeItem[], expenses: ExpenseItem[]) => {
    const totalIncome = incomes.reduce((sum, item) => sum + item.amount, 0);
    const totalExpense = expenses.reduce((sum, item) => sum + item.amount, 0);
    const balance = totalIncome - totalExpense;
    return { totalIncome, totalExpense, balance };
  };

  // 저장
  const handleSave = async () => {
    if (!settlement || !associationId || !tournamentId || !user) return;

    try {
      setSaving(true);
      const { totalIncome, totalExpense, balance } = calculateTotals(
        settlement.incomes,
        settlement.expenses
      );

      const settlementData = {
        ...settlement,
        totalIncome,
        totalExpense,
        balance,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      };

      const settlementRef = doc(
        db,
        `associations/${associationId}/tournaments/${tournamentId}/settlement`
      );
      await setDoc(settlementRef, settlementData);

      alert("정산 정보가 저장되었습니다.");
    } catch (error) {
      console.error("정산 저장 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 수입 항목 추가
  const addIncome = () => {
    if (!settlement) return;
    const newIncome: IncomeItem = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
    };
    setSettlement({
      ...settlement,
      incomes: [...settlement.incomes, newIncome],
    });
  };

  // 지출 항목 추가
  const addExpense = () => {
    if (!settlement) return;
    const newExpense: ExpenseItem = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
    };
    setSettlement({
      ...settlement,
      expenses: [...settlement.expenses, newExpense],
    });
  };

  // 항목 삭제
  const removeItem = (type: "income" | "expense", id: string) => {
    if (!settlement) return;
    if (type === "income") {
      setSettlement({
        ...settlement,
        incomes: settlement.incomes.filter((item) => item.id !== id),
      });
    } else {
      setSettlement({
        ...settlement,
        expenses: settlement.expenses.filter((item) => item.id !== id),
      });
    }
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user || !isAdmin || !settlement) {
    return null;
  }

  const { totalIncome, totalExpense, balance } = calculateTotals(
    settlement.incomes,
    settlement.expenses
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">대회 정산</h1>
          <div className="flex gap-3">
            <button
              onClick={() => {
                // TODO: 보고서 출력 기능
                alert("보고서 출력 기능 준비중");
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              보고서 출력
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 입력 영역 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 참가비 설정 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-lg font-semibold mb-4">참가비 설정</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    참가비 (원)
                  </label>
                  <input
                    type="number"
                    value={settlement.participantFee}
                    onChange={(e) =>
                      setSettlement({
                        ...settlement,
                        participantFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    참가 인원
                  </label>
                  <input
                    type="number"
                    value={settlement.participantCount}
                    onChange={(e) =>
                      setSettlement({
                        ...settlement,
                        participantCount: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>
            </div>

            {/* 수입 항목 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">수입 항목</h2>
                <button
                  onClick={addIncome}
                  className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-3">
                {settlement.incomes.map((item) => (
                  <div key={item.id} className="flex gap-3 items-center">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => {
                        const updated = settlement.incomes.map((i) =>
                          i.id === item.id ? { ...i, name: e.target.value } : i
                        );
                        setSettlement({ ...settlement, incomes: updated });
                      }}
                      placeholder="항목명"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="number"
                      value={item.amount}
                      onChange={(e) => {
                        const updated = settlement.incomes.map((i) =>
                          i.id === item.id
                            ? { ...i, amount: Number(e.target.value) }
                            : i
                        );
                        setSettlement({ ...settlement, incomes: updated });
                      }}
                      placeholder="금액"
                      className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <button
                      onClick={() => removeItem("income", item.id)}
                      className="px-3 py-2 text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                ))}
                {settlement.incomes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    수입 항목이 없습니다.
                  </p>
                )}
              </div>
            </div>

            {/* 지출 항목 */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">지출 항목</h2>
                <button
                  onClick={addExpense}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  + 추가
                </button>
              </div>
              <div className="space-y-3">
                {settlement.expenses.map((item) => (
                  <div key={item.id} className="space-y-2 p-3 border border-gray-200 rounded">
                    <div className="flex gap-3 items-center">
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => {
                          const updated = settlement.expenses.map((i) =>
                            i.id === item.id ? { ...i, name: e.target.value } : i
                          );
                          setSettlement({ ...settlement, expenses: updated });
                        }}
                        placeholder="항목명"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="number"
                        value={item.amount}
                        onChange={(e) => {
                          const updated = settlement.expenses.map((i) =>
                            i.id === item.id
                              ? { ...i, amount: Number(e.target.value) }
                              : i
                          );
                          setSettlement({ ...settlement, expenses: updated });
                        }}
                        placeholder="금액"
                        className="w-32 px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <button
                        onClick={() => removeItem("expense", item.id)}
                        className="px-3 py-2 text-red-600 hover:text-red-800"
                      >
                        삭제
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <input
                        type="date"
                        value={item.date}
                        onChange={(e) => {
                          const updated = settlement.expenses.map((i) =>
                            i.id === item.id ? { ...i, date: e.target.value } : i
                          );
                          setSettlement({ ...settlement, expenses: updated });
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md"
                      />
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !associationId || !tournamentId || !user) return;

                          try {
                            // 영수증 업로드
                            const timestamp = Date.now();
                            const fileName = `${timestamp}-${file.name}`;
                            const storagePath = `associations/${associationId}/tournaments/${tournamentId}/receipts/${fileName}`;
                            const storageRef = ref(storage, storagePath);
                            
                            await uploadBytes(storageRef, file);
                            const downloadURL = await getDownloadURL(storageRef);

                            // 지출 항목에 영수증 URL 추가
                            const updated = settlement.expenses.map((i) =>
                              i.id === item.id ? { ...i, receiptUrl: downloadURL } : i
                            );
                            setSettlement({ ...settlement, expenses: updated });

                            alert("영수증이 업로드되었습니다.");
                          } catch (error) {
                            console.error("영수증 업로드 오류:", error);
                            alert("영수증 업로드 중 오류가 발생했습니다.");
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                      />
                      {item.receiptUrl && (
                        <a
                          href={item.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          영수증 보기
                        </a>
                      )}
                    </div>
                  </div>
                ))}
                {settlement.expenses.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    지출 항목이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* 우측: 요약 영역 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4">정산 요약</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 수입</p>
                  <p className="text-2xl font-bold text-green-600">
                    {totalIncome.toLocaleString()}원
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">총 지출</p>
                  <p className="text-2xl font-bold text-red-600">
                    {totalExpense.toLocaleString()}원
                  </p>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm text-gray-600 mb-1">잔액</p>
                  <p
                    className={`text-3xl font-bold ${
                      balance >= 0 ? "text-blue-600" : "text-red-600"
                    }`}
                  >
                    {balance.toLocaleString()}원
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {balance >= 0 ? "흑자" : "적자"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

