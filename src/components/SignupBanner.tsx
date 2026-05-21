/**
 * 🔥 가입 배너 컴포넌트 (STEP 5 LOCK)
 * 
 * 핵심 원칙:
 * - 최소 허용 (선택적)
 * - 반복 노출 ❌
 * - 강제 노출 ❌
 * - "지금 가입하면 바로 거래를 시작할 수 있어요"
 */

import { useState, useEffect } from "react";
import { shouldShowSignupBanner, getSignupBannerMessage } from "@/lib/uiRules";
import { X } from "lucide-react";

interface SignupBannerProps {
  /**
   * 배너를 닫았는지 추적하는 키 (localStorage)
   */
  dismissKey?: string;
}

/**
 * 가입 배너 컴포넌트 (선택적 표시)
 * 
 * 사용 예시:
 * ```tsx
 * <SignupBanner dismissKey="signup-banner-dismissed" />
 * ```
 */
export function SignupBanner({ dismissKey = "signup-banner-dismissed" }: SignupBannerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 게스트이고, 아직 닫지 않았으면 표시
    if (shouldShowSignupBanner()) {
      const dismissed = localStorage.getItem(dismissKey);
      if (!dismissed) {
        setIsVisible(true);
      }
    }
  }, [dismissKey]);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem(dismissKey, "true");
  };

  if (!isVisible) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 text-blue-400 hover:text-blue-600 transition-colors"
        aria-label="닫기"
      >
        <X className="w-4 h-4" />
      </button>
      
      <p className="text-sm text-blue-800 text-center pr-6 whitespace-pre-line">
        {getSignupBannerMessage()}
      </p>
    </div>
  );
}

