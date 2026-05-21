import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Logo from "@/components/common/Logo";
import { QrCode } from 'lucide-react';

/**
 * 초대 코드 직접 입력 페이지
 * QR 코드가 없을 때 사용
 */
export default function QRInputPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      navigate(`/qr/preview?code=${code.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-none md:max-w-3xl">
        {/* 로고 */}
        <div className="flex justify-center mb-6">
          <Logo size={64} className="mb-4" />
        </div>

        {/* 헤더 */}
        <div className="text-center mb-8">
          <QrCode className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            초대 코드 입력
          </h1>
          <p className="text-sm text-gray-500">
            팀에서 받은 초대 코드를 입력하세요
          </p>
        </div>

        {/* 입력 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              초대 코드
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center text-lg font-mono"
              placeholder="ABCD-1234"
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg"
          >
            확인
          </button>
        </form>

        {/* QR 스캔으로 돌아가기 */}
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/qr')}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            QR 코드로 스캔하기
          </button>
        </div>
      </div>
    </div>
  );
}

