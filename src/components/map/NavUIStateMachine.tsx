/**
 * 🔥 네비 UI 상태 머신 (단일 소스 오브 트루스)
 * 
 * 상태 정의 및 상태별 UI 레이어 분리
 * "상태가 바뀌면 UI 세트가 통째로 갈아끼워진다"
 */

import React from 'react';

// ✅ 상태 정의 (단일 소스 오브 트루스)
export type NavUIState = 'SEARCH' | 'SELECTED' | 'PRE_NAV' | 'NAVIGATING' | 'ARRIVED';

// ✅ 상태별 UI 레이어 타입
export type TopLayerType = 'SEARCH_BAR' | 'STATUS_BAR' | 'TURN_BY_TURN';
export type BottomLayerType = 'RESULT_LIST' | 'CONFIRM_CARD' | 'PRE_NAV_CARD' | 'NAV_CARD' | 'ARRIVED_CARD' | null;

/**
 * 상태별 TopLayer 타입 결정
 */
export function getTopLayerType(state: NavUIState): TopLayerType {
  switch (state) {
    case 'SEARCH':
    case 'SELECTED':
      return 'SEARCH_BAR';
    case 'PRE_NAV':
      return 'STATUS_BAR';
    case 'NAVIGATING':
      return 'TURN_BY_TURN';
    case 'ARRIVED':
      return 'STATUS_BAR'; // 또는 null
    default:
      return 'SEARCH_BAR';
  }
}

/**
 * 상태별 BottomLayer 타입 결정
 */
export function getBottomLayerType(state: NavUIState): BottomLayerType {
  switch (state) {
    case 'SEARCH':
      return 'RESULT_LIST';
    case 'SELECTED':
      return 'CONFIRM_CARD';
    case 'PRE_NAV':
      return 'PRE_NAV_CARD';
    case 'NAVIGATING':
      return 'NAV_CARD';
    case 'ARRIVED':
      return 'ARRIVED_CARD';
    default:
      return null;
  }
}

/**
 * 디버그 배지 컴포넌트
 */
export function DebugBadge({ state }: { state: NavUIState }) {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        zIndex: 9999,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: '#fff',
        padding: '6px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontFamily: 'monospace',
        pointerEvents: 'none',
      }}
    >
      UI STATE: {state}
    </div>
  );
}
