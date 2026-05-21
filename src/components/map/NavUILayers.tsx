/**
 * 🔥 네비 UI 레이어 컴포넌트
 * 
 * TopLayer, MapLayer, BottomLayer를 상태별로 분리
 * 출발 전환 애니메이션 포함
 */

import React, { useState } from "react";
import { NavUIState } from "./navState";

// 🔝 TopLayer 컴포넌트 (UI 통째 교체 애니메이션)
export function TopLayer({ state }: { state: NavUIState }) {
  const getContent = () => {
    switch (state) {
      case "SEARCH":
      case "SELECTED":
        return <SearchBar />;
      case "PRE_NAV":
        return <StatusBar text="🚗 출발 준비됨" />;
      case "NAVIGATING":
        return <TurnBar />;
      default:
        return null;
    }
  };

  return (
    <div
      key={state} // 🔥 핵심: key={state}로 컴포넌트 통째 교체
      style={{
        animation: "fadeInDown 0.25s ease-out",
      }}
    >
      {getContent()}
      <style>{`
        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const SearchBar = () => (
  <div
    style={{
      position: "fixed",
      top: "calc(var(--header-h, 56px) + 80px)",
      left: "50%",
      transform: "translateX(-50%)",
      width: "calc(100% - 32px)",
      maxWidth: "500px",
      zIndex: 700,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(8px)",
      borderRadius: "12px",
      padding: "12px 16px",
      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
    }}
  >
    🔍 목적지를 검색하세요
  </div>
);

const StatusBar = ({ text }: { text: string }) => (
  <div
    style={{
      position: "fixed",
      top: "calc(var(--header-h, 56px) + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 900,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      backdropFilter: "blur(12px)",
      borderRadius: "24px",
      padding: "12px 20px",
      color: "#fff",
      fontSize: "15px",
      fontWeight: "500",
    }}
  >
    {text}
  </div>
);

const TurnBar = () => (
  <div
    style={{
      position: "fixed",
      top: "calc(var(--header-h, 56px) + 8px)",
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 900,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      backdropFilter: "blur(12px)",
      borderRadius: "24px",
      padding: "12px 20px",
      color: "#fff",
      fontSize: "15px",
      fontWeight: "500",
    }}
  >
    ⬆️ 300m 직진
  </div>
);

// 🗺 MapLayer 컴포넌트 (카메라 연출 포함)
export function MapLayer({ state }: { state: NavUIState }) {
  const mapClass = state.toLowerCase().replace("_", "-");
  
  return (
    <div
      className={`map-layer map-${mapClass}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 0,
        backgroundColor: "#e5e5e5",
        transition: "transform 500ms ease, filter 300ms ease",
        transform: state === "NAVIGATING" ? "scale(1.05)" : "scale(1)",
        filter: state === "NAVIGATING" ? "saturate(1.1)" : "saturate(1)",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "#666",
          fontSize: "14px",
        }}
      >
        {state === "SEARCH" && "🗺 지도 영역 (내 위치 중심)"}
        {state === "SELECTED" && "🗺 지도 영역 (내 위치 + 목적지)"}
        {state === "PRE_NAV" && "🗺 지도 영역 (경로 미리보기)"}
        {state === "NAVIGATING" && "🗺 지도 영역 (차량 시점 추적)"}
      </div>
    </div>
  );
}

// 🔽 BottomLayer 컴포넌트 (UI 통째 교체 애니메이션)
type NavActions = {
  toSearch: () => void;
  toSelected: () => void;
  toPreNav: () => void;
  toNavigating: () => void;
};

export function BottomLayer({
  state,
  nav,
}: {
  state: NavUIState;
  nav: NavActions;
}) {
  // ③ 상단·하단 UI "통째 교체" (CSS transition)
  const getContent = () => {
    switch (state) {
      case "SEARCH":
        return <SearchResult onPick={nav.toSelected} />;
      case "SELECTED":
        return <ConfirmPlace onConfirm={nav.toPreNav} />;
      case "PRE_NAV":
        return <PreNav onStart={nav.toNavigating} />;
      case "NAVIGATING":
        return <Navigating onEnd={nav.toPreNav} />;
      default:
        return null;
    }
  };

  return (
    <div
      key={state} // 🔥 핵심: key={state}로 컴포넌트 통째 교체
      style={{
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "500px",
        zIndex: 800,
        animation: "slideUp 0.25s ease-out",
      }}
    >
      {getContent()}
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(40px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

const SearchResult = ({ onPick }: { onPick: () => void }) => (
  <div
    style={{
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(8px)",
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    }}
  >
    <button
      onClick={onPick}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: "8px",
        border: "none",
        backgroundColor: "#4285F4",
        color: "#fff",
        fontSize: "15px",
        fontWeight: "500",
        cursor: "pointer",
      }}
    >
      서울월드컵경기장 선택
    </button>
  </div>
);

const ConfirmPlace = ({ onConfirm }: { onConfirm: () => void }) => (
  <div
    style={{
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(8px)",
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    }}
  >
    <p style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600" }}>
      서울월드컵경기장
    </p>
    <button
      onClick={onConfirm}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: "8px",
        border: "none",
        backgroundColor: "#4285F4",
        color: "#fff",
        fontSize: "15px",
        fontWeight: "500",
        cursor: "pointer",
      }}
    >
      여기에 갈게요
    </button>
  </div>
);

// 🔥 출발 버튼 즉시 피드백 (0-200ms)
const PreNav = ({ onStart }: { onStart: () => void }) => {
  const [loading, setLoading] = useState(false);

  const handleStart = () => {
    // ① 버튼 즉시 피드백
    setLoading(true);
    
    // ② 300ms 후 상태 전환 (지도 연출 + UI 교체)
    setTimeout(() => {
      onStart();
      setLoading(false);
    }, 300);
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: "80px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "calc(100% - 32px)",
        maxWidth: "500px",
        zIndex: 800,
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(8px)",
        borderRadius: "16px",
        padding: "20px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
      }}
    >
      <p style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#666" }}>
        ⏱ 18분 · 📏 6.2km
      </p>
      <button
        onClick={handleStart}
        disabled={loading}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: loading ? "#6ee7b7" : "#10b981",
          color: "#fff",
          fontSize: "15px",
          fontWeight: "500",
          cursor: loading ? "wait" : "pointer",
          opacity: loading ? 0.7 : 1,
          transform: loading ? "scale(0.98)" : "scale(1)",
          transition: "all 150ms ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {loading ? (
          <>
            <span
              style={{
                display: "inline-block",
                width: "16px",
                height: "16px",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                borderTopColor: "#ffffff",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            경로 계산 중…
          </>
        ) : (
          "출발"
        )}
        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </button>
    </div>
  );
};

const Navigating = ({ onEnd }: { onEnd: () => void }) => (
  <div
    style={{
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      backdropFilter: "blur(8px)",
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
    }}
  >
    <p style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#666" }}>
      도착까지 14분
    </p>
    <button
      onClick={onEnd}
      style={{
        width: "100%",
        padding: "12px",
        borderRadius: "8px",
        border: "none",
        backgroundColor: "#ef4444",
        color: "#fff",
        fontSize: "15px",
        fontWeight: "500",
        cursor: "pointer",
      }}
    >
      안내 종료
    </button>
  </div>
);
