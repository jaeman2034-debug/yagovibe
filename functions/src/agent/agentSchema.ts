/**
 * 🧠 Agent Schema
 * Structured Output 스키마 정의
 */

export const agentSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    action: {
      type: "string",
      enum: ["SEARCH", "NAVIGATE", "REPEAT_LAST", "SEARCH_ALTERNATIVE", "NONE"],
      description: "실행할 액션",
    },
    query: {
      type: "string",
      description: "검색어/목적지 텍스트",
    },
    filters: {
      type: "object",
      additionalProperties: false,
      properties: {
        openNow: {
          type: "boolean",
          description: "지금 영업 중인 장소만",
        },
        parking: {
          type: "boolean",
          description: "주차 가능한 장소만",
        },
        sort: {
          type: "string",
          enum: ["NEAREST", "BEST_RATED", "DEFAULT"],
          description: "정렬 방식",
        },
      },
      required: ["openNow", "parking", "sort"],
    },
  },
  required: ["action", "query", "filters"],
} as const;
