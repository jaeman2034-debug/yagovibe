/**
 * 회비 설정 페이지 (Admin 전용)
 * /association/:associationId/admin/fees
 * 
 * 중요: 이 화면은 연 1~2회만 만짐, 이후 사무국 개입 ❌
 */

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useIsAssociationAdmin } from "@/hooks/useIsAssociationAdmin";
import { useAuth } from "@/context/AuthProvider";

interface FeeType {
  id: string;
  name: string; // "연회비" | "월회비" | "임시회비"
  amount: number;
  cycle: "annual" | "monthly" | "one-time"; // 연 1회 / 자동 갱신 / 일회성
  dueDate: string; // 납부 기한 (YYYY-MM-DD)
  target: "all" | "specific"; // 전체 회원 / 특정 등급
  targetGrade?: string; // 특정 등급일 때
  enabled: boolean;
}

interface FeeSettings {
  associationId: string;
  feeTypes: FeeType[];
  updatedAt: Timestamp;
}

export default function FeeSettingsPage() {
  const { associationId } = useParams<{ associationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, loading: adminLoading } = useIsAssociationAdmin(associationId);

  const [settings, setSettings] = useState<FeeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 권한 체크
  useEffect(() => {
    if (!adminLoading && (!user || !isAdmin)) {
      navigate(`/association/${associationId}`, { replace: true });
    }
  }, [adminLoading, user, isAdmin, associationId, navigate]);

  // 설정 로드
  useEffect(() => {
    if (!associationId || !isAdmin) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        const settingsRef = doc(db, `associations/${associationId}/settings/fees`);
        const settingsSnap = await getDoc(settingsRef);

        if (settingsSnap.exists()) {
          setSettings(settingsSnap.data() as FeeSettings);
        } else {
          // 초기 설정
          const initialSettings: FeeSettings = {
            associationId,
            feeTypes: [],
            updatedAt: Timestamp.now(),
          };
          setSettings(initialSettings);
        }
      } catch (error) {
        console.error("회비 설정 로드 오류:", error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [associationId, isAdmin]);

  // 저장
  const handleSave = async () => {
    if (!settings || !associationId || !user) return;

    try {
      setSaving(true);
      const settingsRef = doc(db, `associations/${associationId}/settings/fees`);
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      });

      alert("회비 설정이 저장되었습니다.");
    } catch (error) {
      console.error("회비 설정 저장 오류:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 회비 유형 추가
  const addFeeType = () => {
    if (!settings) return;
    const newFeeType: FeeType = {
      id: Date.now().toString(),
      name: "",
      amount: 0,
      cycle: "annual",
      dueDate: "",
      target: "all",
      enabled: true,
    };
    setSettings({
      ...settings,
      feeTypes: [...settings.feeTypes, newFeeType],
    });
  };

  // 회비 유형 삭제
  const removeFeeType = (id: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      feeTypes: settings.feeTypes.filter((ft) => ft.id !== id),
    });
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!user || !isAdmin || !settings) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">회비 설정</h1>
            <p className="text-sm text-gray-500 mt-1">
              이 화면은 연 1~2회만 수정합니다. 이후 자동으로 관리됩니다.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
          {/* 회비 유형 목록 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">회비 유형</h2>
              <button
                onClick={addFeeType}
                className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
              >
                + 추가
              </button>
            </div>

            <div className="space-y-4">
              {settings.feeTypes.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  회비 유형이 없습니다. + 추가 버튼을 클릭하여 추가하세요.
                </p>
              ) : (
                settings.feeTypes.map((feeType) => (
                  <div
                    key={feeType.id}
                    className="border border-gray-200 rounded-lg p-4 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={feeType.enabled}
                          onChange={(e) => {
                            const updated = settings.feeTypes.map((ft) =>
                              ft.id === feeType.id
                                ? { ...ft, enabled: e.target.checked }
                                : ft
                            );
                            setSettings({ ...settings, feeTypes: updated });
                          }}
                          className="mr-2"
                        />
                        <span className="font-medium">활성화</span>
                      </div>
                      <button
                        onClick={() => removeFeeType(feeType.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          회비 유형
                        </label>
                        <select
                          value={feeType.name}
                          onChange={(e) => {
                            const updated = settings.feeTypes.map((ft) =>
                              ft.id === feeType.id
                                ? { ...ft, name: e.target.value }
                                : ft
                            );
                            setSettings({ ...settings, feeTypes: updated });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="">선택</option>
                          <option value="연회비">연회비</option>
                          <option value="월회비">월회비</option>
                          <option value="임시회비">임시회비</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          금액 (원)
                        </label>
                        <input
                          type="number"
                          value={feeType.amount}
                          onChange={(e) => {
                            const updated = settings.feeTypes.map((ft) =>
                              ft.id === feeType.id
                                ? { ...ft, amount: Number(e.target.value) }
                                : ft
                            );
                            setSettings({ ...settings, feeTypes: updated });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          납부 주기
                        </label>
                        <select
                          value={feeType.cycle}
                          onChange={(e) => {
                            const updated = settings.feeTypes.map((ft) =>
                              ft.id === feeType.id
                                ? { ...ft, cycle: e.target.value as any }
                                : ft
                            );
                            setSettings({ ...settings, feeTypes: updated });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="annual">연 1회</option>
                          <option value="monthly">자동 갱신 (월)</option>
                          <option value="one-time">일회성</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          납부 기한
                        </label>
                        <input
                          type="date"
                          value={feeType.dueDate}
                          onChange={(e) => {
                            const updated = settings.feeTypes.map((ft) =>
                              ft.id === feeType.id
                                ? { ...ft, dueDate: e.target.value }
                                : ft
                            );
                            setSettings({ ...settings, feeTypes: updated });
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        적용 대상
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="all"
                            checked={feeType.target === "all"}
                            onChange={(e) => {
                              const updated = settings.feeTypes.map((ft) =>
                                ft.id === feeType.id
                                  ? { ...ft, target: e.target.value as any }
                                  : ft
                              );
                              setSettings({ ...settings, feeTypes: updated });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">전체 회원</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="specific"
                            checked={feeType.target === "specific"}
                            onChange={(e) => {
                              const updated = settings.feeTypes.map((ft) =>
                                ft.id === feeType.id
                                  ? { ...ft, target: e.target.value as any }
                                  : ft
                              );
                              setSettings({ ...settings, feeTypes: updated });
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">특정 등급</span>
                        </label>
                      </div>
                      {feeType.target === "specific" && (
                        <input
                          type="text"
                          value={feeType.targetGrade || ""}
                          onChange={(e) => {
                            const updated = settings.feeTypes.map((ft) =>
                              ft.id === feeType.id
                                ? { ...ft, targetGrade: e.target.value }
                                : ft
                            );
                            setSettings({ ...settings, feeTypes: updated });
                          }}
                          placeholder="등급명 입력"
                          className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

