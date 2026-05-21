// src/pages/academy/AcademyCreate.tsx
// 🔥 Phase A: 아카데미 생성 (30초 완성 목표)

import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthProvider";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CreateHeader } from "@/components/create/CreateHeader";
import { CreateFormContainer } from "@/components/create/CreateFormContainer";

export default function AcademyCreate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [academyName, setAcademyName] = useState("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const sportType = searchParams.get("type") || "football";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !academyName.trim() || !region.trim()) return;

    setLoading(true);
    try {
      // 🔥 academy doc 생성
      const academyRef = await addDoc(collection(db, "academies"), {
        name: academyName,
        region,
        sportType,
        ownerUid: user.uid,
        plan: "free",
        createdAt: serverTimestamp(),
      });

      // 🔥 생성 성공 → 대시보드로 이동
      setShowToast(true);
      setTimeout(() => {
        setShowToast(false);
        navigate(`/academy/dashboard/${academyRef.id}`);
      }, 1000);
    } catch (error) {
      console.error("아카데미 생성 실패:", error);
      alert("아카데미 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CreateHeader title="아카데미 만들기" />
      <CreateFormContainer className="w-full max-w-none md:max-w-md">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-2">기본 정보</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              아카데미 이름
            </label>
            <input
              type="text"
              value={academyName}
              onChange={(e) => setAcademyName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: YAGO 축구 아카데미"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              지역
            </label>
            <input
              type="text"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="예: 서울시 강남구"
              required
            />
          </div>

        </form>

        <div className="fixed left-0 right-0 bottom-0 z-30 bg-white border-t border-gray-200 p-4">
          <div className="w-full max-w-none px-3 md:mx-auto md:max-w-3xl">
            <button
              type="button"
              onClick={() => {
                const form = document.querySelector("form");
                form?.requestSubmit();
              }}
              disabled={loading}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              {loading ? "생성 중..." : "아카데미 생성하기"}
            </button>
          </div>
        </div>

        {/* 성공 토스트 */}
        {showToast && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
            완료되었습니다
          </div>
        )}
      </CreateFormContainer>
    </div>
  );
}

