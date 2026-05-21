/**
 * 🔥 위치 기반 QR 토큰 진입 페이지
 * 
 * 경로: /q/:token
 * 역할:
 * - QR 토큰 검증
 * - 위치 정보 추출
 * - 목적 경로로 리다이렉트 (위치 파라미터 포함)
 * - 만료/위조 시 만료 페이지로 리다이렉트
 */

import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { verifyLocationQrToken } from "@/utils/qrToken";
import Logo from "@/components/common/Logo";

export default function QRTokenPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      // 토큰이 없으면 만료 페이지로
      navigate('/qr-expired', { replace: true });
      return;
    }

    // 토큰 검증
    const payload = verifyLocationQrToken(token);

    if (!payload) {
      // 만료 또는 위조된 토큰
      navigate('/qr-expired', { replace: true });
      return;
    }

    // 목적 경로로 리다이렉트 (위치 파라미터 포함)
    const destination = `${payload.path}?lat=${payload.lat}&lng=${payload.lng}${
      payload.data ? `&data=${encodeURIComponent(JSON.stringify(payload.data))}` : ''
    }`;

    navigate(destination, { replace: true });
  }, [token, navigate]);

  // 로딩 중 표시
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Logo size={64} className="mx-auto mb-4 animate-pulse" />
        <p className="text-gray-500">위치 정보 확인 중…</p>
      </div>
    </div>
  );
}
