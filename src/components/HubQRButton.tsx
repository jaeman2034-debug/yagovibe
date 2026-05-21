/**
 * 🔥 HUB 상단 헤더 우측 QR 아이콘
 * 
 * 역할: 로그인 QR 페이지로 리다이렉트
 * - 로그인 전: QR 코드로 로그인
 * - 로그인 후: 다른 기기에서 로그인
 * 
 * Overlay QR 제거: 혼란 방지를 위해 로그인 QR만 사용
 */

import { useNavigate } from "react-router-dom";
import { QrCode } from "lucide-react";
import { useAuth } from "@/context/AuthProvider";

interface HubQRButtonProps {
  /** QR 아이콘 크기 (기본값: 20px - 헤더용) */
  iconSize?: number;
  /** 버튼 크기 조정 (기본값: 작은 크기) */
  variant?: "small" | "large";
}

export function HubQRButton({ iconSize, variant = "small" }: HubQRButtonProps = {}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  // 로그인 상태에 따라 aria-label 변경
  const ariaLabel = user ? "다른 기기에서 로그인" : "QR 코드 로그인";

  // variant에 따라 크기 결정
  const finalIconSize = iconSize || (variant === "large" ? 34 : 20);
  const buttonSize = variant === "large" ? { width: '40px', height: '40px' } : {};
  const padding = variant === "large" ? "p-2" : "p-1.5";

  return (
    <button
      onClick={() => navigate('/login/qr-phone')}
      className={`header-icon-btn ${variant === "large" ? "ml-0.5" : "ml-1"} rounded-md ${padding} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
      style={{
        color: 'var(--text-secondary)', // 헤더 서브 컬러 (강조 ❌)
        ...buttonSize,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'var(--text-primary)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'var(--text-secondary)';
      }}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <QrCode 
        size={finalIconSize} 
        className="opacity-70 hover:opacity-100 transition-opacity" 
      />
    </button>
  );
}

