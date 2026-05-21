import React from "react";

interface STTGuideBottomSheetProps {
  /** 바텀시트 표시 여부 */
  isOpen: boolean;
  /** 닫기 핸들러 */
  onClose: () => void;
}

/**
 * STT(음성 입력) 안내 바텀시트
 * iOS Safari에서 음성 입력 사용 방법 안내
 */
export function STTGuideBottomSheet({ isOpen, onClose }: STTGuideBottomSheetProps) {
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
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 10000,
        padding: 0,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 24,
          width: "100%",
          maxWidth: 500,
          boxShadow: "0 -4px 20px rgba(0, 0, 0, 0.15)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 12,
            textAlign: "center",
          }}
        >
          🎤 음성 입력 사용하기
        </div>
        <div
          style={{
            fontSize: 14,
            color: "#374151",
            lineHeight: 1.6,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          음성 입력은 앱을 홈 화면에 추가하면 사용할 수 있어요
        </div>
        <div
          style={{
            fontSize: 13,
            color: "#6B7280",
            lineHeight: 1.8,
            marginBottom: 24,
            padding: "16px",
            background: "#F9FAFB",
            borderRadius: 12,
          }}
        >
          <div style={{ marginBottom: 12 }}>
            <strong>1.</strong> Safari 하단의 <strong>공유 버튼(⬆️)</strong>을 누르세요
          </div>
          <div style={{ marginBottom: 12 }}>
            <strong>2.</strong> <strong>"홈 화면에 추가"</strong>를 선택하세요
          </div>
          <div>
            <strong>3.</strong> 추가 후 다시 실행하면 음성 입력 사용 가능
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: "#2563EB",
            color: "#fff",
            border: "none",
            borderRadius: 12,
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
