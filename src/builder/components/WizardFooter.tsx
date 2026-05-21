/**
 * WizardFooter
 * Wizard 하단 네비게이션 버튼
 */

import { Button } from "@/components/ui/button";
import { ArrowRight, ArrowLeft } from "lucide-react";

interface WizardFooterProps {
  onNext: () => void;
  onBack: () => void;
  disabled?: boolean;
  isLast?: boolean;
  loading?: boolean;
  backDisabled?: boolean;
}

export default function WizardFooter({
  onNext,
  onBack,
  disabled = false,
  isLast = false,
  loading = false,
  backDisabled = false,
}: WizardFooterProps) {
  return (
    <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
      <Button
        onClick={onBack}
        disabled={backDisabled}
        variant="outline"
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        이전
      </Button>

      <Button
        onClick={onNext}
        disabled={loading}
        className={`
          flex items-center gap-2 px-6 py-2.5 text-base font-medium shadow-lg hover:shadow-xl transition-all
          ${
            disabled && !loading
              ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }
        `}
      >
        {loading ? "처리 중..." : isLast ? "조직 생성" : "다음 단계"}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </Button>
    </div>
  );
}
