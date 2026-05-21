import React from 'react';

type AiSummaryBubbleProps = {
  query: string;
  placesCount: number;
  onClose: () => void;
};

export default function AiSummaryBubble({
  query,
  placesCount,
  onClose,
}: AiSummaryBubbleProps) {
  if (!query || placesCount === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 90, // 하단 네비 위
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 1000,
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(6px)',
        borderRadius: 14,
        padding: '12px 16px',
        boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
        maxWidth: 360,
        width: 'calc(100% - 32px)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 18 }}>🤖</div>

        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 13,
              color: '#111827',
              lineHeight: 1.4,
            }}
          >
            <strong>"{query}"</strong> 기준으로{' '}
            <strong>{placesCount}곳</strong>을 추천했어요.
            <br />
            접근성과 분위기가 좋은 곳 위주예요.
            <br />
            <span style={{ fontSize: 12, color: '#6b7280', marginTop: '4px', display: 'block' }}>
              지도에서 마커를 눌러 길안내를 시작하세요.
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            border: 'none',
            background: 'transparent',
            fontSize: 16,
            cursor: 'pointer',
            color: '#6b7280',
            padding: 0,
          }}
          aria-label="AI 요약 닫기"
        >
          ×
        </button>
      </div>
    </div>
  );
}
