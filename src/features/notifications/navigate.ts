/**
 * 🔔 알림 딥링크 라우팅 (제품 레벨)
 * 
 * target.screen 기반으로 적절한 페이지로 이동
 */

import type { YagoNoti } from "./types";
import { resolveLastSportId, sportMarketDetailUrl } from "@/utils/sportHubHref";

/**
 * Navigate 함수 타입 (react-router-dom v6 호환)
 */
type NavigateFunction = (to: string | number, options?: { replace?: boolean; state?: any }) => void;

/**
 * 알림 클릭 시 이동 처리
 * 
 * @param notification 알림 객체
 * @param navigate useNavigate() 반환값
 */
export function navigateFromNoti(
  notification: YagoNoti,
  navigate: NavigateFunction
): void {
  if (notification.target) {
    const { screen, id } = notification.target;
    
    switch (screen) {
      case 'chat':
        navigate(id ? `/chat/${id}` : "/chat");
        break;
        
      case 'trade': {
        const sport = notification.target?.params?.sport;
        if (id) {
          navigate(sportMarketDetailUrl(sport || resolveLastSportId(), id));
        } else {
          navigate("/app/market");
        }
        break;
      }

      case 'item': {
        const sport = notification.target?.params?.sport;
        if (id) {
          navigate(sportMarketDetailUrl(sport || resolveLastSportId(), id));
        } else {
          navigate("/app/market");
        }
        break;
      }

      case 'association_post': {
        const associationId = notification.target?.params?.associationId;
        if (associationId && id) {
          navigate(`/association/${associationId}/posts/${id}`);
        } else if (associationId) {
          navigate(`/association/${associationId}`);
        } else {
          if (!window.location.pathname.startsWith('/sports')) {
          navigate('/home');
          }
        }
        break;
      }

      case 'association':
        if (id) {
          navigate(`/association/${id}`);
        } else {
          if (!window.location.pathname.startsWith('/sports')) {
            navigate('/home');
          }
        }
        break;

      case 'home':
        if (!window.location.pathname.startsWith('/sports')) {
        navigate('/home');
        }
        break;
        
      default:
        if (!window.location.pathname.startsWith('/sports')) {
        navigate('/home');
        }
        break;
    }
  } else {
    if (!window.location.pathname.startsWith('/sports')) {
    navigate('/home');
    }
  }
}
