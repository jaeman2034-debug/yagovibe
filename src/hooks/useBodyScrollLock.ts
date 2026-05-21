/**
 * 🚀 스크롤 잠금 공통 훅 (실서비스용)
 * 
 * 모달/시트/온보딩에서 스크롤 버그 100% 방지
 * 
 * 특징:
 * - 스크롤 위치 보존
 * - iOS/Android 모두 대응
 * - 메모리 누수 방지
 * 
 * 사용 예시:
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * useBodyScrollLock(isOpen);
 * ```
 */

import { useEffect } from "react";

export function useBodyScrollLock(lock: boolean) {
  useEffect(() => {
    if (!lock) return;

    // 🔥 현재 스크롤 위치 저장
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;

    // 🔥 body 스크롤 잠금
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = `-${scrollX}px`;
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    // 🔥 iOS Safari 대응: 추가 스타일
    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.position = "relative";

    // 🔥 cleanup: 스크롤 위치 복원
    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.width = "";
      document.body.style.overflow = "";

      document.documentElement.style.overflow = "";
      document.documentElement.style.position = "";

      // 🔥 스크롤 위치 복원
      window.scrollTo(scrollX, scrollY);
    };
  }, [lock]);
}
