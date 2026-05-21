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

interface ImageMessageProps {
  images: ImageItem[];
  videos?: VideoItem[];
  text?: string;
  isMine: boolean;
  mediaViewer: MediaViewer;
}

/**
 * 이미지 메시지 컴포넌트
 * 이미지 그리드와 텍스트를 포함한 이미지 메시지 표시
 */
export function ImageMessage({ images, videos = [], text, isMine, mediaViewer }: ImageMessageProps) {
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
          maxWidth: images.length === 1 ? 220 : 300,
          display: "grid",
          gridTemplateColumns: images.length === 1 ? "1fr" : "repeat(2, 1fr)",
          gap: 4,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {images.map((img, idx) => (
          <img
            key={idx}
            src={img.thumbUrl}
            alt={`이미지 ${idx + 1}`}
            onClick={() => {
              if (allMediaItems.length > 0) {
                mediaViewer.show(allMediaItems, idx);
              } else {
                window.open(img.url, "_blank");
              }
            }}
            style={{
              width: images.length === 1 ? "100%" : "100%",
              height: "auto",
              minHeight: images.length === 1 ? 140 : 100,
              maxHeight: images.length === 1 ? 220 : 180,
              objectFit: "cover",
              cursor: "pointer",
              borderRadius: 8,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          />
        ))}
      </div>
      {/* 이미지 메시지 텍스트 (있는 경우) */}
      {text && text !== "사진을 보냈습니다" && (
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
