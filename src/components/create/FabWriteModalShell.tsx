import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

export interface FabWriteModalShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

export function FabWriteModalShell({
  open,
  onOpenChange,
  title,
  children,
}: FabWriteModalShellProps) {
  const titleId = useId();
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl border border-white/60 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.2)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="max-h-[80vh] overflow-y-auto p-4 sm:p-5">
          {title ? (
            <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3">
              <h2
                id={titleId}
                className="text-xl font-semibold tracking-tight text-gray-900"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
