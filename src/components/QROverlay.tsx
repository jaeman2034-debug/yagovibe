// ⚠️ 레거시 컴포넌트: 더 이상 사용되지 않음
// 🔥 Overlay QR 완전 제거: 로그인 QR만 사용 (/login/qr-phone)
// 이 파일은 향후 완전 제거 예정
// 
// 사용 금지:
// - SportsHubPage에서 QROverlay 사용 ❌
// - getPublicUrl('/qr?market=home') ❌
// - api.qrserver.com으로 QR 생성 ❌
// 
// 대신 사용:
// - /login/qr-phone에서만 QR 생성 ✅
// - QR URL: https://www.yagovibe.com/qr-login?sessionId=xxx ✅

/**
 * 🔥 QR 풀스크린 화면 (레거시 - 사용 금지)
 * 
 * ⚠️ 이 컴포넌트는 더 이상 사용되지 않습니다.
 * 로그인 QR만 사용하세요: /login/qr-phone
 */

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom"; // 🔥 React Portal: QR 모달을 document.body에 직접 렌더링
import { X } from "lucide-react";
import { getPublicUrl } from "@/utils/getPublicUrl"; // 🔥 QR URL 생성: 공개 접근 가능한 URL 기준으로 생성

interface QROverlayProps {
  onClose: () => void;
}

