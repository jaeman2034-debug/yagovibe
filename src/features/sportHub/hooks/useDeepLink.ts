/**
 * 🔥 useDeepLink - 딥링크 처리 훅
 * 
 * 외부 → 앱 복귀, 지역/팀 컨텍스트 유지
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { routeDeepLink } from "../utils/deeplink.router";
import { logEvent } from "../utils/analytics.logger";
import type { Region } from "../domain/region.types";

/**
 * 딥링크 처리 훅
 */
export function useDeepLink() {
  const navigate = useNavigate();

  useEffect(() => {
    // URL에서 딥링크 감지
    const handleDeepLink = () => {
      const url = window.location.href;
      const success = routeDeepLink(url, navigate);

      if (success) {
        logEvent(
          {
            eventName: "deep_open",
            metadata: { url },
          },
          { region: "seoul" } // 실제로는 URL에서 파싱
        );
      }
    };

    // 초기 로드 시 딥링크 확인
    handleDeepLink();

    // 커스텀 이벤트 리스너 (앱에서 딥링크 호출 시)
    const handleCustomDeepLink = (event: CustomEvent<string>) => {
      routeDeepLink(event.detail, navigate);
    };

    window.addEventListener("deeplink" as any, handleCustomDeepLink);

    return () => {
      window.removeEventListener("deeplink" as any, handleCustomDeepLink);
    };
  }, [navigate]);
}
