/**
 * 🔥 글쓰기 타입 선택 모달
 * (마켓 전용 — CreateModal과 동일한 셸 + MarketFabCreateContent)
 */

import type { Sport, MarketCategory } from "@/types/market";
import type { MarketTradeService } from "@/components/fab/marketPostTypeOptions";
import { FabWriteModalShell } from "@/components/create/FabWriteModalShell";
import { MarketFabCreateContent } from "@/components/fab/MarketFabCreateContent";

interface PostTypeSelectModalProps {
  sport: Sport;
  currentCategory?: MarketCategory;
  currentService?: MarketTradeService;
  isOpen: boolean;
  onClose: () => void;
}

export default function PostTypeSelectModal({
  sport,
  currentCategory,
  currentService,
  isOpen,
  onClose,
}: PostTypeSelectModalProps) {
  return (
    <FabWriteModalShell
      open={isOpen}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="글쓰기 선택"
    >
      <MarketFabCreateContent
        sport={sport}
        currentService={currentService}
        currentCategory={currentCategory}
        onClose={onClose}
      />
    </FabWriteModalShell>
  );
}
