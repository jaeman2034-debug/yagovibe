import { Outlet } from "react-router-dom";

/**
 * FederationShell
 * - 퍼블릭 포털 전용 셸
 * - 레이아웃과 공통 컨텍스트만 담당하고, 콘텐츠는 반드시 Outlet으로만 렌더
 * - 절대 Home/탭 콘텐츠를 직접 포함하지 않는다.
 */
export default function FederationShell() {
  return (
    <div className="min-h-screen bg-gray-50 federation-portal-root">
      <Outlet />
    </div>
  );
}

