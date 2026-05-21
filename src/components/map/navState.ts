/**
 * 🔥 네비 UI 상태 머신 (단일 진실)
 * 
 * 상태 정의만 존재. 로직은 useNavUI에서 처리.
 */

export type NavUIState =
  | "SEARCH"
  | "SELECTED"
  | "PRE_NAV"
  | "NAVIGATING";
