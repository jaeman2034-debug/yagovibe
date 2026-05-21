import React from "react";

interface ChatInputBarProps {
  text: string;
  onTextChange: (text: string) => void;
  onSend: () => void;
  onImageSelect: (files: FileList | null) => void;
  onLocationShare: () => void;
  isUploadingImages: boolean;
  isRecruitGroup: boolean;
  isRoomClosed: boolean;
  productMissing: boolean;
  hasMessages: boolean;
  inputId?: string; // 이미지 input의 id (중복 방지)
  /** 상단 바(bar)가 이미 border-t 인 고정 도킹 영역 안에 있을 때 — 이중 테두리·그림자 제거 */
  docked?: boolean;
}

/**
 * 채팅 입력 바 컴포넌트
 * 텍스트 입력, 이미지 업로드, 위치 공유, 전송 버튼 포함
 */
export function ChatInputBar({
  text,
  onTextChange,
  onSend,
  onImageSelect,
  onLocationShare,
  isUploadingImages,
  isRecruitGroup,
  isRoomClosed,
  productMissing,
  hasMessages,
  inputId = "chat-image-input",
  docked = false,
}: ChatInputBarProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const isInputDisabled = isRecruitGroup && isRoomClosed;

  return (
    <div
      style={{
        flexShrink: 0,
        background: "#fff",
        borderTop: docked ? "none" : "1px solid #e5e7eb",
        padding: docked ? "8px 12px" : "12px 16px",
        paddingBottom: docked ? 8 : `calc(max(12px, env(safe-area-inset-bottom, 0px)))`,
        display: "flex",
        gap: 8,
        alignItems: "center",
        boxShadow: docked ? "none" : "0 -2px 8px rgba(0,0,0,0.05)",
        zIndex: 10,
        // 🔥 오버플로우 방지
        minWidth: 0, // 🔥 핵심: flex 오버플로우 방지
        maxWidth: "56rem", // max-w-4xl 과 동일 (플랫폼형 본문 폭)
        width: "100%",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* 🔥 필수 기능만: 사진, 위치, 전송 (서비스급 UX) */}
      {!isRoomClosed ? (
        <>
          {/* 📷 사진 버튼 */}
          <input
            type="file"
            multiple
            accept="image/*"
            style={{ display: "none" }}
            id={inputId}
            onChange={(e) => onImageSelect(e.target.files)}
            disabled={isUploadingImages}
          />
          <label
            htmlFor={inputId}
            style={{
              background: "transparent",
              border: "none",
              fontSize: 18,
              cursor: isUploadingImages ? "not-allowed" : "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              minWidth: 36,
              width: 36,
              height: 36,
              opacity: isUploadingImages ? 0.5 : 1,
            }}
            title={isUploadingImages ? "업로드 중..." : "사진 보내기"}
          >
            {isUploadingImages ? "⏳" : "📷"}
          </label>

          {/* 📍 위치 공유 버튼 (필수 기능) */}
          {(!productMissing || hasMessages) && (
            <button
              type="button"
              onClick={onLocationShare}
              style={{
                background: "transparent",
                border: "none",
                fontSize: 20, // 🔥 서비스급: 아이콘 크기 최적화
                cursor: "pointer",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                minWidth: 40, // 🔥 서비스급: 터치 영역 확보
                width: 40,
                height: 40,
              }}
              title="위치 공유"
            >
              📍
            </button>
          )}
        </>
      ) : null}
      
      {/* 🔥 모집 단체방 마감 시 입력 제한 */}
      {isRecruitGroup && isRoomClosed ? (
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "12px 16px",
            background: "#f3f4f6",
            borderRadius: 22,
            color: "#6b7280",
            fontSize: 13,
            textAlign: "center",
          }}
        >
          🚫 모집이 마감되어 채팅이 제한되었습니다.
        </div>
      ) : (
        <input
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="메시지를 입력하세요"
          disabled={isInputDisabled}
          style={{
            flex: 1,
            minWidth: 0, // 🔥 핵심: flex 오버플로우 방지
            height: 44,
            borderRadius: 22,
            border: "1px solid #e5e7eb",
            padding: "0 16px",
            outline: "none",
            fontSize: 16, // 🔥 핵심: 16px (아이폰 사파리 자동 줌 방지)
            background: isInputDisabled ? "#f3f4f6" : "#f9fafb",
            color: isInputDisabled ? "#9ca3af" : "#111827",
            cursor: isInputDisabled ? "not-allowed" : "text",
            // 🔥 오버플로우 방지
            maxWidth: "100%",
            boxSizing: "border-box",
          }}
        />
      )}
      
      {/* 🔥 전송 버튼 (서비스급 UX: 시선 집중) */}
      <button
        type="button"
        onClick={onSend}
        disabled={!text.trim() || isInputDisabled}
        style={{
          height: 44,
          width: 44,
          minWidth: 44, // 🔥 최소 너비 보장
          flexShrink: 0, // 🔥 핵심: 절대 줄어들지 않음
          borderRadius: 22,
          border: "none",
          background: isInputDisabled || !text.trim() ? "#d1d5db" : "#2563eb",
          color: "#fff",
          fontWeight: 600,
          cursor: isInputDisabled || !text.trim() ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18, // 🔥 서비스급: 전송 버튼 강조
          transition: "all 0.2s",
          boxSizing: "border-box",
          boxShadow: isInputDisabled || !text.trim() ? "none" : "0 2px 4px rgba(37, 99, 235, 0.3)", // 🔥 서비스급: 시선 집중
        }}
      >
        →
      </button>
    </div>
  );
}
