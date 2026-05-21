// === CORE PROTECTED: DO NOT MODIFY BELOW ===
// 🧠 YAGO SPORTS Router Configuration
// 이 파일은 Cursor가 자동 수정하지 못하도록 보호됩니다.

// ======================================================
// 🧠 GENIUS MODE PATCH INSTRUCTION
// Project: YAGO SPORTS CLEAN BUILD (SPT Edition)
// Author: ChatGPT (천재모드)
// Purpose: Firebase + AuthProvider + Router 구조 세팅
// ======================================================
//
// ⚠️ IMPORTANT DEVELOPER RULES for Cursor
// ------------------------------------------------------
// 1️⃣ 절대 다른 파일 수정 금지 — 지정된 파일만 수정할 것.
// 2️⃣ 파일이 없으면 새로 생성, 반드시 명시된 경로에 생성.
// 3️⃣ 이미 있는 코드는 덮어써도 됨 (본 지시문 내의 파일만).
// 4️⃣ 설치된 패키지, .env, tailwind 설정 절대 건드리지 말 것.
// 5️⃣ ChatGPT가 포함한 주석, 구조, import 경로 절대 삭제 금지.
// ------------------------------------------------------
// ✅ 이 패치는 Firebase + AuthProvider + Router 기반을 구축한다.
// ======================================================

import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthProvider";
import StartPage from "./pages/StartPage";
import HomePage from "./pages/HomePage";
import SignupPage from "./pages/SignupPage";
import TeamBlogPage from "./pages/TeamBlogPage";
import AdminPage from "./pages/AdminPage";
import VoiceMapSearch from "./pages/VoiceMapSearch";
import VoiceAssistant_AI from "./components/VoiceAssistant_AI";

function PrivateRoute({ children }: { children: React.ReactElement }) {
  const { user, loading } = useAuth();
  if (loading) return <div>로딩 중...</div>;
  return user ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/start" element={<StartPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/teamblog" element={<TeamBlogPage />} />
      <Route path="/voice-map" element={<VoiceMapSearch />} />
      <Route path="/voice-assistant" element={<VoiceAssistant_AI />} />
      <Route path="/admin" element={<PrivateRoute><AdminPage /></PrivateRoute>} />
    </Routes>
  );
}

// ======================================================
// ✅ END OF GENIUS MODE PATCH (DO NOT MODIFY ABOVE LINES)
// ======================================================

// === END PROTECTED ===
