import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { Navigate } from "react-router-dom";

export default function AuthGate({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (loading) return;

    const run = async () => {
      const uid = user?.uid ?? auth.currentUser?.uid;
      if (!uid) {
        setNeedsOnboarding(false);
        setChecking(false);
        return;
      }

      setChecking(true);
      try {
        const snap = await getDoc(doc(db, "users", uid));
        if (!snap.exists() || !snap.data()?.onboardingCompleted) {
          setNeedsOnboarding(true);
        } else {
          setNeedsOnboarding(false);
        }
      } catch (e) {
        console.error("AuthGate error:", e);
      } finally {
        setChecking(false);
      }
    };

    run();
  }, [loading, user?.uid]);

  if (loading || checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  const sessionUser = user ?? auth.currentUser;
  if (!sessionUser) return <Navigate to="/login" replace />;

  // 🔥 온보딩 필요 → 온보딩 이동
  if (needsOnboarding) return <Navigate to="/onboarding" replace />;

  // 🔥 정상 → 앱 렌더
  return children;
}
