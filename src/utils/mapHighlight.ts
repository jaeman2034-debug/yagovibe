/**
 * 🔥 지도 하이라이트 연출 (천재 모드 1.2)
 * 
 * 역할:
 * - 상위 3개 장소 핀 하이라이트
 * - PIN_HIGHLIGHT 이벤트 발송
 */

import type { MapPlace } from "@/types/map";

/**
 * 🔥 상위 3개 장소 하이라이트
 */
export function highlightTop3(places: MapPlace[]) {
  if (!places || places.length === 0) {
    return;
  }

  const top3 = places.slice(0, 3);
  
  top3.forEach((place, index) => {
    window.dispatchEvent(
      new CustomEvent("PIN_HIGHLIGHT", {
        detail: {
          id: place.id,
          rank: index + 1,
          effect: "pulse",
        },
      })
    );
  });

  console.log("✨ [mapHighlight] 상위 3개 장소 하이라이트:", top3.map(p => p.name));
}
