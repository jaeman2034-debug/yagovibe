/**
 * ✅ MVP: 길 찾기 실패 RouteErrorCard 컴포넌트
 */

import React from 'react';

type Props = {
  title?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
};

export default function RouteErrorCard({ 
  title = '길을 찾을 수 없어요',
  actions = [],
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
        zIndex: 800,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(8px)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        border: '1px solid rgba(220, 53, 69, 0.3)',
      }}
    >
      <div
        style={{
          fontSize: '18px',
          fontWeight: '600',
          color: '#dc3545',
          marginBottom: '12px',
          textAlign: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span style={{ fontSize: '24px' }}>⚠️</span>
        <span>{title}</span>
      </div>
      
      {actions.length > 0 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginTop: '16px',
          }}
        >
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              style={{
                flex: 1,
                padding: '14px 24px',
                borderRadius: '10px',
                background: index === 0 ? '#dc3545' : '#f5f5f5',
                color: index === 0 ? '#fff' : '#1a1a1a',
                fontSize: '15px',
                fontWeight: index === 0 ? '600' : '500',
                border: 'none',
                cursor: 'pointer',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = index === 0 ? '#c82333' : '#e5e5e5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = index === 0 ? '#dc3545' : '#f5f5f5';
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
