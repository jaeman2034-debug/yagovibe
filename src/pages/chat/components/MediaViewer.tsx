/**
 * 🔥 미디어 뷰어 컴포넌트 (이미지 + 동영상 통합)
 * 
 * 특징:
 * - 풀스크린 뷰어
 * - 좌우 스와이프
 * - 이미지 줌
 * - 동영상 재생
 * - 카톡/당근 스타일
 */

import { useEffect, useRef, useState } from "react";
import type { MediaItem } from "@/hooks/useMediaViewer";

interface MediaViewerProps {
  open: boolean;
  items: MediaItem[];
  index: number;
  next: () => void;
  prev: () => void;
  close: () => void;
}

export default function MediaViewer({
  open,
  items,
  index,
  next,
  prev,
  close,
}: MediaViewerProps) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentItem = items[index];

  // 🔥 키보드 네비게이션
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        close();
      } else if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, next, prev, close]);

  // 🔥 스와이프 감지 (모바일)
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && index < items.length - 1) {
      next();
    }
    if (isRightSwipe && index > 0) {
      prev();
    }
  };

  // 🔥 이미지 줌 (더블 탭)
  const handleImageDoubleClick = () => {
    if (currentItem.kind === "image") {
      if (imageZoom === 1) {
        setImageZoom(2);
      } else {
        setImageZoom(1);
        setImagePosition({ x: 0, y: 0 });
      }
    }
  };

  // 🔥 이미지 드래그 (줌 상태에서)
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      });
    }
  };

  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  // 🔥 인덱스 변경 시 줌 리셋
  useEffect(() => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  }, [index]);

  if (!open || !currentItem) return null;

  return (
    <div
      ref={containerRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.95)",
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        touchAction: "pan-y",
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onClick={(e) => {
        // 배경 클릭 시 닫기
        if (e.target === containerRef.current) {
          close();
        }
      }}
    >
      {/* 닫기 버튼 */}
      <button
        type="button"
        onClick={close}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          background: "rgba(0, 0, 0, 0.5)",
          color: "#fff",
          border: "none",
          borderRadius: "50%",
          width: 40,
          height: 40,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          cursor: "pointer",
          zIndex: 10001,
        }}
      >
        ✕
      </button>

      {/* 이전 버튼 */}
      {index > 0 && (
        <button
          type="button"
          onClick={prev}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0, 0, 0, 0.5)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            cursor: "pointer",
            zIndex: 10001,
          }}
        >
          ‹
        </button>
      )}

      {/* 다음 버튼 */}
      {index < items.length - 1 && (
        <button
          type="button"
          onClick={next}
          style={{
            position: "absolute",
            right: 16,
            top: "50%",
            transform: "translateY(-50%)",
            background: "rgba(0, 0, 0, 0.5)",
            color: "#fff",
            border: "none",
            borderRadius: "50%",
            width: 48,
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 24,
            cursor: "pointer",
            zIndex: 10001,
          }}
        >
          ›
        </button>
      )}

      {/* 미디어 컨텐츠 */}
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {currentItem.kind === "image" ? (
          <img
            ref={imageRef}
            src={currentItem.url}
            alt="미디어"
            onDoubleClick={handleImageDoubleClick}
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseUp}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
              userSelect: "none",
              transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
              transition: isDragging ? "none" : "transform 0.2s",
              cursor: imageZoom > 1 ? "move" : "zoom-in",
            }}
          />
        ) : (
          <video
            src={currentItem.url}
            controls
            autoPlay
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              objectFit: "contain",
            }}
          />
        )}
      </div>

      {/* 인덱스 표시 */}
      {items.length > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#fff",
            padding: "8px 16px",
            borderRadius: 20,
            fontSize: 14,
            fontWeight: 600,
            zIndex: 10001,
          }}
        >
          {index + 1} / {items.length}
        </div>
      )}
    </div>
  );
}
