"use strict";
/**
 * 🔥 AuditLogs 타입 정의
 *
 * 설계 원칙:
 * - append-only (수정/삭제 없음)
 * - 팀 단위 분리
 * - meta는 얕게 (중첩 깊이 ❌)
 * - 사실만 기록 (문장/감정/UI 문구 ❌)
 */
Object.defineProperty(exports, "__esModule", { value: true });
