/**
 * 🔥 네비 UI 상태 관리 훅
 * 
 * 상태 전환 함수를 제공하는 단일 소스 오브 트루스
 */

import { useState } from "react";
import { NavUIState } from "./navState";

export function useNavUI() {
  const [state, setState] = useState<NavUIState>("SEARCH");

  return {
    state,
    toSearch: () => setState("SEARCH"),
    toSelected: () => setState("SELECTED"),
    toPreNav: () => setState("PRE_NAV"),
    toNavigating: () => setState("NAVIGATING"),
  };
}
