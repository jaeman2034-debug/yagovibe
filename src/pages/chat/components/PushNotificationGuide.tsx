/**
 * 🔔 푸시 알림 안내 배너 (iOS/Android)
 * 
 * 플랫폼별로 푸시 알림 가능 여부를 안내하고,
 * 필요한 경우 행동을 유도합니다.
 */

import { useState, useEffect } from "react";

interface PushNotificationGuideProps {
  onDismiss?: () => void;
}

export function PushNotificationGuide({ onDismiss }: PushNotificationGuideProps) {
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // 🔥 플랫폼 감지
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isIOSDevice = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    // 🔥 PWA 설치 여부 확인
    const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
      ((window.navigator as any).standalone) ||
      document.referrer.includes('android-app://');
    setIsPWA(isStandalone);

    // 🔥 iOS이고 PWA가 아니면 안내 표시
    if (isIOSDevice && !isStandalone) {
      // localStorage에서 이미 본 적 있는지 확인
      const hasSeenGuide = localStorage.getItem('push_guide_ios_seen') === 'true';
      if (!hasSeenGuide) {
        setShowIOSGuide(true);
      }
    }

    // 🔥 Android 정보 배너 (한 번만 표시)
    if (!isIOSDevice) {
      const hasSeenAndroidGuide = localStorage.getItem('push_guide_android_seen') === 'true';
      if (!hasSeenAndroidGuide) {
        setShowAndroidGuide(true);
        // 3초 후 자동 닫기
        const timer = setTimeout(() => {
          localStorage.setItem('push_guide_android_seen', 'true');
          setShowAndroidGuide(false);
          onDismiss?.();
        }, 3000);

        return () => clearTimeout(timer);
      }
    }
  }, [onDismiss]);

  const handleDismiss = () => {
    localStorage.setItem('push_guide_ios_seen', 'true');
    setShowIOSGuide(false);
    onDismiss?.();
  };

  const handleShowGuide = () => {
    setShowModal(true);
  };

  // 🔥 iOS 안내 배너
  if (isIOS && !isPWA && showIOSGuide) {
    return (
      <div
        style={{
          background: "#F0F9FF",
          borderBottom: "1px solid #BAE6FD",
          padding: "12px 16px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#0C4A6E",
                marginBottom: 4,
              }}
            >
              🔔 메시지 알림과 음성 기능을 사용하려면
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#075985",
                lineHeight: 1.5,
                marginBottom: 8,
              }}
            >
              홈 화면에 추가하면 바로 이용할 수 있어요.
            </div>
            <button
              type="button"
              onClick={handleShowGuide}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "#0284C7",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 0,
                textDecoration: "underline",
              }}
            >
              홈 화면에 추가하는 방법
            </button>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              color: "#64748B",
              flexShrink: 0,
            }}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // 🔥 Android 정보 배너
  if (showAndroidGuide) {
    return (
      <div
        style={{
          background: "#F0FDF4",
          borderBottom: "1px solid #BBF7D0",
          padding: "12px 16px",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ fontSize: 20, flexShrink: 0 }}>🔔</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#14532D",
                marginBottom: 4,
              }}
            >
              새 메시지 알림이 도착합니다
            </div>
            <div
              style={{
                fontSize: 13,
                color: "#166534",
                lineHeight: 1.5,
              }}
            >
              앱이 꺼져 있어도 메시지를 바로 받아볼 수 있어요.
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem('push_guide_android_seen', 'true');
              setShowAndroidGuide(false);
              onDismiss?.();
            }}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: "pointer",
              padding: "4px 8px",
              color: "#64748B",
              flexShrink: 0,
            }}
            aria-label="닫기"
          >
            ×
          </button>
        </div>
      </div>
    );
  }

  // 🔥 iOS 모달 표시
  if (showModal) {
    return (
      <IOSInstallGuideModal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          handleDismiss();
        }}
      />
    );
  }

  return null;
}

/**
 * iOS 홈 화면 추가 가이드 모달
 */
export function IOSInstallGuideModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 10px 25px rgba(0, 0, 0, 0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 16,
          }}
        >
          📲 홈 화면에 추가하면 더 편해요
        </div>

        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              fontSize: 14,
              color: "#374151",
              lineHeight: 1.8,
              marginBottom: 12,
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <strong>1.</strong> Safari 하단의 <strong>공유 버튼(⬆️)</strong>을 누르세요
            </div>
            <div style={{ marginBottom: 12 }}>
              <strong>2.</strong> <strong>"홈 화면에 추가"</strong>를 선택하세요
            </div>
            <div>
              <strong>3.</strong> 추가 후 다시 실행하면
              <br />
              👉 <strong>알림 + 음성 기능 사용 가능</strong>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "12px 24px",
            background: "#2563EB",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          알겠습니다
        </button>
      </div>
    </div>
  );
}
