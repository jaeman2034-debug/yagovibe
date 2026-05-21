import React from "react";

interface ImageItem {
  url: string;
  thumbUrl: string;
  width: number;
  height: number;
}

interface VideoItem {
  url: string;
  thumbUrl: string;
  duration: number;
  size: number;
}

interface MediaViewer {
  show: (items: Array<{ kind: "image" | "video"; url: string; thumbUrl: string; [key: string]: any }>, index: number) => void;
}

interface VideoMessageProps {
  videos: VideoItem[];
  images?: ImageItem[];
  text?: string;
  isMine: boolean;
  mediaViewer: MediaViewer;
}

/**
 * 동영상 메시지 컴포넌트
 * 동영상 썸네일, 재생 버튼, 길이 표시 및 텍스트를 포함한 동영상 메시지 표시
 */
export function VideoMessage({ videos, images = [], text, isMine, mediaViewer }: VideoMessageProps) {
  // 🔥 모든 미디어 아이템 수집 (이미지 + 동영상)
  const allMediaItems = [
    ...images.map((img) => ({
      kind: "image" as const,
      url: img.url,
      thumbUrl: img.thumbUrl,
      width: img.width,
      height: img.height,
    })),
    ...videos.map((v) => ({
      kind: "video" as const,
      url: v.url,
      thumbUrl: v.thumbUrl,
      duration: v.duration,
      size: v.size,
    })),
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isMine ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: "70%",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {videos.map((vid, idx) => {
          const videoIndex = images.length + idx;

          return (
            <div
              key={idx}
              style={{
                position: "relative",
                borderRadius: 12,
                overflow: "hidden",
                cursor: "pointer",
                background: "#000",
              }}
              onClick={() => {
                if (allMediaItems.length > 0) {
                  mediaViewer.show(allMediaItems, videoIndex);
                } else {
                  window.open(vid.url, "_blank");
                }
              }}
            >
              <img
                src={vid.thumbUrl}
                alt={`동영상 ${idx + 1}`}
                style={{
                  width: "100%",
                  height: "auto",
                  minHeight: 200,
                  maxHeight: 400,
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {/* 재생 버튼 오버레이 */}
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "rgba(0, 0, 0, 0.3)",
                  transition: "background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.3)";
                }}
              >
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "rgba(255, 255, 255, 0.9)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    color: "#2563eb",
                  }}
                >
                  ▶
                </div>
              </div>
              {/* 동영상 길이 표시 */}
              {vid.duration > 0 && (
                <div
                  style={{
                    position: "absolute",
                    bottom: 8,
                    right: 8,
                    background: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    padding: "4px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  {Math.floor(vid.duration / 60)}:{(Math.floor(vid.duration % 60)).toString().padStart(2, "0")}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* 동영상 메시지 텍스트 (있는 경우) */}
      {text && text !== "동영상을 보냈습니다" && (
        <div
          style={{
            maxWidth: "68%", // 🔥 서비스급: 최적 너비
            marginTop: 8,
            padding: "10px 14px", // 🔥 서비스급: 최적 패딩
            borderRadius: 18, // 🔥 서비스급: 카톡/당근 스타일
            background: isMine ? "#2563eb" : "#fff",
            color: isMine ? "#fff" : "#111827",
            border: isMine ? "none" : "1px solid #e5e7eb",
            boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
            whiteSpace: "pre-wrap",
            lineHeight: 1.45, // 🔥 서비스급: 가독성 향상
            wordBreak: "break-word",
            fontSize: 15, // 🔥 서비스급: 최적 폰트 크기
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}
