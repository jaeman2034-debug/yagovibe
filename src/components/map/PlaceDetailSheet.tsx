/**
 * 🔥 CONFIRMED 상태: 위치 상세 정보 시트
 * 
 * 역할:
 * - 출발 결정 카드와 독립된 정보 영역
 * - 접었다 펼 수 있는 하단 시트
 * - 장소 상세 정보 제공 (카테고리, 주소, 이미지 등)
 * 
 * 원칙:
 * - 출발 버튼은 NavigationCard에만 존재
 * - 이 시트는 정보 제공만 담당
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startNavigation } from '@/utils/navigation';
// 🔥 플랫폼 활동 로그 (퍼널 연결)
import { logActivity } from '@/lib/activityLog';

type PlaceDetailSheetProps = {
  place: {
    name: string;
    address?: string;
    distance?: number;
    category?: string; // 예: "경기장", "카페", "병원"
    imageUrl?: string; // 향후 장소 이미지 URL
    rating?: number; // 향후 평점
    placeId?: string; // 향후 상세보기 링크용
    lat?: number; // 🔥 AI 비서 지도: 외부 지도 앱 연동용 좌표
    lng?: number; // 🔥 AI 비서 지도: 외부 지도 앱 연동용 좌표
  };
  isVisible: boolean;
  onViewDetails?: () => void; // 향후 상세보기 핸들러
  onNavigate?: () => void; // 🔥 정상 지도 페이지: "여기로 갈게요" 버튼 핸들러 (내부 네비용)
  useExternalMap?: boolean; // 🔥 AI 비서 지도: 외부 지도 앱 사용 여부 (기본값: true)
};

export default function PlaceDetailSheet({
  place,
  isVisible,
  onViewDetails,
  onNavigate,
  useExternalMap = true, // 🔥 AI 비서 지도: 기본값 true (외부 지도 앱 사용)
}: PlaceDetailSheetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  if (!isVisible) return null;
  
  // 🔥 정상 지도 페이지: 기본적으로 펼쳐진 상태로 시작 (선택 확인 UX)
  // useEffect로 초기 상태 설정은 하지 않음 (상태 유지)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: isExpanded ? '0' : '200px', // 🔥 NavigationCard 위 (CONFIRMED 모드 기준)
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '500px',
        zIndex: 750, // 🔥 NavigationCard(800) 아래, Map(0) 위
        backgroundColor: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(12px)',
        borderRadius: isExpanded ? '16px 16px 0 0' : '16px',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        transition: 'bottom 0.3s ease-out, border-radius 0.3s ease-out',
        maxHeight: isExpanded ? '60vh' : 'auto',
        overflow: 'hidden',
      }}
    >
      {/* 접기/펼치기 핸들 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          width: '100%',
          padding: '12px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#666',
          fontSize: '13px',
          fontWeight: '500',
        }}
      >
        <span>{isExpanded ? '▼' : '▲'}</span>
        <span>{isExpanded ? '접기' : '장소 정보 보기'}</span>
      </button>

      {/* 기본 정보 (항상 표시) - 정상 지도 페이지: 장소명 + 주소 명확히 표시 */}
      <div
        style={{
          padding: '16px',
          display: isExpanded ? 'none' : 'block',
        }}
      >
        {/* 장소명 */}
        <div
          style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: place.address ? '8px' : '0',
            textAlign: 'center',
          }}
        >
          {place.name || place.address || '장소'}
        </div>
        {/* 주소 */}
        {place.address && place.name && (
          <div
            style={{
              fontSize: '14px',
              color: '#666',
              textAlign: 'center',
              lineHeight: '1.5',
              marginBottom: '16px',
            }}
          >
            {place.address}
          </div>
        )}
        
        {/* 🔥 AI 비서 지도: 장소 카드에 "길안내" 버튼 명확히 추가 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('✅ [PlaceDetailSheet] 길안내 버튼 클릭됨:', place.name);
            
            // 🔥 AI 비서 지도: 외부 지도 앱 사용 (기본)
            if (useExternalMap && place.lat && place.lng) {
              startNavigation({
                name: place.name,
                lat: place.lat,
                lng: place.lng,
                address: place.address,
              });
            } else if (onNavigate) {
              // 🔥 내부 네비게이션 사용 (onNavigate가 제공된 경우)
              onNavigate();
            } else {
              console.warn('[PlaceDetailSheet] 길안내를 시작할 수 없습니다. 좌표 또는 onNavigate가 필요합니다.');
            }
          }}
          style={{
            width: '100%',
            padding: '14px 24px',
            marginTop: place.address && place.name ? '16px' : '8px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label={`${place.name}로 길안내 시작`}
        >
          <span>📍</span>
          <span>길안내</span>
        </button>
        
        {/* 🔥 UX 문구: 혼선 방지 */}
        <div
          style={{
            fontSize: '12px',
            color: '#6b7280',
            textAlign: 'center',
            marginTop: '8px',
            lineHeight: '1.4',
          }}
        >
          Google 지도에서 경로를 안내합니다.
        </div>
        
        {/* 🔥 퍼널 연결: 마켓 이동 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('🛒 [PlaceDetailSheet] 마켓 이동 버튼 클릭:', place.name);
            
            // 🔥 마켓 이동 로그 (퍼널 연결)
            logActivity({
              event: "MARKET_VIEW",
              location: "/app/market",
              meta: { 
                source: "map",
                placeId: place.placeId || null,
                placeName: place.name,
                viewMode: "list",
              },
            });
            
            // 마켓 페이지로 이동 (source 파라미터 포함)
            navigate(`/app/market?source=map&placeId=${encodeURIComponent(place.placeId || '')}`);
          }}
          style={{
            width: '100%',
            padding: '12px 24px',
            marginTop: '12px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(16, 185, 129, 0.4)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          aria-label="마켓 보기"
        >
          <span>🛒</span>
          <span>마켓 보기</span>
        </button>
      </div>

      {/* 확장 정보 (펼쳤을 때만 표시) */}
      {isExpanded && (
        <div
          style={{
            padding: '16px',
            maxHeight: 'calc(60vh - 60px)',
            overflowY: 'auto',
          }}
        >
          {/* 장소 이미지 (향후) */}
          {place.imageUrl && (
            <div
              style={{
                width: '100%',
                height: '200px',
                borderRadius: '12px',
                overflow: 'hidden',
                marginBottom: '16px',
                background: '#f5f5f5',
              }}
            >
              <img
                src={place.imageUrl}
                alt={place.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            </div>
          )}

          {/* 카테고리 */}
          {place.category && (
            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  marginBottom: '4px',
                }}
              >
                카테고리
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#1a1a1a',
                  fontWeight: '500',
                }}
              >
                {place.category}
              </div>
            </div>
          )}

          {/* 주소 */}
          {place.address && (
            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  marginBottom: '4px',
                }}
              >
                주소
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#1a1a1a',
                }}
              >
                {place.address}
              </div>
            </div>
          )}

          {/* 거리 */}
          {place.distance !== undefined && (
            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  marginBottom: '4px',
                }}
              >
                거리
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#1a1a1a',
                }}
              >
                {place.distance < 1000
                  ? `${Math.round(place.distance)}m`
                  : `${(place.distance / 1000).toFixed(2)}km`}
              </div>
            </div>
          )}

          {/* 평점 (향후) */}
          {place.rating !== undefined && (
            <div
              style={{
                marginBottom: '12px',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: '#999',
                  marginBottom: '4px',
                }}
              >
                평점
              </div>
              <div
                style={{
                  fontSize: '14px',
                  color: '#1a1a1a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <span>⭐</span>
                <span>{place.rating.toFixed(1)}</span>
              </div>
            </div>
          )}

          {/* 정상 지도 페이지: 상세보기 버튼 (향후 중고거래 게시물 연결용) */}
          {onViewDetails && place.placeId && (
            <button
              onClick={onViewDetails}
              style={{
                width: '100%',
                padding: '12px 24px',
                borderRadius: '10px',
                background: '#f5f5f5',
                color: '#1a1a1a',
                fontSize: '14px',
                fontWeight: '500',
                border: 'none',
                cursor: 'pointer',
                marginTop: '8px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#e5e5e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
            >
              상세보기
            </button>
          )}
        </div>
      )}
    </div>
  );
}
