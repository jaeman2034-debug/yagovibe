/**
 * 🔥 네비 UI 화면 구조 (레이어 고정, UI 섞임 차단)
 * 
 * 이 컴포넌트는 상태 머신 구조의 뼈대만 제공.
 * 실제 지도 SDK는 MapLayer 내부에서 처리.
 */

import React from "react";
import { useNavUI } from "./useNavUI";
import { MapLayer, TopLayer, BottomLayer } from "./NavUILayers";

export default function NavUIScreen() {
  const nav = useNavUI();

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
      }}
    >
      {/* 🗺 지도 레이어 (항상 존재) */}
      <MapLayer state={nav.state} />

      {/* 🔝 상단 레이어 (상태별 컴포넌트 교체) */}
      <TopLayer state={nav.state} />

      {/* 🔽 하단 레이어 (상태별 컴포넌트 교체) */}
      <BottomLayer state={nav.state} nav={nav} />

      {/* 🧠 디버그 배지 (절대 제거하지 마) */}
      {process.env.NODE_ENV === "development" && (
        <div
          style={{
            position: "fixed",
            top: "10px",
            right: "10px",
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            color: "#fff",
            padding: "6px 12px",
            borderRadius: "6px",
            fontSize: "11px",
            fontFamily: "monospace",
            pointerEvents: "none",
          }}
        >
          UI STATE: {nav.state}
        </div>
      )}
    </div>
  );
}
