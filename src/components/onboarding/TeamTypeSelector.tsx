/**
 * 🔥 팀 타입 선택 컴포넌트 (온보딩)
 */
import { useState } from "react";
import { GraduationCap, BookOpen, Palette } from "lucide-react";
import { TEAM_TYPE_CONFIG, type TeamType } from "@/utils/teamTypeConfig";

interface TeamTypeSelectorProps {
  selectedType: TeamType | null;
  onSelect: (type: TeamType) => void;
}

export default function TeamTypeSelector({
  selectedType,
  onSelect,
}: TeamTypeSelectorProps) {
  const types: TeamType[] = ["club", "study", "hobby"];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 16,
        padding: "24px",
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: 8 }}>
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#111827",
            marginBottom: 8,
          }}
        >
          어떤 모임을 만드시나요?
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#6b7280",
          }}
        >
          모임 타입에 맞게 기능이 자동으로 최적화됩니다.
        </p>
      </div>

      {/* 타입 선택 카드 */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {types.map((type) => {
          const config = TEAM_TYPE_CONFIG[type];
          const isSelected = selectedType === type;

          const Icon =
            type === "club"
              ? GraduationCap
              : type === "study"
              ? BookOpen
              : Palette;

          return (
            <button
              key={type}
              onClick={() => onSelect(type)}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 16,
                padding: "20px",
                background: isSelected ? `${config.color}10` : "#fff",
                border: isSelected
                  ? `2px solid ${config.color}`
                  : "2px solid #e5e7eb",
                borderRadius: 12,
                cursor: "pointer",
                transition: "all 0.2s",
                textAlign: "left",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = config.color;
                  e.currentTarget.style.background = `${config.color}05`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = "#e5e7eb";
                  e.currentTarget.style.background = "#fff";
                }
              }}
            >
              {/* 아이콘 */}
              <div
                style={{
                  flexShrink: 0,
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: `${config.color}20`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon size={24} color={config.color} />
              </div>

              {/* 내용 */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    {config.emoji} {config.label}
                  </span>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: config.color,
                        padding: "2px 8px",
                        background: `${config.color}20`,
                        borderRadius: 12,
                      }}
                    >
                      선택됨
                    </span>
                  )}
                </div>
                <p
                  style={{
                    fontSize: 14,
                    color: "#6b7280",
                    lineHeight: 1.5,
                  }}
                >
                  {config.description}
                </p>
              </div>

              {/* 선택 표시 */}
              {isSelected && (
                <div
                  style={{
                    flexShrink: 0,
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: config.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ color: "#fff", fontSize: 14 }}>✓</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