export function QROverlay({ onClose }: QROverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false); // 🔥 애니메이션 상태
  
  // 🔥 Overlay QR 제거됨: 이 컴포넌트는 더 이상 사용되지 않음
  // 로그인 QR만 사용: /login/qr-phone
  // ⚠️ 이 컴포넌트는 레거시이며, 향후 완전 제거 예정
  const qrUrl = "https://www.yagovibe.com/qr?mode=login";

  // QR 코드 이미지 URL (고해상도, 최대 크기)
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrUrl)}`;

  // 🔥 디버깅: QR 오버레이 마운트 확인 및 DOM 검증
  useEffect(() => {
    console.log('✅ [QROverlay] 컴포넌트 마운트됨 (지도 탈출 및 중앙 고정)');
    console.log('   QR URL:', qrUrl);
    console.log('   QR 이미지 URL:', qrImageUrl);
    console.log('   z-index: 2147483647 (브라우저 최대치)');
    console.log('   Portal: document.documentElement에 렌더링됨 (지도 레이어 밖으로 완전히 탈출)');
    console.log('   배경 레이어: display: flex, align-items: center, justify-content: center, inset: 0, position: fixed');
    console.log('   모달 박스: position: relative, margin: auto, top: unset, transform: none');
    console.log('   배경색: rgba(0, 0, 0, 0.6) (인라인 스타일)');
    
    // 🔥 DOM에 실제로 렌더링되었는지 확인
    setTimeout(() => {
      const bgElement = containerRef.current;
      const modalElement = modalRef.current;
      if (bgElement && modalElement) {
        const bgStyle = window.getComputedStyle(bgElement);
        const modalStyle = window.getComputedStyle(modalElement);
        const parentElement = bgElement.parentElement;
        // 🔥 상세 DOM 검증 로그 (각 속성을 개별적으로 출력)
        console.log('🔍 [QROverlay] DOM 검증 시작');
        console.log('   배경 요소 존재:', !!bgElement);
        console.log('   모달 요소 존재:', !!modalElement);
        console.log('   부모 태그:', parentElement?.tagName);
        console.log('   부모가 HTML:', parentElement === document.documentElement);
        console.log('   배경 z-index:', bgStyle.zIndex);
        console.log('   배경 display:', bgStyle.display);
        console.log('   배경 backgroundColor:', bgStyle.backgroundColor);
        console.log('   배경 width:', bgStyle.width);
        console.log('   배경 height:', bgStyle.height);
        console.log('   배경 position:', bgStyle.position);
        console.log('   배경 inset:', bgStyle.inset || `${bgStyle.top} ${bgStyle.right} ${bgStyle.bottom} ${bgStyle.left}`);
        console.log('   배경 alignItems:', bgStyle.alignItems);
        console.log('   배경 justifyContent:', bgStyle.justifyContent);
        console.log('   모달 z-index:', modalStyle.zIndex);
        console.log('   모달 position:', modalStyle.position);
        console.log('   모달 display:', modalStyle.display);
        console.log('   모달 visibility:', modalStyle.visibility);
        console.log('   모달 opacity:', modalStyle.opacity);
        console.log('   모달 width:', modalStyle.width);
        console.log('   모달 height:', modalStyle.height);
        console.log('   모달 minHeight:', modalStyle.minHeight);
        console.log('   모달 maxHeight:', modalStyle.maxHeight);
        console.log('   모달 backgroundColor:', modalStyle.backgroundColor);
        console.log('   모달 padding:', modalStyle.padding);
        console.log('   모달 borderRadius:', modalStyle.borderRadius);
        console.log('   모달 boxShadow:', modalStyle.boxShadow);
        console.log('   모달 top:', modalStyle.top);
        console.log('   모달 left:', modalStyle.left);
        console.log('   모달 transform:', modalStyle.transform);
        console.log('   모달 margin:', modalStyle.margin);
        
        // 🔥 실제 DOM 요소의 인라인 스타일 확인
        if (bgElement) {
          console.log('   배경 인라인 스타일:', bgElement.getAttribute('style'));
        }
        if (modalElement) {
          console.log('   모달 인라인 스타일:', modalElement.getAttribute('style'));
          // 🔥 모달 내부 자식 요소 확인
          const qrImage = modalElement.querySelector('img');
          const closeButton = modalElement.querySelector('button');
          const infoText = modalElement.querySelector('p');
          console.log('   모달 내부 QR 이미지 존재:', !!qrImage);
          console.log('   모달 내부 닫기 버튼 존재:', !!closeButton);
          console.log('   모달 내부 안내 문구 존재:', !!infoText);
          if (qrImage) {
            const imgStyle = window.getComputedStyle(qrImage);
            console.log('   QR 이미지 width:', imgStyle.width);
            console.log('   QR 이미지 height:', imgStyle.height);
            console.log('   QR 이미지 display:', imgStyle.display);
            console.log('   QR 이미지 visibility:', imgStyle.visibility);
            console.log('   QR 이미지 opacity:', imgStyle.opacity);
            console.log('   QR 이미지 src:', qrImage.getAttribute('src'));
          }
        }
        
        // 🔥 지도 요소와의 z-index 비교
        const mapElements = document.querySelectorAll('[class*="map"], [id*="map"], .gm-style');
        if (mapElements.length > 0) {
          const firstMapElement = mapElements[0] as HTMLElement;
          const mapStyle = window.getComputedStyle(firstMapElement);
          console.log('🗺️ [QROverlay] 지도 요소 z-index:', mapStyle.zIndex);
          console.log('   QR 모달 z-index:', modalStyle.zIndex);
          console.log('   QR이 지도보다 위에 있음:', parseInt(modalStyle.zIndex) > parseInt(mapStyle.zIndex || '0'));
        }
        
        // 🔥 Header 요소와의 z-index 비교 (z-index 순서: 모달 > 헤더 > 검색창)
        const headerElements = document.querySelectorAll('header, [class*="header"], [class*="Header"]');
        if (headerElements.length > 0) {
          const firstHeaderElement = headerElements[0] as HTMLElement;
          const headerStyle = window.getComputedStyle(firstHeaderElement);
          console.log('📋 [QROverlay] Header 요소 z-index:', headerStyle.zIndex);
          console.log('   QR 모달 z-index:', modalStyle.zIndex);
          console.log('   QR이 Header보다 위에 있음:', parseInt(modalStyle.zIndex) > parseInt(headerStyle.zIndex || '0'));
          console.log('   ✅ z-index 순서 유지: 모달(2147483647) > 헤더(1200) > 검색창(1100)');
        }
      } else {
        console.error('❌ [QROverlay] 요소를 찾을 수 없습니다!');
      }
    }, 100);
    
    return () => {
      console.log('❌ [QROverlay] 컴포넌트 언마운트됨');
    };
  }, [qrUrl, qrImageUrl]);

  // 🔥 모달 열림 시 body 스크롤 방지 및 애니메이션 시작
  useEffect(() => {
    // 🔥 애니메이션 시작: 약간의 지연 후 표시 (부드러운 fade-in 효과)
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 10);
    
    // 🔥 스크롤 잠금: 모달이 켜지면 body에 overflow: hidden을 줘서 지도가 뒤에서 움직이지 않게 고정
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    
    return () => {
      // 모달 닫힘 시 원래 상태로 복구
      clearTimeout(timer);
      setIsVisible(false);
      document.body.style.overflow = originalOverflow;
      
      // 🔥 Header의 pointer-events 복구 확인 (CSS에서 이미 처리되지만 명시적으로 확인)
      const headerElements = document.querySelectorAll('header, [class*="header"], [class*="Header"]');
      headerElements.forEach((header) => {
        const headerEl = header as HTMLElement;
        headerEl.style.pointerEvents = 'auto';
      });
      
      console.log('✅ [QROverlay] 모달 닫힘 - Header pointer-events 복구 완료');
    };
  }, []);

  // 🔥 스캔 감지 시 자동 종료 (visibilitychange)
  useEffect(() => {
    const handleVisibilityChange = () => {
      // 페이지가 숨겨지면 (B가 스캔해서 새 페이지로 이동) 자동 종료
      if (document.visibilityState === "hidden") {
        onClose();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [onClose]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("keydown", handleEsc);
    };
  }, [onClose]);

  // 스와이프 다운으로 닫기
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartY === null) return;
    
    const touchY = e.touches[0].clientY;
    const diff = touchY - touchStartY;
    
    // 아래로 50px 이상 스와이프하면 닫기
    if (diff > 50) {
      onClose();
    }
  };

  const handleTouchEnd = () => {
    setTouchStartY(null);
  };

  // 🔥 배경 클릭 시 닫기: QR 모달의 배경(Overlay) 영역을 클릭해도 onClose 함수가 실행되도록
  const handleContainerClick = (e: React.MouseEvent) => {
    // 배경 레이어 자체를 클릭했을 때만 닫기 (모달 박스 내부 클릭은 제외)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 🔥 React Portal: QR 모달을 document.documentElement에 직접 렌더링 (지도 레이어 밖으로 완전히 탈출)
  // 포털 위치 최상단 이동: document.body가 아니라 document.documentElement로 변경
  // 지도 라이브러리의 레이아웃 규칙을 완전히 우회하기 위해 최상위 HTML 요소에 직접 붙임
  // z-index: 2147483647 (브라우저 최대치)로 모든 요소보다 위에 표시
  // z-index 순서: 모달(2147483647) > 헤더(1200) > 검색창(1100)
  return createPortal(
    <>
      {/* 🔥 지도 클릭 방지: 투명한 막 (지도가 클릭되지 않게) */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 2147483646,
          pointerEvents: "auto",
          backgroundColor: "transparent",
        } as React.CSSProperties}
        onClick={handleContainerClick}
      />
      
      {/* 🔥 배경 암전 레이어: Flexbox 강제 중앙 정렬 (지도 전용 탈출 코드) */}
      <div
        ref={containerRef}
        data-qr-overlay-background="true"
        className="qr-overlay-background"
        style={{
          position: "fixed", // 🔥 position: fixed !important
          inset: 0, // 🔥 inset: 0 !important (화면 전체를 덮게)
          display: "flex", // 🔥 display: flex !important (Flexbox 강제 중앙 정렬)
          alignItems: "center", // 🔥 align-items: center !important (Flexbox 강제 중앙 정렬)
          justifyContent: "center", // 🔥 justify-content: center !important (Flexbox 강제 중앙 정렬)
          width: "100vw",
          height: "100dvh", // 🔥 모바일 브라우저 주소창까지 계산한 높이 (화면 꽉 차게)
          zIndex: 2147483647,
          background: "rgba(0, 0, 0, 0.6)", // 🔥 반투명 검은색 배경
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
          pointerEvents: "auto",
          margin: 0,
          padding: 0,
          isolation: "isolate",
          // 🔥 애니메이션: Fade-in 효과 (배경이 서서히 밝아짐) + 짧은 트랜지션 (0.2초)
          opacity: isVisible ? 1 : 0,
          transition: "opacity 0.2s ease-out",
        } as React.CSSProperties}
        onClick={handleContainerClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 🔥 QR 모달 컨테이너: 좌표 초기화 (오직 Flexbox 힘으로만 중앙 정렬) */}
        <div
          ref={modalRef}
          data-qr-overlay-content="true"
          className="qr-overlay-content"
          style={{
            position: "relative",
            margin: "auto",
            // 🔥 모달 박스 초기화: top, left, transform 속성을 모두 제거(unset)
            // 이제 좌표가 아니라 Flexbox의 정렬 힘으로만 중앙에 올 것
            top: "unset",
            left: "unset",
            // 🔥 애니메이션: 위에서 아래로 내려오는 효과 + 크기 변화
            transform: isVisible ? "translateY(0) scale(1)" : "translateY(-20px) scale(0.9)",
            // 🔥 가시성 확보 및 짤림 방지
            width: "90vw",
            maxWidth: "400px",
            minHeight: "300px",
            maxHeight: "85vh",
            overflowY: "auto",
            // 🔥 스타일
            padding: "24px",
            backgroundColor: "white",
            borderRadius: "20px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            border: "2px solid #E5E7EB", // 🔥 디버깅: 모달 박스 테두리 추가 (시각적 확인용)
            zIndex: 2147483647,
            pointerEvents: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            visibility: "visible",
            // 🔥 애니메이션: Fade-in 효과 (모달이 서서히 나타남) + 짧은 트랜지션 (0.2초)
            opacity: isVisible ? 1 : 0,
            transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
            isolation: "isolate",
          } as React.CSSProperties}
          onClick={(e) => {
            e.stopPropagation(); // 모달 내부 클릭 시 닫히지 않도록
          }}
        >
          {/* 🔥 닫기 버튼: 모달 내부 우측 상단에 position: absolute로 배치 (모바일 터치 최적화) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="닫기"
            style={{
              position: "absolute",
              top: "12px",
              right: "12px",
              width: "48px", // 🔥 크기 증가: 44px → 48px
              height: "48px", // 🔥 크기 증가: 44px → 48px
              padding: "12px", // 🔥 패딩 증가: 10px → 12px (클릭 영역 확대)
              fontSize: "20px",
              color: "#374151",
              backgroundColor: "transparent",
              border: "none",
              cursor: "pointer",
              pointerEvents: "auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
              borderRadius: "50%", // 🔥 원형 버튼으로 터치 영역 명확화
              transition: "background-color 0.2s ease, color 0.2s ease", // 🔥 부드러운 호버 효과
            } as React.CSSProperties}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#111827";
              e.currentTarget.style.backgroundColor = "rgba(0, 0, 0, 0.08)"; // 🔥 호버 배경색 약간 진하게
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#374151";
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            <X size={26} /> {/* 🔥 아이콘 크기 증가: 24 → 26 */}
          </button>

          {/* 🔥 정석 QR 이미지: 200px 고정 크기, max-width: 80vw로 모바일 대응 */}
          <img
            src={qrImageUrl}
            alt="QR 코드"
            style={{
              width: "200px",
              height: "200px",
              maxWidth: "80vw",
              objectFit: "contain",
              filter: "brightness(1) contrast(1.1)",
              display: "block",
            }}
            onError={(e) => {
              console.error('❌ [QROverlay] QR 이미지 로딩 실패:', qrImageUrl);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent) {
                const errorMsg = document.createElement('p');
                errorMsg.textContent = 'QR 코드를 불러올 수 없습니다.';
                errorMsg.style.cssText = 'color: #EF4444; font-size: 14px; margin-top: 16px;';
                parent.appendChild(errorMsg);
              }
            }}
            onLoad={() => {
              console.log('✅ [QROverlay] QR 이미지 로딩 성공');
            }}
          />

          {/* 안내 문구 (아주 작게, QR 하단 여백 확대) */}
          <p 
            className="text-center"
            style={{
              fontSize: "12px",
              color: "#6B7280",
              lineHeight: 1.4,
              marginTop: "16px",
              marginBottom: 0,
            }}
          >
            이 화면을 스캔하면 바로 둘러볼 수 있어요
          </p>
        </div>
      </div>
    </>,
    document.documentElement // 🔥 React Portal: document.documentElement에 직접 렌더링 (지도 레이어 밖으로 완전히 탈출)
  );
}
