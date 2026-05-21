/**
 * 🔥 GlobalFAB - 전역 플로팅 글쓰기 버튼 (FAB)
 * 
 * 역할:
 * - 우측 하단 고정 글쓰기 버튼
 * - CreateModal 열기 (페이지 이동 대신 모달)
 * - 앱 전체에서 1개만 존재 (Layout에서 관리)
 * - 모바일 앱 UX 완성
 */

import { createPortal } from "react-dom";
import { useLocation } from "react-router-dom";
import { Plus } from "lucide-react";

interface GlobalFABProps {
  onClick: () => void;
}

export default function GlobalFAB({ onClick }: GlobalFABProps) {
  // 표시 여부는 AppShellLayout에서 단일하게 제어한다.
  // 여기서는 렌더만 담당해서 모바일/태블릿 누락을 방지한다.
  if (typeof document === "undefined") return null;
  const location = useLocation();
  const path = location.pathname;
  const isCreatePage = path.includes("/create");
  const isEditPage = /\/edit(\/|$)/.test(path);
  const isSportsMarketProductDetail = /^\/sports\/[^/]+\/market\/[^/]+$/.test(path);
  const isChatRoomPath =
    path.startsWith("/app/chat/") ||
    (path.startsWith("/chat/") && path !== "/chat");

  // 생성/수정 화면에서는 하단 CTA와 FAB 충돌 방지
  if (isCreatePage || isEditPage) return null;
  // 마켓 상품 상세(스포츠 허브) — MarketLayout과 동일 정책 (이중 배치 대비)
  if (isSportsMarketProductDetail) return null;
  if (isChatRoomPath) return null;
  if (path === "/playground" || path.startsWith("/game/session/")) return null;

  return (
    <>
      {createPortal(
        <div className="fixed bottom-20 right-6 z-[99999] pointer-events-auto">
        <button
          type="button"
          onClick={onClick}
          className="
              w-14 h-14 rounded-full bg-blue-600 text-white
              shadow-2xl hover:bg-blue-700 active:bg-blue-800
              transition flex items-center justify-center
          "
          aria-label="작성하기"
        >
          <Plus size={24} />
        </button>
      </div>,
      document.body
      )}
    </>
  );
}
