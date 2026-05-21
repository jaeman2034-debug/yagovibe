import { useState, useEffect, useMemo } from "react";
import { Outlet, useLocation, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import Header from "../layout/Header";
import BottomNav from "../components/BottomNav";
import GlobalFAB from "../components/FloatingWriteButton";
import { CreateModal } from "@/components/create/CreateModal";
import { normalizeSportId } from "@/constants/sports";
import { motion, AnimatePresence } from "framer-motion";

/** `/market/map` 등 자식이 하단 시트를 열 때 GlobalFAB 숨김용 */
export type MarketLayoutOutletContext = {
  setMapOverlayActive: (active: boolean) => void;
};

export default function MarketLayout() {
  const location = useLocation();
  const { sport: sportParam } = useParams<{ sport?: string }>();
  const [isWriteOpen, setIsWriteOpen] = useState(false);
  /** 지도·필터 시트와 FAB z-index 겹침 방지 */
  const [mapOverlayActive, setMapOverlayActive] = useState(false);
  const modalSport =
    sportParam != null ? normalizeSportId(sportParam) ?? undefined : undefined;

  /** 지도 탭: 가로 패딩·max-width 제거 → 풀블리드 지도 + flex 높이 체인 */
  const isMarketMap = location.pathname === "/market/map";

  /** `/sports/:sport/market/:postId` 상품 상세 — 하단 고정 CTA와 겹치므로 작성 FAB 숨김 */
  const isSportsMarketProductDetail = /^\/sports\/[^/]+\/market\/[^/]+$/.test(
    location.pathname
  );

  useEffect(() => {
    if (!isMarketMap) setMapOverlayActive(false);
  }, [isMarketMap]);

  const outletContext = useMemo<MarketLayoutOutletContext>(
    () => ({ setMapOverlayActive }),
    []
  );

  return (
    <div
      className={`flex min-h-screen w-full min-w-0 flex-col bg-white text-gray-900 transition-colors duration-300 dark:bg-gray-900 dark:text-gray-100 ${
        isMarketMap ? "pt-[env(safe-area-inset-top,0px)]" : ""
      }`}
    >
      {/* /market/map: MainLayout 밖이므로 여기서도 헤더 숨김 → 지도 몰입 (알림·계정은 하단 탭·리스트로) */}
      {!isMarketMap && <Header />}

      <main
        className={
          isMarketMap
            ? /* 지도: 풀높이 — 하단은 fixed BottomNav·지도 mapPadding이 담당 (pb-28 제거로 빈 여백 방지) */
              "relative flex w-full min-h-0 flex-1 flex-col overflow-hidden pb-0 pt-0"
            : "w-full flex-1 pb-28 pt-3 sm:pt-4 lg:pt-5"
        }
      >
        <div
          className={cn(
            isMarketMap
              ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
              : "w-full",
            !isMarketMap &&
              (isSportsMarketProductDetail
                ? "px-0"
                : "px-4 sm:px-6 lg:px-8")
          )}
        >
          <div
            className={cn(
              isMarketMap
                ? "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col"
                : "w-full min-w-0",
              !isMarketMap &&
                (isSportsMarketProductDetail ? "max-w-none px-0" : "max-w-none")
            )}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className={isMarketMap ? "flex h-full min-h-0 flex-1 flex-col" : undefined}
              >
                <Outlet context={outletContext} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <footer className="w-full border-t bg-white dark:bg-gray-900/90">
        <BottomNav />
      </footer>

      {!(isMarketMap && mapOverlayActive) && !isSportsMarketProductDetail && (
        <GlobalFAB onClick={() => setIsWriteOpen(true)} />
      )}
      <CreateModal open={isWriteOpen} onOpenChange={setIsWriteOpen} sport={modalSport} />
    </div>
  );
}
