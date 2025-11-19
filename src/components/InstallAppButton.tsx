/**
 * PWA 설치 버튼 컴포넌트
 * 
 * 사용자가 YAGO VIBE를 앱으로 설치할 수 있도록 하는 버튼입니다.
 */

import { usePwaInstall } from "@/hooks/usePwaInstall";
import { Download } from "lucide-react";

export default function InstallAppButton() {
  const { canInstall, install, isInstalled } = usePwaInstall();

  if (isInstalled) {
    return null; // 이미 설치됨
  }

  if (!canInstall) {
    return null; // 아직 설치 가능 상태 아님 (브라우저가 조건 안 맞으면 안 뜸)
  }

  return (
    <button
      onClick={install}
      className="rounded-full bg-yellow-400 px-4 py-2 text-sm font-semibold text-black shadow-md hover:bg-yellow-300 transition-colors flex items-center gap-2"
    >
      <Download className="w-4 h-4" />
      📲 YAGO VIBE 앱으로 설치
    </button>
  );
}

