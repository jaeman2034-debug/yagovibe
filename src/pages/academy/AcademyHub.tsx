// src/pages/academy/AcademyHub.tsx
// 🔥 Phase A: 아카데미 허브 (수익 진입점)

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthProvider";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

const ACTIONS = [
  { key: "manage", label: "🏫 우리 아카데미 관리", primary: true },
  { key: "search", label: "🔍 아카데미 찾기" },
  { key: "promote", label: "📢 아카데미 홍보" },
];

function ActionGrid({
  actions,
  onActionClick,
}: {
  actions: typeof ACTIONS;
  onActionClick: (key: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      {actions.map((action) => (
        <button
          key={action.key}
          onClick={() => onActionClick(action.key)}
          className={`flex flex-col items-center justify-center p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 ${
            action.primary ? "ring-2 ring-blue-500" : ""
          }`}
        >
          <span className="text-4xl mb-2">{action.label.split(" ")[0]}</span>
          <span className="text-sm font-medium text-gray-700 text-center">
            {action.label.split(" ").slice(1).join(" ")}
          </span>
        </button>
      ))}
    </div>
  );
}

export default function AcademyHub() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasAcademy, setHasAcademy] = useState(false);
  const [academyId, setAcademyId] = useState<string | null>(null);

  // 🔥 아카데미 소유 여부 체크
  useEffect(() => {
    if (!user?.uid || !type) return;

    const checkAcademy = async () => {
      try {
        const q = query(
          collection(db, "academies"),
          where("ownerUid", "==", user.uid),
          where("sportType", "==", type)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
          const academyDoc = snapshot.docs[0];
          setHasAcademy(true);
          setAcademyId(academyDoc.id);
        }
      } catch (error) {
        console.error("아카데미 체크 실패:", error);
      }
    };

    checkAcademy();
  }, [user?.uid, type]);

  const handleActionClick = (key: string) => {
    switch (key) {
      case "manage":
        // 🔥 수익 진입점
        if (!hasAcademy) {
          navigate(`/academy/create?type=${type || "football"}`);
        } else {
          navigate(`/academy/dashboard/${academyId}`);
        }
        break;
      case "search":
        navigate(`/academy/search?type=${type || "football"}`);
        break;
      case "promote":
        // TODO: 홍보 페이지
        alert("홍보 기능 준비중");
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">⚽ 축구 아카데미</h1>
        </div>
        <ActionGrid actions={ACTIONS} onActionClick={handleActionClick} />
      </div>
    </div>
  );
}

