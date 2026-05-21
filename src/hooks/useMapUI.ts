/**
 * 🔥 리모델링: UI 상태 머신 (UI 독재자)
 * 
 * 규칙: UI는 오직 이 상태 값만 본다
 * 그 외 컴포넌트는 말할 권한이 없음
 */

import { useState } from 'react';

export type MapUIState =
  | 'idle'        // 아무것도 안 함
  | 'loading'     // 찾는 중
  | 'voice'       // 말해도 됨
  | 'result'      // 장소 선택됨
  | 'navigating'  // 안내 중
  | 'error';      // 에러

export const useMapUI = () => {
  const [ui, setUI] = useState<MapUIState>('idle');
  return { ui, setUI };
};
