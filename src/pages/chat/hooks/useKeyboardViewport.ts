// 🔥 키보드 대응 훅 (visualViewport API, 카톡급 UX)
import { useEffect, useRef } from "react";

export function useKeyboardViewport(
    onResize: () => void,
    isAtBottomRef: React.MutableRefObject<boolean>
) {
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const lastKeyboardHeightRef = useRef<number>(0);

    useEffect(() => {
        if (!window.visualViewport) return;

        const handleViewportResize = () => {
            // 🔥 디바운싱: 연속 resize 이벤트 방지 (iOS Safari 대응)
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }

            resizeTimeoutRef.current = setTimeout(() => {
                const viewport = window.visualViewport;
                if (!viewport) return;

                const keyboardHeight = window.innerHeight - viewport.height;
                const keyboardChanged = Math.abs(keyboardHeight - lastKeyboardHeightRef.current) > 50;

                // 🔥 키보드 높이가 실제로 변경되었을 때만 스크롤 (플리커 방지)
                if (keyboardChanged && keyboardHeight > 100) {
                    lastKeyboardHeightRef.current = keyboardHeight;
                    
                    // 🔥 맨 아래에 있을 때만 키보드 대응 스크롤 (사용자 스크롤 방해 안 함)
                    if (isAtBottomRef.current) {
                        // 🔥 requestAnimationFrame 이중 적용: iOS Safari 지연 문제 대응
                        requestAnimationFrame(() => {
                            requestAnimationFrame(() => {
                                onResize();
                            });
                        });
                    }
                } else if (keyboardHeight < 50) {
                    // 🔥 키보드 닫힘: 높이 초기화
                    lastKeyboardHeightRef.current = 0;
                }
            }, 100); // 🔥 100ms 디바운스 (iOS Safari 빠른 resize 이벤트 대응)
        };

        window.visualViewport.addEventListener('resize', handleViewportResize);

        return () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
            window.visualViewport?.removeEventListener('resize', handleViewportResize);
        };
    }, [onResize, isAtBottomRef]);
}

