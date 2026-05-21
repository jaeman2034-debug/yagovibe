import { useEffect, RefObject } from "react";

/**
 * 모바일/iOS 키보드 이벤트 대응 훅
 *
 * - --vh CSS 변수 설정 (키보드에 따른 viewport 높이 보정)
 * - 키보드 오픈 시 스크롤 영역 자동 하단 스크롤
 */
export function useMobileKeyboardFix(listRef: RefObject<HTMLDivElement | null>) {
  // 1) --vh CSS 변수 설정 (뷰포트 높이 보정)
  useEffect(() => {
    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    setVH();

    window.addEventListener("resize", setVH);
    window.addEventListener("orientationchange", setVH);

    if (window.visualViewport) {
      const handleViewportResize = () => {
        if (window.visualViewport) {
          const vh = window.visualViewport.height * 0.01;
          document.documentElement.style.setProperty("--vh", `${vh}px`);
        }
      };
      window.visualViewport.addEventListener("resize", handleViewportResize);

      return () => {
        window.removeEventListener("resize", setVH);
        window.removeEventListener("orientationchange", setVH);
        window.visualViewport?.removeEventListener("resize", handleViewportResize);
      };
    }

    return () => {
      window.removeEventListener("resize", setVH);
      window.removeEventListener("orientationchange", setVH);
    };
  }, []);

  // 2) 키보드 올라왔을 때 스크롤 위치 보정
  useEffect(() => {
    const scrollToBottom = () => {
      if (window.visualViewport) {
        const keyboardHeight = window.innerHeight - window.visualViewport.height;
        if (keyboardHeight > 100 && listRef.current) {
          requestAnimationFrame(() => {
            if (listRef.current) {
              listRef.current.scrollTop = listRef.current.scrollHeight;
            }
          });
        }
      }
    };

    const handleResize = () => {
      requestAnimationFrame(scrollToBottom);
    };

    window.addEventListener("resize", handleResize);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      return () => {
        window.removeEventListener("resize", handleResize);
        window.visualViewport?.removeEventListener("resize", handleResize);
      };
    }

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []); // listRef is stable, no deps needed
}
