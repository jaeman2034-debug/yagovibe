/**
 * 🔥 미디어 뷰어 훅 (이미지 + 동영상 통합)
 * 
 * 역할:
 * - 갤러리 상태 관리
 * - 현재 인덱스 관리
 * - 열기/닫기 제어
 */

import { useState, useCallback } from "react";

export type MediaItem =
  | {
      kind: "image";
      url: string;
      thumbUrl: string;
      width?: number;
      height?: number;
    }
  | {
      kind: "video";
      url: string;
      thumbUrl: string;
      duration?: number;
      size?: number;
    };

export function useMediaViewer() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);

  const show = useCallback((list: MediaItem[], i: number = 0) => {
    if (list.length === 0) return;
    setItems(list);
    setIndex(Math.max(0, Math.min(i, list.length - 1)));
    setOpen(true);
  }, []);

  const next = useCallback(() => {
    setIndex((i) => Math.min(i + 1, items.length - 1));
  }, [items.length]);

  const prev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    items,
    index,
    show,
    next,
    prev,
    close,
  };
}

