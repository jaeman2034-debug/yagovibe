/**
 * PWA 설치 버튼 컴포넌트
 * 
 * 사용자가 YAGO SPORTS를 앱으로 설치할 수 있도록 하는 버튼입니다.
 */

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Download } from "lucide-react";

type InstallAppButtonProps = {
  /** 상단 네비 등 좁은 영역: 아이콘만 (긴 문구가 행을 잡아먹지 않음) */
  variant?: "full" | "icon";
};

export default function InstallAppButton({ variant = "full" }: InstallAppButtonProps) {
  const { canInstall, install, isInstalled } = usePwaInstall();

  if (isInstalled) {
    return null; // 이미 설치됨
  }

  if (!canInstall) {
    return null; // 아직 설치 가능 상태 아님 (브라우저가 조건 안 맞으면 안 뜸)
  }

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={install}
        aria-label="YAGO SPORTS 앱 설치"
        title="앱으로 설치"
        className="flex shrink-0 items-center justify-center rounded-full bg-yellow-400 p-1.5 text-black shadow-md transition-colors hover:bg-yellow-300"
      >
        <Download className="h-5 w-5" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={install}
      className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow-md transition-colors hover:bg-yellow-300"
    >
      <Download className="w-4 h-4" />
      📲 YAGO SPORTS 앱으로 설치
    </button>
  );
}

