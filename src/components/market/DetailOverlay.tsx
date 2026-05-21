/**
 * 🔥 DetailOverlay - 상세 페이지 push 애니메이션 overlay
 * 
 * 특징:
 * - 라우팅이 아닌 overlay layer
 * - 위에서 슬라이드로 덮는 애니메이션
 * - 뒤로가기 버튼 지원
 */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMapStore } from "@/stores/mapStore";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { MarketProduct } from "@/types/market";
import { parseMarketProduct } from "@/types/market";

export default function DetailOverlay() {
  const { detailId, closeDetail } = useMapStore();
  const navigate = useNavigate();
  const [product, setProduct] = useState<MarketProduct | null>(null);
  const [loading, setLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // 🔥 상품 데이터 로드
  useEffect(() => {
    if (!detailId) {
      setProduct(null);
      return;
    }

    const loadProduct = async () => {
      try {
        setLoading(true);
        const productRef = doc(db, "market_products", detailId);
        const productSnap = await getDoc(productRef);

        if (productSnap.exists()) {
          const data = productSnap.data();
          const parsed = parseMarketProduct({
            id: productSnap.id,
            ...data,
          });
          setProduct(parsed);
        } else {
          console.error("❌ [DetailOverlay] 상품을 찾을 수 없습니다:", detailId);
          closeDetail();
        }
      } catch (error) {
        console.error("❌ [DetailOverlay] 상품 로드 실패:", error);
        closeDetail();
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [detailId, closeDetail]);

  // 🔥 닫기 핸들러 (애니메이션 포함)
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      closeDetail();
      setIsClosing(false);
    }, 280); // CSS 애니메이션 duration과 동일
  };

  // 🔥 뒤로가기 버튼 처리 (앱 UX 핵심)
  useEffect(() => {
    if (!detailId) return;

    const handlePopState = (e: PopStateEvent) => {
      if (detailId) {
        e.preventDefault();
        handleClose();
        // history를 다시 push하여 뒤로가기 이벤트를 무효화
        window.history.pushState(null, "", window.location.pathname);
      }
    };

    // 🔥 history에 상태 추가 (뒤로가기 감지용)
    window.history.pushState({ detailOverlay: true }, "", window.location.pathname);

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [detailId, closeDetail, handleClose]);

  if (!detailId) return null;

  return (
    <div className={`detail-overlay ${isClosing ? "closing" : ""}`}>
      {/* 🔥 헤더 (뒤로가기 버튼) */}
      <div className="detail-overlay-header">
        <button
          type="button"
          onClick={handleClose}
          className="detail-close"
          aria-label="뒤로가기"
        >
          ←
        </button>
        <h2 className="detail-overlay-title">상품 상세</h2>
      </div>

      {/* 🔥 콘텐츠 영역 */}
      <div className="detail-overlay-content">
        {loading ? (
          <div className="detail-loading">
            <div className="spinner"></div>
            <p>로딩 중...</p>
          </div>
        ) : product ? (
          <div className="detail-product-content">
            {/* 🔥 상품 이미지 */}
            {product.imageUrl || (product as any).thumbnailUrl ? (
              <img
                src={product.imageUrl || (product as any).thumbnailUrl}
                alt={product.name || (product as any).title || "상품 이미지"}
                className="detail-product-image"
              />
            ) : null}
            
            {/* 🔥 상품 정보 */}
            <div className="detail-product-info">
              <h1 className="detail-product-name">
                {product.name || (product as any).title || "상품명 없음"}
              </h1>
              {product.price && product.price > 0 && (
                <div className="detail-product-price">
                  {product.price.toLocaleString()}원
                </div>
              )}
              {product.description && (
                <div className="detail-product-description">
                  {product.description}
                </div>
              )}
              {product.location && (
                <div className="detail-product-location">
                  📍 {product.location}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="detail-error">
            <p>상품을 불러올 수 없습니다.</p>
            <button type="button" onClick={handleClose} className="detail-retry-btn">
              닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
