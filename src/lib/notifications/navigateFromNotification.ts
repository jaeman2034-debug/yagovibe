/**
 * 🔔 알림 딥링크 라우팅 (YAGO 알림 시스템)
 * 
 * target.screen 기반으로 적절한 페이지로 이동
 */

import type { NavigateFunction } from "react-router-dom";
import type { Notification } from "@/types/notification";
import { getNotificationMessageId } from "@/lib/notifications/getNotificationMessageId";
import { normalizeTradeChatDocumentIdForRoute } from "@/features/chat/services/chatService";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

export function navigateFromNotification(
  notification: Notification,
  navigate: NavigateFunction
): void {
  // 🔥 target 우선, 없으면 link 사용 (하위 호환성)
  if (notification.target) {
    const { screen, id } = notification.target;
    
    switch (screen) {
      case "chat": {
        if (!id) {
          navigate("/app/chats");
          break;
        }
        const messageId = getNotificationMessageId(notification);
        const qs = messageId ? `?messageId=${encodeURIComponent(messageId)}` : "";
        const roomType = notification.payload?.roomType as string | undefined;
        if (roomType === "recruit_group") {
          navigate(`/chat/${encodeURIComponent(id)}${qs}`);
        } else {
          const routeChatId = normalizeTradeChatDocumentIdForRoute(id);
          navigate(`/app/chat/${encodeURIComponent(routeChatId)}${qs}`);
        }
        break;
      }
        
      case 'item':
      case 'market': // 🔥 매칭 알림용 (하위 호환성)
        if (id) {
          // 🔥 payload에서 postId 확인 (매칭 알림용)
          const postId = notification.payload?.postId || id;
          const sport = notification.payload?.sport as string | undefined;
          navigate(sportMarketDetailUrl(sport || resolveLastSportId(), postId));
        } else {
          navigate('/app/market');
        }
        break;
        
      case 'trade':
        if (id) {
          navigate(sportMarketDetailUrl(resolveLastSportId(), id));
        } else {
          navigate('/app/market');
        }
        break;
        
      case 'profile':
        navigate('/me');
        break;
        
      case 'team':
        if (id) {
          navigate(`/teams/${id}/play`);
        } else {
          navigate('/me');
        }
        break;
        
      case 'tournament':
        if (id) {
          navigate(`/tournaments/${id}`);
        } else {
          navigate('/sports-hub');
        }
        break;
        
      case 'home':
      default:
        if (!window.location.pathname.startsWith('/sports')) {
        navigate('/home');
        }
        break;
    }
  } else if (notification.link) {
    // 하위 호환성: link 사용
    navigate(notification.link);
  } else {
    // 기본: 홈으로
    if (!window.location.pathname.startsWith('/sports')) {
    navigate('/home');
    }
  }
}
