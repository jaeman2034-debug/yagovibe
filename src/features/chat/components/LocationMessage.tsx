import React from "react";

interface LocationMessageProps {
  location: {
    lat: number;
    lng: number;
    address?: string;
  };
  isMine: boolean;
}

/**
 * 위치 공유 메시지 컴포넌트
 * Google Maps 링크가 포함된 위치 공유 메시지 표시
 */
export function LocationMessage({ location, isMine }: LocationMessageProps) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const isValidLocation = !isNaN(lat) && !isNaN(lng);
  const mapUrl = isValidLocation ? `https://www.google.com/maps?q=${lat},${lng}` : '#';

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // 유효하지 않은 위치인 경우 클릭 차단
    if (!isValidLocation) {
      e.preventDefault();
      console.error("❌ [LocationMessage] 위치 좌표가 유효하지 않습니다:", location);
      alert("위치 정보를 불러올 수 없습니다.");
      return;
    }
    // 이벤트 전파 차단 (무한 루프 방지)
    e.stopPropagation();
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: isMine ? "flex-end" : "flex-start",
        marginBottom: 12,
      }}
    >
      <a
        href={mapUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        style={{
          maxWidth: "70%",
          padding: "12px 16px",
          borderRadius: 12,
          background: isMine ? "#2563eb" : "#fff",
          border: isMine ? "none" : "1px solid #e5e7eb",
          boxShadow: isMine ? "none" : "0 1px 2px rgba(0,0,0,0.05)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 8,
          transition: "opacity 0.2s",
          textDecoration: "none",
          color: "inherit",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "0.9";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
      >
        <span style={{ fontSize: 20 }}>📍</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: isMine ? "#fff" : "#111827", marginBottom: 4 }}>
            위치 공유
          </div>
          <div style={{ fontSize: 12, color: isMine ? "rgba(255,255,255,0.8)" : "#6b7280" }}>
            지도를 열어보세요
          </div>
        </div>
      </a>
    </div>
  );
}
