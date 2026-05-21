import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  /** 확대에 사용할 URL (원본 권장) */
  src: string;
  onClose: () => void;
};

/**
 * 채팅 이미지 클릭 시 전체 화면 확대. 배경 클릭·ESC·닫기 버튼으로 종료.
 */
export function ChatImageLightbox({ open, src, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !src) return null;

  const node = (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label="이미지 확대 보기"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="닫기"
      >
        <X className="h-6 w-6" />
      </button>
      <div
        className="flex max-h-[90vh] max-w-[95vw] flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <img src={src} alt="" className="max-h-[85vh] max-w-[95vw] object-contain" />
        <div className="mt-3 flex shrink-0 gap-4">
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-white/75 underline underline-offset-2 hover:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            새 탭에서 열기
          </a>
          <button
            type="button"
            className="text-xs text-white/75 hover:text-white"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
