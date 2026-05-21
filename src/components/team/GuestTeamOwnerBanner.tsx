import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";

/**
 * 익명(게스트) Auth로 팀을 만든 owner에게만 표시.
 * 팀장은 members에 포함되는 것이 정상이며, 여기서는 "계정 연결" UX만 안내한다.
 */
export function GuestTeamOwnerBanner() {
  const location = useLocation();
  const returnTo = `${location.pathname}${location.search}`;

  return (
    <div className="mt-3 rounded-xl border border-sky-400/80 bg-sky-50 px-3 py-3 text-sm text-sky-950 shadow-sm dark:border-sky-600 dark:bg-sky-950/40 dark:text-sky-50">
      <p className="font-semibold">게스트(익명) 계정으로 팀장이에요</p>
      <p className="mt-1 text-xs leading-relaxed opacity-95">
        팀과 권한 구조는 정상이에요. 다만 브라우저·기기를 바꾸면 같은 계정으로 돌아오기 어려울 수 있어요. 이메일 로그인·회원가입으로 연결하면 이 팀의 owner 권한이 그대로 유지돼요.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Button size="sm" className="h-9" asChild>
          <Link to="/login" state={{ from: returnTo }}>
            로그인하고 연결
          </Link>
        </Button>
        <Button size="sm" variant="outline" className="h-9" asChild>
          <Link to="/signup" state={{ from: returnTo }}>
            회원가입(이메일 연결)
          </Link>
        </Button>
      </div>
    </div>
  );
}
