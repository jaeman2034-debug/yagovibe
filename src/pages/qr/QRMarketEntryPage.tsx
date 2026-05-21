/**
 * 🔥 QR 진입 페이지 (중고 마켓용) - STEP 2 LOCK
 * 
 * 핵심 원칙:
 * - QR 진입 = 무조건 게스트 허용
 * - QR 단계에서 가입/로그인 생각이 전혀 안 드는가?
 * - QR 로직과 가입 로직 완전 분리
 * 
 * 책임:
 * 1. QR 의도 해석
 * 2. 게스트 상태 허용 (체크만, 막지 않음)
 * 3. 목적 화면으로 즉시 이동
 * 
 * ❗ 여기서 절대 하지 말 것:
 * - 로그인 체크 ❌
 * - 가입 체크 ❌
 * - 권한 체크 ❌
 */

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleQREntry } from "@/lib/qrRouter";
import Logo from "@/components/common/Logo";

export default function QRMarketEntryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    // QR 의도 해석 및 목적 화면으로 즉시 이동
    const destination = handleQREntry(searchParams);

    if (destination) {
      // 즉시 목적 화면으로 이동
      navigate(destination, { replace: true });
    } else {
      // 유효하지 않은 QR → 마켓 홈으로 fallback
      navigate("/market", { replace: true });
    }
  }, [searchParams, navigate]);

  // 이동 중 로딩 화면 (거의 보이지 않음, 빠른 리다이렉트)
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        <Logo size={64} className="mx-auto mb-4 animate-pulse" />
        <p className="text-gray-500 text-sm">이동 중...</p>
      </div>
    </div>
  );
}

