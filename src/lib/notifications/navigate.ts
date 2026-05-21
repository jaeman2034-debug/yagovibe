/**
 * 🔔 알림 딥링크 라우팅 (제품 레벨)
 * 
 * target.screen 기반으로 적절한 페이지로 이동
 */

import type { NavigateFunction } from "react-router-dom";
import type { Notification } from "@/types/notification";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

/**
 * 알림 클릭 시 이동 처리
 */
export function navigateFromNoti(
  notification: Notification,
  navigate: NavigateFunction
): void {
  if (notification.target) {
    const { screen, id } = notification.target;
    
    switch (screen) {
      case 'chat':
        navigate(id ? `/chat/${id}` : "/chat");
        break;
        
      case 'trade':
        navigate(id ? sportMarketDetailUrl(resolveLastSportId(), id) : "/app/market");
        break;

      case 'item':
        navigate(id ? sportMarketDetailUrl(resolveLastSportId(), id) : "/app/market");
        break;
        
      case 'profile':
        navigate('/me');
        break;
        
      case 'team':
        navigate(id ? `/teams/${encodeURIComponent(String(id).trim())}/play` : '/me');
        break;
        
      case 'tournament':
        navigate(id ? `/tournaments/${id}` : '/sports-hub');
        break;
        
      case 'home':
      default:
        if (!window.location.pathname.startsWith('/sports')) {
        navigate('/home');
        }
        break;
    }
  } else if (notification.link) {
    // 하위 호환성
    navigate(notification.link);
  } else {
    if (!window.location.pathname.startsWith('/sports')) {
    navigate('/home');
    }
  }
}
