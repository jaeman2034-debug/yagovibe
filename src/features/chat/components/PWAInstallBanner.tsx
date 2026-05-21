import React from "react";

interface PWAInstallBannerProps {
  /** 배너 표시 여부 (iOS + PWA 아님일 때) */
  visible: boolean;
}

/**
 * PWA 설치 안내 배너
 * iOS에서 앱을 홈 화면에 추가하면 음성 입력 사용 가능하다는 안내
 */
export function PWAInstallBanner({ visible }: PWAInstallBannerProps) {
  if (!visible) return null;

  return (
    <div
      style={{
        flexShrink: 0,
        background: "#F0F9FF",
        borderTop: "1px solid #BAE6FD",
        padding: "8px 16px",
        fontSize: 12,
        color: "#075985",
        textAlign: "center",
        zIndex: 4,
      }}
    >
      🎤 음성 입력은 <strong>홈 화면에 추가</strong>하면 사용 가능해요
    </div>
  );
}
