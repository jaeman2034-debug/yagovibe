import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import type { User } from "firebase/auth";

export default function OnboardingNamePage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  // 🔥 Firebase user 안정화 대기
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsub();
  }, []);

  const handleNext = async () => {
    if (!user) {
      alert("로그인 정보 확인 중입니다. 잠시 후 다시 시도하세요.");
      return;
    }

    if (!name.trim()) {
      alert("이름을 입력하세요");
      return;
    }

    try {
      setLoading(true);

      await setDoc(
        doc(db, "users", user.uid),
        {
          name: name.trim(),
          email: user.email || null,
          phone: user.phoneNumber || null,
          updatedAt: new Date(),
        },
        { merge: true }
      );
      // 이름 저장 후 다음 단계(지역 선택)로 이동
      navigate("/onboarding/region", { replace: true });

    } catch (e) {
      console.error("Onboarding save error:", e);
      alert("저장 실패 (권한 또는 네트워크 문제)");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-white p-6">
      <div className="w-full max-w-none md:max-w-3xl border rounded-2xl p-8 shadow-sm">

        <h1 className="text-2xl font-bold mb-6">이름을 알려주세요</h1>

        <label className="text-sm text-gray-500">이름</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-xl px-4 py-3 mt-1 mb-6"
        />

        <button
          onClick={handleNext}
          disabled={loading || !user}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold"
        >
          {loading ? "저장 중..." : !user ? "로그인 확인 중..." : "다음"}
        </button>

      </div>
    </div>
  );
}
