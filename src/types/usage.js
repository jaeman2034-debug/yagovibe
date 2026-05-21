"use strict";
/**
 * 🔥 Usage 타입 정의
 *
 * Usage 모델: /teams/{teamId}/usage/current
 * - 월 단위 단일 문서
 * - 서버에서만 업데이트
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.USAGE_LIMITS = void 0;
/**
 * Free / Pro 제한값 정의
 */
exports.USAGE_LIMITS = {
    free: {
        membersCount: 5,
        actionsThisMonth: 1000,
        storageMB: 500,
    },
    pro: {
        membersCount: Infinity, // 무제한
        actionsThisMonth: 50000,
        storageMB: 10240, // 10GB
    },
    academy_pro: {
        membersCount: Infinity,
        actionsThisMonth: 100000,
        storageMB: 51200, // 50GB
    },
};
