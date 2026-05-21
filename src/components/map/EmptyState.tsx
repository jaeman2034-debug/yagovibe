/**
 * ✅ MVP: 검색 결과 0개 EmptyState 컴포넌트
 */

import React from 'react';

type Props = {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export default function EmptyState({ 
  title = '검색 결과가 없어요',
  description = '다른 키워드로 다시 검색해 보세요',
  action,
}: Props) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        maxWidth: '500px',
        zIndex: 700,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        padding: '32px 24px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(0, 0, 0, 0.08)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '48px',
          marginBottom: '16px',
        }}
      >
        🔍
      </div>
      <div
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#1a1a1a',
          marginBottom: '8px',
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: '14px',
          color: '#666',
          marginBottom: action ? '20px' : '0',
        }}
      >
        {description}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            borderRadius: '10px',
            background: '#1a73e8',
            color: '#fff',
            fontSize: '15px',
            fontWeight: '600',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#1557b0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1a73e8';
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
