/**
 * 🔥 ServiceExtensionCard - 장소 기반 서비스 확장 카드 (Phase 17)
 * 
 * 책임 범위:
 * ✅ 장소와 직접 연결된 서비스 제안
 * ✅ 자연스러운 플랫폼 체류 유도
 * 
 * ❌ 하지 않는 것:
 * - 강제 이동
 * - 무관한 서비스
 * - 광고 느낌
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
// 🔥 플랫폼 활동 로그 (퍼널 연결)
import { logActivity } from '@/lib/activityLog';

type ServiceExtensionCardProps = {
  title: string;
  description: string;
  onClick: () => void;
};

function ServiceExtensionCard({ title, description, onClick }: ServiceExtensionCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-3 py-2.5 text-left transition-colors active:scale-[0.98] min-w-[140px]"
    >
      <div className="text-xs font-medium text-gray-900">{title}</div>
      <div className="text-xs text-gray-600 mt-0.5">{description}</div>
    </button>
  );
}

type ServiceExtensionPanelProps = {
  place: { id: string; name?: string };
  searchQuery?: string;
};

export default function ServiceExtensionPanel({ place, searchQuery = '' }: ServiceExtensionPanelProps) {
  const navigate = useNavigate();

  // 🔥 Phase 17: 장소 카테고리 추론 (검색어 기반, 실제 마켓 카테고리 ID 사용)
  const inferCategory = (query: string): { category: string; categoryId: string } | null => {
    const normalized = query.toLowerCase();
    
    // 🔥 Phase 17: 마켓 카테고리 매핑 (marketCategories.ts 기준)
    if (normalized.includes('축구') || normalized.includes('축구장') || normalized.includes('풋살')) {
      return { category: '축구', categoryId: '축구/풋살' };
    }
    if (normalized.includes('농구') || normalized.includes('농구장')) {
      return { category: '농구', categoryId: '농구' };
    }
    if (normalized.includes('테니스') || normalized.includes('테니스장')) {
      return { category: '테니스', categoryId: '테니스' };
    }
    if (normalized.includes('배드민턴') || normalized.includes('배드민턴장')) {
      return { category: '배드민턴', categoryId: '배드민턴' };
    }
    if (normalized.includes('러닝') || normalized.includes('조깅') || normalized.includes('달리기')) {
      return { category: '러닝', categoryId: '러닝' };
    }
    if (normalized.includes('헬스') || normalized.includes('피트니스') || normalized.includes('체육관')) {
      return { category: '헬스', categoryId: '헬스/피트니스' };
    }
    if (normalized.includes('골프') || normalized.includes('골프장')) {
      return { category: '골프', categoryId: '골프' };
    }
    if (normalized.includes('수영') || normalized.includes('수영장')) {
      return { category: '수영', categoryId: '수영' };
    }
    
    return null;
  };

  const categoryInfo = inferCategory(searchQuery);
  const hasCategory = categoryInfo !== null;

  // 🔥 Phase 17: 서비스 카드 목록 (장소와 직접 연결된 것만)
  const services = [];

  // 마켓 서비스 (카테고리가 있을 때만)
  if (hasCategory && categoryInfo) {
    services.push({
      title: '중고 장비',
      description: '이 근처에서 거래 많아요',
      onClick: () => {
        // 🔥 퍼널 연결: 마켓 이동 로그
        logActivity({
          event: "MARKET_VIEW",
          location: "/app/market",
          meta: { 
            source: "map",
            category: categoryInfo.categoryId,
            viewMode: "list",
          },
        });
        
        navigate(`/app/market?source=map&category=${encodeURIComponent(categoryInfo.categoryId)}`);
        console.log('[ServiceExtension] 마켓 이동:', categoryInfo);
      },
    });
  }

  // 커뮤니티 서비스 (항상 표시)
  services.push({
    title: '모임 찾기',
    description: '여기서 자주 모여요',
    onClick: () => {
      navigate('/sports-hub');
      console.log('[ServiceExtension] 커뮤니티 이동');
    },
  });

  // 후기 서비스 (장소 ID가 있을 때만)
  if (place.id && place.id !== 'test-1' && place.id !== 'test-2') {
    services.push({
      title: '후기 보기',
      description: '사람들이 남긴 리뷰',
      onClick: () => {
        // TODO: 후기 페이지 연결 (향후 구현)
        console.log('[ServiceExtension] 후기 보기:', place.id);
      },
    });
  }

  if (services.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-200 pt-3">
      <div className="text-xs text-gray-500 mb-2 px-1">
        이 장소에서 할 수 있어요
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {services.map((service, index) => (
          <ServiceExtensionCard
            key={index}
            title={service.title}
            description={service.description}
            onClick={service.onClick}
          />
        ))}
      </div>
    </div>
  );
}
