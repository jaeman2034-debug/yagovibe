/**
 * 🔥 QR 만료 페이지
 * 
 * 역할:
 * - QR 토큰 만료 시 표시
 * - QR 토큰 위조 시 표시
 * - 사용자 안내 및 홈으로 이동
 */

import { useNavigate } from "react-router-dom";
import { AlertCircle, Home } from "lucide-react";
import Logo from "@/components/common/Logo";

export default function QRExpiredPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="w-full max-w-none text-center md:mx-auto md:max-w-3xl">
        <AlertCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
        <Logo size={48} className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-2">QR 코드가 만료되었습니다</h1>
        <p className="text-gray-600 mb-6">
          이 QR 코드는 만료되었거나 유효하지 않습니다.
          <br />
          새로운 QR 코드를 생성해 주세요.
        </p>
        <button
          onClick={() => navigate('/home')}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
        >
          <Home size={20} />
          홈으로 이동
        </button>
      </div>
    </div>
  );
}
