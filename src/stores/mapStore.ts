/**
 * 🔥 Map Store - 지도 관련 전역 상태 관리
 * 상세 페이지 overlay 상태 관리
 */

import { create } from "zustand";

type MapState = {
  detailId: string | null;
  openDetail: (id: string) => void;
  closeDetail: () => void;
};

export const useMapStore = create<MapState>((set) => ({
  detailId: null,
  openDetail: (id) => set({ detailId: id }),
  closeDetail: () => set({ detailId: null }),
}));
